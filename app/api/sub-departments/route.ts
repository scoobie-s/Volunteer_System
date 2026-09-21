import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { createSubDepartment, listSubDepartmentsForUser } from "@/lib/data";
import { subDepartmentSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiPermission("Sub-Departments", "View");
  if (auth.error) return auth.error;
  return NextResponse.json(await listSubDepartmentsForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Sub-Departments", "Create");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = subDepartmentSchema.parse(body);
    await createSubDepartment(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create sub-department.");
  }
}
