import { AttendancePageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";

export default async function AttendancePage() {
  const currentUser = await requirePageAccess("Attendance");
  const snapshot = await getScopedSnapshot(currentUser);

  return <AttendancePageClient snapshot={snapshot} currentUser={currentUser} />;
}
