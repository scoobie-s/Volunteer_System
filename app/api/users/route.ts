import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-errors";
import { requireApiPermission } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  getSnapshot,
  listUsersForUser,
  listVolunteers,
  updateUser,
} from "@/lib/data";
import { normalizePermissionSelection } from "@/lib/permissions";
import { getRoleForUserType } from "@/lib/user-types";
import { userSchema } from "@/lib/validation";

async function resolveUserPayload(body: unknown, options?: { requireLoginCode?: boolean }) {
  const payload = userSchema.parse(body);
  const loginCode = payload.loginCode.trim();

  if (options?.requireLoginCode !== false && loginCode.length === 0) {
    throw new Error("Login code is required.");
  }

  const snapshot = await getSnapshot();

  const campusIds = new Set(payload.campusIds);
  const departmentIds = new Set(payload.departmentIds);
  const subDepartmentIds = new Set(payload.subDepartmentIds);
  const sectionIds = new Set(payload.sectionIds);
  const normalizedPermissions = normalizePermissionSelection(payload.pageAccess, payload.actionAccess);

  if (payload.userType === "VOLUNTEER_PORTAL" && !payload.volunteerId) {
    throw new Error("Volunteer Portal users must be linked to a volunteer profile.");
  }

  for (const sectionId of Array.from(sectionIds)) {
    const selectedSection = snapshot.sections.find((entry) => entry.id === sectionId);
    if (!selectedSection) continue;
    subDepartmentIds.add(selectedSection.subDepartmentId);
    const selectedSubDepartment = snapshot.subDepartments.find(
      (entry) => entry.id === selectedSection.subDepartmentId,
    );
    if (selectedSubDepartment) {
      departmentIds.add(selectedSubDepartment.departmentId);
      const selectedDepartment = snapshot.departments.find(
        (entry) => entry.id === selectedSubDepartment.departmentId,
      );
      if (selectedDepartment) {
        campusIds.add(selectedDepartment.campusId);
      }
    }
  }

  for (const subDepartmentId of Array.from(subDepartmentIds)) {
    const selectedSubDepartment = snapshot.subDepartments.find((entry) => entry.id === subDepartmentId);
    if (!selectedSubDepartment) continue;
    departmentIds.add(selectedSubDepartment.departmentId);
  }

  for (const departmentId of Array.from(departmentIds)) {
    const selectedDepartment = snapshot.departments.find((entry) => entry.id === departmentId);
    if (!selectedDepartment) continue;
    campusIds.add(selectedDepartment.campusId);
    snapshot.subDepartments
      .filter((entry) => entry.departmentId === selectedDepartment.id)
      .forEach((entry) => subDepartmentIds.add(entry.id));
  }

  if (!payload.volunteerId) {
    if (payload.userType === "CAMPUS_COORDINATOR" && campusIds.size === 0) {
      throw new Error("Campus Coordinator users must be assigned to a campus.");
    }

    if (payload.userType === "DEPARTMENT_MANAGER" && departmentIds.size === 0) {
      throw new Error("Department Manager users must be assigned to a department.");
    }

    if (payload.userType === "SECTION_COORDINATOR" && sectionIds.size === 0) {
      throw new Error("Section Coordinator users must be assigned to a section.");
    }

    return {
      name: payload.name?.trim() ?? "",
      email: payload.email?.trim() ?? "",
      role: getRoleForUserType(payload.userType),
      userType: payload.userType,
      loginCode,
      volunteerId: undefined,
      campusId: Array.from(campusIds)[0],
      campusIds: Array.from(campusIds),
      departmentId: Array.from(departmentIds)[0],
      departmentIds: Array.from(departmentIds),
      subDepartmentId: Array.from(subDepartmentIds)[0],
      subDepartmentIds: Array.from(subDepartmentIds),
      sectionId: Array.from(sectionIds)[0],
      sectionIds: Array.from(sectionIds),
      pageAccess: normalizedPermissions.pageAccess,
      actionAccess: normalizedPermissions.actionAccess,
    };
  }

  const volunteer = (await listVolunteers()).find((entry) => entry.id === payload.volunteerId);
  if (!volunteer) {
    throw new Error("Linked volunteer was not found.");
  }

  const linkedSection = snapshot.sections.find((entry) => entry.id === volunteer.sectionId);
  const linkedSubDepartment = linkedSection
    ? snapshot.subDepartments.find((entry) => entry.id === linkedSection.subDepartmentId)
    : undefined;
  const linkedDepartment = linkedSubDepartment
    ? snapshot.departments.find((entry) => entry.id === linkedSubDepartment.departmentId)
    : undefined;
  if (linkedSection) {
    sectionIds.add(linkedSection.id);
  }
  if (linkedSubDepartment) {
    subDepartmentIds.add(linkedSubDepartment.id);
  }
  if (linkedDepartment) {
    departmentIds.add(linkedDepartment.id);
    campusIds.add(linkedDepartment.campusId);
  }

  if (payload.userType === "CAMPUS_COORDINATOR" && campusIds.size === 0) {
    throw new Error("Campus Coordinator users must be assigned to a campus.");
  }

  if (payload.userType === "DEPARTMENT_MANAGER" && departmentIds.size === 0) {
    throw new Error("Department Manager users must be assigned to a department.");
  }

  if (payload.userType === "SECTION_COORDINATOR" && sectionIds.size === 0) {
    throw new Error("Section Coordinator users must be assigned to a section.");
  }

  return {
    name: volunteer.fullName,
    email: volunteer.email,
    role: getRoleForUserType(payload.userType),
    userType: payload.userType,
    loginCode,
    volunteerId: volunteer.id,
    campusId: Array.from(campusIds)[0],
    campusIds: Array.from(campusIds),
    departmentId: Array.from(departmentIds)[0],
    departmentIds: Array.from(departmentIds),
    subDepartmentId: Array.from(subDepartmentIds)[0],
    subDepartmentIds: Array.from(subDepartmentIds),
    sectionId: Array.from(sectionIds)[0],
    sectionIds: Array.from(sectionIds),
    pageAccess: normalizedPermissions.pageAccess,
    actionAccess: normalizedPermissions.actionAccess,
  };
}

export async function GET() {
  const auth = await requireApiPermission("Users", "View");
  if (auth.error) return auth.error;
  return NextResponse.json(await listUsersForUser(auth.user));
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Users", "Manage Users");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = await resolveUserPayload(body, { requireLoginCode: true });
    await createUser(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to create user.");
  }
}

export async function PUT(request: Request) {
  const auth = await requireApiPermission("Users", "Manage Users");
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const payload = await resolveUserPayload({
      name: body.name,
      email: body.email,
      userType: body.userType,
      loginCode: body.loginCode,
      volunteerId: body.volunteerId,
      campusIds: body.campusIds,
      departmentIds: body.departmentIds,
      subDepartmentIds: body.subDepartmentIds,
      sectionIds: body.sectionIds,
      pageAccess: body.pageAccess,
      actionAccess: body.actionAccess,
    }, { requireLoginCode: false });

    await updateUser(body.id, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to update user.");
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiPermission("Users", "Manage Users");
  if (auth.error) return auth.error;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, "Unable to delete user.");
  }
}
