import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { tanggal } from "@/lib/format";
import { Card, Empty, PageHeader } from "@/components/ui";

const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });

// Pencarian global (FR-09.1): Site ID, nama site, SN alat, ID Tricefy, nomor PO, nomor invoice
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q: raw } = await searchParams;
  const q = typeof raw === "string" ? raw.trim() : "";
  if (!q) return <PageHeader title="Pencarian" subtitle="Ketik kata kunci di kolom pencarian di atas." />;

  const [customers, devices, accounts, orders, invoices, pcs] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null, OR: [{ name: ci(q) }, { geSiteId: ci(q) }, { city: ci(q) }, { contactName: ci(q) }] }, take: 20 }),
    prisma.device.findMany({ where: { deletedAt: null, OR: [{ serialNumber: ci(q) }, { machineModel: { model: ci(q) } }] }, include: { customer: true, machineModel: true }, take: 20 }),
    prisma.tricefyAccount.findMany({ where: { deletedAt: null, OR: [{ tricefyId: ci(q) }, { accountEmail: ci(q) }] }, include: { customer: true }, take: 20 }),
    prisma.purchaseOrder.findMany({ where: { deletedAt: null, poNumber: ci(q) }, include: { customer: true }, take: 20 }),
    prisma.invoice.findMany({ where: { invoiceNumber: ci(q), order: { deletedAt: null } }, include: { order: { include: { customer: true } } }, take: 20 }),
    prisma.pc.findMany({ where: { deletedAt: null, hostname: ci(q) }, include: { customer: true }, take: 20 }),
  ]);
  const groups: { title: string; items: { href: string; title: string; sub: string }[] }[] = [
    { title: "Customer / Site", items: customers.map((c) => ({ href: `/customers/${c.id}`, title: c.name, sub: [c.geSiteId && `Site ID ${c.geSiteId}`, c.city].filter(Boolean).join(" · ") })) },
    { title: "Alat USG", items: devices.map((d) => ({ href: `/devices/${d.id}`, title: `SN ${d.serialNumber}`, sub: `${d.machineModel ? `${d.machineModel.brand} ${d.machineModel.model} · ` : ""}${d.customer.name}` })) },
    { title: "Akun Tricefy", items: accounts.map((a) => ({ href: `/tricefy/accounts/${a.id}`, title: `ID ${a.tricefyId}`, sub: a.customer.name })) },
    { title: "Purchase Order", items: orders.map((o) => ({ href: `/orders/${o.id}`, title: `PO ${o.poNumber}`, sub: `${o.customer.name} · ${tanggal(o.poDate)}` })) },
    { title: "Invoice", items: invoices.map((i) => ({ href: `/orders/${i.orderId}`, title: `Invoice ${i.invoiceNumber}`, sub: `${i.order.customer.name} · PO ${i.order.poNumber}` })) },
    { title: "PC", items: pcs.map((p) => ({ href: `/pcs/${p.id}/edit`, title: p.hostname ?? `PC #${p.id}`, sub: p.customer.name })) },
  ];
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <>
      <PageHeader title={`Hasil pencarian "${q}"`} subtitle={`${total} hasil`} />
      {total === 0 ? <Card><Empty>Tidak ada data yang cocok.</Empty></Card> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.filter((g) => g.items.length).map((g) => (
            <Card key={g.title} title={`${g.title} (${g.items.length})`}>
              <ul className="divide-y divide-slate-100">
                {g.items.map((it) => (
                  <li key={it.href + it.title} className="py-2">
                    <Link href={it.href} className="font-medium text-teal-800 hover:underline">{it.title}</Link>
                    <div className="text-xs text-slate-500">{it.sub}</div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
