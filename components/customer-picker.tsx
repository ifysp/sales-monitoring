import { Card, Select, PageHeader, LinkButton } from "@/components/ui";
import { customerOptions } from "@/lib/queries";

// Langkah pertama untuk form yang butuh customer (alat, PC, VP6, Tricefy, PO)
export async function CustomerPicker({ title, action, extra }: { title: string; action: string; extra?: Record<string, string> }) {
  const customers = await customerOptions();
  return (
    <>
      <PageHeader title={title} subtitle="Langkah 1: pilih customer / site" />
      <Card className="max-w-lg">
        {customers.length === 0 ? (
          <div className="text-sm text-slate-600">
            Belum ada customer. <LinkButton small className="ml-2" href="/customers/new">+ Customer baru</LinkButton>
          </div>
        ) : (
          <form action={action} className="flex gap-2">
            {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <Select name="customerId" required defaultValue="">
              <option value="" disabled>— pilih customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.geSiteId ? ` (${c.geSiteId})` : ""}</option>)}
            </Select>
            <button className="h-9 rounded-md bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800">Lanjut</button>
          </form>
        )}
      </Card>
    </>
  );
}
