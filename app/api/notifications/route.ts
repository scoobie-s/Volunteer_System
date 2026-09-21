import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  clearPortalNotifications,
  deletePortalNotification,
  listPortalNotifications,
} from "@/lib/data";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json(await listPortalNotifications());
}

export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const notificationId = searchParams.get("id");
  const clearAll = searchParams.get("all") === "true";

  if (clearAll) {
    await clearPortalNotifications();
    return NextResponse.json({ ok: true });
  }

  if (!notificationId) {
    return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
  }

  await deletePortalNotification(notificationId);
  return NextResponse.json({ ok: true });
}
