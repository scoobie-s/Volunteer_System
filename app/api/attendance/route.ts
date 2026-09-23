import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth";
import { listAttendancePageForUser } from "@/lib/data";

export async function GET(request: Request) {
  const auth = await requireApiPermission("Attendance", "View");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    await listAttendancePageForUser(auth.user, {
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 50,
    }),
  );
}
