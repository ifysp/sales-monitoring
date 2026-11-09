import Link from "next/link";
import { listCustomers, toFilters } from "@/lib/queries";
import { CUSTOMER_TYPE_LABEL } from "@/lib/format";
import { Badge, Card, Empty, FilterBar, FilterField, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const f = toFilters(await searchParams);
  const customers = await listCustomers(f);
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  return (
    <>
      <PageHeader title="Customer / Site" subtitle={`${customers.length} customer · satu RS/klinik = satu Site ID GE`} actions={<LinkButton href="/customers/new">+ Customer baru</LinkButton>} />
      <Card>
        <FilterBar exportHref={`/api/export/customers?${qs}`}>
          <FilterField label="Cari"><Input name="q" defaultValue={f.q} placeholder="Nama, kota, Site ID, kontak" className="w-64" /></FilterField>
          <FilterField label="Tipe">
            <Select name="type" defaultValue={f.type ?? ""} className="w-40">
              <option value="">Semua</option>
              {Object.entries(CUSTOMER_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FilterField>
        </FilterBar>
        {customers.length === 0 ? <Empty>{f.q ? "Tidak ada customer yang cocok." : "Belum ada customer. Mulai dari tombol + Customer baru."}</Empty> : (
          <Table>
            <thead><tr><th>Nama</th><th>Site ID</th><th>Tipe</th><th>Kota</th><th>Kontak</th><th className="text-right">Alat</th><th className="text-right">VP6</th><th className="text-right">Tricefy</th><th className="text-right">PO</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/customers/${c.id}`}>{c.name}</Link></td>
                  <td className="font-mono text-xs">{c.geSiteId ?? "-"}</td>
                  <td><Badge>{CUSTOMER_TYPE_LABEL[c.type]}</Badge></td>
                  <td>{c.city ?? "-"}</td>
                  <td>{c.contactName ?? "-"}{c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}</td>
                  <td className="text-right">{c._count.devices}</td>
                  <td className="text-right">{c._count.vp6Installations}</td>
                  <td className="text-right">{c._count.tricefyAccounts}</td>
                  <td className="text-right">{c._count.orders}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
