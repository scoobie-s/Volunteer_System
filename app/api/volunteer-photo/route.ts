import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getVolunteerPhoto } from "@/lib/blob";
import { hasActionAccess, hasPageAccess } from "@/lib/permissions";

function isVercelBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const canViewVolunteer = hasPageAccess(user, "Volunteer Hub") && hasActionAccess(user, "Volunteer Hub", "View");
  const canScanVolunteer = hasPageAccess(user, "Scanner") && hasActionAccess(user, "Scanner", "Scan");
  if (!canViewVolunteer && !canScanVolunteer) {
    return NextResponse.json({ error: "You do not have permission to view volunteer photos." }, { status: 403 });
  }

  const photoUrl = new URL(request.url).searchParams.get("url");
  if (!photoUrl || !isVercelBlobUrl(photoUrl)) {
    return NextResponse.json({ error: "Invalid volunteer photo." }, { status: 400 });
  }

  const photo = await getVolunteerPhoto(photoUrl);
  if (!photo || !photo.stream) {
    return NextResponse.json({ error: "Volunteer photo not found." }, { status: 404 });
  }

  return new NextResponse(photo.stream, {
    headers: {
      "Content-Type": photo.blob.contentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
