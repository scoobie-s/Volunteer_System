import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { deleteSection, updateSection } from "@/lib/data";
import { sectionSchema } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("Sections", "Edit");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const payload = sectionSchema.parse(body);
    const { id } = await params;
    await updateSection(id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update section.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("Sections", "Delete");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteSection(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete section.");
  }
}
