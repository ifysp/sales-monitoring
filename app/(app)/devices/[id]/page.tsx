import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteDevice } from "@/app/actions/devices";
import { tanggal, todayDate } from "@/lib/format";
import { tricefyStatus } from "@/lib/tricefy";
import { ConfirmDelete } from "@/components/client";
import { Badge, Card, DL, Empty, LinkButton, PageHeader, Table, TricefyBadge } from "@/components/ui";
import { History } from "@/components/history";

// Detail alat + riwayat ViewPoint 6 & Tricefy (FR-03.3)
export default async function DeviceDetailPage({ params }: PageProps<"/devices/[id]">) {
  const { id } = await params;
  const today = todayDate();
  const d = await prisma.device.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      customer: true,
      machineModel: true,
      vp6Installations: { where: { installation: { deletedAt: null } }, include: { installation: { include: { versionHistory: { orderBy: { changedDate: "asc" } }, package: true } } } },
      tricefySubscriptions: { where: { subscription: { deletedAt: null } }, include: { subscription: { include: { account: true, package: true } } }, orderBy: { subscription: { activationDate: "desc" } } },
      errorLogs: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!d) notFound();
  return (
    <>
      <PageHeader
        title={`Alat ${d.serialNumber}`}
        subtitle={<Link className="text-teal-800 hover:underline" href={`/customers/${d.customerId}`}>{d.customer.name}</Link>}
        actions={<><LinkButton variant="outline" href={`/devices/${d.id}/edit`}>Edit</LinkButton><ConfirmDelete action={deleteDevice.bind(null, d.id)} what={`alat ${d.serialNumber}`} small={false} /></>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Data alat">
          <DL items={[["Model", d.machineModel ? `${d.machineModel.brand} ${d.machineModel.model}` : null], ["Site ID", d.customer.geSiteId], ["Catatan", d.notes]]} />
        </Card>
        <Card title="Riwayat ViewPoint 6" className="xl:col-span-2" actions={<LinkButton small variant="outline" href={`/viewpoint/new?customerId=${d.customerId}`}>+ Instalasi</LinkButton>}>
          {d.vp6Installations.length === 0 ? <Empty>Alat ini belum terhubung ke instalasi ViewPoint 6.</Empty> : (
            <ul className="space-y-3">
              {d.vp6Installations.map(({ installation: v }) => (
                <li key={v.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <Link href={`/viewpoint/${v.id}`} className="font-medium text-teal-800 hover:underline">Instalasi {tanggal(v.installDate)}</Link> <Badge tone="teal">{v.currentVersion}</Badge> {v.package && <span className="text-slate-500">· {v.package.name}</span>}
                  <div className="mt-1 text-xs text-slate-500">Riwayat versi: {v.versionHistory.map((h) => `${h.toVersion} (${tanggal(h.changedDate)})`).join(" → ")}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Riwayat Tricefy" className="xl:col-span-3">
          {d.tricefySubscriptions.length === 0 ? <Empty>Alat ini belum terhubung ke langganan Tricefy.</Empty> : (
            <Table>
              <thead><tr><th>ID Tricefy</th><th>Package</th><th>Aktivasi</th><th>Berakhir</th><th>Status</th></tr></thead>
              <tbody>
                {d.tricefySubscriptions.map(({ subscription: s }) => {
                  const st = tricefyStatus(s.endDate, today);
                  return (
                    <tr key={s.id}>
                      <td><Link className="text-teal-800 hover:underline" href={`/tricefy/accounts/${s.accountId}`}>{s.account.tricefyId}</Link></td>
                      <td>{s.package?.name ?? "-"}</td>
                      <td>{tanggal(s.activationDate)}</td>
                      <td>{tanggal(s.endDate)}</td>
                      <td><TricefyBadge status={st.status} daysLeft={st.daysLeft} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Error log alat ini" className="xl:col-span-2">
          {d.errorLogs.length === 0 ? <Empty>Tidak ada.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {d.errorLogs.map((e) => <li key={e.id} className="py-2"><span className="text-xs text-slate-500">{tanggal(e.occurredAt)}</span> · {e.symptom}{e.solution && <span className="text-slate-600"> — {e.solution}</span>}</li>)}
            </ul>
          )}
        </Card>
        <Card title="Riwayat perubahan"><History entity="Device" entityId={d.id} /></Card>
      </div>
    </>
  );
}
