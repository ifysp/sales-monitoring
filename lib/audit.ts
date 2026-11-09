import "server-only";
import { prisma } from "@/lib/prisma";

export async function audit(
  userId: number | null,
  action: string,
  entity: string,
  entityId?: number | null,
  detail?: string,
) {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId: entityId ?? null, detail },
  });
}
