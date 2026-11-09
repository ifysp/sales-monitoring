import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ordersWithProgress, productSummary } from "@/lib/queries";
import { PAYMENT_LABEL, rupiah, tanggal } from "@/lib/format";
import { Badge, Button, Card, Empty, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import type { Prisma } from "@/generated/prisma/client";

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const product = typeof sp.product === "string" ? sp.product : "";
  const method = typeof sp.method === "string" ? sp.method : "";

  const where: Prisma.PurchaseOrderWhereInput = {
    ...(q ? { OR: [{ poNumber: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    ...(product ? { items: { some: { productId: Number(product) } } } : {}),
    ...(method === "CASH" || method === "CICILAN" ? { paymentMethod: method } : {}),
  };
  const [all, products] = await Promise.all([ordersWithProgress(where), prisma.product.findMany()]);
  const orders = all.filter((o) => (status === "open" ? !o.progress.complete : status === "done" ? o.progress.complete : true));

  return (
    <>
      <PageHeader title="Purchase Order" subtitle={`${orders.length} PO`} actions={<LinkButton href="/orders/new">+ PO baru</LinkButton>} />
      <Card>
        <form className="mb-4 grid gap-2 sm:grid-cols-5">
          <Input name="q" defaultValue={q} placeholder="Cari no. PO / customer" className="sm:col-span-2" />
          <Select name="status" defaultValue={status}>
            <option value="">Semua status</option>
            <option value="open">Berjalan</option>
            <option value="done">Selesai (Clear)</option>
          </Select>
          <Select name="product" defaultValue={product}>
            <option value="">Semua produk</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <Select name="method" defaultValue={method}>
              <option value="">Cash & cicilan</option>
              <option value="CASH">Cash</option>
              <option value="CICILAN">Cicilan</option>
            </Select>
            <Button variant="outline">Filter</Button>
          </div>
        </form>
        {orders.length === 0 ? <Empty>Tidak ada PO.</Empty> : (
          <Table>
            <thead><tr><th>Tanggal PO</th><th>Customer / PO</th><th>Produk</th><th>Bayar</th><th className="text-right">Nilai</th><th className="text-right">Diterima</th><th>Progres</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap">{tanggal(o.poDate)}</td>
                  <td>
                    <Link className="font-medium text-teal-800 hover:underline" href={`/orders/${o.id}`}>{o.customer.name}</Link>
                    <div className="text-xs text-slate-500">PO {o.poNumber}</div>
                  </td>
                  <td className="max-w-xs text-slate-600">{productSummary(o)}</td>
                  <td><Badge tone={o.paymentMethod === "CICILAN" ? "blue" : "slate"}>{PAYMENT_LABEL[o.paymentMethod]}</Badge></td>
                  <td className="whitespace-nowrap text-right">{rupiah(Number(o.price))}</td>
                  <td className="whitespace-nowrap text-right">{rupiah(Number(o.amountReceived))}</td>
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
