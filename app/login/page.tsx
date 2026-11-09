import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { login } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field, Input } from "@/components/ui";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">Beyond Medical · SWIT</div>
          <h1 className="mt-1 text-xl font-semibold">Sistem Monitoring</h1>
          <p className="text-sm text-slate-500">Masuk untuk melanjutkan</p>
        </div>
        <ActionForm action={login} className="space-y-4">
          <Field label="Email">
            <Input name="email" type="email" required autoFocus />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" required />
          </Field>
          <SubmitButton className="w-full">Masuk</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
