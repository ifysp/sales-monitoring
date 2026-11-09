import { saveCustomer } from "@/app/actions/customers";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import { CUSTOMER_TYPE_LABEL } from "@/lib/format";
import type { Customer } from "@/generated/prisma/client";

export function CustomerForm({ customer }: { customer?: Customer }) {
  return (
    <ActionForm action={saveCustomer} className="max-w-2xl space-y-4">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama customer *" className="sm:col-span-2">
          <Input name="name" defaultValue={customer?.name} required placeholder="mis. RSPI Bintaro" />
        </Field>
        <Field label="Tipe *">
          <Select name="type" defaultValue={customer?.type ?? "RUMAH_SAKIT"}>
            {Object.entries(CUSTOMER_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Kota">
          <Input name="city" defaultValue={customer?.city ?? ""} />
        </Field>
        <Field label="Alamat" className="sm:col-span-2">
          <Input name="address" defaultValue={customer?.address ?? ""} />
        </Field>
        <Field label="Nama PIC">
          <Input name="picName" defaultValue={customer?.picName ?? ""} />
        </Field>
        <Field label="Telepon / WA">
          <Input name="phone" defaultValue={customer?.phone ?? ""} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <Input name="email" type="email" defaultValue={customer?.email ?? ""} />
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea name="notes" defaultValue={customer?.notes ?? ""} />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>Simpan</SubmitButton>
        <LinkButton variant="outline" href={customer ? `/customers/${customer.id}` : "/customers"}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}
