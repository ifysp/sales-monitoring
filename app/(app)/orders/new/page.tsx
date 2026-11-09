import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { CustomerPicker } from "@/components/customer-picker";
import { OrderForm } from "@/components/forms/order-form";

export default async function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  const sp = await searchParams;
  if (!sp.customerId) return <CustomerPicker title="Purchase Order baru" action="/orders/new" />;
  const customer = await prisma.customer.findFirst({ where: { id: Number(sp.customerId), deletedAt: null } });
  if (!customer) notFound();
  return (
    <>
      <PageHeader title="Purchase Order baru" subtitle="Langkah 2: data PO" />
      <Card><OrderForm customerId={customer.id} customerName={customer.name} /></Card>
    </>
  );
}
