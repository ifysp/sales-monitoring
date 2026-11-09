import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteSubscription, deleteTricefyAccount } from "@/app/actions/products";
import { tricefyStatus } from "@/lib/tricefy";
import { addDays, rupiah, tanggal, toInputDate, todayDate } from "@/lib/format";
import { ConfirmDelete } from "@/components/client";
import { Card, DL, Empty, LinkButton, PageHeader, Table, TricefyBadge } from "@/components/ui";
import { TricefyAccountForm } from "@/components/forms/tricefy-forms";
import { History } from "@/components/history";

export default async function TricefyAccountPage({ params }: PageProps<"/tricefy/accounts/[id]">) {
  const { id } = await params;
  const today = todayDate();
  const a = await prisma.tricefyAccount.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      customer: true,
      subscriptions: { where: { deletedAt: null }, include: { package: true, order: true, devices: { include: { device: true } } }, orderBy: { activationDate: "desc" } },
    },
  });
  if (!a) notFound();
  const latest = a.subscriptions[0];
  const st = latest ? tricefyStatus(latest.endDate, today) : null;
  // Perpanjang: langganan baru mulai sehari setelah langganan terakhir berakhir
  const renewHref = latest
    ? `/tricefy/subscriptions/new?accountId=${a.id}&renewFrom=${latest.id}&activation=${toInputDate(addDays(latest.endDate, 1))}`
    : `/tricefy/subscriptions/new?accountId=${a.id}`;
  return (
    <>
      <PageHeader
        title={`Tricefy ${a.tricefyId}`}
        subtitle={<Link className="text-teal-800 hover:underline" href={`/customers/${a.customerId}?tab=tricefy`}>{a.customer.name}</Link>}
        actions={<>
          <LinkButton href={renewHref}>{latest ? "Perpanjang langganan" : "+ Langganan"}</LinkButton>
          <ConfirmDelete action={deleteTricefyAccount.bind(null, a.id)} what={`akun ${a.tricefyId}`} small={false} />
        </>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Status saat ini">
          {latest && st ? (
            <DL items={[
              ["Status", <TricefyBadge key="s" status={st.status} daysLeft={st.daysLeft} />],
              ["Package", latest.package?.name],
              ["Aktivasi", tanggal(latest.activationDate)],
              ["Berakhir", tanggal(latest.endDate)],
              ["Alat", latest.devices.map((d) => d.device.serialNumber).join(", ")],
              ["Email akun", a.accountEmail],
            ]} />
          ) : <Empty>Belum ada langganan.</Empty>}
        </Card>
        <Card title="Riwayat langganan & perpanjangan" className="xl:col-span-2">
          {a.subscriptions.length === 0 ? <Empty>Belum ada langganan.</Empty> : (
            <Table>
              <thead><tr><th>Aktivasi – berakhir</th><th>Package</th><th>PO</th><th className="text-right">Harga</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {a.subscriptions.map((s) => {
                  const ss = tricefyStatus(s.endDate, today);
                  return (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap">{tanggal(s.activationDate)} – {tanggal(s.endDate)}<div className="text-xs text-slate-500">{s.devices.map((d) => d.device.serialNumber).join(", ")}</div></td>
                      <td>{s.package?.name ?? "-"}{s.quantity ? ` · ${s.quantity}` : ""}</td>
                      <td>{s.order ? <Link className="text-teal-800 hover:underline" href={`/orders/${s.order.id}`}>{s.order.poNumber}</Link> : "-"}</td>
                      <td className="text-right">{rupiah(s.price)}</td>
                      <td><TricefyBadge status={ss.status} daysLeft={ss.daysLeft} /></td>
                      <td className="whitespace-nowrap text-right">
                        <LinkButton small variant="ghost" href={`/tricefy/subscriptions/${s.id}/edit`}>Edit</LinkButton>
                        <ConfirmDelete action={deleteSubscription.bind(null, s.id)} what="langganan ini" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Edit akun"><TricefyAccountForm customer={{ id: a.customerId, name: a.customer.name }} account={a} /></Card>
        <Card title="Riwayat perubahan" className="xl:col-span-2"><History entity="TricefyAccount" entityId={a.id} /></Card>
      </div>
    </>
  );
}
