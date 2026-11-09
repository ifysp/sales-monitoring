import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FormError } from "@/lib/forms";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export async function saveUpload(file: File) {
  if (!file || file.size === 0) throw new FormError("Pilih file terlebih dahulu.");
  const ext = ALLOWED[file.type];
  if (!ext) throw new FormError("Format file harus PDF, JPG, atau PNG.");
  if (file.size > MAX_UPLOAD_BYTES) throw new FormError("Ukuran file maksimal 10 MB.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}${ext}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
  return { storedName, fileName: file.name, mimeType: file.type, size: file.size };
}

export async function readUpload(storedName: string) {
  return readFile(path.join(UPLOAD_DIR, path.basename(storedName)));
}

export async function removeUpload(storedName: string) {
  await unlink(path.join(UPLOAD_DIR, path.basename(storedName))).catch(() => {});
}
