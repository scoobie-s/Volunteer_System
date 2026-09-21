import { requirePageAccess } from "@/lib/auth";
import { getDashboardData, getScopedSnapshot } from "@/lib/data";
import { DashboardLauncher } from "@/components/dashboard-launcher";

export default async function DashboardPage() {
  const currentUser = await requirePageAccess("Dashboard");
  const [, snapshot] = await Promise.all([getDashboardData(), getScopedSnapshot(currentUser)]);

  return <DashboardLauncher snapshot={snapshot} currentUser={currentUser} />;
}
