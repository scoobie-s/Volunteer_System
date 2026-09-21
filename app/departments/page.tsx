import { DepartmentsPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function DepartmentsPage() {
  const currentUser = await requirePageAccess("Departments");
  const snapshot = await getScopedSnapshot(currentUser);

  return <DepartmentsPageClient snapshot={snapshot} />;
}
