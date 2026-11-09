"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, freeKey, FormError } from "@/lib/forms";
import type { ActionState } from "@/components/client";
import type { PcRole, PcSource } from "@/generated/prisma/client";

export async function saveDevice(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      serialNumber: req(fd, "serialNumber", "Serial number").toUpperCase(),
      machineModelId: Number(fd.get("machineModelId")) || null,
      notes: str(fd, "notes"),
    };
    const before = id ? await prisma.device.findUniqueOrThrow({ where: { id } }) : null;
    const saved = id ? await prisma.device.update({ where: { id }, data }) : await prisma.device.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Device", entityId: saved.id, summary: `SN ${saved.serialNumber}`, before, after: saved });
    return { ok: `${saved.id}|${fd.get("returnTo") ?? ""}` };
  });
  if (r && "ok" in r && r.ok) {
    const [id, returnTo] = r.ok.split("|");
    redirect(returnTo || `/devices/${id}`);
  }
  return r;
}

export async function deleteDevice(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const before = await prisma.device.findUniqueOrThrow({ where: { id } });
    const d = await prisma.device.update({ where: { id }, data: { deletedAt: new Date(), serialNumber: freeKey(before.serialNumber, id)! } });
    await audit({ userId: me.id, action: "DELETE", entity: "Device", entityId: id, summary: `SN ${before.serialNumber}`, before });
    redirect(`/customers/${d.customerId}?tab=devices`);
  });
}

const SOURCES = ["COMPANY_RECOMMENDED", "CUSTOMER_OWNED"];
const ROLES = ["SERVER_CLIENT", "SERVER", "CLIENT"];

export async function savePc(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const source = req(fd, "source", "Sumber PC");
    const role = req(fd, "role", "Peran PC");
    if (!SOURCES.includes(source) || !ROLES.includes(role)) throw new FormError("Sumber/peran PC tidak valid.");
    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      hostname: str(fd, "hostname"),
      source: source as PcSource,
      role: role as PcRole,
      cpu: str(fd, "cpu"), ram: str(fd, "ram"), storage: str(fd, "storage"), vga: str(fd, "vga"), os: str(fd, "os"),
      notes: str(fd, "notes"),
    };
    const before = id ? await prisma.pc.findUniqueOrThrow({ where: { id } }) : null;
    const saved = id ? await prisma.pc.update({ where: { id }, data }) : await prisma.pc.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Pc", entityId: saved.id, summary: saved.hostname ?? `PC #${saved.id}`, before, after: saved });
    return { ok: `${saved.customerId}|${fd.get("returnTo") ?? ""}` };
  });
  if (r && "ok" in r && r.ok) {
    const [customerId, returnTo] = r.ok.split("|");
    redirect(returnTo || `/customers/${customerId}?tab=devices`);
  }
  return r;
}

export async function deletePc(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const p = await prisma.pc.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: me.id, action: "DELETE", entity: "Pc", entityId: id, summary: p.hostname ?? `PC #${id}` });
    revalidatePath("/pcs");
    redirect(`/customers/${p.customerId}?tab=devices`);
  });
}
