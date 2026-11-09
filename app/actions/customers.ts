"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, date, freeKey, FormError } from "@/lib/forms";
import { saveUpload, removeUpload } from "@/lib/uploads";
import type { ActionState } from "@/components/client";
import type { CustomerType, TechNoteKind } from "@/generated/prisma/client";

const TYPES = ["RUMAH_SAKIT", "KLINIK", "DOKTER", "LAINNYA"];

export async function saveCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const type = req(fd, "type", "Tipe");
    if (!TYPES.includes(type)) throw new FormError("Tipe customer tidak valid.");
    const data = {
      name: req(fd, "name", "Nama customer"),
      type: type as CustomerType,
      geSiteId: str(fd, "geSiteId"),
      city: str(fd, "city"),
      address: str(fd, "address"),
      contactName: str(fd, "contactName"),
      phone: str(fd, "phone"),
      email: str(fd, "email"),
      notes: str(fd, "notes"),
    };
    const before = id ? await prisma.customer.findUniqueOrThrow({ where: { id } }) : null;
    const saved = id ? await prisma.customer.update({ where: { id }, data }) : await prisma.customer.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Customer", entityId: saved.id, summary: saved.name, before, after: saved });
    return { ok: String(saved.id) };
  });
  if (r && "ok" in r && r.ok) {
    revalidatePath("/customers");
    redirect(`/customers/${r.ok}`);
  }
  return r;
}

// Soft delete (NFR-07): data tidak hilang dari database
export async function deleteCustomer(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const now = new Date();
    const before = await prisma.customer.findUniqueOrThrow({ where: { id } });
    // Site ID dilepas (diberi akhiran) agar bisa dipakai lagi bila penghapusan karena salah input
    const c = await prisma.customer.update({ where: { id }, data: { deletedAt: now, geSiteId: freeKey(before.geSiteId, id) } });
    const orders = await prisma.purchaseOrder.findMany({ where: { customerId: id, deletedAt: null } });
    for (const o of orders) await prisma.purchaseOrder.update({ where: { id: o.id }, data: { deletedAt: now, poNumber: freeKey(o.poNumber, o.id)! } });
    await audit({ userId: me.id, action: "DELETE", entity: "Customer", entityId: id, summary: c.name, before });
    revalidatePath("/customers");
    redirect("/customers");
  });
}

export async function saveTechNote(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const customerId = Number(fd.get("customerId"));
    const data = { customerId, kind: req(fd, "kind", "Jenis") as TechNoteKind, title: req(fd, "title", "Judul"), content: req(fd, "content", "Isi") };
    const before = id ? await prisma.techNote.findUnique({ where: { id } }) : null;
    const saved = id ? await prisma.techNote.update({ where: { id }, data }) : await prisma.techNote.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "TechNote", entityId: saved.id, summary: saved.title, before, after: saved });
    revalidatePath(`/customers/${customerId}`);
    return { ok: "Catatan teknis disimpan." };
  });
}

export async function deleteTechNote(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const n = await prisma.techNote.delete({ where: { id } });
    await audit({ userId: me.id, action: "DELETE", entity: "TechNote", entityId: id, summary: n.title, before: n });
    revalidatePath(`/customers/${n.customerId}`);
    return { ok: "Dihapus." };
  });
}

export async function saveErrorLog(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const customerId = Number(fd.get("customerId"));
    const occurredAt = date(fd, "occurredAt");
    if (!occurredAt) throw new FormError("Tanggal kejadian wajib diisi.");
    const file = fd.get("file") as File | null;
    const meta = file && file.size > 0 ? await saveUpload(file) : null;
    const deviceId = Number(fd.get("deviceId")) || null;
    const log = await prisma.errorLog.create({
      data: {
        customerId, deviceId, occurredAt,
        symptom: req(fd, "symptom", "Gejala"),
        cause: str(fd, "cause"),
        solution: str(fd, "solution"),
        attachments: meta ? { create: { ...meta, kind: "ERROR", uploadedById: me.id } } : undefined,
      },
    });
    await audit({ userId: me.id, action: "CREATE", entity: "ErrorLog", entityId: log.id, summary: log.symptom.slice(0, 80), after: log });
    revalidatePath(`/customers/${customerId}`);
    return { ok: "Error dicatat." };
  });
}

export async function deleteErrorLog(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const files = await prisma.attachment.findMany({ where: { errorLogId: id } });
    const log = await prisma.errorLog.delete({ where: { id } });
    for (const f of files) await removeUpload(f.storedName);
    await audit({ userId: me.id, action: "DELETE", entity: "ErrorLog", entityId: id, summary: log.symptom.slice(0, 80), before: log });
    revalidatePath(`/customers/${log.customerId}`);
    return { ok: "Dihapus." };
  });
}
