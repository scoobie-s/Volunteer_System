import { UsersPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function UsersPage() {
  const currentUser = await requirePageAccess("Users");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers", "users"],
    includeAttendances: false,
    includeAccessLogs: false,
  });

  return <UsersPageClient snapshot={snapshot} />;
}
