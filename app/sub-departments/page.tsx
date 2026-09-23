import { SubDepartmentsPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function SubDepartmentsPage() {
  const currentUser = await requirePageAccess("Sub-Departments");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers"],
    includeAttendances: false,
    includeAccessLogs: false,
  });

  return <SubDepartmentsPageClient snapshot={snapshot} />;
}
