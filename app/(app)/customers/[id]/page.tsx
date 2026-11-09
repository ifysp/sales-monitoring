import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { listOrders, listTricefy, listVp6, topology } from "@/lib/queries";
import { deleteCustomer, deleteErrorLog, deleteTechNote, saveErrorLog, saveTechNote } from "@/app/actions/customers";
import { CUSTOMER_TYPE_LABEL, PC_ROLE_LABEL, PC_SOURCE_LABEL, TECH_NOTE_LABEL, rupiah, tanggal, toInputDate, todayDate } from "@/lib/format";
import { ActionForm, ConfirmDelete, SubmitButton } from "@/components/client";
import { Badge, Card, DL, Empty, Field, Input, InvoiceBadge, LinkButton, PageHeader, Select, StatCard, Table, Tabs, Textarea, TricefyBadge } from "@/components/ui";
import { ProgressBar } from "@/components/progress-bar";
import { History } from "@/components/history";

const TABS = ["ringkasan", "orders", "viewpoint", "tricefy", "devices", "teknis", "riwayat"] as const;

export default async function CustomerDetailPage({ params, searchParams }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? String(sp.tab) : "ringkasan";
  const me = await requireUser();
  const today = todayDate();
  const customer = await prisma.customer.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      devices: { where: { deletedAt: null }, include: { machineModel: true }, orderBy: { serialNumber: "asc" } },
      pcs: { where: { deletedAt: null }, orderBy: { id: "asc" } },
      techNotes: { orderBy: [{ kind: "asc" }, { title: "asc" }] },
      errorLogs: { include: { attachments: true, device: true }, orderBy: { occurredAt: "desc" } },
      tricefyAccounts: { where: { deletedAt: null }, orderBy: { tricefyId: "asc" } },
    },
  });
  if (!customer) notFound();
  const cid = String(customer.id);
  const [orders, vp6, tricefy] = await Promise.all([
    listOrders({ customer: cid }),
    listVp6({ customer: cid }),
    listTricefy({ customer: cid }, today),
  ]);
  const base = `/customers/${customer.id}`;
  const unpaid = orders.reduce((s, o) => s + (o.amountNum - o.paid), 0);
  // Ringkasan "perlu perhatian": invoice belum lunas + langganan Tricefy yang tidak aktif
  const attention = [
    ...orders.flatMap((o) => o.invoices.filter((i) => !i.paidAt).map((i) => ({
      key: `i${i.id}`, href: `/orders/${o.id}`,
      text: `PO ${o.poNumber} · termin ${i.sequence} · ${rupiah(i.amount)} · jatuh tempo ${tanggal(i.dueDate)}`,
      badge: <InvoiceBadge paidAt={i.paidAt} dueDate={i.dueDate} today={today} />,
    }))),
    ...tricefy.filter((t) => t.status !== "AKTIF").map((t) => ({
      key: `t${t.id}`, href: `/tricefy/accounts/${t.accountId}`,
      text: `Tricefy ${t.account.tricefyId} berakhir ${tanggal(t.endDate)}`,
      badge: <TricefyBadge status={t.status} daysLeft={t.daysLeft} />,
    })),
  ];

  return (
    <>
      <PageHeader
        title={customer.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{CUSTOMER_TYPE_LABEL[customer.type]}</Badge>
            {customer.geSiteId && <span className="font-mono text-xs">Site ID {customer.geSiteId}</span>}
            {customer.city && <span>{customer.city}</span>}
          </span>
        }
        actions={
          <>
            <LinkButton variant="outline" href={`${base}/edit`}>Edit</LinkButton>
            <ConfirmDelete action={deleteCustomer.bind(null, customer.id)} what={`${customer.name} beserta PO-nya`} small={false} />
          </>
        }
      />
      <Tabs
        base={base}
        current={tab}
        tabs={[
          { key: "ringkasan", label: "Ringkasan" },
          { key: "orders", label: "PO & Invoice", count: orders.length },
          { key: "viewpoint", label: "ViewPoint 6", count: vp6.length },
          { key: "tricefy", label: "Tricefy", count: customer.tricefyAccounts.length },
          { key: "devices", label: "Alat & PC", count: customer.devices.length + customer.pcs.length },
          { key: "teknis", label: "Catatan teknis", count: customer.techNotes.length + customer.errorLogs.length },
          { key: "riwayat", label: "Riwayat" },
        ]}
      />

      {tab === "ringkasan" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Data customer">
            <DL items={[
              ["Kontak / dokter", customer.contactName], ["Telepon", customer.phone], ["Email", customer.email],
              ["Alamat", customer.address], ["Catatan", customer.notes],
            ]} />
          </Card>
          <div className="space-y-4 lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
              <StatCard label="PO berjalan" value={orders.filter((o) => !o.progress.complete).length} href={`${base}?tab=orders`} />
              <StatCard label="Belum dibayar" value={rupiah(unpaid)} tone={unpaid > 0 ? "amber" : undefined} href={`${base}?tab=orders`} />
              <StatCard label="Instalasi VP6" value={vp6.length} sub={vp6[0] ? `Versi ${vp6[0].currentVersion}` : undefined} href={`${base}?tab=viewpoint`} />
              <StatCard label="Tricefy" value={tricefy.length} sub={tricefy.some((t) => t.status !== "AKTIF") ? "Ada yang perlu diperpanjang" : undefined} tone={tricefy.some((t) => t.status !== "AKTIF") ? "red" : undefined} href={`${base}?tab=tricefy`} />
            </div>
            <Card title="Perlu perhatian">
              {attention.length === 0 ? <p className="text-sm text-slate-500">Tidak ada tagihan terbuka atau langganan yang perlu diperpanjang.</p> : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {attention.map((a) => (
                    <li key={a.key} className="flex items-center justify-between gap-3 py-2">
                      <Link href={a.href} className="text-teal-800 hover:underline">{a.text}</Link>
                      {a.badge}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Tambah data untuk customer ini">
              <div className="flex flex-wrap gap-2">
                <LinkButton href={`/orders/new?customerId=${cid}`}>+ Purchase Order</LinkButton>
                <LinkButton variant="outline" href={`/viewpoint/new?customerId=${cid}`}>+ Instalasi ViewPoint 6</LinkButton>
                <LinkButton variant="outline" href={`/tricefy/accounts/new?customerId=${cid}`}>+ Akun Tricefy</LinkButton>
                <LinkButton variant="outline" href={`/devices/new?customerId=${cid}&returnTo=${encodeURIComponent(base + "?tab=devices")}`}>+ Alat USG</LinkButton>
                <LinkButton variant="outline" href={`/pcs/new?customerId=${cid}`}>+ PC</LinkButton>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "orders" && (
        <Card title="Purchase Order" actions={<LinkButton small href={`/orders/new?customerId=${cid}`}>+ PO</LinkButton>}>
          {orders.length === 0 ? <Empty>Belum ada PO.</Empty> : (
            <Table>
              <thead><tr><th>PO</th><th className="text-right">Nilai</th><th className="text-right">Di-invoice</th><th className="text-right">Lunas</th><th>Progres</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link className="font-medium text-teal-800 hover:underline" href={`/orders/${o.id}`}>{o.poNumber}</Link><div className="text-xs text-slate-500">{tanggal(o.poDate)}</div></td>
                    <td className="text-right whitespace-nowrap">{rupiah(o.amountNum)}</td>
                    <td className="text-right whitespace-nowrap">{rupiah(o.invoiced)}</td>
                    <td className="text-right whitespace-nowrap">{rupiah(o.paid)}</td>
                    <td className="w-64"><ProgressBar progress={o.progress} /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "viewpoint" && (
        <Card title="Instalasi ViewPoint 6" actions={<LinkButton small href={`/viewpoint/new?customerId=${cid}`}>+ Instalasi</LinkButton>}>
          {vp6.length === 0 ? <Empty>Belum ada instalasi ViewPoint 6.</Empty> : (
            <Table>
              <thead><tr><th>Tanggal install</th><th>Versi</th><th>Package</th><th>Topologi</th><th>Alat (SN)</th><th>PO</th></tr></thead>
              <tbody>
                {vp6.map((v) => (
                  <tr key={v.id}>
                    <td><Link className="font-medium text-teal-800 hover:underline" href={`/viewpoint/${v.id}`}>{tanggal(v.installDate)}</Link></td>
                    <td><Badge tone="teal">{v.currentVersion}</Badge></td>
                    <td>{v.package?.name ?? "-"}</td>
                    <td>{topology(v.pcs)}</td>
                    <td className="font-mono text-xs">{v.devices.map((d) => d.device.serialNumber).join(", ") || "-"}</td>
                    <td>{v.order ? <Link className="text-teal-800 hover:underline" href={`/orders/${v.order.id}`}>{v.order.poNumber}</Link> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "tricefy" && (
        <Card title="Akun & langganan Tricefy" actions={<LinkButton small href={`/tricefy/accounts/new?customerId=${cid}`}>+ Akun Tricefy</LinkButton>}>
          {customer.tricefyAccounts.length === 0 ? <Empty>Belum ada akun Tricefy.</Empty> : (
            <Table>
              <thead><tr><th>ID Tricefy</th><th>Package</th><th>Aktivasi</th><th>Berakhir</th><th>Status</th></tr></thead>
              <tbody>
                {customer.tricefyAccounts.map((a) => {
                  const s = tricefy.find((t) => t.accountId === a.id);
                  return (
                    <tr key={a.id}>
                      <td><Link className="font-medium text-teal-800 hover:underline" href={`/tricefy/accounts/${a.id}`}>{a.tricefyId}</Link><div className="text-xs text-slate-500">{a.accountEmail}</div></td>
                      <td>{s?.package?.name ?? "-"}</td>
                      <td>{s ? tanggal(s.activationDate) : "-"}</td>
                      <td>{s ? tanggal(s.endDate) : "-"}</td>
                      <td>{s ? <TricefyBadge status={s.status} daysLeft={s.daysLeft} /> : <Badge>Belum ada langganan</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      {tab === "devices" && (
        <div className="space-y-6">
          <Card title="Alat USG" actions={<LinkButton small href={`/devices/new?customerId=${cid}&returnTo=${encodeURIComponent(base + "?tab=devices")}`}>+ Alat USG</LinkButton>}>
            {customer.devices.length === 0 ? <Empty>Belum ada alat USG.</Empty> : (
              <Table>
                <thead><tr><th>Serial number</th><th>Model</th><th>Catatan</th></tr></thead>
                <tbody>
                  {customer.devices.map((d) => (
                    <tr key={d.id}>
                      <td><Link className="font-mono font-medium text-teal-800 hover:underline" href={`/devices/${d.id}`}>{d.serialNumber}</Link></td>
                      <td>{d.machineModel ? `${d.machineModel.brand} ${d.machineModel.model}` : "-"}</td>
                      <td className="text-slate-600">{d.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card title="PC ViewPoint" actions={<LinkButton small href={`/pcs/new?customerId=${cid}`}>+ PC</LinkButton>}>
            {customer.pcs.length === 0 ? <Empty>Belum ada PC.</Empty> : (
              <Table>
                <thead><tr><th>Hostname</th><th>Peran</th><th>Sumber</th><th>Spesifikasi</th><th></th></tr></thead>
                <tbody>
                  {customer.pcs.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium">{p.hostname ?? `PC #${p.id}`}</td>
                      <td><Badge tone="blue">{PC_ROLE_LABEL[p.role]}</Badge></td>
                      <td>{PC_SOURCE_LABEL[p.source]}</td>
                      <td className="text-xs text-slate-600">{[p.cpu, p.ram && `RAM ${p.ram}`, p.storage, p.vga, p.os].filter(Boolean).join(" · ") || "-"}</td>
                      <td className="text-right"><LinkButton small variant="ghost" href={`/pcs/${p.id}/edit`}>Edit</LinkButton></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {tab === "teknis" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Catatan teknis (integrasi, preferensi dokter, quick report…)">
            {customer.techNotes.length === 0 ? <Empty>Belum ada catatan.</Empty> : (
              <ul className="mb-4 divide-y divide-slate-100">
                {customer.techNotes.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <Badge tone="blue">{TECH_NOTE_LABEL[n.kind]}</Badge> <span className="font-medium">{n.title}</span>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{n.content}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2.5 py-1.5 text-xs">Edit</summary>
                        <div className="absolute right-0 z-10 mt-1 w-96 max-w-[85vw] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                          <NoteForm customerId={customer.id} note={n} />
                        </div>
                      </details>
                      <ConfirmDelete action={deleteTechNote.bind(null, n.id)} what={`catatan "${n.title}"`} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <details className="rounded-md border border-dashed border-slate-300 p-3">
              <summary className="cursor-pointer text-sm font-medium text-teal-800">+ Tambah catatan</summary>
              <div className="mt-3"><NoteForm customerId={customer.id} /></div>
            </details>
          </Card>
          <Card title="Error history & troubleshooting">
            <details className="mb-4 rounded-md border border-dashed border-slate-300 p-3">
              <summary className="cursor-pointer text-sm font-medium text-teal-800">+ Catat error</summary>
              <ActionForm action={saveErrorLog} resetOnSuccess className="mt-3 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="customerId" value={customer.id} />
                <Field label="Tanggal *"><Input type="date" name="occurredAt" defaultValue={toInputDate(today)} required /></Field>
                <Field label="Alat (opsional)">
                  <Select name="deviceId" defaultValue="">
                    <option value="">—</option>
                    {customer.devices.map((d) => <option key={d.id} value={d.id}>{d.serialNumber}</option>)}
                  </Select>
                </Field>
                <Field label="Gejala *" className="sm:col-span-2"><Textarea name="symptom" required placeholder="mis. Ping ke server selalu fail" /></Field>
                <Field label="Penyebab"><Textarea name="cause" /></Field>
                <Field label="Solusi"><Textarea name="solution" placeholder="mis. Normal untuk site ini, cukup cek verify" /></Field>
                <Field label="Lampiran (opsional)" className="sm:col-span-2"><input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" className="text-sm" /></Field>
                <div><SubmitButton>Simpan</SubmitButton></div>
              </ActionForm>
            </details>
            {customer.errorLogs.length === 0 ? <Empty>Belum ada error yang dicatat.</Empty> : (
              <ul className="divide-y divide-slate-100">
                {customer.errorLogs.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0 text-sm">
                      <div className="text-xs text-slate-500">{tanggal(e.occurredAt)}{e.device && ` · SN ${e.device.serialNumber}`}</div>
                      <div className="font-medium">{e.symptom}</div>
                      {e.cause && <p><span className="text-slate-500">Penyebab:</span> {e.cause}</p>}
                      {e.solution && <p><span className="text-slate-500">Solusi:</span> {e.solution}</p>}
                      {e.attachments.map((a) => <a key={a.id} href={`/api/files/${a.id}`} target="_blank" className="text-teal-800 hover:underline">📎 {a.fileName}</a>)}
                    </div>
                    <ConfirmDelete action={deleteErrorLog.bind(null, e.id)} what="catatan error ini" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "riwayat" && (
        <Card title="Riwayat perubahan data customer"><History entity="Customer" entityId={customer.id} /></Card>
      )}
      {me.role === "VIEWER" && <p className="mt-4 text-xs text-slate-500">Anda masuk sebagai Viewer (hanya lihat).</p>}
    </>
  );
}

function NoteForm({ customerId, note }: { customerId: number; note?: { id: number; kind: string; title: string; content: string } }) {
  return (
    <ActionForm action={saveTechNote} resetOnSuccess={!note} className="grid gap-3">
      <input type="hidden" name="customerId" value={customerId} />
      {note && <input type="hidden" name="id" value={note.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Jenis">
          <Select name="kind" defaultValue={note?.kind ?? "INTEGRASI"}>
            {Object.entries(TECH_NOTE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Judul *"><Input name="title" defaultValue={note?.title} required placeholder="mis. Server integrasi / dr. X" /></Field>
      </div>
      <Field label="Isi *"><Textarea name="content" defaultValue={note?.content} required rows={4} /></Field>
      <div><SubmitButton small>Simpan</SubmitButton></div>
    </ActionForm>
  );
}
