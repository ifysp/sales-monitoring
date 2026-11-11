import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { topology } from "@/lib/queries";
import { deleteVp6, upgradeVp6 } from "@/app/actions/products";
import { PC_ROLE_LABEL, PC_SOURCE_LABEL, tanggal, toInputDate, todayDate } from "@/lib/format";
import { ActionForm, ConfirmDelete, SubmitButton } from "@/components/client";
import { Badge, Card, DL, Empty, Field, Input, LinkButton, PageHeader, Table } from "@/components/ui";
import { History } from "@/components/history";

export default async function Vp6DetailPage({ params }: PageProps<"/viewpoint/[id]">) {
  const { id } = await params;
  const v = await prisma.vp6Installation.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      customer: true, order: true,
      devices: { include: { device: { include: { machineModel: true } } } },
      pcs: { include: { pc: true } },
      versionHistory: { orderBy: [{ changedDate: "desc" }, { id: "desc" }] },
    },
  });
  if (!v) notFound();
  return (
    <>
      <PageHeader
        title={`ViewPoint 6 · ${v.customer.name}`}
        subtitle={<span className="flex items-center gap-2"><Badge tone="teal">Versi {v.currentVersion}</Badge> Install {tanggal(v.installDate)} · <Link className="text-teal-800 hover:underline" href={`/customers/${v.customerId}?tab=viewpoint`}>lihat customer</Link></span>}
        actions={<><LinkButton variant="outline" href={`/viewpoint/${v.id}/edit`}>Edit</LinkButton><ConfirmDelete action={deleteVp6.bind(null, v.id)} what="instalasi ini" small={false} /></>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Data instalasi" className="xl:col-span-2">
          <DL items={[
            ["Site ID", v.customer.geSiteId],
            ["Topologi", topology(v.pcs)],
            ["Purchase Order", v.order ? <Link key="po" className="text-teal-800 hover:underline" href={`/orders/${v.order.id}`}>{v.order.poNumber}</Link> : null],
            ["Apps", v.apps],
            ["Special configuration", v.specialConfig],
            ["Catatan", v.notes],
          ]} />
        </Card>
        <Card title="Riwayat versi">
          <ActionForm action={upgradeVp6} resetOnSuccess className="mb-4 grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3">
            <input type="hidden" name="id" value={v.id} />
            <Field label="Versi baru *"><Input name="toVersion" required placeholder="mis. 6.13" /></Field>
            <Field label="Tanggal *"><Input type="date" name="changedDate" defaultValue={toInputDate(todayDate())} required /></Field>
            <Field label="Catatan" className="col-span-2"><Input name="notes" /></Field>
            <div><SubmitButton small>Catat upgrade</SubmitButton></div>
          </ActionForm>
          <ol className="space-y-2 text-sm">
            {v.versionHistory.map((h) => (
              <li key={h.id} className="border-l-2 border-teal-600 pl-3">
                <div className="font-medium">{h.fromVersion ? `${h.fromVersion} → ${h.toVersion}` : h.toVersion}</div>
                <div className="text-xs text-slate-500">{tanggal(h.changedDate)}{h.notes ? ` · ${h.notes}` : ""}</div>
              </li>
            ))}
          </ol>
        </Card>
        <Card title={`Alat USG (${v.devices.length})`}>
          {v.devices.length === 0 ? <Empty>Belum ada alat terhubung.</Empty> : (
            <ul className="space-y-1.5 text-sm">
              {v.devices.map(({ device: d }) => (
                <li key={d.id}><Link className="font-mono text-teal-800 hover:underline" href={`/devices/${d.id}`}>{d.serialNumber}</Link> <span className="text-slate-500">{d.machineModel ? `${d.machineModel.brand} ${d.machineModel.model}` : ""}</span></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`PC (${v.pcs.length})`} className="xl:col-span-2">
          {v.pcs.length === 0 ? <Empty>Belum ada PC terhubung.</Empty> : (
            <Table>
              <thead><tr><th>PC</th><th>Peran</th><th>Sumber</th><th>Spesifikasi</th></tr></thead>
              <tbody>
                {v.pcs.map(({ pc: p }) => (
                  <tr key={p.id}>
                    <td><Link className="text-teal-800 hover:underline" href={`/pcs/${p.id}/edit`}>{p.hostname ?? `PC #${p.id}`}</Link></td>
                    <td><Badge tone="blue">{PC_ROLE_LABEL[p.role]}</Badge></td>
                    <td>{PC_SOURCE_LABEL[p.source]}</td>
                    <td className="text-xs text-slate-600">{[p.cpu, p.ram && `RAM ${p.ram}`, p.storage, p.vga, p.os].filter(Boolean).join(" · ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Riwayat perubahan" className="xl:col-span-3"><History entity="Vp6Installation" entityId={v.id} /></Card>
      </div>
    </>
  );
}
