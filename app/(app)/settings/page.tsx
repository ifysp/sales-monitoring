import { requireUser } from "@/lib/auth";
import { changePassword } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, DL, Field, Input, PageHeader } from "@/components/ui";
import { SettingsNav } from "@/components/settings-nav";

export default async function SettingsPage() {
  const me = await requireUser();
  return (
    <>
      <PageHeader title="Pengaturan" />
      <SettingsNav current="/settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profil"><DL items={[["Nama", me.name], ["Email", me.email], ["Role", me.role === "ADMIN" ? "Admin" : "Viewer"]]} /></Card>
        <Card title="Ganti password">
          <ActionForm action={changePassword} resetOnSuccess className="space-y-4">
            <Field label="Password lama"><Input type="password" name="current" required /></Field>
            <Field label="Password baru (min. 8 karakter)"><Input type="password" name="next" required /></Field>
            <Field label="Ulangi password baru"><Input type="password" name="confirm" required /></Field>
            <SubmitButton>Simpan</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
