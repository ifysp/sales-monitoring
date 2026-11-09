import { prisma } from "@/lib/prisma";
import { saveMachineModel, savePackage, saveStage } from "@/app/actions/master";
import { PRODUCT_LABEL } from "@/lib/format";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, Input, PageHeader, Select } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

const row = "grid items-center gap-2 border-b border-slate-100 py-2";
const head = "mb-1 grid gap-2 text-xs font-semibold uppercase text-slate-500";

// Master data: diubah dari sini tanpa mengubah kode
export default async function MasterPage() {
  const [packages, models, stages] = await Promise.all([
    prisma.package.findMany({ orderBy: [{ product: "asc" }, { name: "asc" }] }),
    prisma.machineModel.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
    prisma.stage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const pkgCols = "grid-cols-[130px_1fr_100px_130px_50px_80px]";
  return (
    <>
      <PageHeader title="Pengaturan" />
      <SettingsNav current="/settings/master" />
      <div className="space-y-6">
        <Card title="Package ViewPoint 6 & Tricefy">
          <div className="overflow-x-auto"><div className="min-w-[640px]">
            <div className={`${head} ${pkgCols}`}><span>Produk</span><span>Nama</span><span>Satuan</span><span>Harga list</span><span>Aktif</span><span /></div>
            {[...packages.map((p) => ({ ...p, listPrice: p.listPrice === null ? "" : String(Number(p.listPrice)) })), null].map((p) => (
              <ActionForm key={p?.id ?? "new"} action={savePackage} resetOnSuccess={!p} className={`${row} ${pkgCols}`}>
                {p && <input type="hidden" name="id" value={p.id} />}
                <Select name="product" defaultValue={p?.product ?? "TRICEFY"}>{Object.entries(PRODUCT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                <Input name="name" defaultValue={p?.name} placeholder={p ? "" : "Package baru…"} required />
                <Input name="unit" defaultValue={p?.unit ?? ""} placeholder="studies" />
                <Input name="listPrice" type="number" defaultValue={p?.listPrice ?? ""} placeholder="opsional" />
                <input type="checkbox" name="active" defaultChecked={p ? p.active : true} className="h-4 w-4" />
                <SubmitButton small variant={p ? "outline" : "primary"}>{p ? "Simpan" : "Tambah"}</SubmitButton>
              </ActionForm>
            ))}
          </div></div>
        </Card>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Tahapan progres PO" actions={<span className="text-xs text-slate-500">&quot;Bayar&quot; = tahap yang dipecah per invoice</span>}>
            <div className={`${head} grid-cols-[64px_1fr_50px_50px_80px]`}><span>Urutan</span><span>Nama</span><span>Bayar</span><span>Aktif</span><span /></div>
            {[...stages, null].map((s) => (
              <ActionForm key={s?.id ?? "new"} action={saveStage} resetOnSuccess={!s} className={`${row} grid-cols-[64px_1fr_50px_50px_80px]`}>
                {s && <input type="hidden" name="id" value={s.id} />}
                <Input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? (stages.at(-1)?.sortOrder ?? 0) + 1} required />
                <Input name="name" defaultValue={s?.name} placeholder={s ? "" : "Tahap baru…"} required />
                <input type="checkbox" name="isPayment" defaultChecked={s?.isPayment ?? false} className="h-4 w-4" />
                <input type="checkbox" name="active" defaultChecked={s ? s.active : true} className="h-4 w-4" />
                <SubmitButton small variant={s ? "outline" : "primary"}>{s ? "Simpan" : "Tambah"}</SubmitButton>
              </ActionForm>
            ))}
          </Card>
          <Card title="Model alat USG">
            <div className={`${head} grid-cols-[110px_1fr_50px_80px]`}><span>Merk</span><span>Model</span><span>Aktif</span><span /></div>
            {[...models, null].map((m) => (
              <ActionForm key={m?.id ?? "new"} action={saveMachineModel} resetOnSuccess={!m} className={`${row} grid-cols-[110px_1fr_50px_80px]`}>
                {m && <input type="hidden" name="id" value={m.id} />}
                <Input name="brand" defaultValue={m?.brand ?? "GE"} required />
                <Input name="model" defaultValue={m?.model} placeholder={m ? "" : "Model baru…"} required />
                <input type="checkbox" name="active" defaultChecked={m ? m.active : true} className="h-4 w-4" />
                <SubmitButton small variant={m ? "outline" : "primary"}>{m ? "Simpan" : "Tambah"}</SubmitButton>
              </ActionForm>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
