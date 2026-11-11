import Link from "next/link";
import { Building2, Cloud, MonitorCog, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAlerts } from "@/lib/alerts";
import { listOrders } from "@/lib/queries";
import { MONTHS_SHORT, rupiah, tanggal, waktu, ENTITY_LABEL } from "@/lib/format";
import { Badge, Card, Empty, LinkButton, PageHeader, StatCard, Table, TricefyBadge, InvoiceBadge } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { MonthChart } from "@/components/month-chart";

export default async function DashboardPage() {
  const alerts = await getAlerts();
  const today = alerts.today;
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const chartStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));

  const [siteCount, deviceCount, vp6Count, tricefyLatest, orders, poYear, poMonth, paidMonth, vp6Dates, actDates, activity] = await Promise.all([
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.device.count({ where: { deletedAt: null } }),
    prisma.vp6Installation.count({ where: { deletedAt: null } }),
    prisma.tricefySubscription.count({ where: { deletedAt: null, endDate: { gte: today } } }),
    listOrders({ status: "open" }),
    prisma.purchaseOrder.aggregate({ where: { deletedAt: null, invoiceDate: { gte: yearStart } }, _sum: { finalAmount: true } }),
    prisma.purchaseOrder.aggregate({ where: { deletedAt: null, invoiceDate: { gte: monthStart } }, _sum: { finalAmount: true }, _count: true }),
    prisma.payment.aggregate({ where: { paidAt: { gte: monthStart }, order: { deletedAt: null } }, _sum: { amount: true } }),
    prisma.vp6Installation.findMany({ where: { deletedAt: null, installDate: { gte: chartStart } }, select: { installDate: true } }),
    prisma.tricefySubscription.findMany({ where: { deletedAt: null, activationDate: { gte: chartStart } }, select: { activationDate: true } }),
    prisma.auditLog.findMany({ where: { action: { not: "LOGIN" } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const chart = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(chartStart.getUTCFullYear(), chartStart.getUTCMonth() + i, 1));
    const same = (x: Date) => x.getUTCFullYear() === d.getUTCFullYear() && x.getUTCMonth() === d.getUTCMonth();
    return { label: MONTHS_SHORT[d.getUTCMonth()], vp6: vp6Dates.filter((v) => same(v.installDate)).length, tricefy: actDates.filter((v) => same(v.activationDate)).length };
  });
  const byStage = new Map<string, number>();
  for (const o of orders) {
    const k = o.progress.current.startsWith("Termin") || o.progress.current === "Pembayaran" ? "Penagihan" : o.progress.current;
    byStage.set(k, (byStage.get(k) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Ringkasan per ${tanggal(today)}`} actions={<LinkButton href="/orders/new">+ PO baru</LinkButton>} />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Customer / Site" value={siteCount} href="/customers" icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Alat USG" value={deviceCount} href="/devices" icon={<Stethoscope className="h-4 w-4" />} />
        <StatCard label="Instalasi ViewPoint 6" value={vp6Count} href="/viewpoint" icon={<MonitorCog className="h-4 w-4" />} />
        <StatCard label="Langganan Tricefy aktif" value={tricefyLatest} href="/tricefy?status=AKTIF" icon={<Cloud className="h-4 w-4" />} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Penjualan bulan ini (invoice)" value={rupiah(Number(poMonth._sum.finalAmount ?? 0))} sub={`${poMonth._count} invoice terbit`} tone="teal" href="/reports" />
        <StatCard label="Pembayaran diterima bulan ini" value={rupiah(Number(paidMonth._sum.amount ?? 0))} href="/invoices?status=paid" />
        <StatCard label={`Penjualan tahun ${today.getUTCFullYear()}`} value={rupiah(Number(poYear._sum.finalAmount ?? 0))} href="/reports" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card title="Tricefy perlu diperpanjang" actions={<LinkButton small variant="outline" href="/tricefy?status=AKAN_HABIS">Semua</LinkButton>}>
          {alerts.tricefy.length === 0 ? <Empty>Tidak ada langganan yang habis dalam 90 hari.</Empty> : (
            <Table>
              <thead><tr><th>Customer / akun</th><th>Berakhir</th><th>Status</th></tr></thead>
              <tbody>
                {alerts.tricefy.slice(0, 6).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link className="font-medium text-teal-800 hover:underline" href={`/tricefy/accounts/${s.accountId}`}>{s.account.customer.name}</Link>
                      <div className="text-xs text-slate-500">ID {s.account.tricefyId}</div>
                    </td>
                    <td className="whitespace-nowrap">{tanggal(s.endDate)}</td>
                    <td><TricefyBadge status={s.status} daysLeft={s.daysLeft} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Penagihan jatuh tempo ≤ 7 hari / terlambat" actions={<LinkButton small variant="outline" href="/invoices?status=unpaid">Semua</LinkButton>}>
          {alerts.payments.length === 0 ? <Empty>Tidak ada tagihan mendesak.</Empty> : (
            <Table>
              <thead><tr><th>Customer / PO</th><th>Jatuh tempo</th><th className="text-right">Nominal</th></tr></thead>
              <tbody>
                {alerts.payments.slice(0, 6).map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link className="font-medium text-teal-800 hover:underline" href={`/orders/${i.orderId}`}>{i.order.customer.name}</Link>
                      <div className="text-xs text-slate-500">PO {i.order.poNumber} · termin {i.sequence}</div>
                    </td>
                    <td className="whitespace-nowrap">{tanggal(i.dueDate)} <InvoiceBadge paidAt={i.paidAt} dueDate={i.dueDate} today={today} /></td>
                    <td className="text-right whitespace-nowrap">{rupiah(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card title="Instalasi & aktivasi per bulan (12 bulan terakhir)" className="xl:col-span-2">
          <MonthChart data={chart} />
        </Card>
        <Card title="PO berjalan per tahap">
          {byStage.size === 0 ? <Empty>Tidak ada PO berjalan.</Empty> : (
            <ul className="space-y-2">
              {[...byStage.entries()].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-sm"><span>{k}</span><Badge tone="teal">{v}</Badge></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="PO berjalan" className="xl:col-span-2" actions={<LinkButton small variant="outline" href="/orders?status=open">Semua</LinkButton>}>
          {orders.length === 0 ? <Empty>Belum ada PO berjalan.</Empty> : (
            <Table>
              <thead><tr><th>Customer / PO</th><th>Tanggal</th><th>Progres</th></tr></thead>
              <tbody>
                {orders.slice(0, 8).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="font-medium text-teal-800 hover:underline" href={`/orders/${o.id}`}>{o.customer.name}</Link>
                      <div className="text-xs text-slate-500">PO {o.poNumber}</div>
                    </td>
                    <td className="whitespace-nowrap">{tanggal(o.poDate)}</td>
                    <td className="w-72"><ProgressBar progress={o.progress} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Aktivitas terbaru">
          {activity.length === 0 ? <Empty>Belum ada aktivitas.</Empty> : (
            <ul className="space-y-3 text-sm">
              {activity.map((a) => (
                <li key={a.id}>
                  <div><Badge tone={a.action === "DELETE" ? "red" : a.action === "CREATE" ? "green" : "blue"}>{a.action}</Badge> <span className="text-slate-500">{ENTITY_LABEL[a.entity] ?? a.entity}</span> · {a.summary}</div>
                  <div className="text-xs text-slate-500">{waktu(a.createdAt)} · {a.user?.name}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
