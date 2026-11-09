"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customer" },
  { href: "/orders", label: "Purchase Order" },
  { href: "/sites", label: "Site & Teknis" },
  { href: "/reports", label: "Laporan" },
];
const ADMIN = [
  { href: "/master", label: "Master Data" },
  { href: "/audit", label: "Audit Log" },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const item = (l: { href: string; label: string }) => {
    const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        className={cn(
          "block rounded-md px-3 py-2 text-sm",
          active ? "bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
      >
        {l.label}
      </Link>
    );
  };
  return (
    <nav className="space-y-1">
      {LINKS.map(item)}
      {isAdmin && (
        <>
          <div className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Admin</div>
          {ADMIN.map(item)}
        </>
      )}
    </nav>
  );
}
