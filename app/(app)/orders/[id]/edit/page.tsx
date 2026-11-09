import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { OrderForm } from "@/components/forms/order-form";

export default async function EditOrderPage({ params }: PageProps<"/orders/[id]/edit">) {
  const { id } = await params;
  const order = await prisma.purchaseOrder.findFirst({ where: { id: Number(id), deletedAt: null }, include: { customer: true } });
  if (!order) notFound();
  return (
    <>
      <PageHeader title={`Edit PO ${order.poNumber}`} />
      <Card><OrderForm customerId={order.customerId} customerName={order.customer.name} order={order} /></Card>
    </>
  );
}
