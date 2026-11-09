import { requireUser } from "@/lib/auth";
import { getAlerts } from "@/lib/alerts";
import { logout } from "@/app/actions/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const alerts = await getAlerts();
  return (
    <AppShell user={{ name: user.name, role: user.role }} alerts={alerts.count} logoutAction={logout}>
      {children}
    </AppShell>
  );
}
