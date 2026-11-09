import Link from "next/link";
import { customerOptions, listPcs, toFilters } from "@/lib/queries";
import { PC_ROLE_LABEL, PC_SOURCE_LABEL } from "@/lib/format";
import { Badge, Card, Empty, FilterBar, FilterField, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";

export default async function PcsPage({ searchParams }: PageProps<"/pcs">) {
  const f = toFilters(await searchParams);
  const [pcs, customers] = await Promise.all([listPcs(f), customerOptions()]);
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  return (
    <>
      <PageHeader title="PC ViewPoint 6" subtitle={`${pcs.length} PC`} actions={<LinkButton href="/pcs/new">+ PC</LinkButton>} />
      <Card>
        <FilterBar exportHref={`/api/export/pcs?${qs}`}>
          <FilterField label="Cari"><Input name="q" defaultValue={f.q} placeholder="Hostname, CPU, customer" className="w-56" /></FilterField>
          <FilterField label="Customer">
            <Select name="customer" defaultValue={f.customer ?? ""} className="w-56">
              <option value="">Semua</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Sumber">
            <Select name="source" defaultValue={f.source ?? ""} className="w-48">
              <option value="">Semua</option>
              {Object.entries(PC_SOURCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Peran">
            <Select name="role" defaultValue={f.role ?? ""} className="w-40">
              <option value="">Semua</option>
              {Object.entries(PC_ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FilterField>
        </FilterBar>
        {pcs.length === 0 ? <Empty>Belum ada PC.</Empty> : (
          <Table>
            <thead><tr><th>Hostname</th><th>Customer</th><th>Peran</th><th>Sumber</th><th>Spesifikasi</th><th className="text-right">Instalasi</th></tr></thead>
            <tbody>
              {pcs.map((p) => (
                <tr key={p.id}>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/pcs/${p.id}/edit`}>{p.hostname ?? `PC #${p.id}`}</Link></td>
                  <td><Link className="hover:underline" href={`/customers/${p.customer.id}?tab=devices`}>{p.customer.name}</Link></td>
                  <td><Badge tone="blue">{PC_ROLE_LABEL[p.role]}</Badge></td>
                  <td>{PC_SOURCE_LABEL[p.source]}</td>
                  <td className="text-xs text-slate-600">{[p.cpu, p.ram && `RAM ${p.ram}`, p.storage, p.vga, p.os].filter(Boolean).join(" · ") || "-"}</td>
                  <td className="text-right">{p._count.installations}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
