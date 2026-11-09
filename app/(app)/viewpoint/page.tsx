import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { customerOptions, listVp6, packageOptions, toFilters, topology } from "@/lib/queries";
import { tanggal } from "@/lib/format";
import { Badge, Card, Empty, FilterBar, FilterField, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";

export default async function Vp6Page({ searchParams }: PageProps<"/viewpoint">) {
  const f = toFilters(await searchParams);
  const [rows, customers, packages, versions] = await Promise.all([
    listVp6(f), customerOptions(), packageOptions("VIEWPOINT"),
    prisma.vp6Installation.findMany({ where: { deletedAt: null }, distinct: ["currentVersion"], select: { currentVersion: true }, orderBy: { currentVersion: "desc" } }),
  ]);
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  return (
    <>
      <PageHeader title="Instalasi ViewPoint 6" subtitle={`${rows.length} instalasi`} actions={<LinkButton href="/viewpoint/new">+ Instalasi</LinkButton>} />
      <Card>
        <FilterBar exportHref={`/api/export/viewpoint?${qs}`}>
          <FilterField label="Cari"><Input name="q" defaultValue={f.q} placeholder="Customer, Site ID, SN, apps" className="w-56" /></FilterField>
          <FilterField label="Customer">
            <Select name="customer" defaultValue={f.customer ?? ""} className="w-48">
              <option value="">Semua</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Versi">
            <Select name="version" defaultValue={f.version ?? ""} className="w-28">
              <option value="">Semua</option>
              {versions.map((v) => <option key={v.currentVersion} value={v.currentVersion}>{v.currentVersion}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Package">
            <Select name="package" defaultValue={f.package ?? ""} className="w-40">
              <option value="">Semua</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Install dari"><Input type="date" name="from" defaultValue={f.from} className="w-40" /></FilterField>
          <FilterField label="sampai"><Input type="date" name="to" defaultValue={f.to} className="w-40" /></FilterField>
        </FilterBar>
        {rows.length === 0 ? <Empty>Belum ada instalasi.</Empty> : (
          <Table>
            <thead><tr><th>Install</th><th>Customer</th><th>Versi</th><th>Package</th><th>Topologi</th><th>Alat (SN)</th><th>PO</th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className="whitespace-nowrap"><Link className="font-medium text-teal-800 hover:underline" href={`/viewpoint/${v.id}`}>{tanggal(v.installDate)}</Link></td>
                  <td>{v.customer.name}<div className="font-mono text-xs text-slate-500">{v.customer.geSiteId}</div></td>
                  <td><Badge tone="teal">{v.currentVersion}</Badge></td>
                  <td>{v.package?.name ?? "-"}</td>
                  <td>{topology(v.pcs)}</td>
                  <td className="font-mono text-xs">{v.devices.map((d) => d.device.serialNumber).join(", ") || "-"}</td>
                  <td>{v.order ? <Link className="text-teal-800 hover:underline" href={`/orders/${v.order.id}`}>{v.order.poNumber}</Link> : <span className="text-slate-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
