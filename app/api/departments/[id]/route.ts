import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { deleteDepartment, updateDepartment } from "@/lib/data";
import { departmentSchema } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("Departments", "Edit");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const payload = departmentSchema.parse(body);
    const { id } = await params;
    await updateDepartment(id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update department.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("Departments", "Delete");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteDepartment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete department.");
  }
}
