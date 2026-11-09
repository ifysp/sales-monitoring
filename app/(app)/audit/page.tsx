import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { waktu } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Table } from "@/components/ui";

export default async function AuditPage() {
  const me = await requireUser();
  if (me.role !== "ADMIN") redirect("/");
  const logs = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 300 });
  const tone = (a: string) => (a === "DELETE" ? "red" : a === "CREATE" ? "green" : a === "LOGIN" ? "slate" : "blue");
  return (
    <>
      <PageHeader title="Audit log" subtitle="300 aktivitas terakhir: siapa mengubah apa dan kapan" />
      <Card>
        {logs.length === 0 ? <Empty>Belum ada aktivitas.</Empty> : (
          <Table>
            <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Data</th><th>Detail</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-slate-600">{waktu(l.createdAt)}</td>
                  <td>{l.user?.name ?? "-"}</td>
                  <td><Badge tone={tone(l.action)}>{l.action}</Badge></td>
                  <td>{l.entity}{l.entityId ? ` #${l.entityId}` : ""}</td>
                  <td className="text-slate-600">{l.detail ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
