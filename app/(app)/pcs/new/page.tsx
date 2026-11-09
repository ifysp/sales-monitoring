import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { CustomerPicker } from "@/components/customer-picker";
import { PcForm } from "@/components/forms/device-forms";

export default async function NewPcPage({ searchParams }: PageProps<"/pcs/new">) {
  const sp = await searchParams;
  if (!sp.customerId) return <CustomerPicker title="PC baru" action="/pcs/new" />;
  const customer = await prisma.customer.findFirst({ where: { id: Number(sp.customerId), deletedAt: null } });
  if (!customer) notFound();
  return (
    <>
      <PageHeader title="PC baru" />
      <Card><PcForm customerId={customer.id} customerName={customer.name} returnTo={typeof sp.returnTo === "string" ? sp.returnTo : undefined} /></Card>
    </>
  );
}
