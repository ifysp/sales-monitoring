import "server-only";
import { prisma } from "@/lib/prisma";

// Data pilihan untuk form PO (customer, produk, package, mesin)
export async function orderFormOptions() {
  const [customers, products, packages, machines] = await Promise.all([
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ orderBy: { id: "asc" } }),
    prisma.package.findMany({ where: { active: true }, orderBy: [{ productId: "asc" }, { name: "asc" }] }),
    prisma.machineModel.findMany({ where: { active: true }, orderBy: [{ brand: "asc" }, { model: "asc" }] }),
  ]);
  return {
    customers: customers.map((c) => ({ id: c.id, label: c.name })),
    products: products.map((p) => ({ id: p.id, code: p.code, name: p.name })),
    packages: packages.map((p) => ({ id: p.id, productId: p.productId, name: p.name, unit: p.unit })),
    machines: machines.map((m) => ({ id: m.id, label: `${m.brand} ${m.model}` })),
  };
}
