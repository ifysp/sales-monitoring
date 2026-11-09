import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { FormError } from "@/lib/forms";

export type CurrentUser = { id: number; name: string; email: string; role: "ADMIN" | "VIEWER" };

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Semua aksi tambah/ubah/hapus: hanya ADMIN. VIEWER hanya bisa melihat.
export async function requireEditor(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new FormError("Akun Anda hanya bisa melihat data (Viewer).");
  return user;
}
