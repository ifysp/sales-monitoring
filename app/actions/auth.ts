"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handle, req, FormError } from "@/lib/forms";
import type { ActionState } from "@/components/client";

export async function login(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return { error: "Email atau password salah." };
  await createSession(user.id);
  await audit({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, summary: "Login" });
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  return handle(async () => {
    const me = await requireUser();
    const current = req(fd, "current", "Password lama");
    const next = req(fd, "next", "Password baru");
    if (next.length < 8) throw new FormError("Password baru minimal 8 karakter.");
    if (next !== fd.get("confirm")) throw new FormError("Konfirmasi password tidak sama.");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await bcrypt.compare(current, user.passwordHash))) throw new FormError("Password lama salah.");
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
    await audit({ userId: me.id, action: "UPDATE", entity: "User", entityId: me.id, summary: "Ganti password" });
    return { ok: "Password berhasil diganti." };
  });
}
