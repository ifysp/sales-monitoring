import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { readUpload } from "@/lib/uploads";

// Menampilkan / mengunduh lampiran (hanya untuk pengguna yang login)
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[id]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const a = await prisma.attachment.findUnique({ where: { id: Number(id) } });
  if (!a) return new Response("Not found", { status: 404 });
  try {
    const data = await readUpload(a.storedName);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": a.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(a.fileName)}"`,
      },
    });
  } catch {
    return new Response("File tidak ditemukan di folder uploads/", { status: 404 });
  }
}
