import { PageHeader, LinkButton, Card } from "@/components/ui";
import { OrderForm } from "@/components/forms/order-form";
import { orderFormOptions } from "@/lib/order-form-data";
import { todayDate, toInputDate } from "@/lib/format";

export default async function NewOrderPage({ searchParams }: PageProps<"/orders/new">) {
  const { customerId } = await searchParams;
  const opts = await orderFormOptions();
  if (opts.customers.length === 0) {
    return (
      <>
        <PageHeader title="PO baru" />
        <Card>
          <p className="text-sm text-slate-600">Belum ada customer. Tambahkan customer terlebih dahulu.</p>
          <LinkButton className="mt-3" href="/customers/new">+ Customer baru</LinkButton>
        </Card>
      </>
    );
  }
  return (
    <>
      <PageHeader title="PO baru" subtitle="Alur: customer → produk & package → tanggal → mesin → nilai → special notes" />
      <OrderForm
        {...opts}
        value={{
          customerId: typeof customerId === "string" ? customerId : "",
          poNumber: "", invoiceNumber: "", poDate: toInputDate(todayDate()),
          paymentMethod: "CASH", price: "", ppnPercent: "", amountReceived: "", specialNotes: "", items: [],
        }}
      />
    </>
  );
}
