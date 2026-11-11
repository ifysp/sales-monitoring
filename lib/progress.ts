// Alur dokumen PO (v3):
//   1. PO diterima      → wajib file PO
//   2. Invoice & BA     → wajib no. invoice, tgl invoice, nilai final, tgl BA, file invoice, file BA
//   3. Tukar faktur     → wajib tgl tukar faktur, file tanda terima
//   4. Penagihan        → setiap termin lunas wajib bukti bayar (cash = 1 termin, cicilan = N termin)
//   5. Clear            → otomatis setelah semua termin lunas
// Setiap langkah baru terbuka bila langkah sebelumnya selesai (tidak bisa dilompati).

export type DocOrder = {
  poDate: Date;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  finalAmount: unknown; // Decimal | null
  baDate: Date | null;
  tukarFakturDate: Date | null;
  attachments: { kind: string; paymentId: number | null }[];
  payments: { id: number; sequence: number; paidAt: Date | null; dueDate: Date }[];
};

export type StepKey = "po" | "invoice" | "tukar" | "payment" | "clear";
export type Step = { key: StepKey; label: string; done: boolean; open: boolean; date: Date | null; missing: string[] };

export type Flow = {
  steps: Step[];
  canUndoInvoice: boolean;
  canUndoTukar: boolean;
  nextPaySeq: number | null;
  lastPaidSeq: number | null;
  paidCount: number;
};

export function computeFlow(o: DocOrder): Flow {
  const kinds = new Set(o.attachments.filter((a) => a.paymentId === null).map((a) => a.kind));
  const pays = [...o.payments].sort((a, b) => a.sequence - b.sequence);
  const paidCount = pays.filter((p) => p.paidAt).length;

  const poMissing = kinds.has("PO") ? [] : ["File PO"];
  const invMissing = [
    !o.invoiceNumber && "No. invoice",
    !o.invoiceDate && "Tanggal invoice",
    (o.finalAmount === null || o.finalAmount === undefined) && "Nilai final",
    !o.baDate && "Tanggal BA",
    !kinds.has("INVOICE") && "File invoice",
    !kinds.has("BERITA_ACARA") && "File BA",
  ].filter(Boolean) as string[];
  const tukarMissing = [!o.tukarFakturDate && "Tanggal tukar faktur", !kinds.has("TANDA_TERIMA") && "File tanda terima"].filter(Boolean) as string[];
  const payMissing = pays.length === 0 ? ["Jadwal penagihan"] : pays.length - paidCount > 0 ? [`${pays.length - paidCount} termin belum lunas`] : [];

  const raw: Omit<Step, "open">[] = [
    { key: "po", label: "PO diterima", done: poMissing.length === 0, date: o.poDate, missing: poMissing },
    { key: "invoice", label: "Invoice & BA", done: invMissing.length === 0, date: o.invoiceDate, missing: invMissing },
    { key: "tukar", label: "Tukar faktur", done: tukarMissing.length === 0, date: o.tukarFakturDate, missing: tukarMissing },
    { key: "payment", label: "Penagihan", done: payMissing.length === 0, date: pays.at(-1)?.paidAt ?? null, missing: payMissing },
  ];
  const allDone = raw.every((s) => s.done);
  raw.push({ key: "clear", label: "Clear", done: allDone, date: allDone ? raw[3].date : null, missing: [] });

  const steps = raw.map((s, i) => ({ ...s, open: raw.slice(0, i).every((p) => p.done) }));
  const step = (k: StepKey) => steps.find((s) => s.key === k)!;
  const next = pays.find((p) => !p.paidAt);
  const last = [...pays].reverse().find((p) => p.paidAt);
  return {
    steps,
    // Mundur hanya dari langkah terakhir yang berjalan
    canUndoInvoice: step("invoice").done && !o.tukarFakturDate,
    canUndoTukar: !!o.tukarFakturDate && paidCount === 0,
    nextPaySeq: step("payment").open && next ? next.sequence : null,
    lastPaidSeq: last ? last.sequence : null,
    paidCount,
  };
}

export type Segment = { label: string; done: boolean; date: Date | null };
export type Progress = { segments: Segment[]; percent: number; current: string; complete: boolean };

// Progress bar: langkah 1–3 masing-masing 1 segmen, penagihan 1 segmen per termin, lalu Clear
export function computeProgress(o: DocOrder): Progress {
  const flow = computeFlow(o);
  const segments: Segment[] = [];
  for (const s of flow.steps) {
    if (s.key === "payment") {
      const pays = [...o.payments].sort((a, b) => a.sequence - b.sequence);
      if (pays.length === 0) segments.push({ label: "Penagihan", done: false, date: null });
      else for (const p of pays) segments.push({ label: pays.length > 1 ? `Termin ${p.sequence}` : "Pembayaran", done: !!p.paidAt, date: p.paidAt });
    } else {
      segments.push({ label: s.label, done: s.done, date: s.done ? s.date : null });
    }
  }
  const done = segments.filter((s) => s.done).length;
  const next = segments.find((s) => !s.done);
  return { segments, percent: Math.round((done / segments.length) * 100), current: next ? next.label : "Selesai", complete: !next };
}
