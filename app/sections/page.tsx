import { SectionsPageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function SectionsPage() {
  const currentUser = await requirePageAccess("Sections");
  const snapshot = await getScopedSnapshot(currentUser);

  return <SectionsPageClient snapshot={snapshot} />;
}
