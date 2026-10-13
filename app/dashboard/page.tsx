import { requirePageAccess } from "@/lib/auth";
import { getDashboardSnapshotForUser } from "@/lib/data";
import { DashboardLauncher } from "@/components/dashboard-launcher";

export default async function DashboardPage() {
  const currentUser = await requirePageAccess("Dashboard");
  const { snapshot, accessMetrics } = await getDashboardSnapshotForUser(currentUser);

  return <DashboardLauncher snapshot={snapshot} currentUser={currentUser} accessMetrics={accessMetrics} />;
}
