import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import {
  createVolunteer,
  deleteVolunteer,
  getSnapshot,
  listVolunteersForUser,
  listVolunteersPageForUser,
  updateVolunteer,
} from "@/lib/data";
import { volunteerSchema } from "@/lib/validation";

async function resolveVolunteerPayload(body: Record<string, unknown>) {
  const payload = volunteerSchema.parse({
    fullName: body.fullName,
    phone: body.phone,
    email: body.email,
    membershipStatus: body.membershipStatus,
    role: body.role,
    availability: body.availability,
    sectionId: body.sectionId,
    sectionIds: body.sectionIds,
    notes: body.notes,
    pastor: body.pastor,
    zone: body.zone,
    campusPhysicalAddress: body.campusPhysicalAddress,
    photoDataUrl: body.photoDataUrl,
    accessPointIds: body.accessPointIds,
  });

  const campusId = typeof body.campusId === "string" ? body.campusId : "";
  const sectionIds = payload.sectionIds.length ? payload.sectionIds : [payload.sectionId];

  if (!campusId || sectionIds.length === 0) {
    throw new Error("Campus and at least one section are required.");
  }

  const snapshot = await getSnapshot();
  const campus = snapshot.campuses.find((entry) => entry.id === campusId);
  if (!campus) {
    throw new Error("Selected campus was not found.");
  }

  for (const sectionId of sectionIds) {
    const section = snapshot.sections.find((entry) => entry.id === sectionId);
    if (!section) {
      throw new Error("Selected section was not found.");
    }

    const subDepartment = snapshot.subDepartments.find((entry) => entry.id === section.subDepartmentId);
    const department = subDepartment
      ? snapshot.departments.find((entry) => entry.id === subDepartment.departmentId)
      : undefined;

    if (!subDepartment || !department) {
      throw new Error("Selected section is missing its structure.");
    }

    if (department.campusId !== campus.id) {
      throw new Error("Selected section does not belong to the chosen campus.");
    }

  }

  return {
    ...payload,
    sectionId: sectionIds[0],
    sectionIds,
  };
}

export async function GET(request: Request) {
  const auth = await requireApiPermission("Volunteer Hub", "View");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page"));
  if (Number.isFinite(page) && page > 0) {
    return NextResponse.json(
      await listVolunteersPageForUser(auth.user, {
        page,
        pageSize: Number(searchParams.get("pageSize")) || 15,
        search: searchParams.get("search") ?? "",
      }),
    );
  }

  return NextResponse.json(await listVolunteersForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Volunteer Hub", "Create");
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const payload = await resolveVolunteerPayload(body);
    await createVolunteer(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create volunteer.");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiPermission("Volunteer Hub", "Delete");
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Volunteer id is required." }, { status: 400 });
    }

    await deleteVolunteer(body.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete volunteer.");
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiPermission("Volunteer Hub", "Edit");
  if (auth.error) return auth.error;
  try {
    const body = (await request.json()) as { id?: string } & Record<string, unknown>;
    if (!body.id) {
      return NextResponse.json({ error: "Volunteer id is required." }, { status: 400 });
    }

    const payload = await resolveVolunteerPayload(body);

    await updateVolunteer(body.id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update volunteer.");
  }
}
