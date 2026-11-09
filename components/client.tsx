"use client";
// Komponen yang butuh interaksi di browser
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, cn, type ButtonVariant } from "@/components/ui";

export type ActionState = { error?: string; ok?: string } | undefined;

// Status "sedang menyimpan" dari ActionForm (atau dari <form action> biasa)
const PendingContext = createContext<boolean | null>(null);
export const PendingProvider = PendingContext.Provider;

export function SubmitButton({ children, variant = "primary", small, className }: { children: React.ReactNode; variant?: ButtonVariant; small?: boolean; className?: string }) {
  const ctx = useContext(PendingContext);
  const status = useFormStatus();
  const pending = ctx ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={cn(buttonClass(variant, small), className)}>
      {pending ? "Menyimpan…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.ok}</p>;
  return null;
}

export function submitWith(e: React.FormEvent<HTMLFormElement>, formAction: (fd: FormData) => void) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => formAction(fd));
}

// Form generik: server action yang mengembalikan {error} atau redirect
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  // Submit manual (bukan <form action>) agar isian TIDAK dikosongkan otomatis saat ada error
  return (
    <form ref={ref} onSubmit={(e) => submitWith(e, formAction)} className={className}>
      <div className="mb-3 empty:hidden">
        <FormMessage state={state} />
      </div>
      <PendingProvider value={pending}>{children}</PendingProvider>
    </form>
  );
}

// Tombol hapus dengan verifikasi: pengguna harus mengetik HAPUS
export function ConfirmDelete({
  action,
  label = "Hapus",
  what,
  small = true,
}: {
  action: () => Promise<ActionState | void>;
  label?: string;
  what: string;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("outline", small) + " text-red-700"}>
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-900">Hapus {what}?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tindakan ini dicatat di audit log. Ketik <b>HAPUS</b> untuk konfirmasi.
            </p>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-3 h-9 w-full rounded-md border border-slate-300 px-3 text-sm"
            />
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={buttonClass("outline")} onClick={() => setOpen(false)} disabled={busy}>
                Batal
              </button>
              <button
                type="button"
                className={buttonClass("danger")}
                disabled={text !== "HAPUS" || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await action();
                    if (res && "error" in res && res.error) {
                      setError(res.error);
                      setBusy(false);
                    } else {
                      setOpen(false);
                      setBusy(false);
                      setText("");
                    }
                  } catch (e) {
                    // redirect() dari server action dilempar sebagai error khusus; biarkan Next menanganinya
                    throw e;
                  }
                }}
              >
                {busy ? "Menghapus…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
