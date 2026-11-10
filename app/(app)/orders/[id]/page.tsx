import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { activeStages } from "@/lib/queries";
import { computeFlow, computeProgress } from "@/lib/progress";
import { tricefyStatus } from "@/lib/tricefy";
import {
  deleteAttachment, deleteInvoice, deleteOrder, saveInvoice, setInvoicePaid, setInvoicePlan, setStage, uploadAttachment,
} from "@/app/actions/orders";
import { ATTACHMENT_LABEL, PAYMENT_LABEL, rupiah, tanggal, toInputDate, todayDate, waktu } from "@/lib/format";
import { ActionForm, ConfirmDelete, SubmitButton } from "@/components/client";
import { Badge, Card, DL, Empty, Field, Input, InvoiceBadge, LinkButton, PageHeader, Select, StatCard, Table, TricefyBadge } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { History } from "@/components/history";

const fileInput = "block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm";

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const [o, stages] = await Promise.all([
    prisma.purchaseOrder.findFirst({
      where: { id: Number(id), deletedAt: null },
      include: {
        customer: true,
        stages: true,
        invoices: { orderBy: { sequence: "asc" }, include: { attachments: true } },
        attachments: { where: { invoiceId: null }, include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
        vp6Installations: { where: { deletedAt: null }, include: { package: true, devices: { include: { device: true } } } },
        tricefySubscriptions: { where: { deletedAt: null }, include: { package: true, account: true } },
      },
    }),
    activeStages(),
  ]);
  if (!o) notFound();
  const today = todayDate();
  const todayStr = toInputDate(today);
  const progress = computeProgress(stages, o.stages, o.invoices);
  const amount = Number(o.amount);
  const invoiced = o.invoices.reduce((s, i) => s + Number(i.amount), 0);
  const paid = o.invoices.filter((i) => i.paidAt).reduce((s, i) => s + Number(i.amount), 0);
  const ppn = o.ppnPercent === null ? null : Number(o.ppnPercent);
  const byStage = new Map(o.stages.map((s) => [s.stageId, s]));
  const flow = computeFlow(stages, o.stages, o.invoices);
  const canReplan = !o.invoices.some((i) => i.paidAt || i.invoiceNumber);

  return (
    <>
      <PageHeader
        title={`PO ${o.poNumber}`}
        subtitle={<span><Link className="text-teal-800 hover:underline" href={`/customers/${o.customerId}`}>{o.customer.name}</Link> · {tanggal(o.poDate)} · {PAYMENT_LABEL[o.paymentMethod]}</span>}
        actions={<><LinkButton variant="outline" href={`/orders/${o.id}/edit`}>Edit PO</LinkButton><ConfirmDelete action={deleteOrder.bind(null, o.id)} what={`PO ${o.poNumber}`} small={false} /></>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Nilai PO" value={rupiah(amount)} sub={ppn !== null ? `PPN ${ppn}% = ${rupiah((amount * ppn) / 100)}` : undefined} />
        <StatCard label="Sudah di-invoice" value={rupiah(invoiced)} sub={`Sisa belum di-invoice ${rupiah(amount - invoiced)}`} tone={amount - invoiced !== 0 ? "amber" : undefined} />
        <StatCard label="Sudah dibayar" value={rupiah(paid)} sub={amount ? `${Math.round((paid / amount) * 100)}% dari nilai PO` : undefined} tone="teal" />
        <StatCard label="Sisa tagihan" value={rupiah(amount - paid)} tone={amount - paid > 0 ? "red" : undefined} />
      </div>

      <Card title="Progres" className="mb-6"><ProgressBar progress={progress} detail /></Card>

      <div className="mb-6 grid gap-6 xl:grid-cols-5">
        <Card title="Tahapan administrasi" className="xl:col-span-3">
          <Table>
            <thead><tr><th>Tahap</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {flow.stages.map((st) => {
                const ps = byStage.get(st.id);
                const paidCount = o.invoices.filter((i) => i.paidAt).length;
                return (
                  <tr key={st.id} className={!st.done && !st.canComplete && !st.isPayment ? "text-slate-400" : undefined}>
                    <td className="whitespace-nowrap font-medium">{st.name}</td>
                    <td>
                      {st.isPayment
                        ? <Badge tone={st.done ? "green" : "slate"}>{paidCount}/{o.invoices.length} termin lunas</Badge>
                        : st.done ? <Badge tone="green">Selesai {tanggal(st.date)}</Badge> : st.canComplete ? <Badge tone="amber">Giliran tahap ini</Badge> : <Badge>Belum</Badge>}
                      {ps?.note && <div className="mt-1 text-xs text-slate-500">{ps.note}</div>}
                    </td>
                    <td>
                      {st.isPayment ? (
                        <span className="text-xs text-slate-500">{flow.payReady ? "Tandai lunas per termin di bagian Invoice" : "Terbuka setelah tahap sebelumnya selesai"}</span>
                      ) : st.canUndo ? (
                        <ActionForm key={`undo-${st.id}`} action={setStage}>
                          <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="stageId" value={st.id} /><input type="hidden" name="undo" value="1" />
                          <SubmitButton variant="ghost" small>Batalkan</SubmitButton>
                        </ActionForm>
                      ) : st.canComplete ? (
                        <ActionForm key={`done-${st.id}`} action={setStage} className="flex items-center gap-2">
                          <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="stageId" value={st.id} />
                          <Input type="date" name="completedAt" defaultValue={todayStr} className="w-36" />
                          <Input name="note" placeholder="Catatan" className="w-32" />
                          <SubmitButton small>Selesai</SubmitButton>
                        </ActionForm>
                      ) : st.done ? (
                        <span className="text-xs text-slate-500">Terkunci — tahap sesudahnya sudah berjalan</span>
                      ) : (
                        <span className="text-xs">Menunggu &quot;{st.blockedBy}&quot;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
        <Card title="Data PO" className="xl:col-span-2">
          <DL items={[["Site ID", o.customer.geSiteId], ["Metode bayar", PAYMENT_LABEL[o.paymentMethod]], ["Special notes", o.specialNotes]]} />
        </Card>
      </div>

      <Card
        title="Isi PO"
        className="mb-6"
        actions={<>
          <LinkButton small variant="outline" href={`/viewpoint/new?customerId=${o.customerId}&orderId=${o.id}`}>+ Instalasi ViewPoint 6</LinkButton>
          <LinkButton small variant="outline" href={`/tricefy/subscriptions/new?customerId=${o.customerId}&orderId=${o.id}`}>+ Langganan Tricefy</LinkButton>
        </>}
      >
        {o.vp6Installations.length + o.tricefySubscriptions.length === 0 ? <Empty>PO ini belum berisi instalasi atau langganan. Tambahkan dengan tombol di kanan atas.</Empty> : (
          <Table>
            <thead><tr><th>Produk</th><th>Detail</th><th>Tanggal</th><th className="text-right">Harga</th></tr></thead>
            <tbody>
              {o.vp6Installations.map((v) => (
                <tr key={`v${v.id}`}>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/viewpoint/${v.id}`}>ViewPoint 6</Link> <Badge tone="teal">{v.currentVersion}</Badge></td>
                  <td className="text-slate-600">{v.package?.name ?? "-"}{v.licenseQty ? ` · ${v.licenseQty} lisensi` : ""}<div className="font-mono text-xs">{v.devices.map((d) => d.device.serialNumber).join(", ")}</div></td>
                  <td>Install {tanggal(v.installDate)}</td>
                  <td className="text-right">{rupiah(v.price)}</td>
                </tr>
              ))}
              {o.tricefySubscriptions.map((s) => {
                const st = tricefyStatus(s.endDate, today);
                return (
                  <tr key={`t${s.id}`}>
                    <td><Link className="font-medium text-teal-800 hover:underline" href={`/tricefy/accounts/${s.accountId}`}>Tricefy</Link> <span className="font-mono text-xs">{s.account.tricefyId}</span></td>
                    <td className="text-slate-600">{s.package?.name ?? "-"}{s.quantity ? ` · ${s.quantity}` : ""}</td>
                    <td>{tanggal(s.activationDate)} – {tanggal(s.endDate)} <TricefyBadge status={st.status} daysLeft={st.daysLeft} /></td>
                    <td className="text-right">{rupiah(s.price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Invoice & termin pembayaran" className="mb-6">
        {o.invoices.length === 0 ? <Empty>Belum ada invoice. Buat jadwal termin di bawah.</Empty> : (
          <Table>
            <thead><tr><th>Termin</th><th>No. invoice</th><th>Jatuh tempo</th><th className="text-right">Nominal</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {o.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.sequence}</td>
                  <td>
                    <span className="font-mono text-xs">{inv.invoiceNumber ?? <span className="text-slate-400">belum terbit</span>}</span>
                    {inv.invoiceDate && <div className="text-xs text-slate-500">{tanggal(inv.invoiceDate)}</div>}
                    {inv.attachments.map((a) => <div key={a.id}><a href={`/api/files/${a.id}`} target="_blank" className="text-xs text-teal-800 hover:underline">📎 {a.fileName}</a></div>)}
                  </td>
                  <td className="whitespace-nowrap">{tanggal(inv.dueDate)}</td>
                  <td className="whitespace-nowrap text-right">{rupiah(inv.amount)}</td>
                  <td><InvoiceBadge paidAt={inv.paidAt} dueDate={inv.dueDate} today={today} />{inv.paidAt && <div className="text-xs text-slate-500">{tanggal(inv.paidAt)}</div>}</td>
                  <td className="space-y-1.5">
                    {inv.paidAt ? (
                      inv.sequence === flow.lastPaidSeq && flow.canUndoPay ? (
                        <ActionForm key={`unpay-${inv.id}`} action={setInvoicePaid}><input type="hidden" name="id" value={inv.id} /><input type="hidden" name="undo" value="1" /><SubmitButton variant="ghost" small>Batal lunas</SubmitButton></ActionForm>
                      ) : null
                    ) : inv.sequence === flow.nextPaySeq ? (
                      <ActionForm key={`pay-${inv.id}`} action={setInvoicePaid} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={inv.id} />
                        <Input type="date" name="paidAt" defaultValue={todayStr} className="w-36" />
                        <SubmitButton small>Lunas</SubmitButton>
                      </ActionForm>
                    ) : (
                      <span className="text-xs text-slate-500">{flow.payReady ? `Setelah termin ${flow.nextPaySeq} lunas` : "Setelah tukar faktur selesai"}</span>
                    )}
                    <details>
                      <summary className="cursor-pointer text-xs text-teal-800">Edit / lampiran</summary>
                      <div className="mt-2 space-y-3 rounded-md border border-slate-200 p-3">
                        <ActionForm action={saveInvoice} className="grid gap-2 sm:grid-cols-2">
                          <input type="hidden" name="id" value={inv.id} /><input type="hidden" name="orderId" value={o.id} />
                          <Field label="No. invoice"><Input name="invoiceNumber" defaultValue={inv.invoiceNumber ?? ""} /></Field>
                          <Field label="Tanggal invoice"><Input type="date" name="invoiceDate" defaultValue={toInputDate(inv.invoiceDate)} /></Field>
                          <Field label="Nominal"><Input type="number" name="amount" defaultValue={Number(inv.amount)} /></Field>
                          <Field label="Jatuh tempo"><Input type="date" name="dueDate" defaultValue={toInputDate(inv.dueDate)} /></Field>
                          <Field label="Catatan" className="sm:col-span-2"><Input name="notes" defaultValue={inv.notes ?? ""} /></Field>
                          <div><SubmitButton small variant="outline">Simpan invoice</SubmitButton></div>
                        </ActionForm>
                        <ActionForm action={uploadAttachment} resetOnSuccess className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="invoiceId" value={inv.id} />
                          <Select name="kind" defaultValue="INVOICE" className="w-36"><option value="INVOICE">Invoice</option><option value="BUKTI_BAYAR">Bukti bayar</option><option value="FAKTUR">Faktur</option></Select>
                          <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required className={fileInput + " w-56"} />
                          <SubmitButton small variant="outline">Unggah</SubmitButton>
                        </ActionForm>
                        {!inv.paidAt && <ConfirmDelete action={deleteInvoice.bind(null, inv.id)} what={`termin ${inv.sequence}`} label="Hapus termin" />}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {canReplan && (
            <div className="rounded-md border border-dashed border-slate-300 p-3">
              <div className="mb-2 text-sm font-medium">{o.invoices.length ? "Buat ulang jadwal termin" : "Buat jadwal termin"}</div>
              <ActionForm action={setInvoicePlan} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input type="hidden" name="orderId" value={o.id} />
                <Field label="Jumlah"><Input type="number" name="count" min={1} max={60} defaultValue={o.invoices.length || (o.paymentMethod === "CASH" ? 1 : 3)} /></Field>
                <Field label="Total (Rp)"><Input type="number" name="total" defaultValue={amount} /></Field>
                <Field label="Jatuh tempo ke-1"><Input type="date" name="firstDue" defaultValue={toInputDate(o.invoices[0]?.dueDate ?? today)} /></Field>
                <Field label="Jarak (bulan)"><Input type="number" name="interval" min={1} defaultValue={1} /></Field>
                <div className="col-span-2"><SubmitButton small>Buat jadwal</SubmitButton></div>
              </ActionForm>
            </div>
          )}
          <div className="rounded-md border border-dashed border-slate-300 p-3">
            <div className="mb-2 text-sm font-medium">+ Tambah invoice manual</div>
            <ActionForm action={saveInvoice} resetOnSuccess className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input type="hidden" name="orderId" value={o.id} />
              <Field label="No. invoice"><Input name="invoiceNumber" /></Field>
              <Field label="Nominal *"><Input type="number" name="amount" defaultValue={Math.max(0, amount - invoiced) || ""} required /></Field>
              <Field label="Jatuh tempo *"><Input type="date" name="dueDate" defaultValue={todayStr} required /></Field>
              <Field label="Tgl invoice"><Input type="date" name="invoiceDate" /></Field>
              <div className="col-span-2"><SubmitButton small variant="outline">Tambah</SubmitButton></div>
            </ActionForm>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Lampiran PO (PO, berita acara, faktur)" className="xl:col-span-2">
          <ActionForm action={uploadAttachment} resetOnSuccess className="mb-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="orderId" value={o.id} />
            <Field label="Jenis">
              <Select name="kind" defaultValue="PO" className="w-40">
                {["PO", "BERITA_ACARA", "FAKTUR", "LAINNYA"].map((k) => <option key={k} value={k}>{ATTACHMENT_LABEL[k]}</option>)}
              </Select>
            </Field>
            <Field label="File (PDF/JPG/PNG, maks. 10 MB)"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required className={fileInput} /></Field>
            <SubmitButton>Unggah</SubmitButton>
          </ActionForm>
          {o.attachments.length === 0 ? <Empty>Belum ada lampiran.</Empty> : (
            <Table>
              <thead><tr><th>Jenis</th><th>File</th><th>Diunggah</th><th></th></tr></thead>
              <tbody>
                {o.attachments.map((a) => (
                  <tr key={a.id}>
                    <td><Badge tone="teal">{ATTACHMENT_LABEL[a.kind]}</Badge></td>
                    <td><a className="text-teal-800 hover:underline" href={`/api/files/${a.id}`} target="_blank">{a.fileName}</a><div className="text-xs text-slate-500">{Math.max(1, Math.round(a.size / 1024))} KB</div></td>
                    <td className="text-xs text-slate-600">{waktu(a.createdAt)}<div>{a.uploadedBy?.name}</div></td>
                    <td className="text-right"><ConfirmDelete action={deleteAttachment.bind(null, a.id)} what={`lampiran ${a.fileName}`} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Riwayat perubahan PO"><History entity="PurchaseOrder" entityId={o.id} /></Card>
      </div>
    </>
  );
}
