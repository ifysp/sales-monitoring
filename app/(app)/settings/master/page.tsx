import { prisma } from "@/lib/prisma";
import { saveMachineModel } from "@/app/actions/master";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, Input, PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

// Master data. Package ViewPoint 6 & Tricefy ditunda untuk pengembangan berikutnya.
export default async function MasterPage() {
  const models = await prisma.machineModel.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] });
  const cols = "grid-cols-[110px_1fr_50px_80px]";
  return (
    <>
      <PageHeader title="Pengaturan" />
      <SettingsNav current="/settings/master" />
      <Card title="Model alat USG" className="max-w-2xl" actions={<span className="text-xs text-slate-500">Hilangkan centang Aktif untuk menyembunyikan dari form</span>}>
        <div className={`mb-1 grid gap-2 text-xs font-semibold uppercase text-slate-500 ${cols}`}><span>Merk</span><span>Model</span><span>Aktif</span><span /></div>
        {[...models, null].map((m) => (
          <ActionForm key={m?.id ?? "new"} action={saveMachineModel} resetOnSuccess={!m} className={`grid items-center gap-2 border-b border-slate-100 py-2 ${cols}`}>
            {m && <input type="hidden" name="id" value={m.id} />}
            <Input name="brand" defaultValue={m?.brand ?? "GE"} required />
            <Input name="model" defaultValue={m?.model} placeholder={m ? "" : "Model baru…"} required />
            <input type="checkbox" name="active" defaultChecked={m ? m.active : true} className="h-4 w-4" />
            <SubmitButton small variant={m ? "outline" : "primary"}>{m ? "Simpan" : "Tambah"}</SubmitButton>
          </ActionForm>
        ))}
      </Card>
      <p className="mt-4 max-w-2xl text-xs text-slate-500">Package ViewPoint 6 dan Tricefy belum dipakai di versi ini (ditunda). Alur tahapan PO sudah tetap: PO diterima → Invoice &amp; BA → Tukar faktur → Penagihan → Clear.</p>
    </>
  );
}
