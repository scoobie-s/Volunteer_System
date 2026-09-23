import { SectionsPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function SectionsPage() {
  const currentUser = await requirePageAccess("Sections");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers"],
    includeAttendances: false,
    includeAccessLogs: false,
  });

  return <SectionsPageClient snapshot={snapshot} />;
}
