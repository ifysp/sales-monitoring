// Data awal: akun, produk, package sementara, tahapan, model mesin.
// Jalankan: npx prisma db seed   (aman dijalankan ulang)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  // ── Pengguna (GANTI PASSWORD setelah login pertama di menu Akun) ──
  const users = [
    { name: "Lead SWIT", email: "lead@swit.local", password: "Admin12345", role: "ADMIN" as const },
    { name: "Minnie", email: "minnie@swit.local", password: "User12345", role: "USER" as const },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, role: u.role, passwordHash: await bcrypt.hash(u.password, 10) },
    });
  }

  // ── Produk ──
  const tricefy = await prisma.product.upsert({ where: { code: "TRICEFY" }, update: {}, create: { code: "TRICEFY", name: "Tricefy" } });
  const viewpoint = await prisma.product.upsert({ where: { code: "VIEWPOINT" }, update: {}, create: { code: "VIEWPOINT", name: "Viewpoint 6" } });

  // ── Package sementara (ubah di menu Master Data) ──
  if ((await prisma.package.count()) === 0) {
    await prisma.package.createMany({
      data: [
        { productId: tricefy.id, name: "Scanner license", unit: "scanner" },
        { productId: tricefy.id, name: "Basic license", unit: "lisensi" },
        { productId: tricefy.id, name: "Studies 1000", unit: "studies" },
        { productId: tricefy.id, name: "Unlimited", unit: null },
        { productId: tricefy.id, name: "Custom", unit: null },
        { productId: viewpoint.id, name: "Obgyn Basic", unit: "lisensi" },
        { productId: viewpoint.id, name: "Obgyn Analytic", unit: "lisensi" },
        { productId: viewpoint.id, name: "Radiologi Basic", unit: "lisensi" },
        { productId: viewpoint.id, name: "Radiologi Analytic", unit: "lisensi" },
        { productId: viewpoint.id, name: "Cardio", unit: "lisensi" },
        { productId: viewpoint.id, name: "Custom", unit: "lisensi" },
      ],
    });
  }

  // ── Tahapan progres ──
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

  // ── Model mesin USG ──
  if ((await prisma.machineModel.count()) === 0) {
    await prisma.machineModel.createMany({
      data: [
        { brand: "GE", model: "Voluson P18" },
        { brand: "GE", model: "Voluson E10" },
        { brand: "GE", model: "Voluson Expert 22" },
        { brand: "GE", model: "Voluson Signature 20" },
        { brand: "GE", model: "Logiq E10s" },
        { brand: "GE", model: "Logiq P9" },
        { brand: "GE", model: "Vivid E95" },
      ],
    });
  }

  console.log("Seed selesai. Login: lead@swit.local / Admin12345 (Admin), minnie@swit.local / User12345 (User)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
