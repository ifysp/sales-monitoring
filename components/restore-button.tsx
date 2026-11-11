"use client";
import { useState, useTransition } from "react";
import { buttonClass } from "@/components/ui";
import type { ActionState } from "@/components/client";

// Tombol "Pulihkan" dengan pesan error bila gagal (mis. Site ID sudah dipakai data lain)
export function RestoreButton({ action }: { action: () => Promise<ActionState> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={buttonClass("outline", true)}
        onClick={() => start(async () => { const r = await action(); setError(r?.error); })}
      >
        {pending ? "Memulihkan…" : "Pulihkan"}
      </button>
      {error && <div className="mt-1 max-w-xs whitespace-normal text-left text-xs text-red-700">{error}</div>}
    </>
  );
}
