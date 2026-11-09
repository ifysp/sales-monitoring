import Link from "next/link";
import { monthlyReport, isMonth, monthRange } from "@/lib/report";
import { MONTHS_LONG, PAYMENT_LABEL, rupiah, tanggal, todayDate } from "@/lib/format";
import { Badge, Button, Card, Empty, Input, LinkButton, PageHeader, Table } from "@/components/ui";

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : todayDate().toISOString().slice(0, 7);
  const { y, m } = monthRange(month);
  const report = await monthlyReport(month);

  return (
    <>
      <PageHeader
        title="Laporan bulanan"
        subtitle={`${MONTHS_LONG[m - 1]} ${y}`}
        actions={<LinkButton href={`/api/reports/export?month=${month}`} variant="outline">Export Excel</LinkButton>}
      />
      <form className="mb-6 flex items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Bulan</span>
          <Input type="month" name="month" defaultValue={month} className="w-44" />
        </label>
        <Button variant="outline">Tampilkan</Button>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Box label="PO masuk" value={String(report.rows.length)} />
        <Box label="Total nilai deal" value={rupiah(report.totalDeal)} />
        <Box label="Pembayaran diterima" value={rupiah(report.totalPayments)} />
        <Box label="Transaksi pembayaran" value={String(report.payments.length)} />
      </div>

      <Card title="PO masuk bulan ini" className="mb-6">
        {report.rows.length === 0 ? <Empty>Tidak ada PO masuk di bulan ini.</Empty> : (
          <Table>
            <thead><tr><th>Tanggal</th><th>Customer / PO</th><th>Produk</th><th>Bayar</th><th className="text-right">Nilai</th><th className="text-right">Diterima</th><th>Tahap</th><th>Special notes</th></tr></thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{tanggal(r.poDate)}</td>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/orders/${r.id}`}>{r.customer}</Link><div className="text-xs text-slate-500">PO {r.poNumber}</div></td>
                  <td className="max-w-xs text-slate-600">{r.products}</td>
                  <td>{PAYMENT_LABEL[r.method]}</td>
                  <td className="whitespace-nowrap text-right">{rupiah(r.price)}</td>
                  <td className="whitespace-nowrap text-right">{rupiah(r.received)}</td>
                  <td><Badge tone={r.stage === "Clear" ? "green" : "teal"}>{r.stage} · {r.percent}%</Badge></td>
                  <td className="max-w-xs text-slate-600">{r.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Pembayaran diterima bulan ini">
        {report.payments.length === 0 ? <Empty>Belum ada pembayaran tercatat di bulan ini.</Empty> : (
          <Table>
            <thead><tr><th>Tanggal</th><th>Customer / PO</th><th>Keterangan</th><th className="text-right">Nominal</th></tr></thead>
            <tbody>
              {report.payments.map((p, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{tanggal(p.date)}</td>
                  <td><Link className="text-teal-800 hover:underline" href={`/orders/${p.orderId}`}>{p.customer}</Link><div className="text-xs text-slate-500">PO {p.poNumber}</div></td>
                  <td>{p.description}</td>
                  <td className="text-right">{rupiah(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
