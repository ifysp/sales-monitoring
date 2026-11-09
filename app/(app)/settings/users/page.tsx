import { prisma } from "@/lib/prisma";
import { saveUser } from "@/app/actions/master";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, Input, PageHeader, Select } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
  const cols = "grid-cols-[1fr_1fr_110px_170px_80px]";
  return (
    <>
      <PageHeader title="Pengaturan" />
      <SettingsNav current="/settings/users" />
      <Card title="Pengguna" actions={<span className="text-xs text-slate-500">Admin = lihat, tambah, ubah, hapus · Viewer = hanya lihat</span>}>
        <div className="overflow-x-auto"><div className="min-w-[640px]">
          <div className={`mb-1 grid gap-2 text-xs font-semibold uppercase text-slate-500 ${cols}`}><span>Nama</span><span>Email</span><span>Role</span><span>Password baru</span><span /></div>
          {[...users, null].map((u) => (
            <ActionForm key={u?.id ?? "new"} action={saveUser} resetOnSuccess={!u} className={`grid items-center gap-2 border-b border-slate-100 py-2 ${cols}`}>
              {u && <input type="hidden" name="id" value={u.id} />}
              <Input name="name" defaultValue={u?.name} placeholder={u ? "" : "Pengguna baru…"} required />
              <Input name="email" type="email" defaultValue={u?.email} required />
              <Select name="role" defaultValue={u?.role ?? "ADMIN"}><option value="ADMIN">Admin</option><option value="VIEWER">Viewer</option></Select>
              <Input name="password" type="password" placeholder={u ? "kosongkan = tetap" : "min. 8 karakter"} />
              <SubmitButton small variant={u ? "outline" : "primary"}>{u ? "Simpan" : "Tambah"}</SubmitButton>
            </ActionForm>
          ))}
        </div></div>
      </Card>
    </>
  );
}
