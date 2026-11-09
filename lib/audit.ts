import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// Ubah objek Prisma (Decimal, Date) menjadi JSON biasa untuk disimpan di audit log
function snap(v: unknown): Prisma.InputJsonValue | undefined {
  if (v === undefined || v === null) return undefined;
  return JSON.parse(JSON.stringify(v));
}

// Mencatat siapa, kapan, data apa, nilai sebelum & sesudah (FR-12.1)
export async function audit(opts: {
  userId: number | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN";
  entity: string;
  entityId?: number | null;
  summary?: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: opts.userId,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId ?? null,
      summary: opts.summary,
      before: snap(opts.before),
      after: snap(opts.after),
    },
  });
}

// Ambil daftar field yang berubah antara before & after (untuk ditampilkan)
export function diffFields(before: unknown, after: unknown): { field: string; from: unknown; to: unknown }[] {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const skip = new Set(["updatedAt", "createdAt", "passwordHash"]);
  return Object.keys(a)
    .filter((k) => !skip.has(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => ({ field: k, from: b[k], to: a[k] }));
}
