import { AccessManagementPageClient } from "@/components/management-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function AccessPage() {
  const currentUser = await requirePageAccess("Access");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers", "accessPoints", "permissions"],
    includeAttendances: false,
  });
  return <AccessManagementPageClient snapshot={snapshot} />;
}
