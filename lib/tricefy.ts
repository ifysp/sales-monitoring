import { daysBetween, todayDate } from "@/lib/format";

export type TricefyStatus = "AKTIF" | "AKAN_HABIS" | "KEDALUWARSA";

// Status otomatis (FR-06.4): Kedaluwarsa / Akan Habis (≤ 90 hari) / Aktif
export function tricefyStatus(endDate: Date, today = todayDate()): { status: TricefyStatus; daysLeft: number } {
  const daysLeft = daysBetween(today, endDate);
  if (daysLeft < 0) return { status: "KEDALUWARSA", daysLeft };
  if (daysLeft <= 90) return { status: "AKAN_HABIS", daysLeft };
  return { status: "AKTIF", daysLeft };
}

export const TRICEFY_STATUS_LABEL: Record<TricefyStatus, string> = {
  AKTIF: "Aktif",
  AKAN_HABIS: "Akan habis",
  KEDALUWARSA: "Kedaluwarsa",
};

// Default masa aktif 3 tahun sejak aktivasi (BR-04)
export function defaultEndDate(activation: Date): Date {
  const d = new Date(activation);
  d.setUTCFullYear(d.getUTCFullYear() + 3);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
