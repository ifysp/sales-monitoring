"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, date, FormError } from "@/lib/forms";
import { saveUpload, removeUpload } from "@/lib/uploads";
import type { ActionState } from "@/components/client";
import type { ConfigKind } from "@/generated/prisma/client";

export async function saveSite(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await handle(async () => {
    const me = await requireUser();
    const id = Number(fd.get("id")) || null;
    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      name: req(fd, "name", "Nama site"),
      siteCode: str(fd, "siteCode"),
      pcInfo: str(fd, "pcInfo"),
      applications: str(fd, "applications"),
      notes: str(fd, "notes"),
    };
    const saved = id ? await prisma.site.update({ where: { id }, data }) : await prisma.site.create({ data });
    await audit(me.id, id ? "UPDATE" : "CREATE", "Site", saved.id, saved.name);
    return { ok: String(saved.id) };
  });
  if (result && "ok" in result && result.ok) redirect(`/sites/${result.ok}`);
  return result;
}

export async function deleteSite(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const files = await prisma.attachment.findMany({ where: { errorLog: { siteId: id } } });
    const s = await prisma.site.delete({ where: { id } });
    for (const f of files) await removeUpload(f.storedName);
    await audit(me.id, "DELETE", "Site", id, s.name);
    redirect(`/customers/${s.customerId}`);
  });
}

export async function saveConfig(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const id = Number(fd.get("id")) || null;
    const siteId = Number(fd.get("siteId"));
    const data = {
      siteId,
      kind: req(fd, "kind", "Jenis") as ConfigKind,
      title: req(fd, "title", "Judul"),
      content: req(fd, "content", "Isi"),
    };
    const saved = id ? await prisma.siteConfig.update({ where: { id }, data }) : await prisma.siteConfig.create({ data });
    await audit(me.id, id ? "UPDATE" : "CREATE", "SiteConfig", saved.id, saved.title);
    revalidatePath(`/sites/${siteId}`);
    return { ok: "Konfigurasi disimpan." };
  });
}

export async function deleteConfig(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const c = await prisma.siteConfig.delete({ where: { id } });
    await audit(me.id, "DELETE", "SiteConfig", id, c.title);
    revalidatePath(`/sites/${c.siteId}`);
    return { ok: "Dihapus." };
  });
}

export async function saveErrorLog(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const siteId = Number(fd.get("siteId"));
    const occurredAt = date(fd, "occurredAt");
    if (!occurredAt) throw new FormError("Tanggal kejadian wajib diisi.");
    const file = fd.get("file") as File | null;
    const meta = file && file.size > 0 ? await saveUpload(file) : null; // lampiran opsional
    const log = await prisma.errorLog.create({
      data: {
        siteId,
        occurredAt,
        symptom: req(fd, "symptom", "Gejala"),
        cause: str(fd, "cause"),
        solution: str(fd, "solution"),
        attachments: meta ? { create: { ...meta, kind: "ERROR", uploadedById: me.id } } : undefined,
      },
    });
    await audit(me.id, "CREATE", "ErrorLog", log.id, log.symptom.slice(0, 80));
    revalidatePath(`/sites/${siteId}`);
    return { ok: "Error dicatat." };
  });
}

export async function deleteErrorLog(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const files = await prisma.attachment.findMany({ where: { errorLogId: id } });
    const log = await prisma.errorLog.delete({ where: { id } });
    for (const f of files) await removeUpload(f.storedName);
    await audit(me.id, "DELETE", "ErrorLog", id);
    revalidatePath(`/sites/${log.siteId}`);
    return { ok: "Dihapus." };
  });
}
