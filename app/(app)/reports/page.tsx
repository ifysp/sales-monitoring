import Link from "next/link";
import { monthlyReport, isMonth, monthRange } from "@/lib/report";
import { MONTHS_LONG, PAYMENT_LABEL, rupiah, tanggal, todayDate } from "@/lib/format";
import { Badge, Button, Card, Empty, Input, LinkButton, PageHeader, StatCard, Table } from "@/components/ui";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : todayDate().toISOString().slice(0, 7);
  const { y, m } = monthRange(month);
  const r = await monthlyReport(month);
  return (
    <>
      <PageHeader title="Laporan bulanan" subtitle={`${MONTHS_LONG[m - 1]} ${y}`} actions={<LinkButton href={`/api/export/report?month=${month}`} variant="outline">⬇ Export Excel</LinkButton>} />
      <form className="mb-6 flex items-end gap-2">
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Bulan</span><Input type="month" name="month" defaultValue={month} className="w-44" /></label>
        <Button variant="outline">Tampilkan</Button>
      </form>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="PO masuk" value={r.orders.length} sub={rupiah(r.totalPo)} />
        <StatCard label="Pembayaran diterima" value={rupiah(r.totalPaid)} sub={`${r.payments.length} termin`} tone="teal" />
        <StatCard label="Instalasi ViewPoint 6" value={r.vp6.length} />
        <StatCard label="Aktivasi Tricefy" value={r.tricefy.length} />
      </div>
      <div className="space-y-6">
        <Card title="PO masuk">
          {r.orders.length === 0 ? <Empty>Tidak ada PO masuk.</Empty> : (
            <Table>
              <thead><tr><th>Tanggal</th><th>Customer / PO</th><th>Bayar</th><th className="text-right">Nilai</th><th className="text-right">Lunas</th><th>Tahap</th><th>Special notes</th></tr></thead>
              <tbody>
                {r.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap">{tanggal(o.poDate)}</td>
                    <td><Link className="font-medium text-teal-800 hover:underline" href={`/orders/${o.id}`}>{o.customer.name}</Link><div className="text-xs text-slate-500">PO {o.poNumber}</div></td>
                    <td>{PAYMENT_LABEL[o.paymentMethod]}</td>
                    <td className="whitespace-nowrap text-right">{rupiah(o.amountNum)}</td>
                    <td className="whitespace-nowrap text-right">{rupiah(o.paid)}</td>
                    <td><Badge tone={o.progress.complete ? "green" : "teal"}>{o.progress.complete ? "Clear" : o.progress.current} · {o.progress.percent}%</Badge></td>
                    <td className="max-w-xs text-slate-600">{o.specialNotes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Pembayaran diterima">
          {r.payments.length === 0 ? <Empty>Belum ada pembayaran.</Empty> : (
            <Table>
              <thead><tr><th>Tanggal</th><th>Customer / PO</th><th>Termin</th><th>No. invoice</th><th className="text-right">Nominal</th></tr></thead>
              <tbody>
                {r.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{tanggal(p.paidAt)}</td>
                    <td><Link className="text-teal-800 hover:underline" href={`/orders/${p.orderId}`}>{p.order.customer.name}</Link><div className="text-xs text-slate-500">PO {p.order.poNumber}</div></td>
                    <td>{p.sequence}</td>
                    <td className="font-mono text-xs">{p.invoiceNumber ?? "-"}</td>
                    <td className="text-right">{rupiah(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
