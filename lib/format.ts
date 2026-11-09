// Format angka & tanggal untuk tampilan (Indonesia)

export function rupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Kolom @db.Date dari Prisma berupa Date jam 00:00 UTC → baca bagian UTC agar tidak geser hari
export function tanggal(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function waktu(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(d);
}

// Untuk value <input type="date">
export function toInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

// Tanggal hari ini (zona Jakarta) sebagai Date UTC 00:00, cocok dibandingkan dengan kolom @db.Date
export function todayDate(): Date {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return new Date(`${s}T00:00:00.000Z`);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  RUMAH_SAKIT: "Rumah Sakit",
  KLINIK: "Klinik",
  DOKTER: "Dokter",
  LAINNYA: "Lainnya",
};

export const PAYMENT_LABEL: Record<string, string> = { CASH: "Cash", CICILAN: "Cicilan" };

export const ATTACHMENT_LABEL: Record<string, string> = {
  PO: "PO",
  BERITA_ACARA: "Berita Acara",
  FAKTUR: "Faktur",
  BUKTI_BAYAR: "Bukti Bayar",
  ERROR: "Error",
  LAINNYA: "Lainnya",
};

export const CONFIG_LABEL: Record<string, string> = {
  INTEGRASI: "Integrasi",
  PREFERENSI_DOKTER: "Preferensi Dokter",
  QUICK_REPORT: "Quick Report",
  JURNAL_GRAFIK: "Jurnal & Grafik",
  LAINNYA: "Lainnya",
};
