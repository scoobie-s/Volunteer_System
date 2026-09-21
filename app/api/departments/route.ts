import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import { createDepartment, listDepartmentsForUser } from "@/lib/data";
import { departmentSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiPermission("Departments", "View");
  if (auth.error) return auth.error;
  return NextResponse.json(await listDepartmentsForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Departments", "Create");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = departmentSchema.parse(body);
    await createDepartment(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create department.");
  }
}
