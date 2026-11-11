import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { CustomerPicker } from "@/components/customer-picker";
import { Vp6Form } from "@/components/forms/vp6-form";
import { customerFormOptions } from "@/lib/form-options";

export default async function NewVp6Page({ searchParams }: PageProps<"/viewpoint/new">) {
  const sp = await searchParams;
  const orderId = Number(sp.orderId) || undefined;
  if (!sp.customerId) return <CustomerPicker title="Instalasi ViewPoint 6 baru" action="/viewpoint/new" />;
  const opts = await customerFormOptions(Number(sp.customerId));
  if (!opts.customer) notFound();
  const here = `/viewpoint/new?customerId=${opts.customer.id}${orderId ? `&orderId=${orderId}` : ""}`;
  return (
    <>
      <PageHeader title="Instalasi ViewPoint 6 baru" />
      <Card><Vp6Form {...opts} customer={opts.customer} orderId={orderId} here={here} /></Card>
    </>
  );
}
