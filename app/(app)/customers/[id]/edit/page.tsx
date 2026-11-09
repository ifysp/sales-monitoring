import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card } from "@/components/ui";
import { CustomerForm } from "@/components/forms/customer-form";

export default async function EditCustomerPage({ params }: PageProps<"/customers/[id]/edit">) {
  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!customer) notFound();
  return (
    <>
      <PageHeader title={`Edit ${customer.name}`} />
      <Card><CustomerForm customer={customer} /></Card>
    </>
  );
}
