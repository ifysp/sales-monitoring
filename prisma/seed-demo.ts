// Data DEMO untuk mencoba aplikasi / presentasi (semua berlabel [DEMO]).
// Jalankan: npm run seed:demo   — jangan dijalankan di database produksi.
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
const d = (days: number) => new Date(today.getTime() + days * 86400000);
const plus3y = (x: Date) => { const r = new Date(x); r.setUTCFullYear(r.getUTCFullYear() + 3); r.setUTCDate(r.getUTCDate() - 1); return r; };

async function main() {
  if (await prisma.customer.count({ where: { name: { startsWith: "[DEMO]" } } })) {
    console.log("Data demo sudah ada, dilewati.");
    return;
  }
  const stages = await prisma.stage.findMany({ orderBy: { sortOrder: "asc" } });
  const st = (name: string) => stages.find((s) => s.name === name)!.id;
  const pkg = async (name: string) => (await prisma.package.findFirst({ where: { name } }))?.id ?? null;
  const model = async (m: string) => (await prisma.machineModel.findFirst({ where: { model: m } }))?.id ?? null;

  // ── RS besar: topologi multi (2 USG → 1 server → 2 client), VP6 + Tricefy, cicilan 3 termin ──
  const rs = await prisma.customer.create({ data: { name: "[DEMO] RS Harapan Sehat", type: "RUMAH_SAKIT", geSiteId: "GE-DEMO-1001", city: "Jakarta Selatan", contactName: "dr. Rina, Sp.OG", phone: "0812-0000-0001" } });
  const [usg1, usg2] = await Promise.all([
    prisma.device.create({ data: { customerId: rs.id, serialNumber: "DEMO-P18-0001", machineModelId: await model("Voluson P18") } }),
    prisma.device.create({ data: { customerId: rs.id, serialNumber: "DEMO-E10S-0002", machineModelId: await model("Logiq E10s") } }),
  ]);
  const server = await prisma.pc.create({ data: { customerId: rs.id, hostname: "VP-SERVER-01", source: "COMPANY_RECOMMENDED", role: "SERVER", cpu: "Intel Xeon E-2334", ram: "32 GB", storage: "SSD 1 TB", os: "Windows Server 2022" } });
  const c1 = await prisma.pc.create({ data: { customerId: rs.id, hostname: "VP-CLIENT-POLI1", source: "CUSTOMER_OWNED", role: "CLIENT", cpu: "Intel Core i5-12400", ram: "16 GB", os: "Windows 11 Pro" } });
  const c2 = await prisma.pc.create({ data: { customerId: rs.id, hostname: "VP-CLIENT-POLI2", source: "CUSTOMER_OWNED", role: "CLIENT", cpu: "Intel Core i5-12400", ram: "16 GB", os: "Windows 11 Pro" } });
  const po1 = await prisma.purchaseOrder.create({
    data: {
      customerId: rs.id, poNumber: "PO/DEMO/001", poDate: d(-75), paymentMethod: "CICILAN", amount: 150000000, ppnPercent: 11,
      specialNotes: "Bundling VP6 + Tricefy, diskon 10%, cicilan 3x disetujui",
      stages: { create: [{ stageId: st("PO masuk"), completedAt: d(-75) }, { stageId: st("Berita acara"), completedAt: d(-62) }, { stageId: st("Aktivasi"), completedAt: d(-60) }, { stageId: st("Tukar faktur"), completedAt: d(-55) }] },
      invoices: { create: [
        { sequence: 1, invoiceNumber: "INV/DEMO/001-1", invoiceDate: d(-55), amount: 50000000, dueDate: d(-45), paidAt: d(-44) },
        { sequence: 2, invoiceNumber: "INV/DEMO/001-2", invoiceDate: d(-25), amount: 50000000, dueDate: d(-15) },
        { sequence: 3, amount: 50000000, dueDate: d(15) },
      ] },
    },
  });
  const vp = await prisma.vp6Installation.create({
    data: {
      customerId: rs.id, orderId: po1.id, packageId: await pkg("Obgyn Analytic"), licenseQty: 2, installDate: d(-62), currentVersion: "6.13", price: 90000000,
      apps: "Obgyn, Fetal Echo, Gyn", specialConfig: "Quick report trimester 1 khusus dr. Rina",
      devices: { create: [{ deviceId: usg1.id }, { deviceId: usg2.id }] },
      pcs: { create: [{ pcId: server.id }, { pcId: c1.id }, { pcId: c2.id }] },
      versionHistory: { create: [{ toVersion: "6.12", changedDate: d(-62), notes: "Instalasi awal" }, { fromVersion: "6.12", toVersion: "6.13", changedDate: d(-10), notes: "Upgrade rutin" }] },
    },
  });
  const accRs = await prisma.tricefyAccount.create({ data: { customerId: rs.id, tricefyId: "TRC-DEMO-1001", accountEmail: "radiologi@rs-demo.local" } });
  await prisma.tricefySubscription.create({
    data: { accountId: accRs.id, orderId: po1.id, packageId: await pkg("Unlimited"), installDate: d(-62), contractDate: d(-65), activationDate: d(-60), endDate: plus3y(d(-60)), price: 60000000, devices: { create: [{ deviceId: usg1.id }, { deviceId: usg2.id }] } },
  });
  await prisma.techNote.createMany({ data: [
    { customerId: rs.id, kind: "INTEGRASI", title: "Server integrasi", content: "Server di ruang IT Lt. 3, 2 client di poli kandungan" },
    { customerId: rs.id, kind: "PREFERENSI_DOKTER", title: "dr. Rina, Sp.OG", content: "Grafik Hadlock, quick report trimester 1" },
  ] });
  await prisma.errorLog.create({ data: { customerId: rs.id, deviceId: usg1.id, occurredAt: d(-8), symptom: "Ping ke server selalu fail", cause: "Firewall RS memblok ICMP", solution: "Normal untuk site ini — cukup cek verify, hasilnya OK" } });

  // ── Klinik kecil: standalone (1 USG → 1 PC Server+Client), Tricefy hampir habis ──
  const kl = await prisma.customer.create({ data: { name: "[DEMO] Klinik Ibu & Anak Bunda", type: "KLINIK", geSiteId: "GE-DEMO-2002", city: "Tangerang", contactName: "dr. Sari" } });
  const usg3 = await prisma.device.create({ data: { customerId: kl.id, serialNumber: "DEMO-E10-0003", machineModelId: await model("Voluson E10") } });
  const pc = await prisma.pc.create({ data: { customerId: kl.id, hostname: "KLINIK-PC", source: "COMPANY_RECOMMENDED", role: "SERVER_CLIENT", cpu: "Intel Core i7-12700", ram: "16 GB", storage: "SSD 512 GB", os: "Windows 11 Pro" } });
  const po2 = await prisma.purchaseOrder.create({
    data: {
      customerId: kl.id, poNumber: "PO/DEMO/002", poDate: d(-20), paymentMethod: "CASH", amount: 35000000,
      stages: { create: [{ stageId: st("PO masuk"), completedAt: d(-20) }, { stageId: st("Berita acara"), completedAt: d(-12) }] },
      invoices: { create: [{ sequence: 1, invoiceNumber: "INV/DEMO/002", invoiceDate: d(-10), amount: 35000000, dueDate: d(5) }] },
    },
  });
  await prisma.vp6Installation.create({
    data: { customerId: kl.id, orderId: po2.id, packageId: await pkg("Obgyn Basic"), licenseQty: 1, installDate: d(-12), currentVersion: "6.13", price: 35000000,
      devices: { create: [{ deviceId: usg3.id }] }, pcs: { create: [{ pcId: pc.id }] }, versionHistory: { create: { toVersion: "6.13", changedDate: d(-12), notes: "Instalasi awal" } } },
  });
  const accKl = await prisma.tricefyAccount.create({ data: { customerId: kl.id, tricefyId: "TRC-DEMO-2002" } });
  await prisma.tricefySubscription.create({ data: { accountId: accKl.id, packageId: await pkg("Studies 1000"), quantity: 1000, activationDate: d(-1060), endDate: d(35), devices: { create: [{ deviceId: usg3.id }] } } });

  // ── Dokter praktik: Tricefy saja (tanpa Site ID), sudah kedaluwarsa ──
  const dr = await prisma.customer.create({ data: { name: "[DEMO] dr. Andi, Sp.OG", type: "DOKTER", city: "Bekasi" } });
  const usg4 = await prisma.device.create({ data: { customerId: dr.id, serialNumber: "DEMO-P18-0004", machineModelId: await model("Voluson P18") } });
  const accDr = await prisma.tricefyAccount.create({ data: { customerId: dr.id, tricefyId: "TRC-DEMO-3003" } });
  await prisma.tricefySubscription.create({ data: { accountId: accDr.id, packageId: await pkg("Scanner license"), quantity: 1, activationDate: d(-1110), endDate: d(-15), devices: { create: [{ deviceId: usg4.id }] } } });

  console.log(`Data demo dibuat: 3 customer, 4 alat, 2 PO, 2 instalasi VP6 (${vp.currentVersion}), 3 akun Tricefy.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
