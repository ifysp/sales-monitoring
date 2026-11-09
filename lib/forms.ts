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
    if (e instanceof Error && e.message.startsWith("Hanya Admin")) return { error: e.message };
    throw e;
  }
}
