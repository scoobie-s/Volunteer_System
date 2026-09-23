import { VolunteersPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot, listVolunteersPageForUser } from "@/lib/data";
import { hasActionAccess } from "@/lib/permissions";

export default async function VolunteersPage() {
  const currentUser = await requirePageAccess("Volunteer Hub");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "accessPoints", "permissions"],
    includeAttendances: false,
    includeAccessLogs: false,
  });
  const volunteersPage = await listVolunteersPageForUser(currentUser, { page: 1, pageSize: 15 });
  snapshot.volunteers = volunteersPage.items;

  return (
    <VolunteersPageClient
      snapshot={snapshot}
      volunteers={snapshot.volunteers}
      totalVolunteers={volunteersPage.total}
      canExport={hasActionAccess(currentUser, "Volunteer Hub", "Export")}
    />
  );
}
