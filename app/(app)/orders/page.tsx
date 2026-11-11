import Link from "next/link";
import { customerOptions, listOrders, toFilters } from "@/lib/queries";
import { PAYMENT_LABEL, rupiah, tanggal } from "@/lib/format";
import { Badge, Card, Empty, FilterBar, FilterField, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const f = toFilters(await searchParams);
  const [orders, customers] = await Promise.all([listOrders(f), customerOptions()]);
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  const total = orders.reduce((s, o) => s + (o.amount ?? 0), 0);
  return (
    <>
      <PageHeader title="Purchase Order" subtitle={`${orders.length} PO · total harga final ${rupiah(total)}`} actions={<LinkButton href="/orders/new">+ PO baru</LinkButton>} />
      <Card>
        <FilterBar exportHref={`/api/export/orders?${qs}`}>
          <FilterField label="Cari"><Input name="q" defaultValue={f.q} placeholder="No. PO / invoice / customer" className="w-56" /></FilterField>
          <FilterField label="Customer">
            <Select name="customer" defaultValue={f.customer ?? ""} className="w-52">
              <option value="">Semua</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Status">
            <Select name="status" defaultValue={f.status ?? ""} className="w-36">
              <option value="">Semua</option>
              <option value="open">Berjalan</option>
              <option value="done">Selesai</option>
            </Select>
          </FilterField>
          <FilterField label="Bayar">
            <Select name="method" defaultValue={f.method ?? ""} className="w-32">
              <option value="">Semua</option>
              <option value="CASH">Cash</option>
              <option value="CICILAN">Cicilan</option>
            </Select>
          </FilterField>
          <FilterField label="Tanggal PO dari"><Input type="date" name="from" defaultValue={f.from} className="w-40" /></FilterField>
          <FilterField label="sampai"><Input type="date" name="to" defaultValue={f.to} className="w-40" /></FilterField>
        </FilterBar>
        {orders.length === 0 ? <Empty>Tidak ada PO.</Empty> : (
          <Table>
            <thead><tr><th>Tanggal</th><th>Customer / PO</th><th>Produk</th><th>Bayar</th><th>No. invoice</th><th className="text-right">Harga final</th><th className="text-right">Lunas</th><th>Progres</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap">{tanggal(o.poDate)}</td>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/orders/${o.id}`}>{o.customer.name}</Link><div className="text-xs text-slate-500">PO {o.poNumber}</div></td>
                  <td className="text-xs">
                    {o.vp6Installations.length > 0 && <Badge tone="teal">VP6 ×{o.vp6Installations.length}</Badge>}{" "}
                    {o.tricefySubscriptions.length > 0 && <Badge tone="blue">Tricefy ×{o.tricefySubscriptions.length}</Badge>}
                    {o.vp6Installations.length + o.tricefySubscriptions.length === 0 && <span className="text-slate-400">belum diisi</span>}
                  </td>
                  <td>{PAYMENT_LABEL[o.paymentMethod]}</td>
                  <td className="font-mono text-xs">{o.invoiceNumber ?? <span className="font-sans text-slate-400">belum terbit</span>}</td>
                  <td className="whitespace-nowrap text-right">{o.amount === null ? <span className="text-slate-400">—</span> : rupiah(o.amount)}</td>
                  <td className="whitespace-nowrap text-right">{rupiah(o.paid)}</td>
                  <td className="w-64"><ProgressBar progress={o.progress} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
