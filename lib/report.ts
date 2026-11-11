import "server-only";
import { prisma } from "@/lib/prisma";
import { listOrders } from "@/lib/queries";

export function isMonth(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 0)), y, m };
}

// Laporan bulanan untuk finance: PO masuk, invoice terbit (nilai penjualan), pembayaran diterima, instalasi & aktivasi
export async function monthlyReport(month: string) {
  const { start, end } = monthRange(month);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const [orders, invoiced, payments, vp6, tricefy] = await Promise.all([
    listOrders({ from: iso(start), to: iso(end) }),
    prisma.purchaseOrder.findMany({ where: { deletedAt: null, invoiceDate: { gte: start, lte: end } }, include: { customer: true }, orderBy: { invoiceDate: "asc" } }),
    prisma.payment.findMany({
      where: { paidAt: { gte: start, lte: end }, order: { deletedAt: null } },
      include: { order: { include: { customer: true } } },
      orderBy: { paidAt: "asc" },
    }),
    prisma.vp6Installation.findMany({ where: { deletedAt: null, installDate: { gte: start, lte: end } }, include: { customer: true }, orderBy: { installDate: "asc" } }),
    prisma.tricefySubscription.findMany({ where: { deletedAt: null, activationDate: { gte: start, lte: end } }, include: { account: { include: { customer: true } } }, orderBy: { activationDate: "asc" } }),
  ]);
  return {
    orders,
    invoiced,
    payments,
    vp6,
    tricefy,
    totalSales: invoiced.reduce((s, o) => s + Number(o.finalAmount ?? 0), 0),
    totalPaid: payments.reduce((s, p) => s + Number(p.amount), 0),
  };
}
