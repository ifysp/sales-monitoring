// Data awal: 2 akun Admin, package sementara, tahapan, model alat.
// Jalankan: npx prisma db seed   (aman dijalankan ulang)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  // ── Pengguna: keduanya Admin (GANTI PASSWORD setelah login pertama di menu Pengaturan) ──
  const users = [
    { name: "Kak Sara", email: "sara@swit.local", password: "Admin12345" },
    { name: "Minnie", email: "minnie@swit.local", password: "Admin12345" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, role: "ADMIN", passwordHash: await bcrypt.hash(u.password, 10) },
    });
  }

  // ── Package sementara (ubah di Pengaturan → Master data) ──
  if ((await prisma.package.count()) === 0) {
    await prisma.package.createMany({
      data: [
        { product: "TRICEFY", name: "Scanner license", unit: "scanner" },
        { product: "TRICEFY", name: "Basic license", unit: "lisensi" },
        { product: "TRICEFY", name: "Studies 1000", unit: "studies" },
        { product: "TRICEFY", name: "Unlimited" },
        { product: "TRICEFY", name: "Custom" },
        { product: "VIEWPOINT", name: "Obgyn Basic", unit: "lisensi" },
        { product: "VIEWPOINT", name: "Obgyn Analytic", unit: "lisensi" },
        { product: "VIEWPOINT", name: "Radiologi Basic", unit: "lisensi" },
        { product: "VIEWPOINT", name: "Radiologi Analytic", unit: "lisensi" },
        { product: "VIEWPOINT", name: "Cardio", unit: "lisensi" },
        { product: "VIEWPOINT", name: "Custom", unit: "lisensi" },
      ],
    });
  }

  // ── Tahapan progres PO (tahap "Payment" dipecah otomatis per invoice/termin) ──
  if ((await prisma.stage.count()) === 0) {
    await prisma.stage.createMany({
      data: [
        { name: "PO masuk", sortOrder: 1 },
        { name: "Berita acara", sortOrder: 2 },
        { name: "Aktivasi", sortOrder: 3 },
        { name: "Tukar faktur", sortOrder: 4 },
        { name: "Payment", sortOrder: 5, isPayment: true },
        { name: "Clear", sortOrder: 6 },
      ],
    });
  }

  // ── Model alat USG ──
  if ((await prisma.machineModel.count()) === 0) {
    await prisma.machineModel.createMany({
      data: ["Voluson P18", "Voluson E10", "Voluson Expert 22", "Voluson Signature 20", "Logiq E10s", "Logiq P9", "Vivid E95"].map((model) => ({ brand: "GE", model })),
    });
  }

  console.log("Seed selesai. Login: sara@swit.local / minnie@swit.local, password awal Admin12345");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
