// Data DEMO untuk mencoba aplikasi / presentasi. Jangan dijalankan di database produksi.
// Jalankan: npm run seed:demo
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
const d = (days: number) => new Date(today.getTime() + days * 86400000);

async function main() {
  if ((await prisma.customer.count({ where: { name: { startsWith: "[DEMO]" } } })) > 0) {
    console.log("Data demo sudah ada, dilewati.");
    return;
  }
  const stages = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
  const pkg = async (name: string) => (await prisma.package.findFirst({ where: { name } }))?.id ?? null;
  const tricefy = await prisma.product.findUniqueOrThrow({ where: { code: "TRICEFY" } });
  const vp = await prisma.product.findUniqueOrThrow({ where: { code: "VIEWPOINT" } });
  const p18 = await prisma.machineModel.findFirst({ where: { model: "Voluson P18" } });
  const e10s = await prisma.machineModel.findFirst({ where: { model: "Logiq E10s" } });
  const st = (n: number) => stages[n - 1].id;

  const rsA = await prisma.customer.create({ data: { name: "[DEMO] RS Harapan Sehat", type: "RUMAH_SAKIT", city: "Jakarta Selatan", picName: "Bu Rina (Radiologi)", phone: "0812-0000-0001" } });
  const klinik = await prisma.customer.create({ data: { name: "[DEMO] Klinik Ibu & Anak Bunda", type: "KLINIK", city: "Tangerang", picName: "dr. Sari" } });
  const dokter = await prisma.customer.create({ data: { name: "[DEMO] dr. Andi, Sp.OG", type: "DOKTER", city: "Bekasi" } });

  // PO 1: Tricefy cash, sudah sampai tukar faktur
  await prisma.purchaseOrder.create({
    data: {
      customerId: rsA.id, poNumber: "PO/DEMO/001", invoiceNumber: "INV-DEMO-001", poDate: d(-40), paymentMethod: "CASH",
      price: 45000000, ppnPercent: 11, amountReceived: 0, specialNotes: "Diskon 10% karena perpanjangan kontrak",
      items: { create: [{ productId: tricefy.id, packageId: await pkg("Unlimited"), machineModelId: e10s?.id, serialNumber: "SN-E10S-0001", triceId: "TRC-1001", installDate: d(-35), contractStart: d(-35), contractEnd: d(60) }] },
      stages: { create: [{ stageId: st(1), completedAt: d(-40) }, { stageId: st(2), completedAt: d(-30) }, { stageId: st(3), completedAt: d(-28) }] },
    },
  });

  // PO 2: Tricefy + Viewpoint dalam satu PO, cicilan 3x
  const po2 = await prisma.purchaseOrder.create({
    data: {
      customerId: klinik.id, poNumber: "PO/DEMO/002", poDate: d(-75), paymentMethod: "CICILAN", price: 90000000, amountReceived: 30000000,
      specialNotes: "Cicilan 3x disetujui Lead SWIT",
      items: { create: [
        { productId: tricefy.id, packageId: await pkg("Studies 1000"), quantity: 1000, machineModelId: p18?.id, serialNumber: "SN-P18-0042", triceId: "TRC-2002", installDate: d(-70), contractStart: d(-70), contractEnd: d(-70 + 365 * 3 - 1) },
        { productId: vp.id, packageId: await pkg("Obgyn Analytic"), quantity: 2, siteCode: "VP-SITE-77", installDate: d(-68) },
      ] },
      stages: { create: [{ stageId: st(1), completedAt: d(-75) }, { stageId: st(2), completedAt: d(-66) }, { stageId: st(3), completedAt: d(-65) }, { stageId: st(4), completedAt: d(-60) }] },
      installments: { create: [
        { number: 1, amount: 30000000, dueDate: d(-45), paidAt: d(-44) },
        { number: 2, amount: 30000000, dueDate: d(-15) },
        { number: 3, amount: 30000000, dueDate: d(15) },
      ] },
    },
  });

  // PO 3: Viewpoint cash, selesai (Clear)
  await prisma.purchaseOrder.create({
    data: {
      customerId: dokter.id, poNumber: "PO/DEMO/003", poDate: d(-20), paymentMethod: "CASH", price: 25000000, amountReceived: 25000000,
      items: { create: [{ productId: vp.id, packageId: await pkg("Obgyn Basic"), quantity: 1, machineModelId: p18?.id, serialNumber: "SN-P18-0100", installDate: d(-18) }] },
      stages: { create: stages.map((s, i) => ({ stageId: s.id, completedAt: d(-20 + i * 2) })) },
    },
  });

  // Site teknis + konfigurasi + error history
  const site = await prisma.site.create({
    data: {
      customerId: rsA.id, name: "Radiologi Lt. 2", siteCode: "VP-SITE-12", pcInfo: "PC dari RS — Intel i7, RAM 16 GB, Windows 11", applications: "Tricefy Uploader, Viewpoint 6",
      configs: { create: [
        { kind: "INTEGRASI", title: "Server integrasi", content: "Server di ruang IT Lt. 3, 4 client terhubung" },
        { kind: "PREFERENSI_DOKTER", title: "dr. Budi, Sp.Rad", content: "Wajib quick report kehamilan trimester 1; grafik Hadlock" },
      ] },
      errorLogs: { create: [{ occurredAt: d(-10), symptom: "Ping ke server selalu fail", cause: "Firewall RS memblok ICMP", solution: "Normal untuk site ini. Cukup cek verify — hasilnya OK." }] },
    },
  });
  console.log(`Data demo dibuat (PO ${po2.poNumber}, site ${site.name}, dll).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
