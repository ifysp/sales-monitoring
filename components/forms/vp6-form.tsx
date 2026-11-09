import Link from "next/link";
import { saveVp6 } from "@/app/actions/products";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import { PC_ROLE_LABEL, toInputDate, todayDate } from "@/lib/format";
import type { Vp6Installation } from "@/generated/prisma/client";

type Opt = { id: number; label: string; sub?: string };

export function Vp6Form({ customer, devices, pcs, orders, packages, inst, selDevices = [], selPcs = [], orderId, here }: {
  customer: { id: number; name: string };
  devices: Opt[]; pcs: (Opt & { role: string })[]; orders: Opt[]; packages: Opt[];
  inst?: Vp6Installation; selDevices?: number[]; selPcs?: number[]; orderId?: number; here: string;
}) {
  const back = encodeURIComponent(here);
  return (
    <ActionForm action={saveVp6} className="space-y-5">
      <input type="hidden" name="customerId" value={customer.id} />
      {inst && <input type="hidden" name="id" value={inst.id} />}
      <p className="text-sm text-slate-600">Customer: <b>{customer.name}</b></p>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tanggal install *"><Input type="date" name="installDate" defaultValue={toInputDate(inst?.installDate ?? todayDate())} required /></Field>
        <Field label="Versi ViewPoint 6 *" hint={inst ? "Ubah versi lewat tombol Catat upgrade" : "mis. 6.12"}>
          <Input name="currentVersion" defaultValue={inst?.currentVersion} required readOnly={!!inst} className={inst ? "bg-slate-50" : ""} />
        </Field>
        <Field label="Package / modul">
          <Select name="packageId" defaultValue={inst?.packageId ?? ""}>
            <option value="">—</option>
            {packages.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
        </Field>
        <Field label="Jumlah lisensi"><Input type="number" min={1} name="licenseQty" defaultValue={inst?.licenseQty ?? ""} /></Field>
        <Field label="Purchase Order" className="sm:col-span-2">
          <Select name="orderId" defaultValue={inst?.orderId ?? orderId ?? ""}>
            <option value="">— belum ada PO —</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Harga (Rp)"><Input type="number" min={0} name="price" defaultValue={inst?.price ? Number(inst.price) : ""} /></Field>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium">Alat USG yang terhubung</legend>
          {devices.length === 0 ? <p className="text-sm text-slate-500">Customer ini belum punya alat.</p> : (
            <div className="space-y-1.5">
              {devices.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="deviceIds" value={d.id} defaultChecked={selDevices.includes(d.id)} className="h-4 w-4" />
                  <span className="font-mono">{d.label}</span> <span className="text-xs text-slate-500">{d.sub}</span>
                </label>
              ))}
            </div>
          )}
          <Link href={`/devices/new?customerId=${customer.id}&returnTo=${back}`} className="mt-2 inline-block text-xs text-teal-800 hover:underline">+ Daftarkan alat baru</Link>
        </fieldset>
        <fieldset className="rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium">PC (server / client)</legend>
          {pcs.length === 0 ? <p className="text-sm text-slate-500">Customer ini belum punya PC.</p> : (
            <div className="space-y-1.5">
              {pcs.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="pcIds" value={p.id} defaultChecked={selPcs.includes(p.id)} className="h-4 w-4" />
                  {p.label} <span className="text-xs text-slate-500">{PC_ROLE_LABEL[p.role]}</span>
                </label>
              ))}
            </div>
          )}
          <Link href={`/pcs/new?customerId=${customer.id}&returnTo=${back}`} className="mt-2 inline-block text-xs text-teal-800 hover:underline">+ Daftarkan PC baru</Link>
          <p className="mt-2 text-xs text-slate-500">Standalone = 1 PC Server + Client. Multi = 1 server + beberapa client.</p>
        </fieldset>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Field label="Apps" hint="Teks bebas dulu, nanti bisa diubah jadi pilihan"><Textarea name="apps" defaultValue={inst?.apps ?? ""} placeholder="mis. Obgyn, Fetal Echo, Gyn" /></Field>
        <Field label="Special configuration" hint="Diisi hanya bila ada permintaan khusus user/dokter"><Textarea name="specialConfig" defaultValue={inst?.specialConfig ?? ""} /></Field>
        <Field label="Catatan" className="lg:col-span-2"><Textarea name="notes" defaultValue={inst?.notes ?? ""} /></Field>
      </section>

      <div className="flex gap-2">
        <SubmitButton>Simpan instalasi</SubmitButton>
        <LinkButton variant="outline" href={inst ? `/viewpoint/${inst.id}` : `/customers/${customer.id}?tab=viewpoint`}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}
