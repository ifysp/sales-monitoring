import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { saveMachineModel, savePackage, saveStage, saveUser } from "@/app/actions/master";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, Input, PageHeader, Select } from "@/components/ui";

// Semua master data bisa diubah di sini tanpa mengubah kode
export default async function MasterPage() {
  const me = await requireUser();
  if (me.role !== "ADMIN") redirect("/");
  const [products, packages, machines, stages, users] = await Promise.all([
    prisma.product.findMany({ orderBy: { id: "asc" } }),
    prisma.package.findMany({ include: { product: true }, orderBy: [{ productId: "asc" }, { name: "asc" }] }),
    prisma.machineModel.findMany({ orderBy: [{ brand: "asc" }, { model: "asc" }] }),
    prisma.stage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ orderBy: { id: "asc" } }),
  ]);

  const rowForm = "grid items-center gap-2 border-b border-slate-100 py-2";
  return (
    <>
      <PageHeader title="Master data" subtitle="Package, tahapan, model mesin, dan pengguna. Perubahan langsung berlaku di form." />
      <div className="space-y-6">
        <Card title="Package">
          <div className="mb-1 grid grid-cols-[140px_1fr_110px_140px_70px_80px] gap-2 text-xs font-semibold uppercase text-slate-500">
            <span>Produk</span><span>Nama</span><span>Satuan</span><span>Harga list</span><span>Aktif</span><span />
          </div>
          {[...packages.map((p) => ({ ...p, listPrice: p.listPrice === null ? "" : String(Number(p.listPrice)) })), null].map((p) => (
            <ActionForm key={p?.id ?? "new"} action={savePackage} resetOnSuccess={!p} className={`${rowForm} grid-cols-[140px_1fr_110px_140px_70px_80px]`}>
              {p && <input type="hidden" name="id" value={p.id} />}
              <Select name="productId" defaultValue={p?.productId ?? products[0]?.id}>
                {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </Select>
              <Input name="name" defaultValue={p?.name} placeholder={p ? "" : "Package baru…"} required />
              <Input name="unit" defaultValue={p?.unit ?? ""} placeholder="studies" />
              <Input name="listPrice" type="number" defaultValue={p?.listPrice ?? ""} placeholder="opsional" />
              <input type="checkbox" name="active" defaultChecked={p ? p.active : true} className="h-4 w-4" />
              <SubmitButton small variant={p ? "outline" : "primary"}>{p ? "Simpan" : "Tambah"}</SubmitButton>
            </ActionForm>
          ))}
        </Card>

        <Card title="Tahapan progres" actions={<span className="text-xs text-slate-500">Centang &quot;Pembayaran&quot; pada tahap yang dipecah per cicilan</span>}>
          <div className="mb-1 grid grid-cols-[80px_1fr_110px_70px_80px] gap-2 text-xs font-semibold uppercase text-slate-500">
            <span>Urutan</span><span>Nama tahap</span><span>Pembayaran</span><span>Aktif</span><span />
          </div>
          {[...stages, null].map((s) => (
            <ActionForm key={s?.id ?? "new"} action={saveStage} resetOnSuccess={!s} className={`${rowForm} grid-cols-[80px_1fr_110px_70px_80px]`}>
              {s && <input type="hidden" name="id" value={s.id} />}
              <Input name="sortOrder" type="number" defaultValue={s?.sortOrder ?? (stages.at(-1)?.sortOrder ?? 0) + 1} required />
              <Input name="name" defaultValue={s?.name} placeholder={s ? "" : "Tahap baru…"} required />
              <input type="checkbox" name="isPayment" defaultChecked={s?.isPayment ?? false} className="h-4 w-4" />
              <input type="checkbox" name="active" defaultChecked={s ? s.active : true} className="h-4 w-4" />
              <SubmitButton small variant={s ? "outline" : "primary"}>{s ? "Simpan" : "Tambah"}</SubmitButton>
            </ActionForm>
          ))}
        </Card>

        <Card title="Model mesin USG">
          <div className="mb-1 grid grid-cols-[160px_1fr_70px_80px] gap-2 text-xs font-semibold uppercase text-slate-500">
            <span>Merk</span><span>Model</span><span>Aktif</span><span />
          </div>
          {[...machines, null].map((mm) => (
            <ActionForm key={mm?.id ?? "new"} action={saveMachineModel} resetOnSuccess={!mm} className={`${rowForm} grid-cols-[160px_1fr_70px_80px]`}>
              {mm && <input type="hidden" name="id" value={mm.id} />}
              <Input name="brand" defaultValue={mm?.brand ?? "GE"} required />
              <Input name="model" defaultValue={mm?.model} placeholder={mm ? "" : "Model baru…"} required />
              <input type="checkbox" name="active" defaultChecked={mm ? mm.active : true} className="h-4 w-4" />
              <SubmitButton small variant={mm ? "outline" : "primary"}>{mm ? "Simpan" : "Tambah"}</SubmitButton>
            </ActionForm>
          ))}
        </Card>

        <Card title="Pengguna">
          <div className="mb-1 grid grid-cols-[1fr_1fr_110px_170px_80px] gap-2 text-xs font-semibold uppercase text-slate-500">
            <span>Nama</span><span>Email</span><span>Role</span><span>Password baru</span><span />
          </div>
          {[...users, null].map((u) => (
            <ActionForm key={u?.id ?? "new"} action={saveUser} resetOnSuccess={!u} className={`${rowForm} grid-cols-[1fr_1fr_110px_170px_80px]`}>
              {u && <input type="hidden" name="id" value={u.id} />}
              <Input name="name" defaultValue={u?.name} placeholder={u ? "" : "Pengguna baru…"} required />
              <Input name="email" type="email" defaultValue={u?.email} required />
              <Select name="role" defaultValue={u?.role ?? "USER"}>
                <option value="ADMIN">Admin</option>
                <option value="USER">User</option>
              </Select>
              <Input name="password" type="password" placeholder={u ? "kosongkan = tetap" : "min. 8 karakter"} />
              <SubmitButton small variant={u ? "outline" : "primary"}>{u ? "Simpan" : "Tambah"}</SubmitButton>
            </ActionForm>
          ))}
        </Card>
      </div>
    </>
  );
}
