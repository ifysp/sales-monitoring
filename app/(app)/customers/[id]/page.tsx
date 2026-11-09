import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ordersWithProgress, productSummary } from "@/lib/queries";
import { deleteCustomer } from "@/app/actions/customers";
import { CUSTOMER_TYPE_LABEL, rupiah, tanggal } from "@/lib/format";
import { Card, DL, Empty, LinkButton, PageHeader, Table, Badge } from "@/components/ui";
import { ConfirmDelete } from "@/components/client";
import { ProgressBar } from "@/components/progress-bar";

export default async function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const me = await requireUser();
  const customer = await prisma.customer.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: { sites: { include: { _count: { select: { configs: true, errorLogs: true } } }, orderBy: { name: "asc" } } },
  });
  if (!customer) notFound();
  const orders = await ordersWithProgress({ customerId: customer.id });
  const remove = deleteCustomer.bind(null, customer.id);

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={<Badge>{CUSTOMER_TYPE_LABEL[customer.type]}</Badge>}
        actions={
          <>
            <LinkButton variant="outline" href={`/customers/${customer.id}/edit`}>Edit</LinkButton>
            {me.role === "ADMIN" && <ConfirmDelete action={remove} what={`customer ${customer.name} beserta PO-nya`} small={false} />}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Data customer">
          <DL items={[
            ["Kota", customer.city],
            ["PIC", customer.picName],
            ["Telepon", customer.phone],
            ["Email", customer.email],
            ["Alamat", customer.address],
            ["Catatan", customer.notes],
          ]} />
        </Card>

        <Card
          title="Purchase Order"
          className="lg:col-span-2"
          actions={<LinkButton small href={`/orders/new?customerId=${customer.id}`}>+ PO baru</LinkButton>}
        >
          {orders.length === 0 ? <Empty>Belum ada PO.</Empty> : (
            <Table>
              <thead><tr><th>PO</th><th>Produk</th><th className="text-right">Nilai</th><th>Progres</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="font-medium text-teal-800 hover:underline" href={`/orders/${o.id}`}>{o.poNumber}</Link>
                      <div className="text-xs text-slate-500">{tanggal(o.poDate)}</div>
                    </td>
                    <td className="text-slate-600">{productSummary(o)}</td>
                    <td className="text-right whitespace-nowrap">{rupiah(Number(o.price))}</td>
                    <td className="w-64"><ProgressBar progress={o.progress} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card
          title="Site & catatan teknis"
          className="lg:col-span-3"
          actions={<LinkButton small variant="outline" href={`/sites/new?customerId=${customer.id}`}>+ Site</LinkButton>}
        >
          {customer.sites.length === 0 ? <Empty>Belum ada site. Tambahkan untuk mencatat special configuration dan error history.</Empty> : (
            <Table>
              <thead><tr><th>Site</th><th>Site ID</th><th>Aplikasi</th><th className="text-right">Konfigurasi</th><th className="text-right">Error log</th></tr></thead>
              <tbody>
                {customer.sites.map((s) => (
                  <tr key={s.id}>
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
      </div>
    </>
  );
}
