import { saveSite } from "@/app/actions/sites";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import type { Site } from "@/generated/prisma/client";

export function SiteForm({ site, customers, customerId }: { site?: Site; customers: { id: number; name: string }[]; customerId?: string }) {
  return (
    <ActionForm action={saveSite} className="max-w-2xl space-y-4">
      {site && <input type="hidden" name="id" value={site.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer *" className="sm:col-span-2">
          <Select name="customerId" defaultValue={site ? String(site.customerId) : customerId ?? ""} required>
            <option value="">— pilih customer —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Nama site *" hint="mis. Poli Kandungan Lt. 2">
          <Input name="name" defaultValue={site?.name} required />
        </Field>
        <Field label="Site ID">
          <Input name="siteCode" defaultValue={site?.siteCode ?? ""} />
        </Field>
        <Field label="PC (asal & spesifikasi)" className="sm:col-span-2">
          <Textarea name="pcInfo" defaultValue={site?.pcInfo ?? ""} placeholder="mis. PC dari RS, Intel i5, RAM 16 GB, Windows 11" />
        </Field>
        <Field label="Aplikasi terpasang" className="sm:col-span-2">
          <Input name="applications" defaultValue={site?.applications ?? ""} placeholder="mis. Viewpoint 6 Obgyn Analytic, Tricefy Uploader" />
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={site?.notes ?? ""} />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>Simpan</SubmitButton>
        <LinkButton variant="outline" href={site ? `/sites/${site.id}` : "/sites"}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}
