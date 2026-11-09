import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button, Card, Empty, Input, LinkButton, PageHeader, Table } from "@/components/ui";

export default async function SitesPage({ searchParams }: PageProps<"/sites">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const sites = await prisma.site.findMany({
    where: {
      customer: { deletedAt: null },
      ...(query ? { OR: [
        { name: { contains: query, mode: "insensitive" } },
        { siteCode: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { configs: { some: { content: { contains: query, mode: "insensitive" } } } },
        { errorLogs: { some: { symptom: { contains: query, mode: "insensitive" } } } },
      ] } : {}),
    },
    include: { customer: true, _count: { select: { configs: true, errorLogs: true } } },
    orderBy: [{ customer: { name: "asc" } }, { name: "asc" }],
  });
  return (
    <>
      <PageHeader title="Site & teknis" subtitle="Special configuration, preferensi dokter, dan error history per site" actions={<LinkButton href="/sites/new">+ Site</LinkButton>} />
      <Card>
        <form className="mb-4 flex max-w-lg gap-2">
          <Input name="q" defaultValue={query} placeholder="Cari site, customer, isi konfigurasi, atau gejala error…" />
          <Button variant="outline">Cari</Button>
        </form>
        {sites.length === 0 ? <Empty>Belum ada site.</Empty> : (
          <Table>
            <thead><tr><th>Customer</th><th>Site</th><th>Site ID</th><th>Aplikasi</th><th className="text-right">Konfigurasi</th><th className="text-right">Error log</th></tr></thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td>{s.customer.name}</td>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/sites/${s.id}`}>{s.name}</Link></td>
                  <td>{s.siteCode ?? "-"}</td>
                  <td className="text-slate-600">{s.applications ?? "-"}</td>
                  <td className="text-right">{s._count.configs}</td>
                  <td className="text-right">{s._count.errorLogs}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
