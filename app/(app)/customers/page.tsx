import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_TYPE_LABEL } from "@/lib/format";
import { Badge, Card, Empty, Input, LinkButton, PageHeader, Table, Button } from "@/components/ui";

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { city: { contains: query, mode: "insensitive" } }] } : {}),
    },
    include: { _count: { select: { orders: { where: { deletedAt: null } }, sites: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Customer" subtitle={`${customers.length} customer`} actions={<LinkButton href="/customers/new">+ Customer baru</LinkButton>} />
      <Card>
        <form className="mb-4 flex max-w-md gap-2">
          <Input name="q" defaultValue={query} placeholder="Cari nama atau kota…" />
          <Button variant="outline">Cari</Button>
        </form>
        {customers.length === 0 ? (
          <Empty>{query ? "Tidak ada customer yang cocok." : "Belum ada customer."}</Empty>
        ) : (
          <Table>
            <thead><tr><th>Nama</th><th>Tipe</th><th>Kota</th><th>PIC</th><th className="text-right">PO</th><th className="text-right">Site</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/customers/${c.id}`}>{c.name}</Link></td>
                  <td><Badge>{CUSTOMER_TYPE_LABEL[c.type]}</Badge></td>
                  <td>{c.city ?? "-"}</td>
                  <td>{c.picName ?? "-"}{c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}</td>
                  <td className="text-right">{c._count.orders}</td>
                  <td className="text-right">{c._count.sites}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
