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

const refresh = (id: number) => {
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
};

async function loadOrder(id: number) {
  return prisma.purchaseOrder.findUniqueOrThrow({
    where: { id },
    include: { payments: { orderBy: { sequence: "asc" } }, attachments: { select: { kind: true, paymentId: true } } },
  });
}

// File opsional dari form: unggah bila ada isinya
function fileOf(fd: FormData, key: string): File | null {
  const f = fd.get(key);
  return f instanceof File && f.size > 0 ? f : null;
}

async function attach(meId: number, orderId: number, kind: AttachmentKind, file: File, paymentId: number | null = null) {
  const meta = await saveUpload(file);
  return prisma.attachment.create({ data: { ...meta, kind, orderId, paymentId, uploadedById: meId } });
}

// ═════════ Langkah 1: PO diterima ═════════
export async function saveOrder(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const method = req(fd, "paymentMethod", "Metode bayar") as PaymentMethod;
    if (!["CASH", "CICILAN"].includes(method)) throw new FormError("Metode bayar tidak valid.");
    const poDate = date(fd, "poDate");
    if (!poDate) throw new FormError("Tanggal PO wajib diisi.");
    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      poNumber: req(fd, "poNumber", "Nomor PO"),
      poDate,
      paymentMethod: method,
      notes: str(fd, "notes"),
    };
    const poFile = fileOf(fd, "poFile");
    const before = id ? await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } }) : null;
    if (before && before.paymentMethod !== method && (await prisma.payment.count({ where: { orderId: id!, paidAt: { not: null } } })) > 0) {
      throw new FormError("Metode bayar tidak bisa diubah karena sudah ada termin yang lunas.");
    }
    const saved = id ? await prisma.purchaseOrder.update({ where: { id }, data }) : await prisma.purchaseOrder.create({ data });
    if (poFile) await attach(me.id, saved.id, "PO", poFile);
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
    await prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date(), poNumber: freeKey(before.poNumber, id)!, invoiceNumber: freeKey(before.invoiceNumber, id) },
    });
    await audit({ userId: me.id, action: "DELETE", entity: "PurchaseOrder", entityId: id, summary: `PO ${before.poNumber}`, before });
    revalidatePath("/orders");
    redirect("/orders");
  });
}

// ═════════ Langkah 2: Invoice & BA (harga final) ═════════
export async function completeInvoice(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("orderId"));
    const before = await loadOrder(id);
    const flow = computeFlow(before);
    const step = flow.steps.find((s) => s.key === "invoice")!;
    if (!step.open) throw new FormError("Lengkapi dulu langkah PO diterima (file PO).");
    if (before.tukarFakturDate) throw new FormError("Tukar faktur sudah dicatat. Batalkan tukar faktur dulu untuk mengubah invoice.");

    const finalAmount = num(fd, "finalAmount");
    const data = {
      invoiceNumber: req(fd, "invoiceNumber", "No. invoice"),
      invoiceDate: date(fd, "invoiceDate"),
      finalAmount,
      baDate: date(fd, "baDate"),
    };
    if (!data.invoiceDate || !data.baDate) throw new FormError("Tanggal invoice dan tanggal BA wajib diisi.");
    if (finalAmount === null || finalAmount <= 0) throw new FormError("Nilai final wajib diisi.");
    const has = new Set(before.attachments.filter((a) => a.paymentId === null).map((a) => a.kind));
    const invFile = fileOf(fd, "invoiceFile");
    const baFile = fileOf(fd, "baFile");
    if (!has.has("INVOICE") && !invFile) throw new FormError("Unggah file invoice.");
    if (!has.has("BERITA_ACARA") && !baFile) throw new FormError("Unggah file berita acara (BA).");
    if (before.payments.some((p) => p.paidAt) && Number(before.finalAmount) !== finalAmount) {
      throw new FormError("Nilai final tidak bisa diubah karena sudah ada termin yang lunas.");
    }

    const saved = await prisma.purchaseOrder.update({ where: { id }, data });
    if (invFile) await attach(me.id, id, "INVOICE", invFile);
    if (baFile) await attach(me.id, id, "BERITA_ACARA", baFile);
    // Cash: langsung 1 termin senilai harga final (jatuh tempo default +30 hari dari invoice, bisa diubah)
    if (before.paymentMethod === "CASH" && before.payments.length === 0) {
      await prisma.payment.create({ data: { orderId: id, sequence: 1, amount: finalAmount, dueDate: addDays(data.invoiceDate, 30) } });
    }
    await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: id, summary: `Invoice ${data.invoiceNumber} & BA`, before, after: saved });
    refresh(id);
    return { ok: "Invoice & BA tersimpan." };
  });
}

export async function undoInvoice(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const before = await loadOrder(id);
    if (!computeFlow(before).canUndoInvoice) throw new FormError("Batalkan tukar faktur dulu.");
    const saved = await prisma.purchaseOrder.update({ where: { id }, data: { invoiceNumber: null, invoiceDate: null, finalAmount: null, baDate: null } });
    await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: id, summary: "Invoice & BA dibatalkan", before, after: saved });
    refresh(id);
    return { ok: "Invoice & BA dibatalkan. File lampiran tetap tersimpan." };
  });
}

// ═════════ Langkah 3: Tukar faktur ═════════
export async function completeTukar(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("orderId"));
    const before = await loadOrder(id);
    const step = computeFlow(before).steps.find((s) => s.key === "tukar")!;
    if (!step.open) throw new FormError("Lengkapi dulu langkah Invoice & BA.");
    const tukarFakturDate = date(fd, "tukarFakturDate");
    if (!tukarFakturDate) throw new FormError("Tanggal tukar faktur wajib diisi.");
    const file = fileOf(fd, "tandaTerimaFile");
    if (!before.attachments.some((a) => a.kind === "TANDA_TERIMA" && a.paymentId === null) && !file) throw new FormError("Unggah file tanda terima tukar faktur.");
    const saved = await prisma.purchaseOrder.update({ where: { id }, data: { tukarFakturDate } });
    if (file) await attach(me.id, id, "TANDA_TERIMA", file);
    await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: id, summary: "Tukar faktur", before, after: saved });
    refresh(id);
    return { ok: "Tukar faktur tersimpan." };
  });
}

export async function undoTukar(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const before = await loadOrder(id);
    if (!computeFlow(before).canUndoTukar) throw new FormError("Sudah ada termin yang lunas. Batalkan pembayarannya dulu.");
    const saved = await prisma.purchaseOrder.update({ where: { id }, data: { tukarFakturDate: null } });
    await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: id, summary: "Tukar faktur dibatalkan", before, after: saved });
    refresh(id);
    return { ok: "Tukar faktur dibatalkan." };
  });
}

// ═════════ Langkah 4: Penagihan ═════════
// Jadwal termin dari harga final (cicilan); tidak bisa dibuat ulang bila sudah ada yang lunas
export async function setPaymentPlan(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const orderId = Number(fd.get("orderId"));
    const order = await loadOrder(orderId);
    if (order.finalAmount === null) throw new FormError("Isi dulu nilai final di langkah Invoice & BA.");
    if (order.payments.some((p) => p.paidAt)) throw new FormError("Sudah ada termin yang lunas. Ubah termin satu per satu.");
    const count = int(fd, "count");
    const firstDue = date(fd, "firstDue");
    const interval = int(fd, "interval") ?? 1;
    if (!count || count < 1 || count > 60) throw new FormError("Jumlah termin 1–60.");
    if (!firstDue) throw new FormError("Isi jatuh tempo termin pertama.");
    if (interval < 1) throw new FormError("Jarak antar termin minimal 1 bulan.");
    const total = Number(order.finalAmount);
    const base = Math.floor(total / count);
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { orderId } }),
      prisma.payment.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          orderId,
          sequence: i + 1,
          amount: i === count - 1 ? total - base * (count - 1) : base, // sisa pembulatan di termin terakhir
          dueDate: addMonths(firstDue, i * interval),
        })),
      }),
    ]);
    await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: orderId, summary: `Jadwal ${count} termin penagihan` });
    refresh(orderId);
    return { ok: `${count} termin dibuat.` };
  });
}

export async function savePayment(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const orderId = Number(fd.get("orderId"));
    const amount = num(fd, "amount");
    const dueDate = date(fd, "dueDate");
    if (amount === null || amount <= 0 || !dueDate) throw new FormError("Nominal dan jatuh tempo wajib diisi.");
    const before = id ? await prisma.payment.findUniqueOrThrow({ where: { id } }) : null;
    if (before?.paidAt) throw new FormError("Termin yang sudah lunas tidak bisa diubah. Batalkan lunasnya dulu.");
    const data = { amount, dueDate, notes: str(fd, "notes") };
    const saved = id
      ? await prisma.payment.update({ where: { id }, data })
      : await prisma.payment.create({
          data: { ...data, orderId, sequence: ((await prisma.payment.aggregate({ where: { orderId }, _max: { sequence: true } }))._max.sequence ?? 0) + 1 },
        });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Payment", entityId: saved.id, summary: `Termin ${saved.sequence}`, before, after: saved });
    refresh(orderId);
    return { ok: "Termin disimpan." };
  });
}

// Lunas: wajib bukti bayar, termin berurutan, setelah tukar faktur
export async function payPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id"));
    const before = await prisma.payment.findUniqueOrThrow({ where: { id }, include: { attachments: true } });
    const flow = computeFlow(await loadOrder(before.orderId));
    if (before.paidAt) throw new FormError("Termin ini sudah lunas.");
    if (!flow.steps.find((s) => s.key === "payment")!.open) throw new FormError("Penagihan terbuka setelah tukar faktur selesai.");
    if (flow.nextPaySeq !== before.sequence) throw new FormError(`Lunasi dulu termin ${flow.nextPaySeq} — termin harus berurutan.`);
    const paidAt = date(fd, "paidAt");
    if (!paidAt) throw new FormError("Isi tanggal bayar.");
    const file = fileOf(fd, "proofFile");
    if (!before.attachments.some((a) => a.kind === "BUKTI_BAYAR") && !file) throw new FormError("Unggah bukti bayar.");
    if (file) await attach(me.id, before.orderId, "BUKTI_BAYAR", file, id);
    const saved = await prisma.payment.update({ where: { id }, data: { paidAt } });
    await audit({ userId: me.id, action: "UPDATE", entity: "Payment", entityId: id, summary: `Termin ${saved.sequence} lunas`, before, after: saved });
    refresh(before.orderId);
    revalidatePath("/payments");
    return { ok: `Termin ${saved.sequence} lunas.` };
  });
}

export async function unpayPayment(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const before = await prisma.payment.findUniqueOrThrow({ where: { id } });
    const flow = computeFlow(await loadOrder(before.orderId));
    if (flow.lastPaidSeq !== before.sequence) throw new FormError("Batalkan dari termin lunas yang terakhir.");
    const saved = await prisma.payment.update({ where: { id }, data: { paidAt: null } });
    await audit({ userId: me.id, action: "UPDATE", entity: "Payment", entityId: id, summary: `Termin ${saved.sequence} batal lunas`, before, after: saved });
    refresh(before.orderId);
    return { ok: "Status lunas dibatalkan. Bukti bayar tetap tersimpan." };
  });
}

export async function deletePayment(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const target = await prisma.payment.findUniqueOrThrow({ where: { id }, include: { attachments: true } });
    if (target.paidAt) throw new FormError("Termin yang sudah lunas tidak bisa dihapus.");
    await prisma.payment.delete({ where: { id } });
    for (const f of target.attachments) await removeUpload(f.storedName);
    await audit({ userId: me.id, action: "DELETE", entity: "Payment", entityId: id, summary: `Termin ${target.sequence}`, before: target });
    refresh(target.orderId);
    return { ok: "Termin dihapus." };
  });
}

// ═════════ Lampiran tambahan & hapus lampiran ═════════
export async function uploadAttachment(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const orderId = Number(fd.get("orderId"));
    const kind = (str(fd, "kind") ?? "LAINNYA") as AttachmentKind;
    const file = fileOf(fd, "file");
    if (!file) throw new FormError("Pilih file terlebih dahulu.");
    const a = await attach(me.id, orderId, kind, file);
    await audit({ userId: me.id, action: "CREATE", entity: "Attachment", entityId: a.id, summary: a.fileName });
    refresh(orderId);
    return { ok: `${a.fileName} terunggah.` };
  });
}

// File wajib tidak boleh dihapus bila langkahnya sudah berjalan (supaya dokumen tetap lengkap)
export async function deleteAttachment(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const a = await prisma.attachment.findUniqueOrThrow({ where: { id }, include: { payment: true } });
    if (a.orderId) {
      const order = await loadOrder(a.orderId);
      const sameKind = order.attachments.filter((x) => x.kind === a.kind && x.paymentId === a.paymentId).length;
      const lastOne = sameKind <= 1;
      const flow = computeFlow(order);
      const done = (k: string) => flow.steps.find((s) => s.key === k)!.done;
      const locked =
        lastOne &&
        ((a.kind === "PO" && done("invoice")) ||
          ((a.kind === "INVOICE" || a.kind === "BERITA_ACARA") && done("invoice")) ||
          (a.kind === "TANDA_TERIMA" && done("tukar")) ||
          (a.kind === "BUKTI_BAYAR" && !!a.payment?.paidAt));
      if (locked) throw new FormError("File ini wajib untuk langkah yang sudah selesai. Batalkan langkahnya dulu, atau unggah file pengganti sebelum menghapus.");
    }
    await prisma.attachment.delete({ where: { id } });
    await removeUpload(a.storedName);
    await audit({ userId: me.id, action: "DELETE", entity: "Attachment", entityId: id, summary: a.fileName });
    if (a.orderId) refresh(a.orderId);
    revalidatePath("/customers", "layout");
    return { ok: "Lampiran dihapus." };
  });
}
