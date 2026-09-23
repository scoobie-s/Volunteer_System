import { DepartmentsPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function DepartmentsPage() {
  const currentUser = await requirePageAccess("Departments");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers"],
    includeAttendances: false,
    includeAccessLogs: false,
  });

  return <DepartmentsPageClient snapshot={snapshot} />;
}
