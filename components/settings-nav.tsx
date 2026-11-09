import Link from "next/link";
import { cn } from "@/components/ui";

const ITEMS = [
  { href: "/settings", label: "Akun saya" },
  { href: "/settings/master", label: "Master data" },
  { href: "/settings/users", label: "Pengguna" },
  { href: "/settings/audit", label: "Log perubahan" },
];

export function SettingsNav({ current }: { current: string }) {
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {ITEMS.map((t) => (
        <Link key={t.href} href={t.href} className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm", current === t.href ? "border-teal-700 font-medium text-teal-800" : "border-transparent text-slate-600 hover:text-slate-900")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
