import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { CustomerPicker } from "@/components/customer-picker";
import { DeviceForm } from "@/components/forms/device-forms";

export default async function NewDevicePage({ searchParams }: PageProps<"/devices/new">) {
  const sp = await searchParams;
  const returnTo = typeof sp.returnTo === "string" ? sp.returnTo : undefined;
  if (!sp.customerId) return <CustomerPicker title="Alat USG baru" action="/devices/new" />;
  const [customer, models] = await Promise.all([
    prisma.customer.findFirst({ where: { id: Number(sp.customerId), deletedAt: null } }),
    prisma.machineModel.findMany({ where: { active: true }, orderBy: [{ brand: "asc" }, { model: "asc" }] }),
  ]);
  if (!customer) notFound();
  return (
    <>
      <PageHeader title="Alat USG baru" />
      <Card><DeviceForm customerId={customer.id} customerName={customer.name} models={models} returnTo={returnTo} /></Card>
    </>
  );
}
