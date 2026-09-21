import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import {
  createAccessPermission,
  deleteAccessPermission,
  listAccessPermissionsForUser,
  updateAccessPermission,
} from "@/lib/data";
import { accessPermissionSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiPermission("Access", "View");
  if (auth.error) return auth.error;

  return NextResponse.json(await listAccessPermissionsForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Access", "Approve Access");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = accessPermissionSchema.parse(body);
    await createAccessPermission(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create access permission.");
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiPermission("Access", "Approve Access");
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!body.id) {
      return NextResponse.json({ error: "Permission id is required." }, { status: 400 });
    }

    const payload = accessPermissionSchema.parse({
      accessPointId: body.accessPointId,
      departmentId: body.departmentId,
      subDepartmentId: body.subDepartmentId,
      sectionId: body.sectionId,
      role: body.role,
    });

    await updateAccessPermission(body.id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update access permission.");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiPermission("Access", "Approve Access");
  if (auth.error) return auth.error;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing permission id." }, { status: 400 });
    }

    await deleteAccessPermission(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete access permission.");
  }
}
