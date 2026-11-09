// Menghitung progress bar sebuah PO.
// Setiap tahap aktif = 1 segmen. Untuk PO cicilan, tahap pembayaran dipecah menjadi 1 segmen per cicilan.

export type StageLite = { id: number; name: string; sortOrder: number; isPayment: boolean };
export type PoStageLite = { stageId: number; completedAt: Date | null };
export type InstallmentLite = { number: number; paidAt: Date | null; dueDate: Date };

export type Segment = { label: string; done: boolean; date: Date | null; kind: "stage" | "installment" };

export type Progress = {
  segments: Segment[];
  percent: number;
  current: string; // tahap yang sedang berjalan
  complete: boolean;
};

export function computeProgress(
  stages: StageLite[],
  poStages: PoStageLite[],
  paymentMethod: "CASH" | "CICILAN",
  installments: InstallmentLite[],
): Progress {
  const byStage = new Map(poStages.map((p) => [p.stageId, p]));
  const segments: Segment[] = [];
  const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const st of sorted) {
    if (st.isPayment && paymentMethod === "CICILAN") {
      if (installments.length === 0) {
        segments.push({ label: `${st.name} (jadwal cicilan belum diatur)`, done: false, date: null, kind: "installment" });
      } else {
        for (const ins of [...installments].sort((a, b) => a.number - b.number)) {
          segments.push({ label: `Cicilan ${ins.number}`, done: !!ins.paidAt, date: ins.paidAt, kind: "installment" });
        }
      }
    } else {
      const ps = byStage.get(st.id);
      segments.push({ label: st.name, done: !!ps?.completedAt, date: ps?.completedAt ?? null, kind: "stage" });
    }
  }

  const doneCount = segments.filter((s) => s.done).length;
  const percent = segments.length ? Math.round((doneCount / segments.length) * 100) : 0;
  const next = segments.find((s) => !s.done);
  return { segments, percent, current: next ? next.label : "Selesai", complete: !next };
}
