// Grafik batang sederhana (SVG): instalasi ViewPoint 6 & aktivasi Tricefy per bulan (FR-08.2)
export function MonthChart({ data }: { data: { label: string; vp6: number; tricefy: number }[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.vp6, d.tricefy)));
  const W = 720, H = 200, left = 28, bottom = 24, top = 12;
  const slot = (W - left) / data.length;
  const bw = Math.min(14, slot / 3);
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const ticks = Array.from(new Set([0, Math.ceil(max / 2), max]));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Instalasi per bulan">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#64748b">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = left + slot * i + slot / 2;
          return (
            <g key={d.label}>
              <rect x={cx - bw - 1} y={y(d.vp6)} width={bw} height={H - bottom - y(d.vp6)} rx="2" fill="#0f766e"><title>{`${d.label}: ${d.vp6} instalasi VP6`}</title></rect>
              <rect x={cx + 1} y={y(d.tricefy)} width={bw} height={H - bottom - y(d.tricefy)} rx="2" fill="#38bdf8"><title>{`${d.label}: ${d.tricefy} aktivasi Tricefy`}</title></rect>
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748b">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal-700" /> Instalasi ViewPoint 6</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Aktivasi Tricefy</span>
      </div>
    </div>
  );
}
