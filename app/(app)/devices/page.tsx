import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { customerOptions, listDevices, toFilters } from "@/lib/queries";
import { Badge, Card, Empty, FilterBar, FilterField, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";
import { todayDate } from "@/lib/format";

export default async function DevicesPage({ searchParams }: PageProps<"/devices">) {
  const f = toFilters(await searchParams);
  const [devices, customers, models] = await Promise.all([listDevices(f), customerOptions(), prisma.machineModel.findMany({ orderBy: { model: "asc" } })]);
  const today = todayDate();
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  return (
    <>
      <PageHeader title="Alat USG" subtitle={`${devices.length} alat · satu alat bisa punya ViewPoint 6 dan Tricefy sekaligus`} actions={<LinkButton href="/devices/new">+ Alat USG</LinkButton>} />
      <Card>
        <FilterBar exportHref={`/api/export/devices?${qs}`}>
          <FilterField label="Cari"><Input name="q" defaultValue={f.q} placeholder="SN, model, customer" className="w-56" /></FilterField>
          <FilterField label="Customer">
            <Select name="customer" defaultValue={f.customer ?? ""} className="w-56">
              <option value="">Semua</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Model">
            <Select name="model" defaultValue={f.model ?? ""} className="w-44">
              <option value="">Semua</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.model}</option>)}
            </Select>
          </FilterField>
        </FilterBar>
        {devices.length === 0 ? <Empty>Belum ada alat.</Empty> : (
          <Table>
            <thead><tr><th>Serial number</th><th>Model</th><th>Customer</th><th>ViewPoint 6</th><th>Tricefy</th></tr></thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td><Link className="font-mono font-medium text-teal-800 hover:underline" href={`/devices/${d.id}`}>{d.serialNumber}</Link></td>
                  <td>{d.machineModel ? `${d.machineModel.brand} ${d.machineModel.model}` : "-"}</td>
                  <td><Link className="hover:underline" href={`/customers/${d.customer.id}`}>{d.customer.name}</Link></td>
                  <td>{d.vp6Installations.length ? <Badge tone="teal">Ya</Badge> : <span className="text-slate-400">—</span>}</td>
                  <td>{d.tricefySubscriptions.some((t) => t.subscription.endDate >= today) ? <Badge tone="blue">Aktif</Badge> : d.tricefySubscriptions.length ? <Badge tone="red">Habis</Badge> : <span className="text-slate-400">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
