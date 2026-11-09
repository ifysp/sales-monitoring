import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { OrderForm } from "@/components/forms/order-form";
import { orderFormOptions } from "@/lib/order-form-data";
import { toInputDate } from "@/lib/format";

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default async function EditOrderPage({ params }: PageProps<"/orders/[id]/edit">) {
  const { id } = await params;
  const order = await prisma.purchaseOrder.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!order) notFound();
  const opts = await orderFormOptions();
  return (
    <>
      <PageHeader title={`Edit PO ${order.poNumber}`} />
      <OrderForm
        {...opts}
        value={{
          id: order.id,
          customerId: String(order.customerId),
          poNumber: order.poNumber,
          invoiceNumber: s(order.invoiceNumber),
          poDate: toInputDate(order.poDate),
          paymentMethod: order.paymentMethod,
          price: s(Number(order.price)),
          ppnPercent: order.ppnPercent === null ? "" : s(Number(order.ppnPercent)),
          amountReceived: s(Number(order.amountReceived)),
          specialNotes: s(order.specialNotes),
          items: order.items.map((it) => ({
            productId: s(it.productId),
            packageId: s(it.packageId),
            quantity: s(it.quantity),
            machineModelId: s(it.machineModelId),
            serialNumber: s(it.serialNumber),
            triceId: s(it.triceId),
            siteCode: s(it.siteCode),
            installDate: toInputDate(it.installDate),
            contractStart: toInputDate(it.contractStart),
            contractEnd: toInputDate(it.contractEnd),
            notes: s(it.notes),
          })),
        }}
      />
    </>
  );
}
