import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { SiteForm } from "@/components/forms/site-form";

export default async function NewSitePage({ searchParams }: PageProps<"/sites/new">) {
  const { customerId } = await searchParams;
  const customers = await prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Site baru" />
      <Card><SiteForm customers={customers} customerId={typeof customerId === "string" ? customerId : undefined} /></Card>
    </>
  );
}
