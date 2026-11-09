import { saveOrder } from "@/app/actions/orders";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import { toInputDate, todayDate } from "@/lib/format";
import type { PurchaseOrder } from "@/generated/prisma/client";

export function OrderForm({ customerId, customerName, order }: { customerId: number; customerName: string; order?: PurchaseOrder }) {
  return (
    <ActionForm action={saveOrder} className="max-w-3xl space-y-5">
      <input type="hidden" name="customerId" value={customerId} />
      {order && <input type="hidden" name="id" value={order.id} />}
      <p className="text-sm text-slate-600">Customer: <b>{customerName}</b></p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nomor PO *" hint="Unik"><Input name="poNumber" defaultValue={order?.poNumber} required /></Field>
        <Field label="Tanggal PO masuk *"><Input name="poDate" type="date" defaultValue={toInputDate(order?.poDate ?? todayDate())} required /></Field>
        <Field label="Nilai PO (Rp) *" hint="Nilai deal setelah negosiasi"><Input name="amount" type="number" min={0} step="1" defaultValue={order ? Number(order.amount) : ""} required /></Field>
        <Field label="PPN (%)" hint="Opsional"><Input name="ppnPercent" type="number" min={0} step="0.01" defaultValue={order?.ppnPercent ? Number(order.ppnPercent) : ""} /></Field>
        <Field label="Metode bayar" hint={order ? undefined : "Cash: otomatis dibuat 1 invoice. Cicilan: atur termin di halaman PO."}>
          <Select name="paymentMethod" defaultValue={order?.paymentMethod ?? "CASH"}>
            <option value="CASH">Cash</option>
            <option value="CICILAN">Cicilan</option>
          </Select>
        </Field>
        <Field label="Special notes (diskon, negosiasi, deal khusus)" className="sm:col-span-2"><Textarea name="specialNotes" defaultValue={order?.specialNotes ?? ""} /></Field>
      </div>
      {!order && <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">Setelah PO disimpan, tambahkan isinya (instalasi ViewPoint 6 / langganan Tricefy), invoice, dan lampiran dari halaman detail PO.</p>}
      <div className="flex gap-2">
        <SubmitButton>{order ? "Simpan" : "Simpan & lanjut"}</SubmitButton>
        <LinkButton variant="outline" href={order ? `/orders/${order.id}` : `/customers/${customerId}?tab=orders`}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}
