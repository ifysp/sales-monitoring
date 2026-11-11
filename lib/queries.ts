import "server-only";
import { prisma } from "@/lib/prisma";
import { computeProgress } from "@/lib/progress";
import { tricefyStatus, type TricefyStatus } from "@/lib/tricefy";
import { dateVal } from "@/lib/forms";
import type { Prisma } from "@/generated/prisma/client";

export type Filters = Record<string, string | undefined>;

// Ubah searchParams Next.js menjadi objek string sederhana
export function toFilters(sp: Record<string, string | string[] | undefined>): Filters {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v));
}

function dateRange(f: Filters): Prisma.DateTimeFilter | undefined {
  const from = dateVal(f.from ?? null);
  const to = dateVal(f.to ?? null);
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}
const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

// ───────────── Purchase Order ─────────────
export async function listOrders(f: Filters = {}, take?: number) {
  const where: Prisma.PurchaseOrderWhereInput = {
    deletedAt: null,
    ...(f.q ? { OR: [{ poNumber: ci(f.q) }, { invoiceNumber: ci(f.q) }, { customer: { name: ci(f.q) } }] } : {}),
    ...(f.customer ? { customerId: Number(f.customer) } : {}),
    ...(f.method === "CASH" || f.method === "CICILAN" ? { paymentMethod: f.method } : {}),
    ...(dateRange(f) ? { poDate: dateRange(f) } : {}),
  };
  const orders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      payments: { orderBy: { sequence: "asc" } },
      attachments: { select: { kind: true, paymentId: true } },
      vp6Installations: { where: { deletedAt: null }, select: { id: true } },
      tricefySubscriptions: { where: { deletedAt: null }, select: { id: true } },
    },
    orderBy: { poDate: "desc" },
    take,
  });
  const rows = orders.map((o) => {
    const amount = o.finalAmount === null ? null : Number(o.finalAmount);
    const paid = o.payments.filter((p) => p.paidAt).reduce((s, p) => s + Number(p.amount), 0);
    return { ...o, amount, paid, remaining: amount === null ? null : amount - paid, progress: computeProgress(o) };
  });
  if (f.status === "open") return rows.filter((r) => !r.progress.complete);
  if (f.status === "done") return rows.filter((r) => r.progress.complete);
  return rows;
}
export type OrderRow = Awaited<ReturnType<typeof listOrders>>[number];

// ───────────── Penagihan (termin) ─────────────
export async function listPayments(f: Filters = {}, today: Date) {
  const where: Prisma.PaymentWhereInput = {
    order: { deletedAt: null, ...(f.customer ? { customerId: Number(f.customer) } : {}) },
    ...(f.q ? { OR: [{ order: { invoiceNumber: ci(f.q) } }, { order: { poNumber: ci(f.q) } }, { order: { customer: { name: ci(f.q) } } }] } : {}),
    ...(f.status === "paid" ? { paidAt: { not: null } } : {}),
    ...(f.status === "unpaid" ? { paidAt: null } : {}),
    ...(f.status === "overdue" ? { paidAt: null, dueDate: { lt: today } } : {}),
    ...(dateRange(f) ? { dueDate: dateRange(f) } : {}),
  };
  return prisma.payment.findMany({
    where,
    include: { order: { include: { customer: { select: { id: true, name: true } } } }, _count: { select: { attachments: true } } },
    orderBy: [{ dueDate: "asc" }],
  });
}

// ───────────── Customer ─────────────
export async function listCustomers(f: Filters = {}) {
  return prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(f.q ? { OR: [{ name: ci(f.q) }, { city: ci(f.q) }, { geSiteId: ci(f.q) }, { contactName: ci(f.q) }] } : {}),
      ...(f.type ? { type: f.type as Prisma.EnumCustomerTypeFilter["equals"] } : {}),
    },
    include: {
      _count: {
        select: {
          devices: { where: { deletedAt: null } },
          vp6Installations: { where: { deletedAt: null } },
          tricefyAccounts: { where: { deletedAt: null } },
          orders: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

// ───────────── Alat USG ─────────────
export async function listDevices(f: Filters = {}) {
  return prisma.device.findMany({
    where: {
      deletedAt: null,
      customer: { deletedAt: null },
      ...(f.q ? { OR: [{ serialNumber: ci(f.q) }, { customer: { name: ci(f.q) } }, { machineModel: { model: ci(f.q) } }] } : {}),
      ...(f.customer ? { customerId: Number(f.customer) } : {}),
      ...(f.model ? { machineModelId: Number(f.model) } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, geSiteId: true } },
      machineModel: true,
      vp6Installations: { where: { installation: { deletedAt: null } }, select: { installationId: true } },
      tricefySubscriptions: { where: { subscription: { deletedAt: null } }, include: { subscription: { select: { endDate: true } } } },
    },
    orderBy: [{ customer: { name: "asc" } }, { serialNumber: "asc" }],
  });
}

// ───────────── PC ─────────────
export async function listPcs(f: Filters = {}) {
  return prisma.pc.findMany({
    where: {
      deletedAt: null,
      customer: { deletedAt: null },
      ...(f.q ? { OR: [{ hostname: ci(f.q) }, { customer: { name: ci(f.q) } }, { cpu: ci(f.q) }] } : {}),
      ...(f.customer ? { customerId: Number(f.customer) } : {}),
      ...(f.source === "COMPANY_RECOMMENDED" || f.source === "CUSTOMER_OWNED" ? { source: f.source } : {}),
      ...(f.role === "SERVER_CLIENT" || f.role === "SERVER" || f.role === "CLIENT" ? { role: f.role } : {}),
    },
    include: { customer: { select: { id: true, name: true } }, _count: { select: { installations: true } } },
    orderBy: [{ customer: { name: "asc" } }, { hostname: "asc" }],
  });
}

// ───────────── ViewPoint 6 ─────────────
export async function listVp6(f: Filters = {}) {
  return prisma.vp6Installation.findMany({
    where: {
      deletedAt: null,
      customer: { deletedAt: null },
      ...(f.q ? { OR: [{ customer: { name: ci(f.q) } }, { customer: { geSiteId: ci(f.q) } }, { apps: ci(f.q) }, { devices: { some: { device: { serialNumber: ci(f.q) } } } }] } : {}),
      ...(f.customer ? { customerId: Number(f.customer) } : {}),
      ...(f.version ? { currentVersion: f.version } : {}),
      ...(dateRange(f) ? { installDate: dateRange(f) } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, geSiteId: true } },
      package: true,
      order: { select: { id: true, poNumber: true } },
      devices: { include: { device: { select: { serialNumber: true } } } },
      pcs: { include: { pc: { select: { role: true, hostname: true } } } },
    },
    orderBy: { installDate: "desc" },
  });
}

// Topologi (nilai turunan): 1 PC Server+Client → Standalone; ada Server + Client → Multi
export function topology(pcs: { pc: { role: string } }[]): string {
  if (pcs.length === 0) return "-";
  if (pcs.length === 1 && pcs[0].pc.role === "SERVER_CLIENT") return "Standalone";
  return pcs.some((p) => p.pc.role === "SERVER") ? "Multi (server + client)" : "Lainnya";
}

// ───────────── Tricefy ─────────────
export async function listTricefy(f: Filters = {}, today: Date) {
  const subs = await prisma.tricefySubscription.findMany({
    where: {
      deletedAt: null,
      account: { deletedAt: null, customer: { deletedAt: null }, ...(f.customer ? { customerId: Number(f.customer) } : {}) },
      ...(f.q ? { OR: [{ account: { tricefyId: ci(f.q) } }, { account: { customer: { name: ci(f.q) } } }, { devices: { some: { device: { serialNumber: ci(f.q) } } } }] } : {}),
      ...(dateRange(f) ? { activationDate: dateRange(f) } : {}),
    },
    include: {
      account: { include: { customer: { select: { id: true, name: true } } } },
      package: true,
      order: { select: { id: true, poNumber: true } },
      devices: { include: { device: { select: { serialNumber: true } } } },
    },
    orderBy: { endDate: "asc" },
  });
  const rows = subs.map((s) => ({ ...s, ...tricefyStatus(s.endDate, today) }));
  // Default: tampilkan langganan terbaru per akun saja (yang lama = riwayat perpanjangan)
  const latest = f.history === "1" ? rows : rows.filter((r) => !rows.some((o) => o.accountId === r.accountId && o.activationDate > r.activationDate));
  return f.status ? latest.filter((r) => r.status === (f.status as TricefyStatus)) : latest;
}

export async function customerOptions() {
  return prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, geSiteId: true } });
}

