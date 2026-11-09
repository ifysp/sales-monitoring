import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { CustomerPicker } from "@/components/customer-picker";
import { TricefyAccountForm } from "@/components/forms/tricefy-forms";

export default async function NewTricefyAccountPage({ searchParams }: PageProps<"/tricefy/accounts/new">) {
  const sp = await searchParams;
  if (!sp.customerId) return <CustomerPicker title="Akun Tricefy baru" action="/tricefy/accounts/new" />;
  const customer = await prisma.customer.findFirst({ where: { id: Number(sp.customerId), deletedAt: null }, select: { id: true, name: true } });
  if (!customer) notFound();
  return (
    <>
      <PageHeader title="Akun Tricefy baru" subtitle="Langkah 2: data akun · langkah 3: langganan" />
      <Card><TricefyAccountForm customer={customer} /></Card>
    </>
  );
}
