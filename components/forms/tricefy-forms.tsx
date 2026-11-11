import Link from "next/link";
import { saveSubscription, saveTricefyAccount } from "@/app/actions/products";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import { toInputDate } from "@/lib/format";
import type { TricefyAccount, TricefySubscription } from "@/generated/prisma/client";

type Opt = { id: number; label: string; sub?: string };

export function TricefyAccountForm({ customer, account }: { customer: { id: number; name: string }; account?: TricefyAccount }) {
  return (
    <ActionForm action={saveTricefyAccount} className="max-w-xl space-y-4">
      <input type="hidden" name="customerId" value={customer.id} />
      {account && <input type="hidden" name="id" value={account.id} />}
      <p className="text-sm text-slate-600">Customer: <b>{customer.name}</b></p>
      <Field label="ID Tricefy *" hint="Unik per akun. Satu akun bisa mencakup beberapa alat USG."><Input name="tricefyId" defaultValue={account?.tricefyId} required className="font-mono" /></Field>
      <Field label="Email akun"><Input name="accountEmail" type="email" defaultValue={account?.accountEmail ?? ""} /></Field>
      <Field label="Catatan"><Textarea name="notes" defaultValue={account?.notes ?? ""} /></Field>
      <div className="flex gap-2">
        <SubmitButton>{account ? "Simpan" : "Simpan & tambah langganan"}</SubmitButton>
        <LinkButton variant="outline" href={account ? `/tricefy/accounts/${account.id}` : `/customers/${customer.id}?tab=tricefy`}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}

export function SubscriptionForm({ account, devices, orders, sub, prefill, selDevices = [], orderId, here }: {
  account: { id: number; tricefyId: string; customerId: number; customerName: string };
  devices: Opt[]; orders: Opt[];
  sub?: TricefySubscription; prefill?: Partial<{ activationDate: Date }>;
  selDevices?: number[]; orderId?: number; here: string;
}) {
  return (
    <ActionForm action={saveSubscription} className="space-y-5">
      <input type="hidden" name="accountId" value={account.id} />
      {sub && <input type="hidden" name="id" value={sub.id} />}
      <p className="text-sm text-slate-600">Customer: <b>{account.customerName}</b> · Akun Tricefy <span className="font-mono">{account.tricefyId}</span></p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Purchase Order" className="sm:col-span-2">
          <Select name="orderId" defaultValue={sub?.orderId ?? orderId ?? ""}>
            <option value="">— belum ada PO —</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Tanggal install"><Input type="date" name="installDate" defaultValue={toInputDate(sub?.installDate)} /></Field>
        <Field label="Tanggal kontrak"><Input type="date" name="contractDate" defaultValue={toInputDate(sub?.contractDate)} /></Field>
        <Field label="Tanggal aktivasi *"><Input type="date" name="activationDate" defaultValue={toInputDate(sub?.activationDate ?? prefill?.activationDate)} required /></Field>
        <Field label="Tanggal berakhir" hint="Kosongkan = otomatis aktivasi + 3 tahun"><Input type="date" name="endDate" defaultValue={toInputDate(sub?.endDate)} /></Field>
      </div>
      <fieldset className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium">Alat USG yang tercakup</legend>
        {devices.length === 0 ? <p className="text-sm text-slate-500">Customer ini belum punya alat.</p> : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {devices.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="deviceIds" value={d.id} defaultChecked={selDevices.includes(d.id)} className="h-4 w-4" />
                <span className="font-mono">{d.label}</span> <span className="text-xs text-slate-500">{d.sub}</span>
              </label>
            ))}
          </div>
        )}
        <Link href={`/devices/new?customerId=${account.customerId}&returnTo=${encodeURIComponent(here)}`} className="mt-2 inline-block text-xs text-teal-800 hover:underline">+ Daftarkan alat baru</Link>
      </fieldset>
      <Field label="Catatan"><Textarea name="notes" defaultValue={sub?.notes ?? ""} /></Field>
      <div className="flex gap-2">
        <SubmitButton>Simpan langganan</SubmitButton>
        <LinkButton variant="outline" href={`/tricefy/accounts/${account.id}`}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}
