import { EventsManagementPageClient } from "@/components/management-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function EventsPage() {
  const currentUser = await requirePageAccess("Events");
  const snapshot = await getScopedSnapshot(currentUser);
  return <EventsManagementPageClient snapshot={snapshot} />;
}
