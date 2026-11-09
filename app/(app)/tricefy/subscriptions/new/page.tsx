import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { customerFormOptions } from "@/lib/form-options";
import { dateVal } from "@/lib/forms";
import { Card, LinkButton, PageHeader } from "@/components/ui";
import { CustomerPicker } from "@/components/customer-picker";
import { SubscriptionForm } from "@/components/forms/tricefy-forms";

export default async function NewSubscriptionPage({ searchParams }: PageProps<"/tricefy/subscriptions/new">) {
  const sp = await searchParams;
  const orderId = Number(sp.orderId) || undefined;
  const accountId = Number(sp.accountId) || null;

  // Dari halaman PO: pilih akun Tricefy milik customer (atau buat akun dulu)
  if (!accountId) {
    if (!sp.customerId) return <CustomerPicker title="Langganan Tricefy baru" action="/tricefy/subscriptions/new" />;
    const accounts = await prisma.tricefyAccount.findMany({ where: { customerId: Number(sp.customerId), deletedAt: null }, orderBy: { tricefyId: "asc" } });
    if (accounts.length === 1) redirect(`/tricefy/subscriptions/new?accountId=${accounts[0].id}${orderId ? `&orderId=${orderId}` : ""}`);
    return (
      <>
        <PageHeader title="Langganan Tricefy baru" subtitle="Pilih akun Tricefy" />
        <Card className="max-w-lg">
          {accounts.length === 0 ? (
            <p className="text-sm text-slate-600">Customer ini belum punya akun Tricefy. <LinkButton small className="ml-2" href={`/tricefy/accounts/new?customerId=${sp.customerId}`}>+ Akun Tricefy</LinkButton></p>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li key={a.id}><Link className="font-mono text-teal-800 hover:underline" href={`/tricefy/subscriptions/new?accountId=${a.id}${orderId ? `&orderId=${orderId}` : ""}`}>{a.tricefyId}</Link></li>
              ))}
            </ul>
          )}
        </Card>
      </>
    );
  }

  const account = await prisma.tricefyAccount.findFirst({ where: { id: accountId, deletedAt: null }, include: { customer: true } });
  if (!account) notFound();
  const opts = await customerFormOptions(account.customerId, "TRICEFY");
  const renewFrom = Number(sp.renewFrom) ? await prisma.tricefySubscription.findUnique({ where: { id: Number(sp.renewFrom) }, include: { devices: true } }) : null;
  const here = `/tricefy/subscriptions/new?accountId=${account.id}${orderId ? `&orderId=${orderId}` : ""}`;
  return (
    <>
      <PageHeader title={renewFrom ? "Perpanjang langganan Tricefy" : "Langganan Tricefy baru"} subtitle={renewFrom ? "Langganan lama tetap tersimpan sebagai riwayat" : undefined} />
      <Card>
        <SubscriptionForm
          account={{ id: account.id, tricefyId: account.tricefyId, customerId: account.customerId, customerName: account.customer.name }}
          devices={opts.devices} orders={opts.orders} packages={opts.packages} orderId={orderId} here={here}
          prefill={{ activationDate: dateVal(typeof sp.activation === "string" ? sp.activation : null) ?? undefined, packageId: renewFrom?.packageId, quantity: renewFrom?.quantity }}
          selDevices={renewFrom?.devices.map((d) => d.deviceId) ?? (opts.devices.length === 1 ? [opts.devices[0].id] : [])}
        />
      </Card>
    </>
  );
}
