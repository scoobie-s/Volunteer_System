import { AttendancePageClient } from "@/components/module-pages";
import { requirePageAccess } from "@/lib/auth";
import { getAttendanceSnapshotForUser, listAttendancePageForUser } from "@/lib/data";

export default async function AttendancePage() {
  const currentUser = await requirePageAccess("Attendance");
  const snapshot = await getAttendanceSnapshotForUser(currentUser);
  const attendancePage = await listAttendancePageForUser(currentUser, { page: 1, pageSize: 15 });
  snapshot.attendances = attendancePage.items;

  return <AttendancePageClient snapshot={snapshot} currentUser={currentUser} totalAttendances={attendancePage.total} />;
}
