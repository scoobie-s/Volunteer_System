import { CampusesPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function CampusesPage() {
  const currentUser = await requirePageAccess("Campuses");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers", "events"],
    includeAttendances: false,
    includeAccessLogs: false,
  });

  return <CampusesPageClient snapshot={snapshot} />;
}
