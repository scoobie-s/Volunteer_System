import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";
import { DashboardLauncher } from "@/components/dashboard-launcher";

export default async function DashboardPage() {
  const currentUser = await requirePageAccess("Dashboard");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers", "events", "attendances", "accessPoints", "accessLogs"],
  });

  return <DashboardLauncher snapshot={snapshot} currentUser={currentUser} />;
}
