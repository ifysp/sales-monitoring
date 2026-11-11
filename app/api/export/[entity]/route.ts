import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers, listDevices, listOrders, listPayments, listPcs, listTricefy, listVp6, topology, type Filters } from "@/lib/queries";
import { monthlyReport, isMonth, monthRange } from "@/lib/report";
import { CUSTOMER_TYPE_LABEL, MONTHS_LONG, PAYMENT_LABEL, PC_ROLE_LABEL, PC_SOURCE_LABEL, todayDate } from "@/lib/format";
import { TRICEFY_STATUS_LABEL } from "@/lib/tricefy";

type Col = { header: string; width?: number; money?: boolean; date?: boolean };
type Sheet = { name: string; title?: string; cols: Col[]; rows: unknown[][] };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function build(entity: string, f: Filters): Promise<{ file: string; sheets: Sheet[] } | null> {
  const today = todayDate();
  switch (entity) {
    case "customers": {
      const rows = await listCustomers(f);
      return { file: "customer", sheets: [{ name: "Customer", cols: [{ header: "Nama", width: 32 }, { header: "Site ID GE", width: 16 }, { header: "Tipe" }, { header: "Kota" }, { header: "Kontak", width: 22 }, { header: "Telepon", width: 16 }, { header: "Email", width: 24 }, { header: "Alat" }, { header: "Instalasi VP6" }, { header: "Akun Tricefy" }, { header: "PO" }],
        rows: rows.map((c) => [c.name, c.geSiteId, CUSTOMER_TYPE_LABEL[c.type], c.city, c.contactName, c.phone, c.email, c._count.devices, c._count.vp6Installations, c._count.tricefyAccounts, c._count.orders]) }] };
    }
    case "devices": {
      const rows = await listDevices(f);
      return { file: "alat-usg", sheets: [{ name: "Alat USG", cols: [{ header: "Serial number", width: 20 }, { header: "Merk" }, { header: "Model", width: 20 }, { header: "Customer", width: 30 }, { header: "Site ID", width: 14 }, { header: "Terpasang VP6" }, { header: "Tricefy aktif" }, { header: "Catatan", width: 30 }],
        rows: rows.map((d) => [d.serialNumber, d.machineModel?.brand, d.machineModel?.model, d.customer.name, d.customer.geSiteId, d.vp6Installations.length ? "Ya" : "Tidak", d.tricefySubscriptions.some((t) => t.subscription.endDate >= today) ? "Ya" : "Tidak", d.notes]) }] };
    }
    case "pcs": {
      const rows = await listPcs(f);
      return { file: "pc", sheets: [{ name: "PC", cols: [{ header: "Hostname", width: 18 }, { header: "Customer", width: 30 }, { header: "Peran", width: 16 }, { header: "Sumber", width: 22 }, { header: "CPU", width: 22 }, { header: "RAM" }, { header: "Storage", width: 14 }, { header: "VGA", width: 16 }, { header: "OS", width: 16 }, { header: "Catatan", width: 30 }],
        rows: rows.map((p) => [p.hostname, p.customer.name, PC_ROLE_LABEL[p.role], PC_SOURCE_LABEL[p.source], p.cpu, p.ram, p.storage, p.vga, p.os, p.notes]) }] };
    }
    case "viewpoint": {
      const rows = await listVp6(f);
      return { file: "instalasi-viewpoint6", sheets: [{ name: "ViewPoint 6", cols: [{ header: "Tanggal install", date: true }, { header: "Customer", width: 30 }, { header: "Site ID", width: 14 }, { header: "Versi" }, { header: "Topologi", width: 20 }, { header: "Alat (SN)", width: 30 }, { header: "No. PO", width: 16 }, { header: "Apps", width: 30 }, { header: "Special config", width: 30 }],
        rows: rows.map((v) => [v.installDate, v.customer.name, v.customer.geSiteId, v.currentVersion, topology(v.pcs), v.devices.map((d) => d.device.serialNumber).join(", "), v.order?.poNumber, v.apps, v.specialConfig]) }] };
    }
    case "tricefy": {
      const rows = await listTricefy(f, today);
      return { file: "tricefy", sheets: [{ name: "Tricefy", cols: [{ header: "Customer", width: 30 }, { header: "ID Tricefy", width: 16 }, { header: "Alat (SN)", width: 30 }, { header: "Install", date: true }, { header: "Kontrak", date: true }, { header: "Aktivasi", date: true }, { header: "Berakhir", date: true }, { header: "Sisa hari" }, { header: "Status", width: 14 }, { header: "No. PO", width: 16 }],
        rows: rows.map((s) => [s.account.customer.name, s.account.tricefyId, s.devices.map((d) => d.device.serialNumber).join(", "), s.installDate, s.contractDate, s.activationDate, s.endDate, s.daysLeft, TRICEFY_STATUS_LABEL[s.status], s.order?.poNumber]) }] };
    }
    case "orders": {
      const rows = await listOrders(f);
      return { file: "purchase-order", sheets: [{ name: "PO", cols: [{ header: "Tgl PO diterima", date: true }, { header: "No. PO", width: 18 }, { header: "Customer", width: 30 }, { header: "Bayar" }, { header: "No. invoice", width: 18 }, { header: "Tgl invoice", date: true }, { header: "Harga final", money: true }, { header: "Tgl BA", date: true }, { header: "Tgl tukar faktur", date: true }, { header: "Lunas", money: true }, { header: "Sisa tagihan", money: true }, { header: "Langkah", width: 18 }, { header: "Progres %" }, { header: "Catatan", width: 36 }],
        rows: rows.map((o) => [o.poDate, o.poNumber, o.customer.name, PAYMENT_LABEL[o.paymentMethod], o.invoiceNumber, o.invoiceDate, o.amount, o.baDate, o.tukarFakturDate, o.paid, o.remaining, o.progress.complete ? "Clear" : o.progress.current, o.progress.percent, o.notes]) }] };
    }
    case "payments": {
      const rows = await listPayments(f, today);
      return { file: "penagihan", sheets: [{ name: "Penagihan", cols: [{ header: "Jatuh tempo", date: true }, { header: "Customer", width: 30 }, { header: "No. PO", width: 18 }, { header: "No. invoice", width: 18 }, { header: "Termin" }, { header: "Nominal", money: true }, { header: "Tgl lunas", date: true }, { header: "Status", width: 14 }],
        rows: rows.map((p) => [p.dueDate, p.order.customer.name, p.order.poNumber, p.order.invoiceNumber, p.sequence, num(p.amount), p.paidAt, p.paidAt ? "Lunas" : p.dueDate < today ? "Terlambat" : "Belum dibayar"]) }] };
    }
    case "report": {
      if (!isMonth(f.month)) return null;
      const { y, m } = monthRange(f.month);
      const r = await monthlyReport(f.month);
      const period = `${MONTHS_LONG[m - 1]} ${y}`;
      return { file: `laporan-${f.month}`, sheets: [
        { name: "PO diterima", title: `PO diterima — ${period}`, cols: [{ header: "Tgl PO", date: true }, { header: "Customer", width: 30 }, { header: "No. PO", width: 18 }, { header: "Bayar" }, { header: "No. invoice", width: 18 }, { header: "Harga final", money: true }, { header: "Lunas", money: true }, { header: "Langkah", width: 18 }, { header: "Catatan", width: 36 }],
          rows: r.orders.map((o) => [o.poDate, o.customer.name, o.poNumber, PAYMENT_LABEL[o.paymentMethod], o.invoiceNumber, o.amount, o.paid, o.progress.complete ? "Clear" : o.progress.current, o.notes]) },
        { name: "Invoice terbit", title: `Penjualan (invoice terbit) — ${period}`, cols: [{ header: "Tgl invoice", date: true }, { header: "Customer", width: 30 }, { header: "No. PO", width: 18 }, { header: "No. invoice", width: 18 }, { header: "Harga final", money: true }],
          rows: r.invoiced.map((o) => [o.invoiceDate, o.customer.name, o.poNumber, o.invoiceNumber, num(o.finalAmount)]) },
        { name: "Pembayaran", title: `Pembayaran diterima — ${period}`, cols: [{ header: "Tanggal", date: true }, { header: "Customer", width: 30 }, { header: "No. PO", width: 18 }, { header: "No. invoice", width: 18 }, { header: "Termin" }, { header: "Nominal", money: true }],
          rows: r.payments.map((p) => [p.paidAt, p.order.customer.name, p.order.poNumber, p.order.invoiceNumber, p.sequence, num(p.amount)]) },
        { name: "Instalasi & aktivasi", title: `Instalasi VP6 & aktivasi Tricefy — ${period}`, cols: [{ header: "Tanggal", date: true }, { header: "Produk", width: 14 }, { header: "Customer", width: 30 }, { header: "Detail", width: 30 }],
          rows: [...r.vp6.map((v) => [v.installDate, "ViewPoint 6", v.customer.name, v.currentVersion]), ...r.tricefy.map((t) => [t.activationDate, "Tricefy", t.account.customer.name, t.account.tricefyId])] },
      ] };
    }
  }
  return null;
}

// Export tabel (dengan filter yang sama seperti di layar) ke .xlsx (FR-09.3)
export async function GET(req: Request, ctx: RouteContext<"/api/export/[entity]">) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { entity } = await ctx.params;
  const f = Object.fromEntries(new URL(req.url).searchParams.entries()) as Filters;
  const data = await build(entity, f);
  if (!data) return new Response("Export tidak dikenal", { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "SWIT Sales Monitoring";
  for (const s of data.sheets) {
    const ws = wb.addWorksheet(s.name);
    if (s.title) {
      ws.addRow([s.title]).font = { bold: true, size: 13 };
      ws.addRow([]);
    }
    const header = ws.addRow(s.cols.map((c) => c.header));
    header.font = { bold: true };
    header.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }));
    for (const row of s.rows) ws.addRow(row.map((v) => (v === undefined ? null : v)));
    s.cols.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      col.width = c.width ?? 12;
      if (c.money) col.numFmt = '"Rp"#,##0';
      if (c.date) col.numFmt = "dd/mm/yyyy";
    });
    ws.views = [{ state: "frozen", ySplit: header.number }];
  }
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${data.file}-${todayDate().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
