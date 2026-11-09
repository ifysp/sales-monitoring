// Format tampilan (NFR-06): tanggal DD/MM/YYYY, mata uang Rupiah

export function rupiah(value: number | string | null | undefined | { toString(): string }): string {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const pad = (n: number) => String(n).padStart(2, "0");

// Kolom @db.Date dari Prisma = Date jam 00:00 UTC → baca bagian UTC agar tidak geser hari
export function tanggal(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

export function waktu(d: Date | null | undefined): string {
  if (!d) return "-";
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return p.replace(",", "");
}

export function toInputDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

// Hari ini (zona Jakarta) sebagai Date 00:00 UTC, cocok dibandingkan dengan kolom @db.Date
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

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  RUMAH_SAKIT: "Rumah Sakit", KLINIK: "Klinik", DOKTER: "Dokter", LAINNYA: "Lainnya",
};
export const PAYMENT_LABEL: Record<string, string> = { CASH: "Cash", CICILAN: "Cicilan" };
export const PRODUCT_LABEL: Record<string, string> = { VIEWPOINT: "ViewPoint 6", TRICEFY: "Tricefy" };
export const PC_SOURCE_LABEL: Record<string, string> = {
  COMPANY_RECOMMENDED: "Rekomendasi perusahaan", CUSTOMER_OWNED: "Milik customer",
};
export const PC_ROLE_LABEL: Record<string, string> = { SERVER_CLIENT: "Server + Client", SERVER: "Server", CLIENT: "Client" };
export const ATTACHMENT_LABEL: Record<string, string> = {
  PO: "PO", BERITA_ACARA: "Berita Acara", FAKTUR: "Faktur", INVOICE: "Invoice",
  BUKTI_BAYAR: "Bukti Bayar", ERROR: "Error", LAINNYA: "Lainnya",
};
export const TECH_NOTE_LABEL: Record<string, string> = {
  INTEGRASI: "Integrasi", PREFERENSI_DOKTER: "Preferensi Dokter", QUICK_REPORT: "Quick Report",
  JURNAL_GRAFIK: "Jurnal & Grafik", LAINNYA: "Lainnya",
};
export const ENTITY_LABEL: Record<string, string> = {
  Customer: "Customer", Device: "Alat USG", Pc: "PC", PurchaseOrder: "PO", Invoice: "Invoice",
  Vp6Installation: "Instalasi VP6", TricefyAccount: "Akun Tricefy", TricefySubscription: "Langganan Tricefy",
  TechNote: "Catatan teknis", ErrorLog: "Error log", Attachment: "Lampiran", User: "Pengguna",
  Package: "Package", Stage: "Tahapan", MachineModel: "Model mesin",
};
