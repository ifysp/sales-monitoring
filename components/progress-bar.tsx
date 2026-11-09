import type { Progress } from "@/lib/progress";
import { tanggal } from "@/lib/format";
import { cn } from "@/components/ui";

// Bar bersegmen: hijau = selesai, abu-abu = belum. Detail=true menampilkan label tiap segmen.
export function ProgressBar({ progress, detail = false }: { progress: Progress; detail?: boolean }) {
  const { segments, percent, current, complete } = progress;
  return (
    <div className="min-w-[180px]">
      <div className="flex gap-0.5" role="img" aria-label={`Progres ${percent}%`}>
        {segments.map((s, i) => (
          <div
            key={i}
            title={`${s.label}${s.done ? ` — ${tanggal(s.date)}` : " — belum"}`}
            className={cn(
              "h-2.5 flex-1 first:rounded-l-full last:rounded-r-full",
              s.done ? (complete ? "bg-emerald-500" : "bg-teal-600") : "bg-slate-200",
            )}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{complete ? "Clear — lunas & selesai" : `Tahap: ${current}`}</span>
        <span className="font-medium text-slate-700">{percent}%</span>
      </div>
      {detail && (
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {segments.map((s, i) => (
            <li key={i} className={cn("rounded-md border px-2 py-1.5 text-xs", s.done ? "border-teal-200 bg-teal-50" : "border-slate-200")}>
              <div className="font-medium text-slate-800">{s.label}</div>
              <div className="text-slate-500">{s.done ? tanggal(s.date) : "belum"}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
