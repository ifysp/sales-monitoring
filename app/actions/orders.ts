"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, num, date, dateVal, int, FormError } from "@/lib/forms";
import { saveUpload, removeUpload } from "@/lib/uploads";
import { addMonths } from "@/lib/format";
import type { ActionState } from "@/components/client";
import type { AttachmentKind, PaymentMethod } from "@/generated/prisma/client";

// Satu baris produk di dalam PO (dikirim dari form sebagai JSON)
// Kolom angka opsional: "" / null → null
const optionalId = (msg: string) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number({ message: msg }).int({ message: msg }).positive({ message: msg }).nullable());

const ItemSchema = z.object({
  productId: z.coerce.number({ message: "Pilih produk untuk setiap item." }).int().positive({ message: "Pilih produk untuk setiap item." }),
  packageId: optionalId("Package tidak valid."),
  quantity: optionalId("Jumlah harus bilangan bulat lebih dari 0."),
  machineModelId: optionalId("Model mesin tidak valid."),
  serialNumber: z.string().trim().nullable().optional(),
  triceId: z.string().trim().nullable().optional(),
  siteCode: z.string().trim().nullable().optional(),
  installDate: z.string().nullable().optional(),
  contractStart: z.string().nullable().optional(),
  contractEnd: z.string().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

function blank(v: string | null | undefined) {
  return v && v.trim() !== "" ? v.trim() : null;
}

// Hitung ulang uang diterima (untuk PO cicilan) & status tahap pembayaran
async function syncPayment(orderId: number) {
  const order = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { installments: true },
  });
  if (order.paymentMethod !== "CICILAN") return;
  const paid = order.installments.filter((i) => i.paidAt);
  const total = paid.reduce((s, i) => s + Number(i.amount), 0);
  await prisma.purchaseOrder.update({ where: { id: orderId }, data: { amountReceived: total } });
  const payStage = await prisma.stage.findFirst({ where: { isPayment: true, active: true } });
  if (!payStage) return;
  const allPaid = order.installments.length > 0 && paid.length === order.installments.length;
  const lastPaid = paid.map((i) => i.paidAt!).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  await prisma.poStage.upsert({
    where: { orderId_stageId: { orderId, stageId: payStage.id } },
    create: { orderId, stageId: payStage.id, completedAt: allPaid ? lastPaid : null },
    update: { completedAt: allPaid ? lastPaid : null },
  });
}

export async function saveOrder(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await handle(async () => {
    const me = await requireUser();
    const id = Number(fd.get("id")) || null;
    const method = req(fd, "paymentMethod", "Metode bayar") as PaymentMethod;
    if (!["CASH", "CICILAN"].includes(method)) throw new FormError("Metode bayar tidak valid.");

    let rawItems: unknown;
    try {
      rawItems = JSON.parse(String(fd.get("items") ?? "[]"));
    } catch {
      throw new FormError("Data item tidak valid.");
    }
    const parsed = z.array(ItemSchema).min(1, { message: "Tambahkan minimal satu produk." }).safeParse(rawItems);
    if (!parsed.success) throw new FormError(parsed.error.issues[0]?.message ?? "Data item tidak valid.");

    const price = num(fd, "price");
    if (price === null) throw new FormError("Nilai deal (harga) wajib diisi.");

    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      poNumber: req(fd, "poNumber", "Nomor PO"),
      invoiceNumber: str(fd, "invoiceNumber"),
      poDate: date(fd, "poDate") ?? (() => { throw new FormError("Tanggal PO wajib diisi."); })(),
      paymentMethod: method,
      price,
      ppnPercent: num(fd, "ppnPercent"),
      specialNotes: str(fd, "specialNotes"),
      // untuk cash, uang diterima diisi manual; untuk cicilan dihitung otomatis
      ...(method === "CASH" ? { amountReceived: num(fd, "amountReceived") ?? 0 } : {}),
    };

    const items = parsed.data.map((it) => ({
      productId: it.productId,
      packageId: it.packageId ?? null,
      quantity: it.quantity ?? null,
      machineModelId: it.machineModelId ?? null,
      serialNumber: blank(it.serialNumber),
      triceId: blank(it.triceId),
      siteCode: blank(it.siteCode),
      installDate: dateVal(blank(it.installDate)),
      contractStart: dateVal(blank(it.contractStart)),
      contractEnd: dateVal(blank(it.contractEnd)),
      notes: blank(it.notes),
    }));

    const saved = await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        return tx.purchaseOrder.update({ where: { id }, data: { ...data, items: { create: items } } });
      }
      // PO baru: tahap "PO masuk" (urutan pertama) otomatis selesai di tanggal PO
      const first = await tx.stage.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } });
      return tx.purchaseOrder.create({
        data: {
          ...data,
          items: { create: items },
          stages: first ? { create: { stageId: first.id, completedAt: data.poDate } } : undefined,
        },
      });
    });
    await syncPayment(saved.id);
    await audit(me.id, id ? "UPDATE" : "CREATE", "PurchaseOrder", saved.id, `PO ${saved.poNumber}`);
    return { ok: String(saved.id) };
  });
  if (result && "ok" in result && result.ok) {
    revalidatePath("/orders");
    redirect(`/orders/${result.ok}`);
  }
  return result;
}

export async function deleteOrder(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const o = await prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(me.id, "DELETE", "PurchaseOrder", id, `PO ${o.poNumber}`);
    revalidatePath("/orders");
    redirect("/orders");
  });
}

// Tandai tahap selesai (dengan tanggal) atau batalkan
export async function setStage(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const orderId = Number(fd.get("orderId"));
    const stageId = Number(fd.get("stageId"));
    const undo = fd.get("undo") === "1";
    const completedAt = undo ? null : date(fd, "completedAt");
    if (!undo && !completedAt) throw new FormError("Isi tanggal selesai tahap.");
    const note = str(fd, "note");
    const stage = await prisma.stage.findUniqueOrThrow({ where: { id: stageId } });
    await prisma.poStage.upsert({
      where: { orderId_stageId: { orderId, stageId } },
      create: { orderId, stageId, completedAt, note },
      update: { completedAt, ...(note !== null ? { note } : {}) },
    });
    await audit(me.id, "UPDATE", "PurchaseOrder", orderId, `${undo ? "Batal" : "Selesai"}: ${stage.name}`);
    revalidatePath(`/orders/${orderId}`);
    return { ok: undo ? `Tahap ${stage.name} dibatalkan.` : `Tahap ${stage.name} ditandai selesai.` };
  });
}

// Admin (Lead SWIT) mengatur jadwal cicilan. Cicilan yang sudah dibayar tidak diubah.
export async function setInstallmentPlan(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const orderId = Number(fd.get("orderId"));
    const count = int(fd, "count");
    const firstDue = date(fd, "firstDue");
    const interval = int(fd, "interval") ?? 1;
    if (!count || count < 1 || count > 60) throw new FormError("Jumlah cicilan 1–60.");
    if (!firstDue) throw new FormError("Isi tanggal jatuh tempo cicilan pertama.");
    if (interval < 1) throw new FormError("Jarak antar cicilan minimal 1 bulan.");
    const order = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: orderId }, include: { installments: true } });
    if (order.installments.some((i) => i.paidAt)) {
      throw new FormError("Sudah ada cicilan yang dibayar. Ubah cicilan satu per satu di tabel.");
    }
    const total = num(fd, "total") ?? Number(order.price);
    const base = Math.floor(total / count);
    const rows = Array.from({ length: count }, (_, i) => ({
      orderId,
      number: i + 1,
      amount: i === count - 1 ? total - base * (count - 1) : base, // sisa pembulatan di cicilan terakhir
      dueDate: addMonths(firstDue, i * interval),
    }));
    await prisma.$transaction([
      prisma.installment.deleteMany({ where: { orderId } }),
      prisma.installment.createMany({ data: rows }),
    ]);
    await syncPayment(orderId);
    await audit(me.id, "UPDATE", "PurchaseOrder", orderId, `Jadwal ${count} cicilan`);
    revalidatePath(`/orders/${orderId}`);
    return { ok: `Jadwal ${count} cicilan dibuat.` };
  });
}

export async function updateInstallment(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const id = Number(fd.get("id"));
    const ins = await prisma.installment.findUniqueOrThrow({ where: { id } });
    const mode = String(fd.get("mode"));
    if (mode === "pay") {
      const paidAt = date(fd, "paidAt");
      if (!paidAt) throw new FormError("Isi tanggal bayar.");
      await prisma.installment.update({ where: { id }, data: { paidAt } });
    } else if (mode === "unpay") {
      await prisma.installment.update({ where: { id }, data: { paidAt: null } });
    } else if (mode === "edit") {
      if (me.role !== "ADMIN") throw new FormError("Hanya Admin yang boleh mengubah jadwal cicilan.");
      const amount = num(fd, "amount");
      const dueDate = date(fd, "dueDate");
      await prisma.installment.update({
        where: { id },
        data: { ...(amount !== null ? { amount } : {}), ...(dueDate ? { dueDate } : {}), note: str(fd, "note") },
      });
    }
    await syncPayment(ins.orderId);
    await audit(me.id, "UPDATE", "Installment", id, `Cicilan ${ins.number}: ${mode}`);
    revalidatePath(`/orders/${ins.orderId}`);
    return { ok: "Cicilan diperbarui." };
  });
}

export async function uploadOrderAttachment(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const orderId = Number(fd.get("orderId"));
    const kind = (str(fd, "kind") ?? "LAINNYA") as AttachmentKind;
    const meta = await saveUpload(fd.get("file") as File);
    await prisma.attachment.create({ data: { ...meta, kind, orderId, uploadedById: me.id } });
    await audit(me.id, "CREATE", "Attachment", orderId, meta.fileName);
    revalidatePath(`/orders/${orderId}`);
    return { ok: `${meta.fileName} terunggah.` };
  });
}

export async function deleteAttachment(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const a = await prisma.attachment.delete({ where: { id } });
    await removeUpload(a.storedName);
    await audit(me.id, "DELETE", "Attachment", id, a.fileName);
    if (a.orderId) revalidatePath(`/orders/${a.orderId}`);
    revalidatePath("/sites", "layout");
    return { ok: "Lampiran dihapus." };
  });
}
