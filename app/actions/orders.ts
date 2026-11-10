"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, num, date, int, freeKey, FormError } from "@/lib/forms";
import { saveUpload, removeUpload } from "@/lib/uploads";
import { addDays, addMonths } from "@/lib/format";
import { computeFlow } from "@/lib/progress";
import type { ActionState } from "@/components/client";
import type { AttachmentKind, PaymentMethod } from "@/generated/prisma/client";

const orderPath = (id: number) => revalidatePath(`/orders/${id}`);

// Status urutan tahapan & termin sebuah PO, dihitung dari database (validasi di server)
async function orderFlow(orderId: number) {
  const [stages, order] = await Promise.all([
    prisma.stage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.purchaseOrder.findUniqueOrThrow({ where: { id: orderId }, include: { stages: true, invoices: true } }),
  ]);
  return computeFlow(stages, order.stages, order.invoices);
}

export async function saveOrder(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const method = req(fd, "paymentMethod", "Metode bayar") as PaymentMethod;
    if (!["CASH", "CICILAN"].includes(method)) throw new FormError("Metode bayar tidak valid.");
    const amount = num(fd, "amount");
    if (amount === null) throw new FormError("Nilai PO wajib diisi.");
    const poDate = date(fd, "poDate");
    if (!poDate) throw new FormError("Tanggal PO wajib diisi.");
    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      poNumber: req(fd, "poNumber", "Nomor PO"),
      poDate,
      paymentMethod: method,
      amount,
      ppnPercent: num(fd, "ppnPercent"),
      specialNotes: str(fd, "specialNotes"),
    };
    const before = id ? await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } }) : null;
    let saved;
    if (id) {
      saved = await prisma.purchaseOrder.update({ where: { id }, data });
    } else {
      // PO baru: tahap pertama ("PO masuk") otomatis selesai di tanggal PO.
      // Cash: langsung dibuat 1 invoice senilai PO (jatuh tempo default +30 hari, bisa diubah).
      const first = await prisma.stage.findFirst({ where: { active: true, isPayment: false }, orderBy: { sortOrder: "asc" } });
      saved = await prisma.purchaseOrder.create({
        data: {
          ...data,
          stages: first ? { create: { stageId: first.id, completedAt: poDate } } : undefined,
          invoices: method === "CASH" ? { create: { sequence: 1, amount, dueDate: addDays(poDate, 30) } } : undefined,
        },
      });
    }
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "PurchaseOrder", entityId: saved.id, summary: `PO ${saved.poNumber}`, before, after: saved });
    return { ok: String(saved.id) };
  });
  if (r && "ok" in r && r.ok) {
    revalidatePath("/orders");
    redirect(`/orders/${r.ok}`);
  }
  return r;
}

export async function deleteOrder(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const before = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    await prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date(), poNumber: freeKey(before.poNumber, id)! } });
    await audit({ userId: me.id, action: "DELETE", entity: "PurchaseOrder", entityId: id, summary: `PO ${before.poNumber}`, before });
    revalidatePath("/orders");
    redirect("/orders");
  });
}

export async function setStage(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const orderId = Number(fd.get("orderId"));
    const stageId = Number(fd.get("stageId"));
    const undo = fd.get("undo") === "1";
    const completedAt = undo ? null : date(fd, "completedAt");
    if (!undo && !completedAt) throw new FormError("Isi tanggal selesai tahap.");
    const note = str(fd, "note");
    const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });
    const flow = (await orderFlow(orderId)).stages.find((s) => s.id === stageId);
    if (!flow || stage.isPayment) throw new FormError("Tahap pembayaran mengikuti status invoice.");
    if (!undo && !flow.canComplete) {
      throw new FormError(flow.done ? `Tahap ${stage.name} sudah selesai.` : `Selesaikan dulu tahap "${flow.blockedBy}" — tahapan harus berurutan.`);
    }
    if (undo && !flow.canUndo) throw new FormError(`Tahap ${stage.name} tidak bisa dibatalkan karena tahap sesudahnya sudah berjalan. Batalkan dari tahap terakhir.`);
    await prisma.poStage.upsert({
      where: { orderId_stageId: { orderId, stageId } },
      create: { orderId, stageId, completedAt, note },
      update: { completedAt, ...(note !== null ? { note } : {}) },
    });
    await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: orderId, summary: `${undo ? "Batal" : "Selesai"}: ${stage.name}` });
    orderPath(orderId);
    return { ok: undo ? `Tahap ${stage.name} dibatalkan.` : `Tahap ${stage.name} selesai.` };
  });
}

// Buat jadwal termin: N invoice dengan nominal dibagi rata (invoice yang sudah lunas tidak disentuh)
export async function setInvoicePlan(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const orderId = Number(fd.get("orderId"));
    const count = int(fd, "count");
    const firstDue = date(fd, "firstDue");
    const interval = int(fd, "interval") ?? 1;
    if (!count || count < 1 || count > 60) throw new FormError("Jumlah termin 1–60.");
    if (!firstDue) throw new FormError("Isi jatuh tempo termin pertama.");
    if (interval < 1) throw new FormError("Jarak antar termin minimal 1 bulan.");
    const order = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: orderId }, include: { invoices: true } });
    if (order.invoices.some((i) => i.paidAt || i.invoiceNumber)) {
      throw new FormError("Sudah ada invoice yang terbit/lunas. Ubah invoice satu per satu.");
    }
    const total = num(fd, "total") ?? Number(order.amount);
    const base = Math.floor(total / count);
    await prisma.$transaction([
      prisma.invoice.deleteMany({ where: { orderId } }),
      prisma.invoice.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          orderId,
          sequence: i + 1,
          amount: i === count - 1 ? total - base * (count - 1) : base,
          dueDate: addMonths(firstDue, i * interval),
        })),
      }),
    ]);
    await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: orderId, summary: `Jadwal ${count} termin dibuat` });
    orderPath(orderId);
    return { ok: `${count} termin dibuat.` };
  });
}

export async function saveInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const orderId = Number(fd.get("orderId"));
    const amount = num(fd, "amount");
    const dueDate = date(fd, "dueDate");
    if (amount === null || !dueDate) throw new FormError("Nominal dan jatuh tempo wajib diisi.");
    const data = {
      invoiceNumber: str(fd, "invoiceNumber"),
      invoiceDate: date(fd, "invoiceDate"),
      amount,
      dueDate,
      notes: str(fd, "notes"),
    };
    const before = id ? await prisma.invoice.findUniqueOrThrow({ where: { id } }) : null;
    const saved = id
      ? await prisma.invoice.update({ where: { id }, data })
      : await prisma.invoice.create({
          data: { ...data, orderId, sequence: ((await prisma.invoice.aggregate({ where: { orderId }, _max: { sequence: true } }))._max.sequence ?? 0) + 1 },
        });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Invoice", entityId: saved.id, summary: `Termin ${saved.sequence}${saved.invoiceNumber ? ` · ${saved.invoiceNumber}` : ""}`, before, after: saved });
    orderPath(orderId);
    revalidatePath("/invoices");
    return { ok: "Invoice disimpan." };
  });
}

export async function setInvoicePaid(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id"));
    const undo = fd.get("undo") === "1";
    const paidAt = undo ? null : date(fd, "paidAt");
    if (!undo && !paidAt) throw new FormError("Isi tanggal bayar.");
    const before = await prisma.invoice.findUniqueOrThrow({ where: { id } });
    const flow = await orderFlow(before.orderId);
    if (!undo) {
      if (before.paidAt) throw new FormError("Termin ini sudah lunas.");
      if (!flow.payReady) throw new FormError("Selesaikan dulu tahapan sebelum Payment (berita acara, aktivasi, tukar faktur).");
      if (flow.nextPaySeq !== before.sequence) throw new FormError(`Lunasi dulu termin ${flow.nextPaySeq} — termin harus berurutan.`);
    } else {
      if (flow.lastPaidSeq !== before.sequence) throw new FormError("Batalkan dari termin lunas yang terakhir.");
      if (!flow.canUndoPay) throw new FormError("Tahap sesudah Payment sudah berjalan. Batalkan tahap itu dulu.");
    }
    const inv = await prisma.invoice.update({ where: { id }, data: { paidAt } });
    await audit({ userId: me.id, action: "UPDATE", entity: "Invoice", entityId: id, summary: `Termin ${inv.sequence} ${undo ? "batal lunas" : "lunas"}`, before, after: inv });
    orderPath(inv.orderId);
    revalidatePath("/invoices");
    return { ok: undo ? "Status lunas dibatalkan." : "Ditandai lunas." };
  });
}

export async function deleteInvoice(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const target = await prisma.invoice.findUniqueOrThrow({ where: { id } });
    if (target.paidAt) throw new FormError("Termin yang sudah lunas tidak bisa dihapus. Batalkan status lunasnya dulu.");
    const files = await prisma.attachment.findMany({ where: { invoiceId: id } });
    const inv = await prisma.invoice.delete({ where: { id } });
    for (const f of files) await removeUpload(f.storedName);
    await audit({ userId: me.id, action: "DELETE", entity: "Invoice", entityId: id, summary: `Termin ${inv.sequence}`, before: inv });
    orderPath(inv.orderId);
    return { ok: "Invoice dihapus." };
  });
}

export async function uploadAttachment(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const orderId = Number(fd.get("orderId"));
    const invoiceId = Number(fd.get("invoiceId")) || null;
    const kind = (str(fd, "kind") ?? "LAINNYA") as AttachmentKind;
    const meta = await saveUpload(fd.get("file") as File);
    const a = await prisma.attachment.create({ data: { ...meta, kind, orderId, invoiceId, uploadedById: me.id } });
    await audit({ userId: me.id, action: "CREATE", entity: "Attachment", entityId: a.id, summary: meta.fileName });
    orderPath(orderId);
    return { ok: `${meta.fileName} terunggah.` };
  });
}

export async function deleteAttachment(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const a = await prisma.attachment.delete({ where: { id } });
    await removeUpload(a.storedName);
    await audit({ userId: me.id, action: "DELETE", entity: "Attachment", entityId: id, summary: a.fileName });
    if (a.orderId) orderPath(a.orderId);
    revalidatePath("/customers", "layout");
    return { ok: "Lampiran dihapus." };
  });
}
