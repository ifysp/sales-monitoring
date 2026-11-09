import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { Vp6Form } from "@/components/forms/vp6-form";
import { customerFormOptions } from "@/lib/form-options";

export default async function EditVp6Page({ params }: PageProps<"/viewpoint/[id]/edit">) {
  const { id } = await params;
  const inst = await prisma.vp6Installation.findFirst({ where: { id: Number(id), deletedAt: null }, include: { devices: true, pcs: true } });
  if (!inst) notFound();
  const opts = await customerFormOptions(inst.customerId, "VIEWPOINT");
  return (
    <>
      <PageHeader title="Edit instalasi ViewPoint 6" />
      <Card>
        <Vp6Form {...opts} customer={opts.customer!} inst={inst} selDevices={inst.devices.map((d) => d.deviceId)} selPcs={inst.pcs.map((p) => p.pcId)} here={`/viewpoint/${inst.id}/edit`} />
      </Card>
    </>
  );
}
