import Link from "next/link";
import { getAlerts } from "@/lib/alerts";
import { rupiah, tanggal } from "@/lib/format";
import { Card, Empty, PageHeader, Table, TricefyBadge, InvoiceBadge } from "@/components/ui";

export default async function NotificationsPage() {
  const { tricefy, invoices, today } = await getAlerts();
  const groups = [
    { title: "Kedaluwarsa", items: tricefy.filter((s) => s.status === "KEDALUWARSA") },
    { title: "Habis ≤ 30 hari", items: tricefy.filter((s) => s.status === "AKAN_HABIS" && s.daysLeft <= 30) },
    { title: "Habis 31–60 hari", items: tricefy.filter((s) => s.daysLeft > 30 && s.daysLeft <= 60) },
    { title: "Habis 61–90 hari", items: tricefy.filter((s) => s.daysLeft > 60 && s.daysLeft <= 90) },
  ];
  return (
    <>
      <PageHeader title="Notifikasi" subtitle="Langganan Tricefy yang perlu diperpanjang dan tagihan yang perlu ditindaklanjuti" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Langganan Tricefy (${tricefy.length})`}>
          {tricefy.length === 0 ? <Empty>Semua langganan aman (&gt; 90 hari).</Empty> : groups.filter((g) => g.items.length).map((g) => (
            <div key={g.title} className="mb-4">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.title}</h3>
              <ul className="divide-y divide-slate-100">
                {g.items.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div>
                      <Link className="font-medium text-teal-800 hover:underline" href={`/tricefy/accounts/${s.accountId}`}>{s.account.customer.name}</Link>
                      <div className="text-xs text-slate-500">ID {s.account.tricefyId} · berakhir {tanggal(s.endDate)}</div>
                    </div>
                    <TricefyBadge status={s.status} daysLeft={s.daysLeft} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
        <Card title={`Invoice (${invoices.length})`}>
          {invoices.length === 0 ? <Empty>Tidak ada tagihan yang jatuh tempo dalam 7 hari.</Empty> : (
            <Table>
              <thead><tr><th>Customer / PO</th><th>Jatuh tempo</th><th className="text-right">Nominal</th></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <td><Link className="font-medium text-teal-800 hover:underline" href={`/orders/${i.orderId}`}>{i.order.customer.name}</Link><div className="text-xs text-slate-500">PO {i.order.poNumber} · termin {i.sequence}</div></td>
                    <td className="whitespace-nowrap">{tanggal(i.dueDate)}<div><InvoiceBadge paidAt={i.paidAt} dueDate={i.dueDate} today={today} /></div></td>
                    <td className="text-right">{rupiah(i.amount)}</td>
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
