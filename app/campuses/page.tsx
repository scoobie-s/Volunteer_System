import { CampusesPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function CampusesPage() {
  const currentUser = await requirePageAccess("Campuses");
  const snapshot = await getScopedSnapshot(currentUser);

  return <CampusesPageClient snapshot={snapshot} />;
}
