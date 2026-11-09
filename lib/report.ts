import "server-only";
import { prisma } from "@/lib/prisma";
import { ordersWithProgress, productSummary } from "@/lib/queries";

// "2026-11" → rentang tanggal bulan tersebut
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end, y, m };
}

export function isMonth(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

// Data laporan bulanan: PO masuk di bulan itu + pembayaran yang diterima di bulan itu
export async function monthlyReport(month: string) {
  const { start, end } = monthRange(month);
  const [orders, installments, cashPaid] = await Promise.all([
    ordersWithProgress({ poDate: { gte: start, lt: end } }),
    prisma.installment.findMany({
      where: { paidAt: { gte: start, lt: end }, order: { deletedAt: null } },
      include: { order: { include: { customer: true } } },
      orderBy: { paidAt: "asc" },
    }),
    // PO cash yang tahap pembayarannya selesai di bulan ini
    prisma.poStage.findMany({
      where: { completedAt: { gte: start, lt: end }, stage: { isPayment: true }, order: { deletedAt: null, paymentMethod: "CASH" } },
      include: { order: { include: { customer: true } } },
    }),
  ]);

  const rows = orders.map((o) => ({
    id: o.id,
    poDate: o.poDate,
    customer: o.customer.name,
    poNumber: o.poNumber,
    invoiceNumber: o.invoiceNumber,
    products: productSummary(o),
    method: o.paymentMethod,
    price: Number(o.price),
    ppnPercent: o.ppnPercent === null ? null : Number(o.ppnPercent),
    received: Number(o.amountReceived),
    stage: o.progress.complete ? "Clear" : o.progress.current,
    percent: o.progress.percent,
    notes: o.specialNotes,
  }));

  const payments = [
    ...installments.map((i) => ({
      date: i.paidAt!, customer: i.order.customer.name, poNumber: i.order.poNumber, orderId: i.orderId,
      description: `Cicilan ke-${i.number}`, amount: Number(i.amount),
    })),
    ...cashPaid.map((p) => ({
      date: p.completedAt!, customer: p.order.customer.name, poNumber: p.order.poNumber, orderId: p.orderId,
      description: "Pembayaran cash", amount: Number(p.order.amountReceived),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    rows,
    payments,
    totalDeal: rows.reduce((s, r) => s + r.price, 0),
    totalPayments: payments.reduce((s, p) => s + p.amount, 0),
  };
}
