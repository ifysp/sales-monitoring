import { prisma } from "@/lib/prisma";
import { diffFields } from "@/lib/audit";
import { waktu } from "@/lib/format";
import { Badge, Empty } from "@/components/ui";

const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v).replace(/T00:00:00\.000Z$/, ""));

// Riwayat perubahan satu data (FR-12.2): siapa, kapan, field apa berubah dari → ke
export async function History({ entity, entityId }: { entity: string; entityId: number }) {
  const logs = await prisma.auditLog.findMany({
    where: { entity, entityId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (logs.length === 0) return <Empty>Belum ada riwayat perubahan.</Empty>;
  return (
    <ol className="space-y-3">
      {logs.map((l) => {
        const changes = l.action === "UPDATE" ? diffFields(l.before, l.after) : [];
        return (
          <li key={l.id} className="border-l-2 border-slate-200 pl-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={l.action === "DELETE" ? "red" : l.action === "CREATE" ? "green" : "blue"}>{l.action}</Badge>
              <span className="text-slate-700">{l.summary}</span>
            </div>
            <div className="text-xs text-slate-500">{waktu(l.createdAt)} · {l.user?.name ?? "-"}</div>
            {changes.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {changes.map((c) => (
                  <li key={c.field}>
                    <span className="font-medium">{c.field}</span>: <span className="line-through decoration-slate-400">{show(c.from)}</span> → {show(c.to)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
