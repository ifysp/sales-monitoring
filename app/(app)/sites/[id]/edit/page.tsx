import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { SiteForm } from "@/components/forms/site-form";

export default async function EditSitePage({ params }: PageProps<"/sites/[id]/edit">) {
  const { id } = await params;
  const [site, customers] = await Promise.all([
    prisma.site.findUnique({ where: { id: Number(id) } }),
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!site) notFound();
  return (
    <>
      <PageHeader title={`Edit site ${site.name}`} />
      <Card><SiteForm site={site} customers={customers} /></Card>
    </>
  );
}
