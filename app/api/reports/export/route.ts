import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { monthlyReport, isMonth, monthRange } from "@/lib/report";
import { MONTHS_LONG, PAYMENT_LABEL } from "@/lib/format";

// Export laporan bulanan ke Excel (.xlsx) untuk finance
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const month = new URL(req.url).searchParams.get("month");
  if (!isMonth(month)) return new Response("Parameter month harus YYYY-MM", { status: 400 });
  const { y, m } = monthRange(month);
  const report = await monthlyReport(month);

  const wb = new ExcelJS.Workbook();
  wb.creator = "SWIT Monitoring";
  const money = '"Rp"#,##0';

  const ws = wb.addWorksheet("PO masuk");
  ws.addRow([`Laporan PO masuk — ${MONTHS_LONG[m - 1]} ${y}`]).font = { bold: true, size: 13 };
  ws.addRow([]);
  const header = ws.addRow(["Tanggal PO", "Customer", "No. PO", "No. Invoice", "Produk", "Metode", "Nilai deal", "PPN %", "Uang diterima", "Tahap", "Progres %", "Special notes"]);
  header.font = { bold: true };
  header.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; });
  for (const r of report.rows) {
    ws.addRow([r.poDate, r.customer, r.poNumber, r.invoiceNumber ?? "", r.products, PAYMENT_LABEL[r.method], r.price, r.ppnPercent ?? "", r.received, r.stage, r.percent, r.notes ?? ""]);
  }
  const total = ws.addRow(["", "TOTAL", "", "", "", "", report.totalDeal, "", report.rows.reduce((s, r) => s + r.received, 0)]);
  total.font = { bold: true };
  ws.getColumn(1).numFmt = "dd/mm/yyyy";
  ws.getColumn(7).numFmt = money;
  ws.getColumn(9).numFmt = money;
  [12, 30, 16, 16, 40, 10, 16, 8, 16, 18, 10, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  const ws2 = wb.addWorksheet("Pembayaran diterima");
  ws2.addRow([`Pembayaran diterima — ${MONTHS_LONG[m - 1]} ${y}`]).font = { bold: true, size: 13 };
  ws2.addRow([]);
  const h2 = ws2.addRow(["Tanggal", "Customer", "No. PO", "Keterangan", "Nominal"]);
  h2.font = { bold: true };
  h2.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; });
  for (const p of report.payments) ws2.addRow([p.date, p.customer, p.poNumber, p.description, p.amount]);
  ws2.addRow(["", "TOTAL", "", "", report.totalPayments]).font = { bold: true };
  ws2.getColumn(1).numFmt = "dd/mm/yyyy";
  ws2.getColumn(5).numFmt = money;
  [12, 30, 16, 24, 18].forEach((w, i) => (ws2.getColumn(i + 1).width = w));

  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-${month}.xlsx"`,
    },
  });
}
