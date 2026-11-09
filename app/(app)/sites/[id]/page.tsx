import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteConfig, deleteErrorLog, deleteSite, saveConfig, saveErrorLog } from "@/app/actions/sites";
import { CONFIG_LABEL, tanggal, toInputDate, todayDate } from "@/lib/format";
import { ActionForm, ConfirmDelete, SubmitButton } from "@/components/client";
import { Badge, Card, DL, Empty, Field, Input, LinkButton, PageHeader, Select, Textarea } from "@/components/ui";

export default async function SiteDetailPage({ params }: PageProps<"/sites/[id]">) {
  const { id } = await params;
  const me = await requireUser();
  const site = await prisma.site.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      configs: { orderBy: [{ kind: "asc" }, { title: "asc" }] },
      errorLogs: { include: { attachments: true }, orderBy: { occurredAt: "desc" } },
    },
  });
  if (!site) notFound();

  return (
    <>
      <PageHeader
        title={site.name}
        subtitle={<Link className="text-teal-800 hover:underline" href={`/customers/${site.customerId}`}>{site.customer.name}</Link>}
        actions={
          <>
            <LinkButton variant="outline" href={`/sites/${site.id}/edit`}>Edit site</LinkButton>
            {me.role === "ADMIN" && <ConfirmDelete action={deleteSite.bind(null, site.id)} what={`site ${site.name}`} small={false} />}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Info site">
          <DL items={[
            ["Site ID", site.siteCode],
            ["PC & spesifikasi", site.pcInfo],
            ["Aplikasi", site.applications],
            ["Catatan", site.notes],
          ]} />
        </Card>

        <Card title="Special configuration" className="lg:col-span-2">
          {site.configs.length === 0 ? <Empty>Belum ada konfigurasi khusus.</Empty> : (
            <ul className="mb-4 divide-y divide-slate-100">
              {site.configs.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone="blue">{CONFIG_LABEL[c.kind]}</Badge>
                      <span className="ml-2 font-medium">{c.title}</span>
                      <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{c.content}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2.5 py-1.5 text-xs">Edit</summary>
                        <div className="absolute right-0 z-10 mt-1 w-96 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                          <ConfigForm siteId={site.id} config={c} />
                        </div>
                      </details>
                      <ConfirmDelete action={deleteConfig.bind(null, c.id)} what={`konfigurasi "${c.title}"`} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <details className="rounded-md border border-dashed border-slate-300 p-3">
            <summary className="cursor-pointer text-sm font-medium text-teal-800">+ Tambah konfigurasi</summary>
            <div className="mt-3"><ConfigForm siteId={site.id} /></div>
          </details>
        </Card>

        <Card title="Error history" className="lg:col-span-3">
          <details className="mb-4 rounded-md border border-dashed border-slate-300 p-3">
            <summary className="cursor-pointer text-sm font-medium text-teal-800">+ Catat error / troubleshooting</summary>
            <ActionForm action={saveErrorLog} resetOnSuccess className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="siteId" value={site.id} />
              <Field label="Tanggal kejadian *"><Input type="date" name="occurredAt" defaultValue={toInputDate(todayDate())} required /></Field>
              <Field label="Lampiran (opsional, PDF/JPG/PNG)">
                <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm" />
              </Field>
              <Field label="Gejala *" className="sm:col-span-2"><Textarea name="symptom" required placeholder="mis. Ping ke server selalu fail" /></Field>
              <Field label="Penyebab"><Textarea name="cause" /></Field>
              <Field label="Solusi / catatan"><Textarea name="solution" placeholder="mis. Normal untuk site ini, cukup cek verify — hasilnya OK" /></Field>
              <div><SubmitButton>Simpan</SubmitButton></div>
            </ActionForm>
          </details>
          {site.errorLogs.length === 0 ? <Empty>Belum ada error yang dicatat.</Empty> : (
            <ul className="divide-y divide-slate-100">
              {site.errorLogs.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">{tanggal(e.occurredAt)}</div>
                    <div className="font-medium">{e.symptom}</div>
                    {e.cause && <p className="text-sm text-slate-700"><span className="text-slate-500">Penyebab:</span> {e.cause}</p>}
                    {e.solution && <p className="text-sm text-slate-700"><span className="text-slate-500">Solusi:</span> {e.solution}</p>}
                    {e.attachments.map((a) => (
                      <a key={a.id} href={`/api/files/${a.id}`} target="_blank" className="mt-1 inline-block text-sm text-teal-800 hover:underline">📎 {a.fileName}</a>
                    ))}
                  </div>
                  <ConfirmDelete action={deleteErrorLog.bind(null, e.id)} what="catatan error ini" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function ConfigForm({ siteId, config }: { siteId: number; config?: { id: number; kind: string; title: string; content: string } }) {
  return (
    <ActionForm action={saveConfig} resetOnSuccess={!config} className="grid gap-3">
      <input type="hidden" name="siteId" value={siteId} />
      {config && <input type="hidden" name="id" value={config.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Jenis">
          <Select name="kind" defaultValue={config?.kind ?? "INTEGRASI"}>
            {Object.entries(CONFIG_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Judul *"><Input name="title" defaultValue={config?.title} required placeholder="mis. Server integrasi / dr. X" /></Field>
      </div>
      <Field label="Isi *"><Textarea name="content" defaultValue={config?.content} required rows={4} placeholder="mis. Server di ruang IT Lt. 3, 4 client terhubung" /></Field>
      <div><SubmitButton small>Simpan</SubmitButton></div>
    </ActionForm>
  );
}
