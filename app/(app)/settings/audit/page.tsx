import { prisma } from "@/lib/prisma";
import { diffFields } from "@/lib/audit";
import { ENTITY_LABEL, waktu } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Table } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <>
      <PageHeader title="Pengaturan" />
      <SettingsNav current="/settings/audit" />
      <Card title="Log perubahan (300 terakhir)">
        {logs.length === 0 ? <Empty>Belum ada aktivitas.</Empty> : (
          <Table>
            <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Data</th><th>Keterangan</th></tr></thead>
            <tbody>
              {logs.map((l) => {
                const changed = l.action === "UPDATE" ? diffFields(l.before, l.after).map((c) => c.field) : [];
                return (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-slate-600">{waktu(l.createdAt)}</td>
                    <td>{l.user?.name ?? "-"}</td>
                    <td><Badge tone={l.action === "DELETE" ? "red" : l.action === "CREATE" ? "green" : l.action === "LOGIN" ? "slate" : "blue"}>{l.action}</Badge></td>
                    <td>{ENTITY_LABEL[l.entity] ?? l.entity}{l.entityId ? ` #${l.entityId}` : ""}</td>
                    <td className="text-slate-600">{l.summary}{changed.length > 0 && <div className="text-xs text-slate-500">Diubah: {changed.join(", ")}</div>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
