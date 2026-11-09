import "server-only";
import { prisma } from "@/lib/prisma";
import { computeProgress } from "@/lib/progress";
import type { Prisma } from "@/generated/prisma/client";

export async function activeStages() {
  return prisma.stage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
}

const orderInclude = {
  customer: { select: { id: true, name: true } },
  items: { include: { product: true, package: true } },
  stages: true,
  installments: { orderBy: { number: "asc" } },
} satisfies Prisma.PurchaseOrderInclude;

// Daftar PO beserta progres yang sudah dihitung
export async function ordersWithProgress(where: Prisma.PurchaseOrderWhereInput = {}, take?: number) {
  const [stages, orders] = await Promise.all([
    activeStages(),
    prisma.purchaseOrder.findMany({
      where: { deletedAt: null, ...where },
      include: orderInclude,
      orderBy: { poDate: "desc" },
      take,
    }),
  ]);
  return orders.map((o) => ({
    ...o,
    progress: computeProgress(stages, o.stages, o.paymentMethod, o.installments),
  }));
}

export type OrderWithProgress = Awaited<ReturnType<typeof ordersWithProgress>>[number];

export function productSummary(o: { items: { product: { name: string }; package: { name: string } | null; quantity: number | null }[] }) {
  return o.items
    .map((i) => `${i.product.name}${i.package ? ` · ${i.package.name}` : ""}${i.quantity ? ` (${i.quantity})` : ""}`)
    .join(", ");
}
