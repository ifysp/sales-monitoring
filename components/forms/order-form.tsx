"use client";
import { useActionState, useState } from "react";
import { saveOrder } from "@/app/actions/orders";
import { FormMessage, PendingProvider, SubmitButton, submitWith } from "@/components/client";
import { Field, Input, Select, Textarea, Button, LinkButton } from "@/components/ui";

export type Option = { id: number; label: string };
export type PackageOption = { id: number; productId: number; name: string; unit: string | null };
export type ProductOption = { id: number; code: string; name: string };

export type ItemValue = {
  productId: string;
  packageId: string;
  quantity: string;
  machineModelId: string;
  serialNumber: string;
  triceId: string;
  siteCode: string;
  installDate: string;
  contractStart: string;
  contractEnd: string;
  notes: string;
};

export type OrderValue = {
  id?: number;
  customerId: string;
  poNumber: string;
  invoiceNumber: string;
  poDate: string;
  paymentMethod: "CASH" | "CICILAN";
  price: string;
  ppnPercent: string;
  amountReceived: string;
  specialNotes: string;
  items: ItemValue[];
};

const emptyItem = (productId = ""): ItemValue => ({
  productId, packageId: "", quantity: "", machineModelId: "", serialNumber: "", triceId: "",
  siteCode: "", installDate: "", contractStart: "", contractEnd: "", notes: "",
});

// Tambah N tahun ke tanggal "YYYY-MM-DD" (untuk isi otomatis akhir kontrak)
function plusYears(d: string, years: number) {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCFullYear(dt.getUTCFullYear() + years);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function OrderForm({
  value,
  customers,
  products,
  packages,
  machines,
}: {
  value: OrderValue;
  customers: Option[];
  products: ProductOption[];
  packages: PackageOption[];
  machines: Option[];
}) {
  const [state, action, pending] = useActionState(saveOrder, undefined);
  const [items, setItems] = useState<ItemValue[]>(value.items.length ? value.items : [emptyItem(String(products[0]?.id ?? ""))]);
  const [method, setMethod] = useState(value.paymentMethod);

  const setItem = (i: number, patch: Partial<ItemValue>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const productCode = (id: string) => products.find((p) => String(p.id) === id)?.code;

  return (
    <form onSubmit={(e) => submitWith(e, action)} className="space-y-6">
      <PendingProvider value={pending}>
      <FormMessage state={state} />
      {value.id && <input type="hidden" name="id" value={value.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold">1. Customer & PO</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Customer *" className="sm:col-span-2">
            <Select name="customerId" defaultValue={value.customerId} required>
              <option value="">— pilih customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Nomor PO *">
            <Input name="poNumber" defaultValue={value.poNumber} required />
          </Field>
          <Field label="Tanggal PO masuk *">
            <Input name="poDate" type="date" defaultValue={value.poDate} required />
          </Field>
          <Field label="Nomor invoice">
            <Input name="invoiceNumber" defaultValue={value.invoiceNumber} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">2. Produk / service dalam PO ini</h2>
          <Button type="button" variant="outline" small onClick={() => setItems((p) => [...p, emptyItem(String(products[0]?.id ?? ""))])}>
            + Tambah produk
          </Button>
        </div>
        <div className="space-y-4">
          {items.map((it, i) => {
            const code = productCode(it.productId);
            const pkgs = packages.filter((p) => String(p.productId) === it.productId);
            const unit = pkgs.find((p) => String(p.id) === it.packageId)?.unit;
            return (
              <div key={i} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item {i + 1}</span>
                  {items.length > 1 && (
                    <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}>
                      Hapus item
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Produk *">
                    <Select value={it.productId} onChange={(e) => setItem(i, { productId: e.target.value, packageId: "" })}>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Package">
                    <Select value={it.packageId} onChange={(e) => setItem(i, { packageId: e.target.value })}>
                      <option value="">—</option>
                      {pkgs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                  <Field label={`Jumlah${unit ? ` (${unit})` : ""}`} hint="Kosongkan bila unlimited">
                    <Input type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                  </Field>
                  <Field label="Model mesin USG">
                    <Select value={it.machineModelId} onChange={(e) => setItem(i, { machineModelId: e.target.value })}>
                      <option value="">—</option>
                      {machines.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="SN alat">
                    <Input value={it.serialNumber} onChange={(e) => setItem(i, { serialNumber: e.target.value })} />
                  </Field>
                  {code === "TRICEFY" ? (
                    <Field label="ID Tricefy">
                      <Input value={it.triceId} onChange={(e) => setItem(i, { triceId: e.target.value })} />
                    </Field>
                  ) : (
                    <Field label="Site ID">
                      <Input value={it.siteCode} onChange={(e) => setItem(i, { siteCode: e.target.value })} />
                    </Field>
                  )}
                  <Field label="Tanggal install">
                    <Input type="date" value={it.installDate} onChange={(e) => setItem(i, { installDate: e.target.value })} />
                  </Field>
                  <div />
                  <Field label={code === "TRICEFY" ? "Kontrak / aktivasi mulai" : "Mulai lisensi (opsional)"}>
                    <Input type="date" value={it.contractStart} onChange={(e) => setItem(i, { contractStart: e.target.value })} />
                  </Field>
                  <Field label="Kontrak berakhir">
                    <Input type="date" value={it.contractEnd} onChange={(e) => setItem(i, { contractEnd: e.target.value })} />
                  </Field>
                  <div className="flex items-end gap-1 sm:col-span-2">
                    {[1, 3, 5].map((y) => (
                      <Button key={y} type="button" variant="ghost" small disabled={!it.contractStart}
                        onClick={() => setItem(i, { contractEnd: plusYears(it.contractStart, y) })}>
                        +{y} th
                      </Button>
                    ))}
                  </div>
                  <Field label="Catatan item" className="sm:col-span-2 lg:col-span-4">
                    <Input value={it.notes} onChange={(e) => setItem(i, { notes: e.target.value })} />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-semibold">3. Nilai & pembayaran</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nilai deal (Rp) *" hint="Harga setelah negosiasi">
            <Input name="price" type="number" min={0} step="1" defaultValue={value.price} required />
          </Field>
          <Field label="PPN (%)" hint="Opsional">
            <Input name="ppnPercent" type="number" min={0} step="0.01" defaultValue={value.ppnPercent} />
          </Field>
          <Field label="Metode bayar">
            <Select name="paymentMethod" value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "CICILAN")}>
              <option value="CASH">Cash</option>
              <option value="CICILAN">Cicilan</option>
            </Select>
          </Field>
          {method === "CASH" ? (
            <Field label="Uang diterima (Rp)">
              <Input name="amountReceived" type="number" min={0} step="1" defaultValue={value.amountReceived} />
            </Field>
          ) : (
            <p className="self-end text-xs text-slate-500">Jadwal cicilan diatur oleh Admin di halaman detail PO. Uang diterima dihitung otomatis dari cicilan yang lunas.</p>
          )}
          <Field label="Special notes (diskon, negosiasi, deal khusus)" className="sm:col-span-2 lg:col-span-4">
            <Textarea name="specialNotes" defaultValue={value.specialNotes} />
          </Field>
        </div>
      </section>

      <div className="flex gap-2">
        <SubmitButton>Simpan PO</SubmitButton>
        <LinkButton variant="outline" href={value.id ? `/orders/${value.id}` : "/orders"}>Batal</LinkButton>
      </div>
      </PendingProvider>
    </form>
  );
}
