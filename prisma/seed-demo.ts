// Data DEMO untuk mencoba aplikasi / presentasi (semua berlabel [DEMO]).
// Jalankan: npm run seed:demo   — jangan dijalankan di database produksi.
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient, type AttachmentKind } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
const d = (days: number) => new Date(today.getTime() + days * 86400000);
const plus3y = (x: Date) => { const r = new Date(x); r.setUTCFullYear(r.getUTCFullYear() + 3); r.setUTCDate(r.getUTCDate() - 1); return r; };

// PDF satu halaman berisi tulisan, sebagai file contoh lampiran
function tinyPdf(text: string) {
  const stream = `BT /F1 14 Tf 60 760 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out);
}

async function demoFile(orderId: number, kind: AttachmentKind, label: string, paymentId: number | null = null) {
  const dir = path.join(process.cwd(), "uploads");
  await mkdir(dir, { recursive: true });
  const storedName = `${randomUUID()}.pdf`;
  const data = tinyPdf(`[DEMO] ${label}`);
  await writeFile(path.join(dir, storedName), data);
  await prisma.attachment.create({ data: { orderId, paymentId, kind, fileName: `${label}.pdf`, storedName, mimeType: "application/pdf", size: data.length } });
}

async function main() {
  if (await prisma.customer.count({ where: { name: { startsWith: "[DEMO]" } } })) {
    console.log("Data demo sudah ada, dilewati.");
    return;
  }
  const model = async (m: string) => (await prisma.machineModel.findFirst({ where: { model: m } }))?.id ?? null;

  // ── RS besar: multi (2 USG → 1 server → 2 client), VP6 + Tricefy, cicilan 3 termin ──
  const rs = await prisma.customer.create({ data: { name: "[DEMO] RS Harapan Sehat", type: "RUMAH_SAKIT", geSiteId: "GE-DEMO-1001", city: "Jakarta Selatan", contactName: "dr. Rina, Sp.OG", phone: "0812-0000-0001" } });
  const usg1 = await prisma.device.create({ data: { customerId: rs.id, serialNumber: "DEMO-P18-0001", machineModelId: await model("Voluson P18") } });
  const usg2 = await prisma.device.create({ data: { customerId: rs.id, serialNumber: "DEMO-E10S-0002", machineModelId: await model("Logiq E10s") } });
  const server = await prisma.pc.create({ data: { customerId: rs.id, hostname: "VP-SERVER-01", source: "COMPANY_RECOMMENDED", role: "SERVER", cpu: "Intel Xeon E-2334", ram: "32 GB", storage: "SSD 1 TB", os: "Windows Server 2022" } });
  const c1 = await prisma.pc.create({ data: { customerId: rs.id, hostname: "VP-CLIENT-POLI1", source: "CUSTOMER_OWNED", role: "CLIENT", cpu: "Intel Core i5-12400", ram: "16 GB", os: "Windows 11 Pro" } });
  const c2 = await prisma.pc.create({ data: { customerId: rs.id, hostname: "VP-CLIENT-POLI2", source: "CUSTOMER_OWNED", role: "CLIENT", cpu: "Intel Core i5-12400", ram: "16 GB", os: "Windows 11 Pro" } });
  const po1 = await prisma.purchaseOrder.create({
    data: {
      customerId: rs.id, poNumber: "PO/DEMO/001", poDate: d(-75), paymentMethod: "CICILAN",
      invoiceNumber: "INV/DEMO/001", invoiceDate: d(-56), finalAmount: 150000000, baDate: d(-57), tukarFakturDate: d(-50),
      notes: "Bundling ViewPoint 6 + Tricefy, cicilan 3x",
      payments: { create: [
        { sequence: 1, amount: 50000000, dueDate: d(-45), paidAt: d(-44) },
        { sequence: 2, amount: 50000000, dueDate: d(-15) },
        { sequence: 3, amount: 50000000, dueDate: d(15) },
      ] },
    },
    include: { payments: true },
  });
  await demoFile(po1.id, "PO", "PO-DEMO-001");
  await demoFile(po1.id, "INVOICE", "INV-DEMO-001");
  await demoFile(po1.id, "BERITA_ACARA", "BA-DEMO-001");
  await demoFile(po1.id, "TANDA_TERIMA", "Tanda-terima-DEMO-001");
  await demoFile(po1.id, "BUKTI_BAYAR", "Bukti-bayar-termin-1", po1.payments.find((p) => p.sequence === 1)!.id);
  await prisma.vp6Installation.create({
    data: {
      customerId: rs.id, orderId: po1.id, installDate: d(-62), currentVersion: "6.13",
      apps: "Obgyn, Fetal Echo, Gyn", specialConfig: "Quick report trimester 1 khusus dr. Rina",
      devices: { create: [{ deviceId: usg1.id }, { deviceId: usg2.id }] },
      pcs: { create: [{ pcId: server.id }, { pcId: c1.id }, { pcId: c2.id }] },
      versionHistory: { create: [{ toVersion: "6.12", changedDate: d(-62), notes: "Instalasi awal" }, { fromVersion: "6.12", toVersion: "6.13", changedDate: d(-10), notes: "Upgrade rutin" }] },
    },
  });
  const accRs = await prisma.tricefyAccount.create({ data: { customerId: rs.id, tricefyId: "TRC-DEMO-1001", accountEmail: "radiologi@rs-demo.local" } });
  await prisma.tricefySubscription.create({
    data: { accountId: accRs.id, orderId: po1.id, installDate: d(-62), contractDate: d(-65), activationDate: d(-60), endDate: plus3y(d(-60)), devices: { create: [{ deviceId: usg1.id }, { deviceId: usg2.id }] } },
  });
  await prisma.techNote.createMany({ data: [
    { customerId: rs.id, kind: "INTEGRASI", title: "Server integrasi", content: "Server di ruang IT Lt. 3, 2 client di poli kandungan" },
    { customerId: rs.id, kind: "PREFERENSI_DOKTER", title: "dr. Rina, Sp.OG", content: "Grafik Hadlock, quick report trimester 1" },
  ] });
  await prisma.errorLog.create({ data: { customerId: rs.id, deviceId: usg1.id, occurredAt: d(-8), symptom: "Ping ke server selalu fail", cause: "Firewall RS memblok ICMP", solution: "Normal untuk site ini — cukup cek verify, hasilnya OK" } });

  // ── Klinik kecil: standalone, PO cash baru diterima (menunggu invoice & BA) ──
  const kl = await prisma.customer.create({ data: { name: "[DEMO] Klinik Ibu & Anak Bunda", type: "KLINIK", geSiteId: "GE-DEMO-2002", city: "Tangerang", contactName: "dr. Sari" } });
  const usg3 = await prisma.device.create({ data: { customerId: kl.id, serialNumber: "DEMO-E10-0003", machineModelId: await model("Voluson E10") } });
  const pc = await prisma.pc.create({ data: { customerId: kl.id, hostname: "KLINIK-PC", source: "COMPANY_RECOMMENDED", role: "SERVER_CLIENT", cpu: "Intel Core i7-12700", ram: "16 GB", storage: "SSD 512 GB", os: "Windows 11 Pro" } });
  const po2 = await prisma.purchaseOrder.create({ data: { customerId: kl.id, poNumber: "PO/DEMO/002", poDate: d(-5), paymentMethod: "CASH" } });
  await demoFile(po2.id, "PO", "PO-DEMO-002");
  await prisma.vp6Installation.create({
    data: { customerId: kl.id, orderId: po2.id, installDate: d(-2), currentVersion: "6.13",
      devices: { create: [{ deviceId: usg3.id }] }, pcs: { create: [{ pcId: pc.id }] }, versionHistory: { create: { toVersion: "6.13", changedDate: d(-2), notes: "Instalasi awal" } } },
  });
  const accKl = await prisma.tricefyAccount.create({ data: { customerId: kl.id, tricefyId: "TRC-DEMO-2002" } });
  await prisma.tricefySubscription.create({ data: { accountId: accKl.id, activationDate: d(-1060), endDate: d(35), devices: { create: [{ deviceId: usg3.id }] } } });

  // ── Dokter praktik: Tricefy saja (tanpa Site ID), sudah kedaluwarsa ──
  const dr = await prisma.customer.create({ data: { name: "[DEMO] dr. Andi, Sp.OG", type: "DOKTER", city: "Bekasi" } });
  const usg4 = await prisma.device.create({ data: { customerId: dr.id, serialNumber: "DEMO-P18-0004", machineModelId: await model("Voluson P18") } });
  const accDr = await prisma.tricefyAccount.create({ data: { customerId: dr.id, tricefyId: "TRC-DEMO-3003" } });
  await prisma.tricefySubscription.create({ data: { accountId: accDr.id, activationDate: d(-1110), endDate: d(-15), devices: { create: [{ deviceId: usg4.id }] } } });

  console.log("Data demo dibuat: 3 customer, 4 alat, 2 PO (1 cicilan berjalan, 1 cash baru masuk), 2 instalasi VP6, 3 akun Tricefy.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
