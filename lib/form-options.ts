import "server-only";
import { prisma } from "@/lib/prisma";
import { tanggal } from "@/lib/format";

// Pilihan untuk form instalasi/langganan: alat, PC, dan PO milik satu customer
export async function customerFormOptions(customerId: number, product: "VIEWPOINT" | "TRICEFY") {
  const [customer, devices, pcs, orders, packages] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, deletedAt: null }, select: { id: true, name: true } }),
    prisma.device.findMany({ where: { customerId, deletedAt: null }, include: { machineModel: true }, orderBy: { serialNumber: "asc" } }),
    prisma.pc.findMany({ where: { customerId, deletedAt: null }, orderBy: { id: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { customerId, deletedAt: null }, orderBy: { poDate: "desc" } }),
    prisma.package.findMany({ where: { product, active: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    customer,
    devices: devices.map((d) => ({ id: d.id, label: d.serialNumber, sub: d.machineModel ? `${d.machineModel.brand} ${d.machineModel.model}` : "" })),
    pcs: pcs.map((p) => ({ id: p.id, label: p.hostname ?? `PC #${p.id}`, role: p.role })),
    orders: orders.map((o) => ({ id: o.id, label: `${o.poNumber} (${tanggal(o.poDate)})` })),
    packages: packages.map((p) => ({ id: p.id, label: p.name })),
  };
}
