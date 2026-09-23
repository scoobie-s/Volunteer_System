import { AttendancePageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getScopedSnapshot, listAttendancePageForUser } from "@/lib/data";

export default async function AttendancePage() {
  const currentUser = await requirePageAccess("Attendance");
  const snapshot = await getScopedSnapshot(currentUser, {
    collections: ["campuses", "departments", "subDepartments", "sections", "volunteers", "events"],
    includeAttendances: false,
    includeAccessLogs: false,
  });
  const attendancePage = await listAttendancePageForUser(currentUser, { page: 1, pageSize: 50 });
  snapshot.attendances = attendancePage.items;

  return <AttendancePageClient snapshot={snapshot} currentUser={currentUser} totalAttendances={attendancePage.total} />;
}
