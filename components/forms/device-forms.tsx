import { saveDevice, savePc } from "@/app/actions/devices";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import { PC_ROLE_LABEL, PC_SOURCE_LABEL } from "@/lib/format";
import type { Device, Pc } from "@/generated/prisma/client";

export function DeviceForm({ customerId, customerName, models, device, returnTo }: {
  customerId: number; customerName: string; models: { id: number; brand: string; model: string }[]; device?: Device; returnTo?: string;
}) {
  return (
    <ActionForm action={saveDevice} className="max-w-xl space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      {device && <input type="hidden" name="id" value={device.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <p className="text-sm text-slate-600">Customer: <b>{customerName}</b></p>
      <Field label="Serial number (SN) *" hint="Unik — satu SN hanya boleh terdaftar sekali">
        <Input name="serialNumber" defaultValue={device?.serialNumber} required className="font-mono uppercase" />
      </Field>
      <Field label="Model alat">
        <Select name="machineModelId" defaultValue={device?.machineModelId ?? ""}>
          <option value="">—</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.brand} {m.model}</option>)}
        </Select>
      </Field>
      <Field label="Catatan"><Textarea name="notes" defaultValue={device?.notes ?? ""} /></Field>
      <div className="flex gap-2">
        <SubmitButton>Simpan</SubmitButton>
        <LinkButton variant="outline" href={returnTo || `/customers/${customerId}?tab=devices`}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}

export function PcForm({ customerId, customerName, pc, returnTo }: { customerId: number; customerName: string; pc?: Pc; returnTo?: string }) {
  return (
    <ActionForm action={savePc} className="max-w-3xl space-y-4">
      <input type="hidden" name="customerId" value={customerId} />
      {pc && <input type="hidden" name="id" value={pc.id} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <p className="text-sm text-slate-600">Customer: <b>{customerName}</b></p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nama / hostname PC"><Input name="hostname" defaultValue={pc?.hostname ?? ""} placeholder="mis. VP-SERVER-01" /></Field>
        <Field label="Peran *" hint="Server + Client = klinik kecil, satu PC">
          <Select name="role" defaultValue={pc?.role ?? "SERVER_CLIENT"}>
            {Object.entries(PC_ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Sumber PC *">
          <Select name="source" defaultValue={pc?.source ?? "COMPANY_RECOMMENDED"}>
            {Object.entries(PC_SOURCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="CPU"><Input name="cpu" defaultValue={pc?.cpu ?? ""} placeholder="Intel Core i7-12700" /></Field>
        <Field label="RAM"><Input name="ram" defaultValue={pc?.ram ?? ""} placeholder="16 GB" /></Field>
        <Field label="Storage"><Input name="storage" defaultValue={pc?.storage ?? ""} placeholder="SSD 512 GB" /></Field>
        <Field label="VGA"><Input name="vga" defaultValue={pc?.vga ?? ""} /></Field>
        <Field label="OS"><Input name="os" defaultValue={pc?.os ?? ""} placeholder="Windows 11 Pro" /></Field>
        <Field label="Catatan" className="sm:col-span-3"><Textarea name="notes" defaultValue={pc?.notes ?? ""} /></Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>Simpan</SubmitButton>
        <LinkButton variant="outline" href={returnTo || `/customers/${customerId}?tab=devices`}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}
