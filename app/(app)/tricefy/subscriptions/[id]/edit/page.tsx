import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { customerFormOptions } from "@/lib/form-options";
import { Card, PageHeader } from "@/components/ui";
import { SubscriptionForm } from "@/components/forms/tricefy-forms";
import { History } from "@/components/history";

export default async function EditSubscriptionPage({ params }: PageProps<"/tricefy/subscriptions/[id]/edit">) {
  const { id } = await params;
  const sub = await prisma.tricefySubscription.findFirst({ where: { id: Number(id), deletedAt: null }, include: { devices: true, account: { include: { customer: true } } } });
  if (!sub) notFound();
  const opts = await customerFormOptions(sub.account.customerId, "TRICEFY");
  return (
    <>
      <PageHeader title="Edit langganan Tricefy" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <SubscriptionForm
            account={{ id: sub.accountId, tricefyId: sub.account.tricefyId, customerId: sub.account.customerId, customerName: sub.account.customer.name }}
            devices={opts.devices} orders={opts.orders} packages={opts.packages} sub={sub}
            selDevices={sub.devices.map((d) => d.deviceId)} here={`/tricefy/subscriptions/${sub.id}/edit`}
          />
        </Card>
        <Card title="Riwayat perubahan"><History entity="TricefySubscription" entityId={sub.id} /></Card>
      </div>
    </>
  );
}
