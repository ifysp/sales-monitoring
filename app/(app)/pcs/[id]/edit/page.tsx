import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deletePc } from "@/app/actions/devices";
import { ConfirmDelete } from "@/components/client";
import { Card, PageHeader } from "@/components/ui";
import { PcForm } from "@/components/forms/device-forms";
import { History } from "@/components/history";

export default async function EditPcPage({ params }: PageProps<"/pcs/[id]/edit">) {
  const { id } = await params;
  const pc = await prisma.pc.findFirst({ where: { id: Number(id), deletedAt: null }, include: { customer: true } });
  if (!pc) notFound();
  return (
    <>
      <PageHeader title={`PC ${pc.hostname ?? `#${pc.id}`}`} subtitle={pc.customer.name} actions={<ConfirmDelete action={deletePc.bind(null, pc.id)} what="PC ini" small={false} />} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2"><PcForm customerId={pc.customerId} customerName={pc.customer.name} pc={pc} /></Card>
        <Card title="Riwayat perubahan"><History entity="Pc" entityId={pc.id} /></Card>
      </div>
    </>
  );
}
