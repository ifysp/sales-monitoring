import Link from "next/link";
import { customerOptions, listInvoices, toFilters } from "@/lib/queries";
import { rupiah, tanggal, todayDate } from "@/lib/format";
import { Card, Empty, FilterBar, FilterField, Input, InvoiceBadge, PageHeader, Select, Table } from "@/components/ui";

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const f = toFilters(await searchParams);
  const today = todayDate();
  const [invoices, customers] = await Promise.all([listInvoices(f, today), customerOptions()]);
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
  return (
    <>
      <PageHeader title="Invoice & termin" subtitle={`${invoices.length} invoice · ${rupiah(total)} · invoice dibuat & dibayar dari halaman PO`} />
      <Card>
        <FilterBar exportHref={`/api/export/invoices?${qs}`}>
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
        {invoices.length === 0 ? <Empty>Tidak ada invoice.</Empty> : (
          <Table>
            <thead><tr><th>Jatuh tempo</th><th>Customer / PO</th><th>Termin</th><th>No. invoice</th><th className="text-right">Nominal</th><th>Status</th><th>Lunas</th></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="whitespace-nowrap">{tanggal(i.dueDate)}</td>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/orders/${i.orderId}`}>{i.order.customer.name}</Link><div className="text-xs text-slate-500">PO {i.order.poNumber}</div></td>
                  <td>{i.sequence}</td>
                  <td className="font-mono text-xs">{i.invoiceNumber ?? <span className="text-slate-400">belum terbit</span>}</td>
                  <td className="whitespace-nowrap text-right">{rupiah(i.amount)}</td>
                  <td><InvoiceBadge paidAt={i.paidAt} dueDate={i.dueDate} today={today} /></td>
                  <td className="whitespace-nowrap">{tanggal(i.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
