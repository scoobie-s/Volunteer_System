import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { deleteSubDepartment, updateSubDepartment } from "@/lib/data";
import { subDepartmentSchema } from "@/lib/validation";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("Sub-Departments", "Edit");
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const payload = subDepartmentSchema.parse(body);
    const { id } = await params;
    await updateSubDepartment(id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update sub-department.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("Sub-Departments", "Delete");
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await deleteSubDepartment(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete sub-department.");
  }
}
