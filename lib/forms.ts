// Helper membaca nilai dari FormData
export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function req(fd: FormData, key: string, label: string): string {
  const v = str(fd, key);
  if (!v) throw new FormError(`${label} wajib diisi.`);
  return v;
}

export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new FormError(`Nilai "${key}" harus bilangan bulat.`);
  return n;
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) throw new FormError(`Nilai "${key}" harus angka.`);
  return n;
}

// "2026-11-09" → Date 00:00 UTC (cocok untuk kolom @db.Date)
export function dateVal(v: string | null | undefined): Date | null {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new FormError(`Format tanggal tidak valid: ${v}`);
  return new Date(`${v}T00:00:00.000Z`);
}

export function date(fd: FormData, key: string): Date | null {
  return dateVal(str(fd, key));
}

export class FormError extends Error {}

// Membungkus server action: error validasi dikembalikan sebagai pesan, bukan crash
export async function handle<T extends { error?: string; ok?: string } | undefined>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    if (isUniqueError(e)) return { error: uniqueMessage(e) };
    throw e;
  }
}

// Pelanggaran data unik (Site ID, SN, ID Tricefy, No. PO, No. Invoice) → pesan yang jelas (NFR-07)
const UNIQUE_LABEL: Record<string, string> = {
  geSiteId: "Site ID GE", serialNumber: "Serial number alat", tricefyId: "ID Tricefy",
  poNumber: "Nomor PO", invoiceNumber: "Nomor invoice", email: "Email",
};
function isUniqueError(e: unknown): e is { code: string; meta?: unknown; message: string } {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
function uniqueMessage(e: { meta?: unknown; message: string }): string {
  const text = JSON.stringify(e.meta ?? "") + e.message;
  const key = Object.keys(UNIQUE_LABEL).find((k) => text.includes(k));
  return `${key ? UNIQUE_LABEL[key] : "Data"} sudah dipakai oleh data lain. Nilainya harus unik.`;
}

export function ids(fd: FormData, key: string): number[] {
  return fd.getAll(key).map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

// Soft delete: kunci unik (Site ID, SN, ID Tricefy, No. PO) diberi akhiran agar nilainya bisa dipakai lagi.
// Nilai asli tetap tersimpan di audit log (kolom "before").
export function freeKey(value: string | null, id: number): string | null {
  return value ? `${value}~hapus#${id}` : null;
}
