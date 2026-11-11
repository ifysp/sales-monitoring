"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, FormError } from "@/lib/forms";
import { removeUpload } from "@/lib/uploads";
import type { ActionState } from "@/components/client";

export type TrashEntity = "customer" | "order" | "device" | "pc" | "vp6" | "account" | "subscription";

// Kembalikan kunci unik yang diberi akhiran saat dihapus ("GE-1001~hapus#5" → "GE-1001")
const unfree = (v: string | null) => (v ? v.replace(/~hapus#\d+$/, "") : v);
const done = (msg: string) => {
  revalidatePath("/", "layout");
  return { ok: msg };
};

async function ensureFree(check: Promise<unknown>, label: string, value: string | null) {
  if (value && (await check)) throw new FormError(`${label} "${value}" sudah dipakai data lain. Ubah data itu dulu sebelum memulihkan.`);
}

export async function restoreItem(entity: TrashEntity, id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    switch (entity) {
      case "customer": {
        const c = await prisma.customer.findUniqueOrThrow({ where: { id } });
        const geSiteId = unfree(c.geSiteId);
        await ensureFree(prisma.customer.findFirst({ where: { geSiteId, NOT: { id } } }), "Site ID", geSiteId);
        await prisma.customer.update({ where: { id }, data: { deletedAt: null, geSiteId } });
        // PO yang ikut terhapus bersama customer dipulihkan juga
        const orders = await prisma.purchaseOrder.findMany({ where: { customerId: id, deletedAt: c.deletedAt } });
        for (const o of orders) {
          const poNumber = unfree(o.poNumber)!;
          const invoiceNumber = unfree(o.invoiceNumber);
          if (await prisma.purchaseOrder.findFirst({ where: { OR: [{ poNumber }, ...(invoiceNumber ? [{ invoiceNumber }] : [])], NOT: { id: o.id } } })) continue;
          await prisma.purchaseOrder.update({ where: { id: o.id }, data: { deletedAt: null, poNumber, invoiceNumber } });
        }
        await audit({ userId: me.id, action: "UPDATE", entity: "Customer", entityId: id, summary: `Dipulihkan: ${c.name}` });
        return done(`${c.name} dipulihkan.`);
      }
      case "order": {
        const o = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id }, include: { customer: true } });
        if (o.customer.deletedAt) throw new FormError("Customer PO ini juga terhapus. Pulihkan customer-nya dulu.");
        const poNumber = unfree(o.poNumber)!;
        const invoiceNumber = unfree(o.invoiceNumber);
        await ensureFree(prisma.purchaseOrder.findFirst({ where: { poNumber, NOT: { id } } }), "No. PO", poNumber);
        await ensureFree(prisma.purchaseOrder.findFirst({ where: { invoiceNumber, NOT: { id } } }), "No. invoice", invoiceNumber);
        await prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: null, poNumber, invoiceNumber } });
        await audit({ userId: me.id, action: "UPDATE", entity: "PurchaseOrder", entityId: id, summary: `Dipulihkan: PO ${poNumber}` });
        return done(`PO ${poNumber} dipulihkan.`);
      }
      case "device": {
        const d = await prisma.device.findUniqueOrThrow({ where: { id }, include: { customer: true } });
        if (d.customer.deletedAt) throw new FormError("Customer alat ini juga terhapus. Pulihkan customer-nya dulu.");
        const serialNumber = unfree(d.serialNumber)!;
        await ensureFree(prisma.device.findFirst({ where: { serialNumber, NOT: { id } } }), "SN", serialNumber);
        await prisma.device.update({ where: { id }, data: { deletedAt: null, serialNumber } });
        await audit({ userId: me.id, action: "UPDATE", entity: "Device", entityId: id, summary: `Dipulihkan: SN ${serialNumber}` });
        return done(`Alat ${serialNumber} dipulihkan.`);
      }
      case "pc": {
        const p = await prisma.pc.findUniqueOrThrow({ where: { id }, include: { customer: true } });
        if (p.customer.deletedAt) throw new FormError("Customer PC ini juga terhapus. Pulihkan customer-nya dulu.");
        await prisma.pc.update({ where: { id }, data: { deletedAt: null } });
        await audit({ userId: me.id, action: "UPDATE", entity: "Pc", entityId: id, summary: "Dipulihkan" });
        return done("PC dipulihkan.");
      }
      case "vp6": {
        const v = await prisma.vp6Installation.findUniqueOrThrow({ where: { id }, include: { customer: true } });
        if (v.customer.deletedAt) throw new FormError("Customer instalasi ini juga terhapus. Pulihkan customer-nya dulu.");
        await prisma.vp6Installation.update({ where: { id }, data: { deletedAt: null } });
        await audit({ userId: me.id, action: "UPDATE", entity: "Vp6Installation", entityId: id, summary: "Dipulihkan" });
        return done("Instalasi ViewPoint 6 dipulihkan.");
      }
      case "account": {
        const a = await prisma.tricefyAccount.findUniqueOrThrow({ where: { id }, include: { customer: true } });
        if (a.customer.deletedAt) throw new FormError("Customer akun ini juga terhapus. Pulihkan customer-nya dulu.");
        const tricefyId = unfree(a.tricefyId)!;
        await ensureFree(prisma.tricefyAccount.findFirst({ where: { tricefyId, NOT: { id } } }), "ID Tricefy", tricefyId);
        await prisma.tricefyAccount.update({ where: { id }, data: { deletedAt: null, tricefyId } });
        await audit({ userId: me.id, action: "UPDATE", entity: "TricefyAccount", entityId: id, summary: `Dipulihkan: ${tricefyId}` });
        return done(`Akun Tricefy ${tricefyId} dipulihkan.`);
      }
      case "subscription": {
        const s = await prisma.tricefySubscription.findUniqueOrThrow({ where: { id }, include: { account: true } });
        if (s.account.deletedAt) throw new FormError("Akun Tricefy langganan ini juga terhapus. Pulihkan akunnya dulu.");
        await prisma.tricefySubscription.update({ where: { id }, data: { deletedAt: null } });
        await audit({ userId: me.id, action: "UPDATE", entity: "TricefySubscription", entityId: id, summary: "Dipulihkan" });
        return done("Langganan Tricefy dipulihkan.");
      }
    }
  });
}

// Hapus permanen dari database (tidak bisa dibatalkan). File lampiran ikut dihapus dari folder uploads/.
export async function purgeItem(entity: TrashEntity, id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    let files: string[] = [];
    let summary = "";
    switch (entity) {
      case "customer": {
        const c = await prisma.customer.findUniqueOrThrow({ where: { id } });
        if (!c.deletedAt) throw new FormError("Hanya data yang sudah dihapus yang bisa dihapus permanen.");
        files = (await prisma.attachment.findMany({ where: { OR: [{ order: { customerId: id } }, { errorLog: { customerId: id } }] } })).map((a) => a.storedName);
        await prisma.$transaction([
          prisma.tricefySubscription.deleteMany({ where: { account: { customerId: id } } }),
          prisma.tricefyAccount.deleteMany({ where: { customerId: id } }),
          prisma.vp6Installation.deleteMany({ where: { customerId: id } }),
          prisma.purchaseOrder.deleteMany({ where: { customerId: id } }),
          prisma.device.deleteMany({ where: { customerId: id } }),
          prisma.pc.deleteMany({ where: { customerId: id } }),
          prisma.customer.delete({ where: { id } }),
        ]);
        summary = `Customer ${c.name} beserta seluruh datanya`;
        break;
      }
      case "order": {
        const o = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
        if (!o.deletedAt) throw new FormError("Hanya data yang sudah dihapus yang bisa dihapus permanen.");
        files = (await prisma.attachment.findMany({ where: { orderId: id } })).map((a) => a.storedName);
        await prisma.purchaseOrder.delete({ where: { id } }); // termin & lampiran ikut terhapus (cascade)
        summary = `PO ${unfree(o.poNumber)}`;
        break;
      }
      case "device": {
        const d = await prisma.device.findUniqueOrThrow({ where: { id } });
        if (!d.deletedAt) throw new FormError("Hanya data yang sudah dihapus yang bisa dihapus permanen.");
        await prisma.device.delete({ where: { id } });
        summary = `Alat ${unfree(d.serialNumber)}`;
        break;
      }
      case "pc": {
        const p = await prisma.pc.findUniqueOrThrow({ where: { id } });
        if (!p.deletedAt) throw new FormError("Hanya data yang sudah dihapus yang bisa dihapus permanen.");
        await prisma.pc.delete({ where: { id } });
        summary = `PC ${p.hostname ?? id}`;
        break;
      }
      case "vp6": {
        const v = await prisma.vp6Installation.findUniqueOrThrow({ where: { id } });
        if (!v.deletedAt) throw new FormError("Hanya data yang sudah dihapus yang bisa dihapus permanen.");
        await prisma.vp6Installation.delete({ where: { id } });
        summary = "Instalasi ViewPoint 6";
        break;
      }
      case "account": {
        const a = await prisma.tricefyAccount.findUniqueOrThrow({ where: { id } });
        if (!a.deletedAt) throw new FormError("Hanya data yang sudah dihapus yang bisa dihapus permanen.");
        await prisma.$transaction([prisma.tricefySubscription.deleteMany({ where: { accountId: id } }), prisma.tricefyAccount.delete({ where: { id } })]);
        summary = `Akun Tricefy ${unfree(a.tricefyId)}`;
        break;
      }
      case "subscription": {
        const s = await prisma.tricefySubscription.findUniqueOrThrow({ where: { id } });
        if (!s.deletedAt) throw new FormError("Hanya data yang sudah dihapus yang bisa dihapus permanen.");
        await prisma.tricefySubscription.delete({ where: { id } });
        summary = "Langganan Tricefy";
        break;
      }
    }
    for (const f of files) await removeUpload(f);
    await audit({ userId: me.id, action: "DELETE", entity: "Trash", entityId: id, summary: `Hapus permanen: ${summary}` });
    return done(`${summary} dihapus permanen.`);
  });
}
