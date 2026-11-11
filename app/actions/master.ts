"use server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, str, FormError } from "@/lib/forms";
import type { ActionState } from "@/components/client";

const done = (msg: string) => {
  revalidatePath("/settings", "layout");
  return { ok: msg };
};

export async function saveMachineModel(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const data = { brand: req(fd, "brand", "Merk"), model: req(fd, "model", "Model"), active: fd.get("active") === "on" };
    const m = id ? await prisma.machineModel.update({ where: { id }, data }) : await prisma.machineModel.create({ data });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "MachineModel", entityId: m.id, summary: `${m.brand} ${m.model}` });
    return done(`Model ${m.model} disimpan.`);
  });
}

export async function saveUser(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireEditor();
    const id = Number(fd.get("id")) || null;
    const password = str(fd, "password");
    const role = fd.get("role") === "VIEWER" ? "VIEWER" : "ADMIN";
    if (id === me.id && role !== "ADMIN") throw new FormError("Anda tidak bisa menurunkan role akun sendiri.");
    if (password && password.length < 8) throw new FormError("Password minimal 8 karakter.");
    if (!id && !password) throw new FormError("Password wajib untuk pengguna baru.");
    const base = { name: req(fd, "name", "Nama"), email: req(fd, "email", "Email").toLowerCase(), role } as const;
    const u = id
      ? await prisma.user.update({ where: { id }, data: password ? { ...base, passwordHash: await bcrypt.hash(password, 10) } : base })
      : await prisma.user.create({ data: { ...base, passwordHash: await bcrypt.hash(password!, 10) } });
    await audit({ userId: me.id, action: id ? "UPDATE" : "CREATE", entity: "User", entityId: u.id, summary: u.email });
    return done(`Pengguna ${u.name} disimpan.`);
  });
}
