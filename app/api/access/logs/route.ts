import { NextResponse } from "next/server";
import { requireApiPermission } from "@/lib/auth";
import { listAccessLogPageForUser } from "@/lib/data";

export async function GET(request: Request) {
  const auth = await requireApiPermission("Access", "View");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  return NextResponse.json(
    await listAccessLogPageForUser(auth.user, {
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 50,
    }),
  );
}
