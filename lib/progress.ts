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

// ───────── Aturan urutan (tahapan tidak boleh dilompati) ─────────
// - Tahap hanya bisa diselesaikan bila semua tahap sebelumnya sudah selesai.
// - Tahap hanya bisa dibatalkan bila tahap sesudahnya belum dimulai.
// - Tahap pembayaran = invoice: termin dibayar berurutan, setelah tahap sebelum pembayaran selesai.
// - Tahap sesudah pembayaran (mis. Clear) baru bisa setelah semua termin lunas.

export type StageFlow = StageLite & { done: boolean; date: Date | null; canComplete: boolean; canUndo: boolean; blockedBy: string | null };
export type Flow = {
  stages: StageFlow[];
  payReady: boolean; // semua tahap sebelum pembayaran sudah selesai
  nextPaySeq: number | null; // termin yang boleh ditandai lunas berikutnya
  lastPaidSeq: number | null; // termin lunas terakhir (yang boleh dibatalkan)
  canUndoPay: boolean; // tahap sesudah pembayaran belum dimulai
};

export function computeFlow(stages: StageLite[], poStages: PoStageLite[], invoices: InvoiceLite[]): Flow {
  const byStage = new Map(poStages.map((p) => [p.stageId, p]));
  const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const inv = [...invoices].sort((a, b) => a.sequence - b.sequence);
  const allPaid = inv.length > 0 && inv.every((i) => i.paidAt);
  const anyPaid = inv.some((i) => i.paidAt);
  const isDone = (s: StageLite) => (s.isPayment ? allPaid : !!byStage.get(s.id)?.completedAt);
  const isStarted = (s: StageLite) => (s.isPayment ? anyPaid : !!byStage.get(s.id)?.completedAt);

  const flow = sorted.map((s, i) => {
    const before = sorted.slice(0, i);
    const after = sorted.slice(i + 1);
    const firstUndone = before.find((b) => !isDone(b));
    const done = isDone(s);
    return {
      ...s,
      done,
      date: s.isPayment ? null : byStage.get(s.id)?.completedAt ?? null,
      canComplete: !s.isPayment && !done && !firstUndone,
      canUndo: !s.isPayment && done && !after.some(isStarted),
      blockedBy: !done && firstUndone ? firstUndone.name : null,
    };
  });
  const payIdx = sorted.findIndex((s) => s.isPayment);
  const payReady = payIdx < 0 || sorted.slice(0, payIdx).every(isDone);
  const afterPay = payIdx < 0 ? [] : sorted.slice(payIdx + 1);
  const nextUnpaid = inv.find((i) => !i.paidAt);
  const lastPaid = [...inv].reverse().find((i) => i.paidAt);
  return {
    stages: flow,
    payReady,
    nextPaySeq: payReady && nextUnpaid ? nextUnpaid.sequence : null,
    lastPaidSeq: lastPaid ? lastPaid.sequence : null,
    canUndoPay: !afterPay.some(isStarted),
  };
}
