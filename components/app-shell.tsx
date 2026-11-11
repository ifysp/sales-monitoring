"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, Building2, Cloud, Cpu, FileBarChart, FileText, LayoutDashboard, Menu, MonitorCog,
  Receipt, Search, Settings, Stethoscope, X, LogOut,
} from "lucide-react";
import { cn } from "@/components/ui";

const NAV = [
  { group: null, items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Penjualan",
    items: [
      { href: "/customers", label: "Customer / Site", icon: Building2 },
      { href: "/orders", label: "Purchase Order", icon: FileText },
      { href: "/invoices", label: "Penagihan", icon: Receipt },
    ],
  },
  {
    group: "Produk",
    items: [
      { href: "/viewpoint", label: "ViewPoint 6", icon: MonitorCog },
      { href: "/tricefy", label: "Tricefy", icon: Cloud },
    ],
  },
  {
    group: "Perangkat",
    items: [
      { href: "/devices", label: "Alat USG", icon: Stethoscope },
      { href: "/pcs", label: "PC", icon: Cpu },
    ],
  },
  {
    group: "Lainnya",
    items: [
      { href: "/reports", label: "Laporan", icon: FileBarChart },
      { href: "/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];

export function AppShell({
  user,
  alerts,
  logoutAction,
  children,
}: {
  user: { name: string; role: string };
  alerts: number;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const path = usePathname();
  // Menu HP tertutup otomatis saat pindah halaman: "terbuka" hanya berlaku untuk path saat dibuka
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-5 px-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">Beyond Medical · SWIT</div>
        <div className="text-base font-semibold text-white">Sales Monitoring</div>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.group ?? "main"}>
            {g.group && <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.group}</div>}
            {g.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                  active(href) ? "bg-teal-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-4 border-t border-slate-800 pt-3 text-sm">
        <div className="px-3 text-slate-200">{user.name}</div>
        <div className="px-3 text-xs text-slate-500">{user.role === "ADMIN" ? "Admin" : "Viewer"}</div>
        <form action={logoutAction} className="mt-2 px-3">
          <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
            <LogOut className="h-3.5 w-3.5" /> Keluar
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-slate-900 p-4 lg:block print:hidden">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 p-4">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 text-slate-400" aria-label="Tutup menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:px-8 print:hidden">
          <button onClick={() => setOpen(true)} className="text-slate-600 lg:hidden" aria-label="Buka menu">
            <Menu className="h-5 w-5" />
          </button>
          <form action="/search" className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              placeholder="Cari Site ID, nama customer, SN alat, ID Tricefy, no. PO / invoice…"
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-teal-600 focus:bg-white focus:outline-none"
            />
          </form>
          <Link href="/notifications" className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Notifikasi">
            <Bell className="h-5 w-5" />
            {alerts > 0 && (
              <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-4 text-white">
                {alerts > 99 ? "99+" : alerts}
              </span>
            )}
          </Link>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
