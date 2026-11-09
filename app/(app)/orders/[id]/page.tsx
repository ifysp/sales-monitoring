import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { activeStages } from "@/lib/queries";
import { computeProgress } from "@/lib/progress";
import {
  deleteAttachment, deleteOrder, setInstallmentPlan, setStage, updateInstallment, uploadOrderAttachment,
} from "@/app/actions/orders";
import { ATTACHMENT_LABEL, PAYMENT_LABEL, rupiah, tanggal, toInputDate, todayDate, waktu } from "@/lib/format";
import { ActionForm, ConfirmDelete, SubmitButton } from "@/components/client";
import { Badge, Card, DL, Empty, Field, Input, LinkButton, PageHeader, Select, Table } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const me = await requireUser();
  const isAdmin = me.role === "ADMIN";
  const [order, stages] = await Promise.all([
    prisma.purchaseOrder.findFirst({
      where: { id: Number(id), deletedAt: null },
      include: {
        customer: true,
        items: { include: { product: true, package: true, machineModel: true }, orderBy: { id: "asc" } },
        stages: true,
        installments: { orderBy: { number: "asc" } },
        attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    activeStages(),
  ]);
  if (!order) notFound();

  const progress = computeProgress(stages, order.stages, order.paymentMethod, order.installments);
  const today = todayDate();
  const todayStr = toInputDate(today);
  const price = Number(order.price);
  const ppn = order.ppnPercent === null ? null : Number(order.ppnPercent);
  const received = Number(order.amountReceived);
  const byStage = new Map(order.stages.map((s) => [s.stageId, s]));

  return (
    <>
      <PageHeader
        title={`PO ${order.poNumber}`}
        subtitle={<Link className="text-teal-800 hover:underline" href={`/customers/${order.customerId}`}>{order.customer.name}</Link>}
        actions={
          <>
            <LinkButton variant="outline" href={`/orders/${order.id}/edit`}>Edit PO</LinkButton>
            {isAdmin && <ConfirmDelete action={deleteOrder.bind(null, order.id)} what={`PO ${order.poNumber}`} small={false} />}
          </>
        }
      />

      <Card title="Progres" className="mb-6">
        <ProgressBar progress={progress} detail />
      </Card>

      <div className="mb-6 grid gap-6 xl:grid-cols-5">
        <Card title="Data PO" className="xl:col-span-2">
          <DL items={[
            ["Tanggal PO", tanggal(order.poDate)],
            ["No. invoice", order.invoiceNumber],
            ["Metode bayar", PAYMENT_LABEL[order.paymentMethod]],
            ["Nilai deal", rupiah(price)],
            ["PPN", ppn === null ? "-" : `${ppn}% (${rupiah((price * ppn) / 100)})`],
            ["Uang diterima", <span key="r">{rupiah(received)} <span className="text-xs text-slate-500">({price ? Math.round((received / price) * 100) : 0}%)</span></span>],
            ["Special notes", order.specialNotes],
          ]} />
        </Card>

        <Card title="Tahapan" className="xl:col-span-3">
          <Table>
            <thead><tr><th>Tahap</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {stages.map((st) => {
                const ps = byStage.get(st.id);
                const viaInstallments = st.isPayment && order.paymentMethod === "CICILAN";
                return (
                  <tr key={st.id}>
                    <td className="font-medium">{st.name}{st.isPayment && <span className="ml-1 text-xs text-slate-500">(pembayaran)</span>}</td>
                    <td>
                      {ps?.completedAt ? <Badge tone="green">Selesai {tanggal(ps.completedAt)}</Badge> : <Badge>Belum</Badge>}
                      {ps?.note && <div className="mt-1 text-xs text-slate-500">{ps.note}</div>}
                    </td>
                    <td>
                      {viaInstallments ? (
                        <span className="text-xs text-slate-500">Otomatis selesai saat semua cicilan lunas</span>
                      ) : ps?.completedAt ? (
                        <ActionForm action={setStage}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="stageId" value={st.id} />
                          <input type="hidden" name="undo" value="1" />
                          <SubmitButton variant="ghost" small>Batalkan</SubmitButton>
                        </ActionForm>
                      ) : (
                        <ActionForm action={setStage} className="flex items-center gap-2">
                          <input type="hidden" name="orderId" value={order.id} />
                          <input type="hidden" name="stageId" value={st.id} />
                          <Input type="date" name="completedAt" defaultValue={todayStr} className="w-36" />
                          <Input name="note" placeholder="Catatan" className="w-32" />
                          <SubmitButton small>Tandai selesai</SubmitButton>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      </div>

      {order.paymentMethod === "CICILAN" && (
        <Card title="Cicilan" className="mb-6">
          {order.installments.length === 0 ? (
            <Empty>{isAdmin ? "Jadwal cicilan belum dibuat. Atur di bawah." : "Jadwal cicilan belum dibuat. Menunggu Admin (Lead SWIT) mengatur."}</Empty>
          ) : (
            <Table>
              <thead><tr><th>Ke</th><th>Jatuh tempo</th><th className="text-right">Nominal</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {order.installments.map((ins) => (
                  <tr key={ins.id}>
                    <td>{ins.number}</td>
                    <td className="whitespace-nowrap">{tanggal(ins.dueDate)}</td>
                    <td className="text-right whitespace-nowrap">{rupiah(Number(ins.amount))}</td>
                    <td>
                      {ins.paidAt ? <Badge tone="green">Lunas {tanggal(ins.paidAt)}</Badge>
                        : ins.dueDate < today ? <Badge tone="red">Terlambat</Badge> : <Badge>Belum</Badge>}
                      {ins.note && <div className="mt-1 text-xs text-slate-500">{ins.note}</div>}
                    </td>
                    <td className="space-y-2">
                      {ins.paidAt ? (
                        <ActionForm action={updateInstallment}>
                          <input type="hidden" name="id" value={ins.id} />
                          <input type="hidden" name="mode" value="unpay" />
                          <SubmitButton variant="ghost" small>Batalkan lunas</SubmitButton>
                        </ActionForm>
                      ) : (
                        <ActionForm action={updateInstallment} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={ins.id} />
                          <input type="hidden" name="mode" value="pay" />
                          <Input type="date" name="paidAt" defaultValue={todayStr} className="w-40" />
                          <SubmitButton small>Tandai lunas</SubmitButton>
                        </ActionForm>
                      )}
                      {isAdmin && !ins.paidAt && (
                        <details>
                          <summary className="cursor-pointer text-xs text-teal-800">Ubah jadwal</summary>
                          <ActionForm action={updateInstallment} className="mt-2 flex flex-wrap items-center gap-2">
                            <input type="hidden" name="id" value={ins.id} />
                            <input type="hidden" name="mode" value="edit" />
                            <Input type="date" name="dueDate" defaultValue={toInputDate(ins.dueDate)} className="w-40" />
                            <Input type="number" name="amount" defaultValue={Number(ins.amount)} className="w-36" />
                            <Input name="note" defaultValue={ins.note ?? ""} placeholder="Catatan" className="w-40" />
                            <SubmitButton small variant="outline">Simpan</SubmitButton>
                          </ActionForm>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {isAdmin && !order.installments.some((i) => i.paidAt) && (
            <div className="mt-4 rounded-md border border-dashed border-slate-300 p-3">
              <div className="mb-2 text-sm font-medium">{order.installments.length ? "Buat ulang jadwal cicilan" : "Atur jadwal cicilan"} <span className="text-xs font-normal text-slate-500">(Admin)</span></div>
              <ActionForm action={setInstallmentPlan} className="grid gap-3 sm:grid-cols-5">
                <input type="hidden" name="orderId" value={order.id} />
                <Field label="Jumlah cicilan"><Input type="number" name="count" min={1} max={60} defaultValue={order.installments.length || 3} /></Field>
                <Field label="Total (Rp)"><Input type="number" name="total" defaultValue={price} /></Field>
                <Field label="Jatuh tempo pertama"><Input type="date" name="firstDue" defaultValue={todayStr} /></Field>
                <Field label="Jarak (bulan)"><Input type="number" name="interval" min={1} defaultValue={1} /></Field>
                <div className="flex items-end"><SubmitButton>Buat jadwal</SubmitButton></div>
              </ActionForm>
            </div>
          )}
        </Card>
      )}

      <Card title="Produk dalam PO" className="mb-6">
        <Table>
          <thead><tr><th>Produk / package</th><th>Jumlah</th><th>Mesin / SN</th><th>ID</th><th>Install</th><th>Kontrak</th></tr></thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>
                  <div className="font-medium">{it.product.name}</div>
                  <div className="text-xs text-slate-500">{it.package?.name ?? "-"}</div>
                  {it.notes && <div className="text-xs text-slate-500">{it.notes}</div>}
                </td>
                <td>{it.quantity ?? (it.package?.name.toLowerCase().includes("unlimited") ? "Unlimited" : "-")}{it.quantity && it.package?.unit ? ` ${it.package.unit}` : ""}</td>
                <td>{it.machineModel ? `${it.machineModel.brand} ${it.machineModel.model}` : "-"}<div className="text-xs text-slate-500">{it.serialNumber ?? ""}</div></td>
                <td>{it.triceId ? `Tricefy: ${it.triceId}` : it.siteCode ? `Site: ${it.siteCode}` : "-"}</td>
                <td className="whitespace-nowrap">{tanggal(it.installDate)}</td>
                <td className="whitespace-nowrap">
                  {it.contractStart || it.contractEnd ? `${tanggal(it.contractStart)} – ${tanggal(it.contractEnd)}` : "-"}
                  {it.contractEnd && it.contractEnd < today && <div><Badge tone="red">berakhir</Badge></div>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card title="Lampiran (PO, berita acara, faktur, bukti bayar)">
        <ActionForm action={uploadOrderAttachment} resetOnSuccess className="mb-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="orderId" value={order.id} />
          <Field label="Jenis">
            <Select name="kind" defaultValue="PO" className="w-40">
              {Object.entries(ATTACHMENT_LABEL).filter(([k]) => k !== "ERROR").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </Field>
          <Field label="File (PDF/JPG/PNG, maks. 10 MB)">
            <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm" />
          </Field>
          <SubmitButton>Unggah</SubmitButton>
        </ActionForm>
        {order.attachments.length === 0 ? <Empty>Belum ada lampiran.</Empty> : (
          <Table>
            <thead><tr><th>Jenis</th><th>File</th><th>Diunggah</th><th></th></tr></thead>
            <tbody>
              {order.attachments.map((a) => (
                <tr key={a.id}>
                  <td><Badge tone="teal">{ATTACHMENT_LABEL[a.kind]}</Badge></td>
                  <td>
                    <a className="text-teal-800 hover:underline" href={`/api/files/${a.id}`} target="_blank">{a.fileName}</a>
                    <div className="text-xs text-slate-500">{(a.size / 1024).toFixed(0)} KB</div>
                  </td>
                  <td className="text-xs text-slate-600">{waktu(a.createdAt)}<div>{a.uploadedBy?.name}</div></td>
                  <td className="text-right"><ConfirmDelete action={deleteAttachment.bind(null, a.id)} what={`lampiran ${a.fileName}`} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
