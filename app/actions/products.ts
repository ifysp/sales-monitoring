"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, date, ids, freeKey, FormError } from "@/lib/forms";
import { defaultEndDate } from "@/lib/tricefy";
import type { ActionState } from "@/components/client";

// ═════════ ViewPoint 6 ═════════
export async function saveVp6(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const installDate = date(fd, "installDate");
    if (!installDate) throw new FormError("Tanggal install wajib diisi.");
    const deviceIds = ids(fd, "deviceIds");
    const pcIds = ids(fd, "pcIds");
    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      orderId: Number(fd.get("orderId")) || null,
      installDate,
      currentVersion: req(fd, "currentVersion", "Versi ViewPoint 6"),
      apps: str(fd, "apps"),
      specialConfig: str(fd, "specialConfig"),
      notes: str(fd, "notes"),
    };
    const before = id ? await prisma.vp6Installation.findUniqueOrThrow({ where: { id }, include: { devices: true, pcs: true } }) : null;
    if (before && before.currentVersion !== data.currentVersion) {
      throw new FormError("Untuk mengganti versi, gunakan tombol \"Catat upgrade\" agar riwayat versi tersimpan.");
    }
    const links = {
      devices: { create: deviceIds.map((deviceId) => ({ deviceId })) },
      pcs: { create: pcIds.map((pcId) => ({ pcId })) },
    };
    const saved = await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.vp6InstallationDevice.deleteMany({ where: { installationId: id } });
        await tx.vp6InstallationPc.deleteMany({ where: { installationId: id } });
        return tx.vp6Installation.update({ where: { id }, data: { ...data, ...links }, include: { devices: true, pcs: true } });
      }
      return tx.vp6Installation.create({
        data: { ...data, ...links, versionHistory: { create: { toVersion: data.currentVersion, changedDate: installDate, notes: "Instalasi awal" } } },
        include: { devices: true, pcs: true },
      });
    });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "Vp6Installation", entityId: saved.id, summary: `VP6 ${saved.currentVersion}`, before, after: saved });
    return { ok: String(saved.id) };
  });
  if (r && "ok" in r && r.ok) {
    revalidatePath("/viewpoint");
    redirect(`/viewpoint/${r.ok}`);
  }
  return r;
}

// Riwayat versi (FR-05.5): upgrade dicatat tanpa menimpa data lama
export async function upgradeVp6(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id"));
    const toVersion = req(fd, "toVersion", "Versi baru");
    const changedDate = date(fd, "changedDate");
    if (!changedDate) throw new FormError("Tanggal upgrade wajib diisi.");
    const inst = await prisma.vp6Installation.findUniqueOrThrow({ where: { id } });
    if (inst.currentVersion === toVersion) throw new FormError("Versi baru sama dengan versi sekarang.");
    await prisma.$transaction([
      prisma.vp6VersionHistory.create({ data: { installationId: id, fromVersion: inst.currentVersion, toVersion, changedDate, notes: str(fd, "notes") } }),
      prisma.vp6Installation.update({ where: { id }, data: { currentVersion: toVersion } }),
    ]);
    await audit({ userId: me.id, action: "UPDATE", entity: "Vp6Installation", entityId: id, summary: `Upgrade ${inst.currentVersion} → ${toVersion}`, before: { currentVersion: inst.currentVersion }, after: { currentVersion: toVersion } });
    revalidatePath(`/viewpoint/${id}`);
    return { ok: `Upgrade ke ${toVersion} dicatat.` };
  });
}

export async function deleteVp6(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const v = await prisma.vp6Installation.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: me.id, action: "DELETE", entity: "Vp6Installation", entityId: id, summary: `VP6 ${v.currentVersion}` });
    redirect(`/customers/${v.customerId}?tab=viewpoint`);
  });
}

// ═════════ Tricefy ═════════
export async function saveTricefyAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const data = {
      customerId: Number(req(fd, "customerId", "Customer")),
      tricefyId: req(fd, "tricefyId", "ID Tricefy"),
      accountEmail: str(fd, "accountEmail"),
      notes: str(fd, "notes"),
    };
    const before = id ? await prisma.tricefyAccount.findUniqueOrThrow({ where: { id } }) : null;
    const saved = id ? await prisma.tricefyAccount.update({ where: { id }, data }) : await prisma.tricefyAccount.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "TricefyAccount", entityId: saved.id, summary: `Akun ${saved.tricefyId}`, before, after: saved });
    return { ok: `${saved.id}|${id ? "" : "new"}` };
  });
  if (r && "ok" in r && r.ok) {
    const [accId, isNew] = r.ok.split("|");
    // akun baru → langsung ke form langganan pertama
    redirect(isNew ? `/tricefy/subscriptions/new?accountId=${accId}` : `/tricefy/accounts/${accId}`);
  }
  return r;
}

export async function deleteTricefyAccount(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const before = await prisma.tricefyAccount.findUniqueOrThrow({ where: { id } });
    const a = await prisma.tricefyAccount.update({ where: { id }, data: { deletedAt: new Date(), tricefyId: freeKey(before.tricefyId, id)! } });
    await audit({ userId: me.id, action: "DELETE", entity: "TricefyAccount", entityId: id, summary: `Akun ${before.tricefyId}`, before });
    redirect(`/customers/${a.customerId}?tab=tricefy`);
  });
}

export async function saveSubscription(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const activationDate = date(fd, "activationDate");
    if (!activationDate) throw new FormError("Tanggal aktivasi wajib diisi.");
    const deviceIds = ids(fd, "deviceIds");
    const data = {
      accountId: Number(req(fd, "accountId", "Akun Tricefy")),
      orderId: Number(fd.get("orderId")) || null,
      installDate: date(fd, "installDate"),
      contractDate: date(fd, "contractDate"),
      activationDate,
      endDate: date(fd, "endDate") ?? defaultEndDate(activationDate), // default aktivasi + 3 tahun (FR-06.3)
      notes: str(fd, "notes"),
    };
    const before = id ? await prisma.tricefySubscription.findUniqueOrThrow({ where: { id }, include: { devices: true } }) : null;
    const links = { devices: { create: deviceIds.map((deviceId) => ({ deviceId })) } };
    const saved = await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.tricefySubscriptionDevice.deleteMany({ where: { subscriptionId: id } });
        return tx.tricefySubscription.update({ where: { id }, data: { ...data, ...links }, include: { devices: true } });
      }
      return tx.tricefySubscription.create({ data: { ...data, ...links }, include: { devices: true } });
    });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "TricefySubscription", entityId: saved.id, summary: `Langganan s.d. ${saved.endDate.toISOString().slice(0, 10)}`, before, after: saved });
    return { ok: String(saved.accountId) };
  });
  if (r && "ok" in r && r.ok) {
    revalidatePath("/tricefy");
    redirect(`/tricefy/accounts/${r.ok}`);
  }
  return r;
}

export async function deleteSubscription(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const s = await prisma.tricefySubscription.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: me.id, action: "DELETE", entity: "TricefySubscription", entityId: id, summary: "Langganan dihapus" });
    revalidatePath(`/tricefy/accounts/${s.accountId}`);
    return { ok: "Dihapus." };
  });
}
