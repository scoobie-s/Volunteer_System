import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { createCampus, deleteCampus, listCampusesForUser, updateCampus } from "@/lib/data";
import { campusSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiPermission("Campuses", "View");
  if (auth.error) return auth.error;
  return NextResponse.json(await listCampusesForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Campuses", "Create");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = campusSchema.parse(body);
    const campus = await createCampus(payload, auth.user.id);
    return NextResponse.json({ ok: true, campus });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create campus.");
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiPermission("Campuses", "Edit");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = campusSchema.parse({
      name: body.name,
      city: body.city,
    });

    await updateCampus(body.id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update campus.");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiPermission("Campuses", "Delete");
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing campus id." }, { status: 400 });
  }

  try {
    await deleteCampus(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete campus.");
  }
}
