import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-slate-900 p-4 print:hidden">
        <div className="mb-6 px-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">Beyond Medical</div>
          <div className="text-base font-semibold text-white">SWIT Monitoring</div>
        </div>
        <Nav isAdmin={user.role === "ADMIN"} />
        <div className="mt-auto border-t border-slate-800 pt-4 text-sm">
          <Link href="/account" className="block px-3 text-slate-200 hover:text-white">
            {user.name}
            <span className="block text-xs text-slate-500">{user.role === "ADMIN" ? "Admin" : "User"} · ganti password</span>
          </Link>
          <form action={logout} className="mt-2 px-3">
            <button className="text-xs text-slate-400 hover:text-white">Keluar</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
