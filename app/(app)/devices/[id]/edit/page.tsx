import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { DeviceForm } from "@/components/forms/device-forms";

export default async function EditDevicePage({ params }: PageProps<"/devices/[id]/edit">) {
  const { id } = await params;
  const [device, models] = await Promise.all([
    prisma.device.findFirst({ where: { id: Number(id), deletedAt: null }, include: { customer: true } }),
    prisma.machineModel.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
  ]);
  if (!device) notFound();
  return (
    <>
      <PageHeader title={`Edit alat ${device.serialNumber}`} />
      <Card><DeviceForm customerId={device.customerId} customerName={device.customer.name} models={models} device={device} returnTo={`/devices/${device.id}`} /></Card>
    </>
  );
}
