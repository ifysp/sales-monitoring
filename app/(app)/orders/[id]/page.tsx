import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { computeFlow, computeProgress, type Step } from "@/lib/progress";
import { tricefyStatus } from "@/lib/tricefy";
import {
  completeInvoice, completeTukar, deleteAttachment, deleteOrder, deletePayment, payPayment, savePayment,
  setPaymentPlan, undoInvoice, undoTukar, unpayPayment, uploadAttachment,
} from "@/app/actions/orders";
import { ATTACHMENT_LABEL, PAYMENT_LABEL, addDays, rupiah, tanggal, toInputDate, todayDate, waktu } from "@/lib/format";
import { ActionForm, ConfirmDelete, SubmitButton } from "@/components/client";
import { Badge, Card, Empty, Field, Input, InvoiceBadge, LinkButton, PageHeader, Select, StatCard, Table, TricefyBadge, cn } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { History } from "@/components/history";

const fileInput = "block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm";

type Att = { id: number; kind: string; fileName: string; paymentId: number | null };

function Files({ files }: { files: Att[] }) {
  if (files.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-x-3">
      {files.map((f) => <a key={f.id} href={`/api/files/${f.id}`} target="_blank" className="text-teal-800 hover:underline">📎 {f.fileName}</a>)}
    </span>
  );
}

// Satu langkah dalam stepper: nomor, judul, status, daftar dokumen kurang, isi
function StepCard({ n, step, children, actions }: { n: number; step: Step; children: ReactNode; actions?: ReactNode }) {
  const tone = step.done ? "border-emerald-200" : step.open ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200 opacity-70";
  return (
    <section className={cn("rounded-lg border bg-white", tone)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", step.done ? "bg-emerald-600 text-white" : step.open ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-600")}>
            {step.done ? "✓" : n}
          </span>
          <h2 className="font-semibold">{step.label}</h2>
          {step.done ? <Badge tone="green">Selesai{step.date ? ` ${tanggal(step.date)}` : ""}</Badge> : step.open ? <Badge tone="amber">Giliran langkah ini</Badge> : <Badge>Menunggu langkah sebelumnya</Badge>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="space-y-3 p-4 text-sm">
        {!step.done && step.missing.length > 0 && step.open && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">Yang belum ada: {step.missing.join(", ")}</p>
        )}
        {children}
      </div>
    </section>
  );
}

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const o = await prisma.purchaseOrder.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      customer: true,
      payments: { orderBy: { sequence: "asc" }, include: { attachments: true } },
      attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      vp6Installations: { where: { deletedAt: null }, include: { devices: { include: { device: true } } } },
      tricefySubscriptions: { where: { deletedAt: null }, include: { account: true } },
    },
  });
  if (!o) notFound();
  const today = todayDate();
  const todayStr = toInputDate(today);
  const flow = computeFlow(o);
  const progress = computeProgress(o);
  const [s1, s2, s3, s4, s5] = flow.steps;
  const docs = o.attachments.filter((a) => a.paymentId === null);
  const ofKind = (k: string) => docs.filter((a) => a.kind === k);
  const amount = o.finalAmount === null ? null : Number(o.finalAmount);
  const paid = o.payments.filter((p) => p.paidAt).reduce((s, p) => s + Number(p.amount), 0);
  const planned = o.payments.reduce((s, p) => s + Number(p.amount), 0);
  const required = ["PO", "INVOICE", "BERITA_ACARA", "TANDA_TERIMA"];
  const docCount = required.filter((k) => ofKind(k).length > 0).length + o.payments.filter((p) => p.paidAt && p.attachments.length > 0).length;
  const docTotal = required.length + o.payments.length;

  return (
    <>
      <PageHeader
        title={`PO ${o.poNumber}`}
        subtitle={<span><Link className="text-teal-800 hover:underline" href={`/customers/${o.customerId}`}>{o.customer.name}</Link> · diterima {tanggal(o.poDate)} · {PAYMENT_LABEL[o.paymentMethod]}</span>}
        actions={<><LinkButton variant="outline" href={`/orders/${o.id}/edit`}>Edit PO</LinkButton><ConfirmDelete action={deleteOrder.bind(null, o.id)} what={`PO ${o.poNumber}`} small={false} /></>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Harga final (invoice)" value={amount === null ? "—" : rupiah(amount)} sub={amount === null ? "Diisi di langkah Invoice & BA" : o.invoiceNumber ?? undefined} />
        <StatCard label="Sudah dibayar" value={rupiah(paid)} tone="teal" sub={amount ? `${Math.round((paid / amount) * 100)}% dari harga final` : undefined} />
        <StatCard label="Sisa tagihan" value={amount === null ? "—" : rupiah(amount - paid)} tone={amount !== null && amount - paid > 0 ? "red" : undefined} />
        <StatCard label="Dokumen" value={`${docCount}/${docTotal}`} sub="PO, invoice, BA, tanda terima, bukti bayar" tone={docCount < docTotal ? "amber" : undefined} />
      </div>

      <Card title="Progres" className="mb-6"><ProgressBar progress={progress} detail /></Card>

      <div className="mb-6 space-y-4">
        {/* 1. PO diterima */}
        <StepCard n={1} step={s1}>
          <p>Tanggal PO diterima: <b>{tanggal(o.poDate)}</b>{o.notes && <span className="text-slate-600"> · {o.notes}</span>}</p>
          <div>File PO: {ofKind("PO").length ? <Files files={ofKind("PO")} /> : <span className="text-slate-500">belum ada</span>}</div>
          {!s1.done && (
            <ActionForm key="po-file" action={uploadAttachment} resetOnSuccess className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="kind" value="PO" />
              <Field label="Unggah file PO (PDF/JPG/PNG, maks. 10 MB)"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required className={fileInput} /></Field>
              <SubmitButton small>Unggah</SubmitButton>
            </ActionForm>
          )}
        </StepCard>

        {/* 2. Invoice & BA */}
        <StepCard
          n={2}
          step={s2}
          actions={s2.done && flow.canUndoInvoice ? <ConfirmDelete key="undo-inv" action={undoInvoice.bind(null, o.id)} what="langkah Invoice & BA (file tetap tersimpan)" label="Batalkan langkah" verb="Batalkan" /> : null}
        >
          {s2.done ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><div className="text-xs uppercase text-slate-500">No. invoice</div><div className="font-mono">{o.invoiceNumber}</div></div>
              <div><div className="text-xs uppercase text-slate-500">Tanggal invoice</div>{tanggal(o.invoiceDate)}</div>
              <div><div className="text-xs uppercase text-slate-500">Harga final</div><b>{rupiah(amount)}</b></div>
              <div><div className="text-xs uppercase text-slate-500">Tanggal BA</div>{tanggal(o.baDate)}</div>
              <div className="sm:col-span-2">File invoice: <Files files={ofKind("INVOICE")} /></div>
              <div className="sm:col-span-2">File BA: <Files files={ofKind("BERITA_ACARA")} /></div>
            </div>
          ) : s2.open ? (
            <ActionForm key="inv-form" action={completeInvoice} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="orderId" value={o.id} />
              <Field label="No. invoice *" hint="Unik"><Input name="invoiceNumber" defaultValue={o.invoiceNumber ?? ""} required /></Field>
              <Field label="Tanggal invoice *"><Input type="date" name="invoiceDate" defaultValue={toInputDate(o.invoiceDate ?? today)} required /></Field>
              <Field label="Harga final (Rp) *" hint="Harga penjualan yang ditagihkan"><Input type="number" min={1} step="1" name="finalAmount" defaultValue={amount ?? ""} required /></Field>
              <Field label="Tanggal BA *"><Input type="date" name="baDate" defaultValue={toInputDate(o.baDate ?? today)} required /></Field>
              <Field label={ofKind("INVOICE").length ? "File invoice (sudah ada, opsional ganti)" : "File invoice *"} className="sm:col-span-2">
                <input type="file" name="invoiceFile" accept=".pdf,.jpg,.jpeg,.png" className={fileInput} />
              </Field>
              <Field label={ofKind("BERITA_ACARA").length ? "File BA (sudah ada, opsional ganti)" : "File berita acara (BA) *"} className="sm:col-span-2">
                <input type="file" name="baFile" accept=".pdf,.jpg,.jpeg,.png" className={fileInput} />
              </Field>
              <div className="sm:col-span-4"><SubmitButton>Simpan invoice & BA</SubmitButton></div>
            </ActionForm>
          ) : <p className="text-slate-500">Terbuka setelah file PO diunggah.</p>}
        </StepCard>

        {/* 3. Tukar faktur */}
        <StepCard
          n={3}
          step={s3}
          actions={o.tukarFakturDate && flow.canUndoTukar ? <ConfirmDelete key="undo-tukar" action={undoTukar.bind(null, o.id)} what="langkah Tukar faktur (file tetap tersimpan)" label="Batalkan langkah" verb="Batalkan" /> : null}
        >
          {s3.done ? (
            <p>Tanggal tukar faktur: <b>{tanggal(o.tukarFakturDate)}</b> · Tanda terima: <Files files={ofKind("TANDA_TERIMA")} /></p>
          ) : s3.open ? (
            <ActionForm key="tukar-form" action={completeTukar} className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="orderId" value={o.id} />
              <Field label="Tanggal tukar faktur *"><Input type="date" name="tukarFakturDate" defaultValue={toInputDate(o.tukarFakturDate ?? today)} required /></Field>
              <Field label={ofKind("TANDA_TERIMA").length ? "File tanda terima (sudah ada, opsional ganti)" : "File tanda terima *"} className="sm:col-span-2">
                <input type="file" name="tandaTerimaFile" accept=".pdf,.jpg,.jpeg,.png" className={fileInput} />
              </Field>
              <div><SubmitButton>Simpan tukar faktur</SubmitButton></div>
            </ActionForm>
          ) : <p className="text-slate-500">Terbuka setelah invoice & BA lengkap.</p>}
        </StepCard>

        {/* 4. Penagihan */}
        <StepCard n={4} step={s4}>
          {amount === null ? <p className="text-slate-500">Jadwal penagihan dibuat setelah harga final diisi di langkah 2.</p> : (
            <>
              {o.payments.length > 0 && Math.round(planned) !== Math.round(amount) && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">Total termin {rupiah(planned)} tidak sama dengan harga final {rupiah(amount)}. Sesuaikan nominal termin.</p>
              )}
              {o.payments.length === 0 ? <Empty>Belum ada jadwal penagihan.</Empty> : (
                <Table>
                  <thead><tr><th>Termin</th><th>Jatuh tempo</th><th className="text-right">Nominal</th><th>Status</th><th>Bukti bayar</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {o.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="font-medium">{p.sequence}</td>
                        <td className="whitespace-nowrap">{tanggal(p.dueDate)}</td>
                        <td className="whitespace-nowrap text-right">{rupiah(p.amount)}</td>
                        <td><InvoiceBadge paidAt={p.paidAt} dueDate={p.dueDate} today={today} />{p.paidAt && <div className="text-xs text-slate-500">{tanggal(p.paidAt)}</div>}</td>
                        <td><Files files={p.attachments} /></td>
                        <td className="space-y-1.5">
                          {p.paidAt ? (
                            p.sequence === flow.lastPaidSeq ? <ConfirmDelete key={`unpay-${p.id}`} action={unpayPayment.bind(null, p.id)} what={`status lunas termin ${p.sequence}`} label="Batal lunas" verb="Batalkan" /> : null
                          ) : p.sequence === flow.nextPaySeq ? (
                            <ActionForm key={`pay-${p.id}`} action={payPayment} className="grid max-w-xs gap-2">
                              <input type="hidden" name="id" value={p.id} />
                              <Field label="Tanggal bayar"><Input type="date" name="paidAt" defaultValue={todayStr} /></Field>
                              <Field label="Bukti bayar *"><input type="file" name="proofFile" accept=".pdf,.jpg,.jpeg,.png" className={fileInput} /></Field>
                              <div><SubmitButton small>Lunas</SubmitButton></div>
                            </ActionForm>
                          ) : (
                            <span className="text-xs text-slate-500">{s4.open ? `Setelah termin ${flow.nextPaySeq} lunas` : "Setelah tukar faktur"}</span>
                          )}
                          {!p.paidAt && (
                            <details>
                              <summary className="cursor-pointer text-xs text-teal-800">Ubah / hapus</summary>
                              <ActionForm key={`edit-${p.id}`} action={savePayment} className="mt-2 flex flex-wrap items-end gap-2">
                                <input type="hidden" name="id" value={p.id} /><input type="hidden" name="orderId" value={o.id} />
                                <Field label="Nominal"><Input type="number" name="amount" defaultValue={Number(p.amount)} className="w-36" /></Field>
                                <Field label="Jatuh tempo"><Input type="date" name="dueDate" defaultValue={toInputDate(p.dueDate)} className="w-40" /></Field>
                                <SubmitButton small variant="outline">Simpan</SubmitButton>
                              </ActionForm>
                              <div className="mt-2"><ConfirmDelete action={deletePayment.bind(null, p.id)} what={`termin ${p.sequence}`} label="Hapus termin" /></div>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
              {flow.paidCount === 0 && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border border-dashed border-slate-300 p-3">
                    <div className="mb-2 font-medium">{o.payments.length ? "Buat ulang jadwal" : "Buat jadwal penagihan"} <span className="font-normal text-slate-500">(dibagi rata dari harga final)</span></div>
                    <ActionForm key="plan" action={setPaymentPlan} className="grid grid-cols-3 gap-2">
                      <input type="hidden" name="orderId" value={o.id} />
                      <Field label="Jumlah termin"><Input type="number" name="count" min={1} max={60} defaultValue={o.payments.length || (o.paymentMethod === "CASH" ? 1 : 3)} /></Field>
                      <Field label="Jatuh tempo ke-1"><Input type="date" name="firstDue" defaultValue={toInputDate(o.payments[0]?.dueDate ?? addDays(o.tukarFakturDate ?? o.invoiceDate ?? today, 30))} /></Field>
                      <Field label="Jarak (bulan)"><Input type="number" name="interval" min={1} defaultValue={1} /></Field>
                      <div className="col-span-3"><SubmitButton small>Buat jadwal</SubmitButton></div>
                    </ActionForm>
                  </div>
                  <div className="rounded-md border border-dashed border-slate-300 p-3">
                    <div className="mb-2 font-medium">+ Tambah termin manual</div>
                    <ActionForm key="add-pay" action={savePayment} resetOnSuccess className="grid grid-cols-2 gap-2">
                      <input type="hidden" name="orderId" value={o.id} />
                      <Field label="Nominal *"><Input type="number" name="amount" defaultValue={Math.max(0, amount - planned) || ""} required /></Field>
                      <Field label="Jatuh tempo *"><Input type="date" name="dueDate" defaultValue={todayStr} required /></Field>
                      <div className="col-span-2"><SubmitButton small variant="outline">Tambah</SubmitButton></div>
                    </ActionForm>
                  </div>
                </div>
              )}
            </>
          )}
        </StepCard>

        {/* 5. Clear */}
        <StepCard n={5} step={s5}>
          <p className={s5.done ? "text-emerald-800" : "text-slate-500"}>{s5.done ? "Semua dokumen lengkap dan semua termin lunas. PO selesai." : "Otomatis selesai setelah semua termin lunas."}</p>
        </StepCard>
      </div>

      <Card
        title="Produk dalam PO"
        className="mb-6"
        actions={<>
          <LinkButton small variant="outline" href={`/viewpoint/new?customerId=${o.customerId}&orderId=${o.id}`}>+ ViewPoint 6</LinkButton>
          <LinkButton small variant="outline" href={`/tricefy/subscriptions/new?customerId=${o.customerId}&orderId=${o.id}`}>+ Tricefy</LinkButton>
        </>}
      >
        {o.vp6Installations.length + o.tricefySubscriptions.length === 0 ? <Empty>Belum ada produk. Tambahkan ViewPoint 6 dan/atau Tricefy yang dibeli di PO ini.</Empty> : (
          <Table>
            <thead><tr><th>Produk</th><th>Detail</th><th>Tanggal</th></tr></thead>
            <tbody>
              {o.vp6Installations.map((v) => (
                <tr key={`v${v.id}`}>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/viewpoint/${v.id}`}>ViewPoint 6</Link> <Badge tone="teal">{v.currentVersion}</Badge></td>
                  <td className="font-mono text-xs">{v.devices.map((d) => d.device.serialNumber).join(", ") || "-"}</td>
                  <td>Install {tanggal(v.installDate)}</td>
                </tr>
              ))}
              {o.tricefySubscriptions.map((s) => {
                const st = tricefyStatus(s.endDate, today);
                return (
                  <tr key={`t${s.id}`}>
                    <td><Link className="font-medium text-teal-800 hover:underline" href={`/tricefy/accounts/${s.accountId}`}>Tricefy</Link> <span className="font-mono text-xs">{s.account.tricefyId}</span></td>
                    <td><TricefyBadge status={st.status} daysLeft={st.daysLeft} /></td>
                    <td>{tanggal(s.activationDate)} – {tanggal(s.endDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Semua lampiran PO" className="xl:col-span-2">
          <ActionForm key="extra-file" action={uploadAttachment} resetOnSuccess className="mb-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="orderId" value={o.id} />
            <Field label="Jenis">
              <Select name="kind" defaultValue="FAKTUR" className="w-44">
                {["PO", "INVOICE", "BERITA_ACARA", "TANDA_TERIMA", "FAKTUR", "LAINNYA"].map((k) => <option key={k} value={k}>{ATTACHMENT_LABEL[k]}</option>)}
              </Select>
            </Field>
            <Field label="File (PDF/JPG/PNG, maks. 10 MB)"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required className={fileInput} /></Field>
            <SubmitButton variant="outline">Unggah</SubmitButton>
          </ActionForm>
          {o.attachments.length === 0 ? <Empty>Belum ada lampiran.</Empty> : (
            <Table>
              <thead><tr><th>Jenis</th><th>File</th><th>Diunggah</th><th></th></tr></thead>
              <tbody>
                {o.attachments.map((a) => (
                  <tr key={a.id}>
                    <td><Badge tone="teal">{ATTACHMENT_LABEL[a.kind]}</Badge>{a.paymentId && <div className="text-xs text-slate-500">termin {o.payments.find((p) => p.id === a.paymentId)?.sequence}</div>}</td>
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
