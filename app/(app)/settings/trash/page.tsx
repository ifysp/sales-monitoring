import { prisma } from "@/lib/prisma";
import { restoreItem, purgeItem, type TrashEntity } from "@/app/actions/trash";
import { tanggal, waktu } from "@/lib/format";
import { ConfirmDelete } from "@/components/client";
import { Badge, Card, Empty, PageHeader, Table } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";
import { RestoreButton } from "@/components/restore-button";

const clean = (v: string | null) => (v ? v.replace(/~hapus#\d+$/, "") : "");

// Data yang dihapus (soft delete): bisa dipulihkan atau dihapus permanen
export default async function TrashPage() {
  const deleted = { deletedAt: { not: null } } as const;
  const [customers, orders, devices, pcs, vp6, accounts, subs] = await Promise.all([
    prisma.customer.findMany({ where: deleted, orderBy: { deletedAt: "desc" } }),
    prisma.purchaseOrder.findMany({ where: deleted, include: { customer: true }, orderBy: { deletedAt: "desc" } }),
    prisma.device.findMany({ where: deleted, include: { customer: true }, orderBy: { deletedAt: "desc" } }),
    prisma.pc.findMany({ where: deleted, include: { customer: true }, orderBy: { deletedAt: "desc" } }),
    prisma.vp6Installation.findMany({ where: deleted, include: { customer: true }, orderBy: { deletedAt: "desc" } }),
    prisma.tricefyAccount.findMany({ where: deleted, include: { customer: true }, orderBy: { deletedAt: "desc" } }),
    prisma.tricefySubscription.findMany({ where: deleted, include: { account: { include: { customer: true } } }, orderBy: { deletedAt: "desc" } }),
  ]);
  const rows: { entity: TrashEntity; id: number; type: string; name: string; sub: string; deletedAt: Date }[] = [
    ...customers.map((c) => ({ entity: "customer" as const, id: c.id, type: "Customer", name: c.name, sub: clean(c.geSiteId) ? `Site ID ${clean(c.geSiteId)}` : "", deletedAt: c.deletedAt! })),
    ...orders.map((o) => ({ entity: "order" as const, id: o.id, type: "PO", name: `PO ${clean(o.poNumber)}`, sub: o.customer.name, deletedAt: o.deletedAt! })),
    ...devices.map((d) => ({ entity: "device" as const, id: d.id, type: "Alat USG", name: `SN ${clean(d.serialNumber)}`, sub: d.customer.name, deletedAt: d.deletedAt! })),
    ...pcs.map((p) => ({ entity: "pc" as const, id: p.id, type: "PC", name: p.hostname ?? `PC #${p.id}`, sub: p.customer.name, deletedAt: p.deletedAt! })),
    ...vp6.map((v) => ({ entity: "vp6" as const, id: v.id, type: "ViewPoint 6", name: `Instalasi ${tanggal(v.installDate)} · ${v.currentVersion}`, sub: v.customer.name, deletedAt: v.deletedAt! })),
    ...accounts.map((a) => ({ entity: "account" as const, id: a.id, type: "Akun Tricefy", name: clean(a.tricefyId), sub: a.customer.name, deletedAt: a.deletedAt! })),
    ...subs.map((s) => ({ entity: "subscription" as const, id: s.id, type: "Langganan Tricefy", name: `${tanggal(s.activationDate)} – ${tanggal(s.endDate)}`, sub: `${clean(s.account.tricefyId)} · ${s.account.customer.name}`, deletedAt: s.deletedAt! })),
  ].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());

  return (
    <>
      <PageHeader title="Pengaturan" />
      <SettingsNav current="/settings/trash" />
      <Card title={`Data terhapus (${rows.length})`} actions={<span className="text-xs text-slate-500">Pulihkan = kembali seperti semula · Hapus permanen = hilang dari database</span>}>
        {rows.length === 0 ? <Empty>Tidak ada data terhapus.</Empty> : (
          <Table>
            <thead><tr><th>Jenis</th><th>Data</th><th>Dihapus</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.entity}-${r.id}`}>
                  <td><Badge>{r.type}</Badge></td>
                  <td><div className="font-medium">{r.name}</div><div className="text-xs text-slate-500">{r.sub}</div></td>
                  <td className="whitespace-nowrap text-slate-600">{waktu(r.deletedAt)}</td>
                  <td className="whitespace-nowrap text-right">
                    <RestoreButton action={restoreItem.bind(null, r.entity, r.id)} />{" "}
                    <ConfirmDelete action={purgeItem.bind(null, r.entity, r.id)} what={`${r.name} secara permanen${r.entity === "customer" ? " beserta semua PO, alat, PC, VP6, dan Tricefy-nya" : ""}`} label="Hapus permanen" />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
