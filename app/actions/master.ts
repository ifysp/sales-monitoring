"use server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, num, int, FormError } from "@/lib/forms";
import type { ActionState } from "@/components/client";

const done = (msg: string) => {
  revalidatePath("/master");
  return { ok: msg };
};

export async function savePackage(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const id = Number(fd.get("id")) || null;
    const data = {
      productId: Number(req(fd, "productId", "Produk")),
      name: req(fd, "name", "Nama package"),
      unit: str(fd, "unit"),
      listPrice: num(fd, "listPrice"),
      active: fd.get("active") === "on",
    };
    const p = id ? await prisma.package.update({ where: { id }, data }) : await prisma.package.create({ data });
    await audit(me.id, id ? "UPDATE" : "CREATE", "Package", p.id, p.name);
    return done(`Package "${p.name}" disimpan.`);
  });
}

export async function saveMachineModel(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const id = Number(fd.get("id")) || null;
    const data = { brand: req(fd, "brand", "Merk"), model: req(fd, "model", "Model"), active: fd.get("active") === "on" };
    const m = id ? await prisma.machineModel.update({ where: { id }, data }) : await prisma.machineModel.create({ data });
    await audit(me.id, id ? "UPDATE" : "CREATE", "MachineModel", m.id, `${m.brand} ${m.model}`);
    return done(`Model ${m.model} disimpan.`);
  });
}

export async function saveStage(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const id = Number(fd.get("id")) || null;
    const sortOrder = int(fd, "sortOrder");
    if (sortOrder === null) throw new FormError("Urutan wajib diisi.");
    const isPayment = fd.get("isPayment") === "on";
    const data = { name: req(fd, "name", "Nama tahap"), sortOrder, isPayment, active: fd.get("active") === "on" };
    if (isPayment) {
      // hanya boleh ada satu tahap pembayaran
      await prisma.stage.updateMany({ where: { isPayment: true, NOT: id ? { id } : undefined }, data: { isPayment: false } });
    }
    const s = id ? await prisma.stage.update({ where: { id }, data }) : await prisma.stage.create({ data });
    await audit(me.id, id ? "UPDATE" : "CREATE", "Stage", s.id, s.name);
    return done(`Tahap "${s.name}" disimpan.`);
  });
}

export async function saveUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireAdmin();
    const id = Number(fd.get("id")) || null;
    const password = str(fd, "password");
    const role = fd.get("role") === "ADMIN" ? "ADMIN" : "USER";
    const base = { name: req(fd, "name", "Nama"), email: req(fd, "email", "Email").toLowerCase(), role } as const;
    if (!id && (!password || password.length < 8)) throw new FormError("Password minimal 8 karakter.");
    if (password && password.length < 8) throw new FormError("Password minimal 8 karakter.");
    const data = password ? { ...base, passwordHash: await bcrypt.hash(password, 10) } : base;
    const u = id
      ? await prisma.user.update({ where: { id }, data })
      : await prisma.user.create({ data: { ...base, passwordHash: await bcrypt.hash(password!, 10) } });
    await audit(me.id, id ? "UPDATE" : "CREATE", "User", u.id, u.email);
    return done(`Pengguna ${u.name} disimpan.`);
  });
}
