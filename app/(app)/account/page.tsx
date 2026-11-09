import { requireUser } from "@/lib/auth";
import { changePassword } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, Field, Input, PageHeader } from "@/components/ui";

export default async function AccountPage() {
  const me = await requireUser();
  return (
    <>
      <PageHeader title="Akun saya" subtitle={`${me.name} · ${me.email}`} />
      <Card title="Ganti password" className="max-w-md">
        <ActionForm action={changePassword} resetOnSuccess className="space-y-4">
          <Field label="Password lama"><Input type="password" name="current" required /></Field>
          <Field label="Password baru (min. 8 karakter)"><Input type="password" name="next" required /></Field>
          <Field label="Ulangi password baru"><Input type="password" name="confirm" required /></Field>
          <SubmitButton>Simpan</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
