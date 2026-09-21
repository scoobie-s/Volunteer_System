import { ModulePageHeader } from "@/components/module-layout";
import { ScannerClient } from "@/components/scanner-client";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function ScannerPage() {
  const currentUser = await requirePageAccess("Scanner");
  const snapshot = await getScopedSnapshot(currentUser);

  return (
    <>
      <ModulePageHeader
        eyebrow="Scanner"
        title="Attendance and access in one surface"
        description="Camera scanning is enabled for mobile workflows, with manual token fallback for desktop testing and operator override."
      />
      <ScannerClient events={snapshot.events} accessPoints={snapshot.accessPoints} />
    </>
  );
}
