import { ReportsModalView } from "@/components/dashboard-secondary-views";
import { ModulePageHeader } from "@/components/module-layout";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";
import { hasActionAccess } from "@/lib/permissions";

export default async function ReportsPage() {
  const currentUser = await requirePageAccess("Reports");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers", "events", "attendances", "accessPoints", "accessLogs"],
  });
  return (
    <>
      <ModulePageHeader
        eyebrow="Reporting"
        title="Volunteer performance reporting"
        description="Monitor team coverage, attendance activity, consistency, and follow-up needs across the departments you manage."
      />
      <ReportsModalView
        departments={snapshot.departments}
        sections={snapshot.sections}
        volunteers={snapshot.volunteers}
        attendances={snapshot.attendances}
        events={snapshot.events}
        campuses={snapshot.campuses}
        accessPoints={snapshot.accessPoints}
        accessLogs={snapshot.accessLogs}
        canExport={hasActionAccess(currentUser, "Reports", "Export")}
      />
    </>
  );
}
