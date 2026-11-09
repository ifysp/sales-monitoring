import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, todayDate } from "@/lib/format";
import { tricefyStatus } from "@/lib/tricefy";

// Pengingat (FR-10.1): langganan Tricefy yang habis ≤ 90/60/30 hari atau sudah kedaluwarsa,
// serta invoice yang terlambat / jatuh tempo ≤ 7 hari.
export async function getAlerts() {
  const today = todayDate();
  const [subs, invoices] = await Promise.all([
    prisma.tricefySubscription.findMany({
      where: { deletedAt: null, endDate: { lte: addDays(today, 90) }, account: { deletedAt: null, customer: { deletedAt: null } } },
      include: { account: { include: { customer: { select: { id: true, name: true } } } }, package: true },
      orderBy: { endDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { paidAt: null, dueDate: { lte: addDays(today, 7) }, order: { deletedAt: null } },
      include: { order: { include: { customer: { select: { id: true, name: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  // Lewati langganan lama yang sudah diperpanjang (ada langganan lebih baru di akun yang sama)
  const latestByAccount = await prisma.tricefySubscription.groupBy({
    by: ["accountId"],
    where: { deletedAt: null, accountId: { in: subs.map((s) => s.accountId) } },
    _max: { activationDate: true },
  });
  const latest = new Map(latestByAccount.map((r) => [r.accountId, r._max.activationDate?.getTime()]));
  const tricefy = subs
    .filter((s) => latest.get(s.accountId) === s.activationDate.getTime())
    .map((s) => ({ ...s, ...tricefyStatus(s.endDate, today) }));
  return { today, tricefy, invoices, count: tricefy.length + invoices.length };
}
