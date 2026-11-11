import { saveOrder } from "@/app/actions/orders";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input, Select, Textarea, LinkButton } from "@/components/ui";
import { toInputDate, todayDate } from "@/lib/format";
import type { PurchaseOrder } from "@/generated/prisma/client";

// Langkah 1: PO diterima dari customer. Tanpa harga — harga final diisi saat invoice terbit.
export function OrderForm({ customerId, customerName, order }: { customerId: number; customerName: string; order?: PurchaseOrder }) {
  return (
    <ActionForm action={saveOrder} className="max-w-3xl space-y-5">
      <input type="hidden" name="customerId" value={customerId} />
      {order && <input type="hidden" name="id" value={order.id} />}
      <p className="text-sm text-slate-600">Customer: <b>{customerName}</b></p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nomor PO *" hint="Sesuai PO dari customer (unik)"><Input name="poNumber" defaultValue={order?.poNumber} required /></Field>
        <Field label="Tanggal PO diterima *"><Input name="poDate" type="date" defaultValue={toInputDate(order?.poDate ?? todayDate())} required /></Field>
        <Field label="Pembayaran" hint="Cicilan = satu invoice, ditagih beberapa termin">
          <Select name="paymentMethod" defaultValue={order?.paymentMethod ?? "CASH"}>
            <option value="CASH">Cash (1 kali bayar)</option>
            <option value="CICILAN">Cicilan (beberapa termin)</option>
          </Select>
        </Field>
        {!order && (
          <Field label="File PO" hint="PDF/JPG/PNG, maks. 10 MB. Bisa juga diunggah nanti.">
            <input type="file" name="poFile" accept=".pdf,.jpg,.jpeg,.png" className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm" />
          </Field>
        )}
        <Field label="Catatan (diskon, negosiasi, deal khusus)" className="sm:col-span-2"><Textarea name="notes" defaultValue={order?.notes ?? ""} /></Field>
      </div>
      {!order && <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">Harga tidak diisi di sini. Harga final diisi saat invoice terbit (langkah 2 di halaman PO).</p>}
      <div className="flex gap-2">
        <SubmitButton>{order ? "Simpan" : "Simpan & lanjut"}</SubmitButton>
        <LinkButton variant="outline" href={order ? `/orders/${order.id}` : `/customers/${customerId}?tab=orders`}>Batal</LinkButton>
      </div>
    </ActionForm>
  );
}
