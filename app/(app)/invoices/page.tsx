import Link from "next/link";
import { customerOptions, listPayments, toFilters } from "@/lib/queries";
import { rupiah, tanggal, todayDate } from "@/lib/format";
import { Card, Empty, FilterBar, FilterField, Input, InvoiceBadge, PageHeader, Select, Table } from "@/components/ui";

// Semua termin penagihan lintas PO (dibuat & dilunasi dari halaman PO)
export default async function PaymentsPage({ searchParams }: PageProps<"/invoices">) {
  const f = toFilters(await searchParams);
  const today = todayDate();
  const [rows, customers] = await Promise.all([listPayments(f, today), customerOptions()]);
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  const total = rows.reduce((s, p) => s + Number(p.amount), 0);
  return (
    <>
      <PageHeader title="Penagihan" subtitle={`${rows.length} termin · ${rupiah(total)} · dibuat & dilunasi dari halaman PO`} />
      <Card>
        <FilterBar exportHref={`/api/export/payments?${qs}`}>
          <FilterField label="Cari"><Input name="q" defaultValue={f.q} placeholder="No. invoice / PO / customer" className="w-56" /></FilterField>
          <FilterField label="Customer">
            <Select name="customer" defaultValue={f.customer ?? ""} className="w-52">
              <option value="">Semua</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Status">
            <Select name="status" defaultValue={f.status ?? ""} className="w-40">
              <option value="">Semua</option>
              <option value="unpaid">Belum dibayar</option>
              <option value="overdue">Terlambat</option>
              <option value="paid">Lunas</option>
            </Select>
          </FilterField>
          <FilterField label="Jatuh tempo dari"><Input type="date" name="from" defaultValue={f.from} className="w-40" /></FilterField>
          <FilterField label="sampai"><Input type="date" name="to" defaultValue={f.to} className="w-40" /></FilterField>
        </FilterBar>
        {rows.length === 0 ? <Empty>Belum ada penagihan.</Empty> : (
          <Table>
            <thead><tr><th>Jatuh tempo</th><th>Customer / PO</th><th>No. invoice</th><th>Termin</th><th className="text-right">Nominal</th><th>Status</th><th>Lunas</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap">{tanggal(p.dueDate)}</td>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/orders/${p.orderId}`}>{p.order.customer.name}</Link><div className="text-xs text-slate-500">PO {p.order.poNumber}</div></td>
                  <td className="font-mono text-xs">{p.order.invoiceNumber ?? "-"}</td>
                  <td>{p.sequence}</td>
                  <td className="whitespace-nowrap text-right">{rupiah(p.amount)}</td>
                  <td><InvoiceBadge paidAt={p.paidAt} dueDate={p.dueDate} today={today} /></td>
                  <td className="whitespace-nowrap">{tanggal(p.paidAt)}{p.paidAt && p._count.attachments > 0 && <span title="Ada bukti bayar"> 📎</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
