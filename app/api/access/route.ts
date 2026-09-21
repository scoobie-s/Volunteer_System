import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import {
  createAccessPoint,
  deleteAccessPoint,
  listAccessPointsForUser,
  updateAccessPoint,
} from "@/lib/data";
import { accessPointSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiPermission("Access", "View");
  if (auth.error) return auth.error;
  return NextResponse.json(await listAccessPointsForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Access", "Create");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = accessPointSchema.parse(body);
    await createAccessPoint(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create access point.");
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiPermission("Access", "Edit");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = accessPointSchema.parse({
      name: body.name,
      location: body.location,
      campusId: body.campusId,
      color: body.color,
      isActive: body.isActive,
      volunteerIds: body.volunteerIds,
      sectionIds: body.sectionIds,
      excludedVolunteerIdsBySection: body.excludedVolunteerIdsBySection,
    });

    await updateAccessPoint(body.id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update access point.");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiPermission("Access", "Delete");
  if (auth.error) return auth.error;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing access point id." }, { status: 400 });
    }

    await deleteAccessPoint(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete access point.");
  }
}
