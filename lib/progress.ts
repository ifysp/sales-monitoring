// Progress bar PO: setiap tahap aktif = 1 segmen.
// Tahap pembayaran dipecah menjadi 1 segmen per invoice/termin (cash = 1, cicilan = N).

export type StageLite = { id: number; name: string; sortOrder: number; isPayment: boolean };
export type PoStageLite = { stageId: number; completedAt: Date | null };
export type InvoiceLite = { sequence: number; paidAt: Date | null; dueDate: Date };

export type Segment = { label: string; done: boolean; date: Date | null };
export type Progress = { segments: Segment[]; percent: number; current: string; complete: boolean };

export function computeProgress(stages: StageLite[], poStages: PoStageLite[], invoices: InvoiceLite[]): Progress {
  const byStage = new Map(poStages.map((p) => [p.stageId, p]));
  const segments: Segment[] = [];
  for (const st of [...stages].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (st.isPayment) {
      if (invoices.length === 0) {
        segments.push({ label: `${st.name} (invoice belum dibuat)`, done: false, date: null });
      } else {
        const many = invoices.length > 1;
        for (const inv of [...invoices].sort((a, b) => a.sequence - b.sequence)) {
          segments.push({ label: many ? `Termin ${inv.sequence}` : st.name, done: !!inv.paidAt, date: inv.paidAt });
        }
      }
    } else {
      const ps = byStage.get(st.id);
      segments.push({ label: st.name, done: !!ps?.completedAt, date: ps?.completedAt ?? null });
    }
  }
  const done = segments.filter((s) => s.done).length;
  const next = segments.find((s) => !s.done);
  return {
    segments,
    percent: segments.length ? Math.round((done / segments.length) * 100) : 0,
    current: next ? next.label : "Selesai",
    complete: !next,
  };
}
