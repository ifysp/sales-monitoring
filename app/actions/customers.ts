"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, FormError } from "@/lib/forms";
import type { ActionState } from "@/components/client";
import type { CustomerType } from "@/generated/prisma/client";

const TYPES = ["RUMAH_SAKIT", "KLINIK", "DOKTER", "LAINNYA"];

export async function saveCustomer(_: ActionState, fd: FormData): Promise<ActionState> {
  const result = await handle(async () => {
    const me = await requireUser();
    const id = Number(fd.get("id")) || null;
    const type = req(fd, "type", "Tipe");
    if (!TYPES.includes(type)) throw new FormError("Tipe customer tidak valid.");
    const data = {
      name: req(fd, "name", "Nama customer"),
      type: type as CustomerType,
      city: str(fd, "city"),
      address: str(fd, "address"),
      picName: str(fd, "picName"),
      phone: str(fd, "phone"),
      email: str(fd, "email"),
      notes: str(fd, "notes"),
    };
    const saved = id
      ? await prisma.customer.update({ where: { id }, data })
      : await prisma.customer.create({ data });
    await audit(me.id, id ? "UPDATE" : "CREATE", "Customer", saved.id, saved.name);
    return { ok: String(saved.id) };
  });
  if (result && "ok" in result && result.ok) {
    revalidatePath("/customers");
    redirect(`/customers/${result.ok}`);
  }
  return result;
}

export async function deleteCustomer(id: number): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const c = await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    await prisma.purchaseOrder.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt: new Date() } });
    await audit(me.id, "DELETE", "Customer", id, c.name);
    revalidatePath("/customers");
    redirect("/customers");
  });
}
