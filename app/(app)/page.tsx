import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ordersWithProgress, productSummary } from "@/lib/queries";
import { rupiah, tanggal, todayDate, addDays } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Table, LinkButton } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";

export default async function DashboardPage() {
  const today = todayDate();
  const in30 = addDays(today, 30);
  const in90 = addDays(today, 90);

  const [orders, dueInstallments, endingContracts] = await Promise.all([
    ordersWithProgress(),
    prisma.installment.findMany({
      where: { paidAt: null, dueDate: { lte: in30 }, order: { deletedAt: null } },
      include: { order: { include: { customer: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.orderItem.findMany({
      where: { contractEnd: { gte: addDays(today, -30), lte: in90 }, order: { deletedAt: null } },
      include: { product: true, package: true, order: { include: { customer: true } } },
      orderBy: { contractEnd: "asc" },
    }),
  ]);

  const open = orders.filter((o) => !o.progress.complete);
  const done = orders.length - open.length;
  const overdue = dueInstallments.filter((i) => i.dueDate < today);

  // jumlah PO per tahap berjalan
  const byStage = new Map<string, number>();
  for (const o of open) {
    const key = o.progress.current.startsWith("Cicilan") ? "Payment (cicilan)" : o.progress.current;
    byStage.set(key, (byStage.get(key) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Ringkasan per ${tanggal(today)}`}
        actions={<LinkButton href="/orders/new">+ PO baru</LinkButton>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="PO berjalan" value={open.length} href="/orders?status=open" />
        <Stat label="PO selesai (Clear)" value={done} href="/orders?status=done" />
        <Stat label="Cicilan jatuh tempo ≤ 30 hari" value={dueInstallments.length} tone={overdue.length ? "red" : undefined} sub={overdue.length ? `${overdue.length} terlambat` : undefined} />
        <Stat label="Kontrak berakhir ≤ 90 hari" value={endingContracts.length} tone={endingContracts.length ? "amber" : undefined} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="PO berjalan per tahap">
          {byStage.size === 0 ? (
            <Empty>Tidak ada PO yang sedang berjalan.</Empty>
          ) : (
            <ul className="space-y-2">
              {[...byStage.entries()].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span>{k}</span>
                  <Badge tone="teal">{v}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Reminder cicilan" className="lg:col-span-2">
          {dueInstallments.length === 0 ? (
            <Empty>Tidak ada cicilan jatuh tempo dalam 30 hari.</Empty>
          ) : (
            <Table>
              <thead>
                <tr><th>Jatuh tempo</th><th>Customer / PO</th><th>Cicilan</th><th className="text-right">Nominal</th></tr>
              </thead>
              <tbody>
                {dueInstallments.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {tanggal(i.dueDate)}{" "}
                      {i.dueDate < today ? <Badge tone="red">terlambat</Badge> : <Badge tone="amber">segera</Badge>}
                    </td>
                    <td>
                      <Link className="font-medium text-teal-800 hover:underline" href={`/orders/${i.orderId}`}>{i.order.customer.name}</Link>
                      <div className="text-xs text-slate-500">PO {i.order.poNumber}</div>
                    </td>
                    <td>Ke-{i.number}</td>
                    <td className="text-right">{rupiah(Number(i.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <div className="mb-6">
        <Card title="Kontrak Tricefy/Viewpoint berakhir (30 hari lalu – 90 hari ke depan)">
          {endingContracts.length === 0 ? (
            <Empty>Tidak ada kontrak yang akan berakhir.</Empty>
          ) : (
            <Table>
              <thead><tr><th>Berakhir</th><th>Customer</th><th>Produk</th><th>PO</th></tr></thead>
              <tbody>
                {endingContracts.map((it) => (
                  <tr key={it.id}>
                    <td>
                      {tanggal(it.contractEnd)}{" "}
                      {it.contractEnd! < today ? <Badge tone="red">lewat</Badge> : <Badge tone="amber">perpanjangan</Badge>}
                    </td>
                    <td>{it.order.customer.name}</td>
                    <td>{it.product.name}{it.package ? ` · ${it.package.name}` : ""}</td>
                    <td><Link className="text-teal-800 hover:underline" href={`/orders/${it.orderId}`}>{it.order.poNumber}</Link></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card title="PO berjalan" actions={<LinkButton href="/orders" variant="outline" small>Semua PO</LinkButton>}>
        {open.length === 0 ? (
          <Empty>Belum ada PO berjalan. Mulai dari menambah customer, lalu PO baru.</Empty>
        ) : (
          <Table>
            <thead><tr><th>Customer</th><th>Produk</th><th>Tanggal PO</th><th>Progres</th></tr></thead>
            <tbody>
              {open.slice(0, 15).map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="font-medium text-teal-800 hover:underline" href={`/orders/${o.id}`}>{o.customer.name}</Link>
                    <div className="text-xs text-slate-500">PO {o.poNumber}</div>
                  </td>
                  <td className="max-w-xs text-slate-600">{productSummary(o)}</td>
                  <td className="whitespace-nowrap">{tanggal(o.poDate)}</td>
                  <td className="w-72"><ProgressBar progress={o.progress} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value, sub, tone, href }: { label: string; value: number; sub?: string; tone?: "red" | "amber"; href?: string }) {
  const body = (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-slate-900"}`}>{value}</div>
      {sub && <div className="text-xs text-red-600">{sub}</div>}
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}
