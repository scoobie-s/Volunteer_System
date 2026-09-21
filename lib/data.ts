import { addDays, formatISO, startOfDay, subDays } from "date-fns";
import { createLocalAccountIssuer } from "@better-auth/core/db";
import { nanoid } from "nanoid";
import { hashLoginCode } from "@/lib/credentials";
import { getMockSnapshot } from "@/lib/mock-data";
import { prisma } from "@/lib/prisma";
import { getPresetPermissionsForUserType } from "@/lib/user-types";
import type {
  AccessLog,
  AccessPermission,
  AccessPoint,
  Attendance,
  Campus,
  Department,
  Event,
  PortalNotification,
  RecurringDay,
  SubDepartment,
  Section,
  UserAccount,
  Volunteer,
} from "@/lib/types";

const CREDENTIAL_PROVIDER_ID = "credential";
const CREDENTIAL_ISSUER = createLocalAccountIssuer(CREDENTIAL_PROVIDER_ID);

export type Snapshot = {
  campuses: Campus[];
  departments: Department[];
  subDepartments: SubDepartment[];
  sections: Section[];
  volunteers: Volunteer[];
  events: Event[];
  attendances: Attendance[];
  accessPoints: AccessPoint[];
  permissions: AccessPermission[];
  accessLogs: AccessLog[];
  users: UserAccount[];
};

function shouldUseMockFallback() {
  return process.env.ALLOW_MOCK_DATA === "true";
}

async function readDatabaseSnapshot(): Promise<Snapshot> {
  const [
    campuses,
    departments,
    subDepartments,
    sections,
    volunteers,
    events,
    attendances,
    accessPoints,
    permissions,
    accessLogs,
    users,
  ] = await Promise.all([
    prisma.campus.findMany(),
    prisma.department.findMany(),
    prisma.subDepartment.findMany(),
    prisma.section.findMany(),
    prisma.volunteer.findMany(),
    prisma.event.findMany(),
    prisma.attendance.findMany(),
    prisma.accessPoint.findMany(),
    prisma.accessPermission.findMany(),
    prisma.accessLog.findMany(),
    prisma.user.findMany(),
  ]);

  return {
    campuses,
    departments,
    subDepartments,
    sections: sections.map((section) => mapSection(section, subDepartments)),
    volunteers: volunteers.map(mapVolunteer),
    events: events.map(mapEvent),
    attendances: attendances.map(mapAttendance),
    accessPoints: accessPoints.map(mapAccessPoint),
    permissions: permissions.map(mapPermission),
    accessLogs: accessLogs.map(mapAccessLog),
    users: users.map(mapUser),
  };
}

function mapSection(
  section: Awaited<ReturnType<typeof prisma.section.findMany>>[number],
  subDepartments: Awaited<ReturnType<typeof prisma.subDepartment.findMany>>,
): Section {
  const subDepartment = subDepartments.find((entry) => entry.id === section.subDepartmentId);
  return {
    ...section,
    departmentId: subDepartment?.departmentId,
  };
}

function mapVolunteer(volunteer: Awaited<ReturnType<typeof prisma.volunteer.findMany>>[number]): Volunteer {
  const sectionIds = Array.isArray(volunteer.sectionIds) ? volunteer.sectionIds : [];
  return {
    ...volunteer,
    email: volunteer.email ?? "",
    sectionIds: sectionIds.length ? sectionIds : volunteer.sectionId ? [volunteer.sectionId] : [],
    notes: volunteer.notes ?? undefined,
    pastor: volunteer.pastor ?? undefined,
    zone: volunteer.zone ?? undefined,
    campusPhysicalAddress: volunteer.campusPhysicalAddress ?? undefined,
    photoDataUrl: volunteer.photoDataUrl ?? undefined,
    accessPointIds: volunteer.accessPointIds,
  };
}

function getVolunteerSectionIds(volunteer: Pick<Volunteer, "sectionId" | "sectionIds">) {
  return volunteer.sectionIds.length ? volunteer.sectionIds : volunteer.sectionId ? [volunteer.sectionId] : [];
}

function mapEvent(event: Awaited<ReturnType<typeof prisma.event.findMany>>[number]): Event {
  return {
    ...event,
    date: formatISO(event.date, { representation: "date" }),
    recurringDays: event.recurringDays as RecurringDay[],
  };
}

function mapAttendance(attendance: Awaited<ReturnType<typeof prisma.attendance.findMany>>[number]): Attendance {
  return {
    ...attendance,
    scannedAt: attendance.scannedAt.toISOString(),
  };
}

function mapPermission(
  permission: Awaited<ReturnType<typeof prisma.accessPermission.findMany>>[number],
): AccessPermission {
  return {
    ...permission,
    departmentId: permission.departmentId ?? undefined,
    subDepartmentId: permission.subDepartmentId ?? undefined,
    sectionId: permission.sectionId ?? undefined,
    role: permission.role ?? undefined,
    excludedVolunteerIds: permission.excludedVolunteerIds ?? [],
  };
}

function mapAccessLog(log: Awaited<ReturnType<typeof prisma.accessLog.findMany>>[number]): AccessLog {
  return {
    ...log,
    scannedAt: log.scannedAt.toISOString(),
  };
}

function mapAccessPoint(
  accessPoint: Awaited<ReturnType<typeof prisma.accessPoint.findMany>>[number],
): AccessPoint {
  return {
    ...accessPoint,
    campusId: accessPoint.campusId ?? undefined,
  };
}

function mapUser(user: Awaited<ReturnType<typeof prisma.user.findMany>>[number]): UserAccount {
  const campusIds = Array.isArray(user.campusIds) ? user.campusIds : [];
  const departmentIds = Array.isArray(user.departmentIds) ? user.departmentIds : [];
  const subDepartmentIds = Array.isArray(user.subDepartmentIds) ? user.subDepartmentIds : [];
  const sectionIds = Array.isArray(user.sectionIds) ? user.sectionIds : [];
  const presetPermissions = getPresetPermissionsForUserType(user.userType);
  const pageAccess = user.pageAccess.length ? user.pageAccess : presetPermissions.pageAccess;
  const actionAccess = user.actionAccess.length ? user.actionAccess : presetPermissions.actionAccess;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    userType: user.userType,
    loginCode: "",
    hasLoginCode: Boolean(user.passwordHash),
    volunteerId: user.volunteerId ?? undefined,
    campusId: user.campusId ?? undefined,
    campusIds: campusIds.length ? campusIds : user.campusId ? [user.campusId] : [],
    departmentId: user.departmentId ?? undefined,
    departmentIds: departmentIds.length
      ? departmentIds
      : user.departmentId
        ? [user.departmentId]
        : [],
    subDepartmentId: user.subDepartmentId ?? undefined,
    subDepartmentIds: subDepartmentIds.length
      ? subDepartmentIds
      : user.subDepartmentId
        ? [user.subDepartmentId]
        : [],
    sectionId: user.sectionId ?? undefined,
    sectionIds: sectionIds.length ? sectionIds : user.sectionId ? [user.sectionId] : [],
    pageAccess,
    actionAccess,
  };
}

export async function getSnapshot(): Promise<Snapshot> {
  if (!shouldUseMockFallback()) {
    return readDatabaseSnapshot();
  }

  try {
    return await readDatabaseSnapshot();
  } catch (error) {
    console.warn(
      "Falling back to mock snapshot for local development.",
      error instanceof Error ? error.message : error,
    );
    return getMockSnapshot();
  }
}

function filterSnapshotByUser(snapshot: Snapshot, user: UserAccount): Snapshot {
  if (user.role === "SUPER_ADMIN") {
    return snapshot;
  }

  const campusIds = new Set<string>(user.campusIds);
  const departmentIds = new Set<string>(user.departmentIds);
  const subDepartmentIds = new Set<string>(user.subDepartmentIds);
  const sectionIds = new Set<string>(user.sectionIds);

  const linkedVolunteer = user.volunteerId
    ? snapshot.volunteers.find((volunteer) => volunteer.id === user.volunteerId)
    : undefined;
  const linkedSection = linkedVolunteer
    ? snapshot.sections.find((section) => section.id === linkedVolunteer.sectionId)
    : undefined;
  const linkedSubDepartment = linkedSection
    ? snapshot.subDepartments.find((subDepartment) => subDepartment.id === linkedSection.subDepartmentId)
    : undefined;
  const linkedDepartment = linkedSubDepartment
    ? snapshot.departments.find((department) => department.id === linkedSubDepartment.departmentId)
    : undefined;

  if (sectionIds.size === 0 && user.sectionId) {
    sectionIds.add(user.sectionId);
  }
  if (subDepartmentIds.size === 0 && user.subDepartmentId) {
    subDepartmentIds.add(user.subDepartmentId);
  }
  if (departmentIds.size === 0 && user.departmentId) {
    departmentIds.add(user.departmentId);
  }
  if (campusIds.size === 0 && user.campusId) {
    campusIds.add(user.campusId);
  }

  if (sectionIds.size > 0) {
    for (const sectionId of sectionIds) {
      const section = snapshot.sections.find((entry) => entry.id === sectionId);
      if (!section) continue;
      subDepartmentIds.add(section.subDepartmentId);
    }
  }

  if (subDepartmentIds.size > 0) {
    for (const subDepartmentId of Array.from(subDepartmentIds)) {
      const subDepartment = snapshot.subDepartments.find((entry) => entry.id === subDepartmentId);
      if (!subDepartment) continue;
      departmentIds.add(subDepartment.departmentId);
      for (const section of snapshot.sections) {
        if (section.subDepartmentId === subDepartment.id) {
          sectionIds.add(section.id);
        }
      }
    }
  }

  if (departmentIds.size > 0) {
    for (const departmentId of Array.from(departmentIds)) {
      const department = snapshot.departments.find((entry) => entry.id === departmentId);
      if (!department) continue;
      campusIds.add(department.campusId);
      for (const subDepartment of snapshot.subDepartments) {
        if (subDepartment.departmentId === department.id) {
          subDepartmentIds.add(subDepartment.id);
        }
      }
    }
  }

  if (campusIds.size > 0) {
    for (const campusId of Array.from(campusIds)) {
      for (const department of snapshot.departments) {
        if (department.campusId !== campusId) continue;
        departmentIds.add(department.id);
      }
    }
    for (const subDepartment of snapshot.subDepartments) {
      if (departmentIds.has(subDepartment.departmentId)) {
        subDepartmentIds.add(subDepartment.id);
      }
    }
    for (const section of snapshot.sections) {
      if (subDepartmentIds.has(section.subDepartmentId)) {
        sectionIds.add(section.id);
      }
    }
  } else if (linkedVolunteer && linkedSection && linkedSubDepartment && linkedDepartment) {
    sectionIds.add(linkedSection.id);
    subDepartmentIds.add(linkedSubDepartment.id);
    departmentIds.add(linkedDepartment.id);
    campusIds.add(linkedDepartment.campusId);
  }

  if (
    user.role === "VOLUNTEER" &&
    user.volunteerId &&
    snapshot.volunteers.some((volunteer) => volunteer.id === user.volunteerId)
  ) {
    if (sectionIds.size === 0 && linkedSection) {
      sectionIds.add(linkedSection.id);
    }
    if (subDepartmentIds.size === 0 && linkedSubDepartment) {
      subDepartmentIds.add(linkedSubDepartment.id);
    }
    if (departmentIds.size === 0 && linkedDepartment) {
      departmentIds.add(linkedDepartment.id);
    }
    if (campusIds.size === 0 && linkedDepartment) {
      campusIds.add(linkedDepartment.campusId);
    }
  }

  const scopedCampuses =
    campusIds.size > 0
      ? snapshot.campuses.filter((campus) => campusIds.has(campus.id))
      : [];
  const scopedDepartments =
    departmentIds.size > 0
      ? snapshot.departments.filter((department) => departmentIds.has(department.id))
      : [];
  const scopedSubDepartments =
    subDepartmentIds.size > 0
      ? snapshot.subDepartments.filter((subDepartment) => subDepartmentIds.has(subDepartment.id))
      : [];
  const scopedSections =
    sectionIds.size > 0
      ? snapshot.sections.filter((section) => sectionIds.has(section.id))
      : [];

  const visibleVolunteerIds = new Set(
    snapshot.volunteers
      .filter((volunteer) => getVolunteerSectionIds(volunteer).some((sectionId) => sectionIds.has(sectionId)))
      .map((volunteer) => volunteer.id),
  );

  if (user.role === "VOLUNTEER" && user.volunteerId) {
    visibleVolunteerIds.clear();
    visibleVolunteerIds.add(user.volunteerId);
  }

  const scopedVolunteers = snapshot.volunteers.filter((volunteer) =>
    visibleVolunteerIds.has(volunteer.id),
  );
  const visibleEventIds = new Set(
    snapshot.events
      .filter((event) => campusIds.has(event.campusId))
      .map((event) => event.id),
  );
  const scopedEvents = snapshot.events.filter((event) => visibleEventIds.has(event.id));
  const visibleAccessPointIds = new Set(
    snapshot.accessPoints
      .filter((accessPoint) => Boolean(accessPoint.campusId && campusIds.has(accessPoint.campusId)))
      .map((accessPoint) => accessPoint.id),
  );
  const scopedAccessPoints = snapshot.accessPoints.filter((accessPoint) =>
    visibleAccessPointIds.has(accessPoint.id),
  );
  const scopedPermissions = snapshot.permissions.filter((permission) => {
    if (!visibleAccessPointIds.has(permission.accessPointId)) {
      return false;
    }

    if (permission.sectionId) {
      return sectionIds.has(permission.sectionId);
    }

    if (permission.departmentId) {
      return departmentIds.has(permission.departmentId);
    }

    if (permission.subDepartmentId) {
      return subDepartmentIds.has(permission.subDepartmentId);
    }

    return true;
  });
  const scopedAttendances = snapshot.attendances.filter(
    (attendance) =>
      visibleVolunteerIds.has(attendance.volunteerId) && visibleEventIds.has(attendance.eventId),
  );
  const scopedAccessLogs = snapshot.accessLogs.filter(
    (log) =>
      visibleVolunteerIds.has(log.volunteerId) && visibleAccessPointIds.has(log.accessPointId),
  );
  const scopedUsers = snapshot.users.filter((candidate) => {
    if (candidate.id === user.id) {
      return true;
    }

    const candidateSectionIds = candidate.sectionIds.length
      ? candidate.sectionIds
      : candidate.sectionId
        ? [candidate.sectionId]
        : [];
    if (candidateSectionIds.some((candidateSectionId) => sectionIds.has(candidateSectionId))) {
      return true;
    }

    const candidateDepartmentIds = candidate.departmentIds.length
      ? candidate.departmentIds
      : candidate.departmentId
        ? [candidate.departmentId]
        : [];
    if (candidateDepartmentIds.some((candidateDepartmentId) => departmentIds.has(candidateDepartmentId))) {
      return true;
    }

    const candidateSubDepartmentIds = candidate.subDepartmentIds.length
      ? candidate.subDepartmentIds
      : candidate.subDepartmentId
        ? [candidate.subDepartmentId]
        : [];
    if (candidateSubDepartmentIds.some((candidateSubDepartmentId) => subDepartmentIds.has(candidateSubDepartmentId))) {
      return true;
    }

    const candidateCampusIds = candidate.campusIds.length
      ? candidate.campusIds
      : candidate.campusId
        ? [candidate.campusId]
        : [];
    if (candidateCampusIds.some((candidateCampusId) => campusIds.has(candidateCampusId))) {
      return true;
    }

    if (candidate.volunteerId) {
      return visibleVolunteerIds.has(candidate.volunteerId);
    }

    return false;
  });

  return {
    campuses: scopedCampuses,
    departments: scopedDepartments,
    subDepartments: scopedSubDepartments,
    sections: scopedSections,
    volunteers: scopedVolunteers,
    events: scopedEvents,
    attendances: scopedAttendances,
    accessPoints: scopedAccessPoints,
    permissions: scopedPermissions,
    accessLogs: scopedAccessLogs,
    users: scopedUsers,
  };
}

export async function getScopedSnapshot(user: UserAccount): Promise<Snapshot> {
  const snapshot = await getSnapshot();
  return filterSnapshotByUser(snapshot, user);
}

export async function getDashboardData() {
  const snapshot = await getSnapshot();
  const today = startOfDay(new Date());
  const weekAgo = subDays(today, 7);
  const monthAgo = subDays(today, 30);

  return {
    totals: {
      volunteers: snapshot.volunteers.length,
      weeklyAttendance: snapshot.attendances.filter(
        (entry) => new Date(entry.scannedAt) >= weekAgo,
      ).length,
      monthlyAttendance: snapshot.attendances.filter(
        (entry) => new Date(entry.scannedAt) >= monthAgo,
      ).length,
      activeEvents: snapshot.events.filter(
        (event) => new Date(event.date) >= today && new Date(event.date) <= addDays(today, 7),
      ).length,
      grantedAccess: snapshot.accessLogs.filter((log) => log.status === "GRANTED").length,
    },
    recentAccess: snapshot.accessLogs
      .slice()
      .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt))
      .slice(0, 5),
  };
}

export async function listVolunteers() {
  return (await getSnapshot()).volunteers;
}

export async function listVolunteersForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).volunteers;
}

export async function listEvents() {
  return (await getSnapshot()).events;
}

export async function listEventsForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).events;
}

export async function listAccessPoints() {
  return (await getSnapshot()).accessPoints;
}

export async function listAccessPointsForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).accessPoints;
}

export async function listAccessPermissions() {
  return (await getSnapshot()).permissions;
}

export async function listAccessPermissionsForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).permissions;
}

export async function listUsers() {
  return (await getSnapshot()).users;
}

export async function findUserAccountById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  return user ? mapUser(user) : null;
}

export async function syncCredentialAccountHash(userId: string, passwordHash: string) {
  await prisma.account.upsert({
    where: {
      issuer_accountId: {
        issuer: CREDENTIAL_ISSUER,
        accountId: userId,
      },
    },
    update: {
      password: passwordHash,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId,
    },
    create: {
      accountId: userId,
      providerId: CREDENTIAL_PROVIDER_ID,
      issuer: CREDENTIAL_ISSUER,
      userId,
      password: passwordHash,
    },
  });
}

export async function listPortalNotifications(limit = 25): Promise<PortalNotification[]> {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    detail: notification.detail,
    createdAt: notification.createdAt.toISOString(),
  }));
}

export async function createPortalNotification(input: Pick<PortalNotification, "title" | "detail">) {
  await prisma.notification.create({
    data: {
      title: input.title,
      detail: input.detail,
    },
  });
}

export async function deletePortalNotification(notificationId: string) {
  await prisma.notification.delete({
    where: { id: notificationId },
  });
}

export async function clearPortalNotifications() {
  await prisma.notification.deleteMany();
}

export async function listUsersForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).users;
}

export async function listCampusesForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).campuses;
}

export async function listDepartmentsForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).departments;
}

export async function listSubDepartmentsForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).subDepartments;
}

export async function listSectionsForUser(user: UserAccount) {
  return (await getScopedSnapshot(user)).sections;
}

export async function getReportData() {
  const snapshot = await getSnapshot();
  return snapshot.departments.map((department) => {
    const subDepartmentIds = snapshot.subDepartments
      .filter((subDepartment) => subDepartment.departmentId === department.id)
      .map((subDepartment) => subDepartment.id);
    const sectionIds = snapshot.sections
      .filter((section) => subDepartmentIds.includes(section.subDepartmentId))
      .map((section) => section.id);
    const volunteers = snapshot.volunteers.filter((volunteer) =>
      getVolunteerSectionIds(volunteer).some((sectionId) => sectionIds.includes(sectionId)),
    );
    const volunteerIds = volunteers.map((volunteer) => volunteer.id);
    const attendances = snapshot.attendances.filter((entry) =>
      volunteerIds.includes(entry.volunteerId),
    );

    return {
      department,
      volunteers: volunteers.length,
      attendances: attendances.length,
      consistency:
        volunteers.length === 0
          ? 0
          : Math.round((attendances.length / volunteers.length) * 100),
    };
  });
}

export async function findVolunteerByQrToken(token: string) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { qrToken: token },
  });

  return volunteer ? mapVolunteer(volunteer) : null;
}

export async function findVolunteerBadgeByQrToken(token: string) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { qrToken: token },
    include: {
      section: {
        include: {
          subDepartment: {
            include: {
              department: {
                include: {
                  campus: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!volunteer) {
    return null;
  }

  return {
    volunteer: mapVolunteer(volunteer),
    sectionName: volunteer.section.name,
    departmentName: volunteer.section.subDepartment.department.name,
    campusName: volunteer.section.subDepartment.department.campus.name,
  };
}

export async function processAttendanceScan(input: { token: string; eventId: string }) {
  const [volunteer, event] = await Promise.all([
    prisma.volunteer.findUnique({
      where: { qrToken: input.token },
      include: { section: true },
    }),
    prisma.event.findUnique({ where: { id: input.eventId } }),
  ]);

  if (!volunteer || !event) {
    return {
      ok: false,
      mode: "attendance" as const,
      status: "DENIED",
      message: "Volunteer or event not found.",
    };
  }

  const duplicate = await prisma.attendance.findFirst({
    where: {
      volunteerId: volunteer.id,
      eventId: event.id,
    },
  });

  if (duplicate && !event.allowDuplicate) {
    return {
      ok: false,
      mode: "attendance" as const,
      status: "DUPLICATE",
      message: `${volunteer.fullName} has already checked in for ${event.name} ${event.sundayService}.`,
      details: undefined,
      volunteer: {
        fullName: volunteer.fullName,
        sectionName: volunteer.section.name,
        photoDataUrl: volunteer.photoDataUrl ?? undefined,
      },
    };
  }

  await prisma.attendance.create({
    data: { volunteerId: volunteer.id, eventId: event.id, status: "PRESENT" },
  });

  return {
    ok: true,
    mode: "attendance" as const,
    status: "PRESENT",
    message: `${volunteer.fullName} checked in for ${event.name} ${event.sundayService}.`,
    details: undefined,
    volunteer: {
      fullName: volunteer.fullName,
      sectionName: volunteer.section.name,
      photoDataUrl: volunteer.photoDataUrl ?? undefined,
    },
  };
}

export async function processAccessScan(input: { token: string; accessPointId: string }) {
  const [volunteer, accessPoint] = await Promise.all([
    prisma.volunteer.findUnique({
      where: { qrToken: input.token },
      include: { section: { include: { subDepartment: { include: { department: true } } } } },
    }),
    prisma.accessPoint.findUnique({ where: { id: input.accessPointId } }),
  ]);

  if (!volunteer || !accessPoint || !accessPoint.isActive) {
    return {
      ok: false,
      mode: "access" as const,
      status: "DENIED",
      message: "Volunteer or access point not found.",
    };
  }

  const permissions = await prisma.accessPermission.findMany({
    where: { accessPointId: accessPoint.id },
  });

  const hasDirectAccess = volunteer.accessPointIds.includes(accessPoint.id);
  const volunteerSectionIds = volunteer.sectionIds.length ? volunteer.sectionIds : [volunteer.sectionId];
  const assignedSections = await prisma.section.findMany({
    where: { id: { in: volunteerSectionIds } },
    include: { subDepartment: { include: { department: true } } },
  });
  const volunteerSubDepartmentIds = Array.from(new Set(assignedSections.map((section) => section.subDepartmentId)));
  const volunteerDepartmentIds = Array.from(
    new Set(assignedSections.map((section) => section.subDepartment.departmentId)),
  );
  const matchedPermission = permissions.find((permission) => {
    if (permission.excludedVolunteerIds.includes(volunteer.id)) {
      return false;
    }

    return (
      (permission.sectionId ? volunteerSectionIds.includes(permission.sectionId) : false) ||
      (permission.subDepartmentId ? volunteerSubDepartmentIds.includes(permission.subDepartmentId) : false) ||
      (permission.departmentId ? volunteerDepartmentIds.includes(permission.departmentId) : false) ||
      permission.role === volunteer.role
    );
  });
  const allowed = hasDirectAccess || Boolean(matchedPermission);
  const status = allowed ? "GRANTED" : "DENIED";

  const directAccessNames =
    volunteer.accessPointIds.length > 0
      ? await prisma.accessPoint.findMany({
          where: { id: { in: volunteer.accessPointIds } },
          select: { name: true },
        })
      : [];

  let details: string | undefined;
  if (hasDirectAccess) {
    details = "Granted via direct volunteer access on the profile.";
  } else if (matchedPermission?.sectionId) {
    const matchedSection = assignedSections.find((section) => section.id === matchedPermission.sectionId);
    details = `Granted via section access: ${matchedSection?.name ?? volunteer.section.name}.`;
  } else if (matchedPermission?.subDepartmentId) {
    const matchedSection = assignedSections.find((section) => section.subDepartmentId === matchedPermission.subDepartmentId);
    details = `Granted via sub-department access: ${matchedSection?.subDepartment.name ?? volunteer.section.subDepartment.name}.`;
  } else if (matchedPermission?.departmentId) {
    const matchedSection = assignedSections.find(
      (section) => section.subDepartment.departmentId === matchedPermission.departmentId,
    );
    details = `Granted via department access: ${matchedSection?.subDepartment.department.name ?? volunteer.section.subDepartment.department.name}.`;
  } else if (matchedPermission?.role) {
    details = `Granted via role access: ${matchedPermission.role.replaceAll("_", " ")}.`;
  } else if (directAccessNames.length > 0) {
    details = `Direct volunteer access currently includes: ${directAccessNames.map((item) => item.name).join(", ")}.`;
  } else {
    details = "No direct volunteer access override is configured on this profile.";
  }

  await prisma.accessLog.create({
    data: { volunteerId: volunteer.id, accessPointId: accessPoint.id, status },
  });

  return {
    ok: allowed,
    mode: "access" as const,
    status,
    message: allowed
      ? `${volunteer.fullName} is cleared for ${accessPoint.name}.`
      : `${volunteer.fullName} is not authorized for ${accessPoint.name}.`,
    details,
    volunteer: {
      fullName: volunteer.fullName,
      sectionName: volunteer.section.name,
      photoDataUrl: volunteer.photoDataUrl ?? undefined,
    },
  };
}

export async function createVolunteer(input: Omit<Volunteer, "id" | "qrToken">) {
  const { departmentIds: _departmentIds, subDepartmentIds: _subDepartmentIds, ...volunteerData } = input as Omit<
    Volunteer,
    "id" | "qrToken"
  > & { departmentIds?: string[]; subDepartmentIds?: string[] };
  const sectionIds = volunteerData.sectionIds.length ? volunteerData.sectionIds : [volunteerData.sectionId];
  await prisma.volunteer.create({
    data: {
      ...volunteerData,
      email: volunteerData.email.trim() || null,
      sectionId: sectionIds[0],
      sectionIds,
      qrToken: `CRC-${volunteerData.fullName.toUpperCase().replace(/\s+/g, "-")}-${nanoid(6)}`,
    },
  });
  await createPortalNotification({
    title: "Volunteer added",
    detail: volunteerData.fullName,
  });
}

export async function deleteVolunteer(volunteerId: string) {
  await prisma.attendance.deleteMany({
    where: { volunteerId },
  });
  await prisma.accessLog.deleteMany({
    where: { volunteerId },
  });
  await prisma.user.deleteMany({
    where: { volunteerId },
  });
  await prisma.volunteer.delete({
    where: { id: volunteerId },
  });
}

export async function updateVolunteer(
  volunteerId: string,
  input: Omit<Volunteer, "id" | "qrToken">,
) {
  const { departmentIds: _departmentIds, subDepartmentIds: _subDepartmentIds, ...volunteerData } = input as Omit<
    Volunteer,
    "id" | "qrToken"
  > & { departmentIds?: string[]; subDepartmentIds?: string[] };
  const sectionIds = volunteerData.sectionIds.length ? volunteerData.sectionIds : [volunteerData.sectionId];
  await prisma.volunteer.update({
    where: { id: volunteerId },
    data: {
      ...volunteerData,
      email: volunteerData.email.trim() || null,
      sectionId: sectionIds[0],
      sectionIds,
    },
  });
}

export async function createEvent(input: Omit<Event, "id">) {
  await prisma.event.create({
    data: { ...input, date: new Date(input.date) },
  });
  await createPortalNotification({
    title: "Event added",
    detail: input.name,
  });
}

export async function updateEvent(eventId: string, input: Omit<Event, "id">) {
  await prisma.event.update({
    where: { id: eventId },
    data: { ...input, date: new Date(input.date) },
  });
}

export async function deleteEvent(eventId: string) {
  await prisma.attendance.deleteMany({
    where: { eventId },
  });
  await prisma.event.delete({
    where: { id: eventId },
  });
}

type DirectSectionAccessInput = {
  sectionIds?: string[];
  excludedVolunteerIdsBySection?: Record<string, string[]>;
};

async function syncDirectSectionAccess(
  accessPointId: string,
  sectionIds: string[],
  excludedVolunteerIdsBySection: Record<string, string[]>,
) {
  const selectedSectionIds = Array.from(new Set(sectionIds));
  const members = selectedSectionIds.length
    ? await prisma.volunteer.findMany({
        where: {
          OR: [
            { sectionId: { in: selectedSectionIds } },
            { sectionIds: { hasSome: selectedSectionIds } },
          ],
        },
        select: { id: true, sectionId: true, sectionIds: true },
      })
    : [];
  const memberIdsBySection = new Map(
    selectedSectionIds.map((sectionId) => [
      sectionId,
      new Set(
        members
          .filter((member) => (member.sectionIds.length ? member.sectionIds : [member.sectionId]).includes(sectionId))
          .map((member) => member.id),
      ),
    ]),
  );
  const existing = await prisma.accessPermission.findMany({
    where: { accessPointId, sectionId: { not: null } },
  });
  const existingBySection = new Map<string, typeof existing[number]>();
  const duplicateIds: string[] = [];
  for (const permission of existing) {
    if (!permission.sectionId) continue;
    if (existingBySection.has(permission.sectionId)) {
      duplicateIds.push(permission.id);
    } else {
      existingBySection.set(permission.sectionId, permission);
    }
  }

  await prisma.$transaction([
    ...existing
      .filter((permission) => permission.sectionId && !selectedSectionIds.includes(permission.sectionId))
      .map((permission) => prisma.accessPermission.delete({ where: { id: permission.id } })),
    ...duplicateIds.map((id) => prisma.accessPermission.delete({ where: { id } })),
    ...selectedSectionIds.map((sectionId) => {
      const validExcludedIds = Array.from(
        new Set((excludedVolunteerIdsBySection[sectionId] ?? []).filter((id) => memberIdsBySection.get(sectionId)?.has(id))),
      );
      const existingPermission = existingBySection.get(sectionId);
      return existingPermission
        ? prisma.accessPermission.update({
            where: { id: existingPermission.id },
            data: { excludedVolunteerIds: validExcludedIds },
          })
        : prisma.accessPermission.create({
            data: { accessPointId, sectionId, excludedVolunteerIds: validExcludedIds },
          });
    }),
  ]);
}

export async function createAccessPoint(
  input: Omit<AccessPoint, "id"> & { volunteerIds?: string[] } & DirectSectionAccessInput,
) {
  const { volunteerIds = [], sectionIds = [], excludedVolunteerIdsBySection = {}, ...accessPointData } = input;
  const accessPoint = await prisma.accessPoint.create({ data: accessPointData, select: { id: true, name: true } });

  await syncDirectSectionAccess(accessPoint.id, sectionIds, excludedVolunteerIdsBySection);

  if (volunteerIds.length > 0) {
    const linkedVolunteers = await prisma.volunteer.findMany({
      where: { id: { in: volunteerIds } },
      select: { id: true, accessPointIds: true },
    });

    await Promise.all(
      linkedVolunteers.map((volunteer) =>
        prisma.volunteer.update({
          where: { id: volunteer.id },
          data: {
            accessPointIds: Array.from(new Set([...(volunteer.accessPointIds ?? []), accessPoint.id])),
          },
        }),
      ),
    );
  }

  await createPortalNotification({
    title: "Access point added",
    detail: accessPoint.name,
  });
}

export async function createCampus(input: Omit<Campus, "id">, createdByUserId?: string) {
  const campus = await prisma.campus.create({
    data: input,
    select: { id: true, name: true, city: true },
  });

  if (createdByUserId) {
    const creator = await prisma.user.findUnique({
      where: { id: createdByUserId },
      select: { id: true, campusId: true, campusIds: true, role: true },
    });

    if (creator && creator.role !== "SUPER_ADMIN") {
      const nextCampusIds = Array.from(new Set([...(creator.campusIds ?? []), campus.id]));
      await prisma.user.update({
        where: { id: creator.id },
        data: {
          campusId: creator.campusId ?? campus.id,
          campusIds: nextCampusIds,
        },
      });
    }
  }

  await createPortalNotification({
    title: "Campus added",
    detail: `${campus.name} • ${campus.city}`,
  });

  return campus;
}

export async function updateCampus(campusId: string, input: Omit<Campus, "id">) {
  await prisma.campus.update({
    where: { id: campusId },
    data: input,
  });
}

export async function deleteCampus(campusId: string) {
  const [departmentCount, eventCount] = await Promise.all([
    prisma.department.count({ where: { campusId } }),
    prisma.event.count({ where: { campusId } }),
  ]);

  if (departmentCount > 0 || eventCount > 0) {
    throw new Error("This campus still has linked departments or events.");
  }

  await prisma.campus.delete({
    where: { id: campusId },
  });
}

export async function createAccessPermission(input: Omit<AccessPermission, "id">) {
  await prisma.accessPermission.create({
    data: {
      accessPointId: input.accessPointId,
      departmentId: input.departmentId ?? null,
      subDepartmentId: input.subDepartmentId ?? null,
      sectionId: input.sectionId ?? null,
      role: input.role ?? null,
    },
  });
  await createPortalNotification({
    title: "Access permission added",
    detail: input.role ?? input.sectionId ?? input.subDepartmentId ?? input.departmentId ?? input.accessPointId,
  });
}

export async function updateAccessPermission(
  permissionId: string,
  input: Omit<AccessPermission, "id">,
) {
  await prisma.accessPermission.update({
    where: { id: permissionId },
    data: {
      accessPointId: input.accessPointId,
      departmentId: input.departmentId ?? null,
      subDepartmentId: input.subDepartmentId ?? null,
      sectionId: input.sectionId ?? null,
      role: input.role ?? null,
    },
  });
}

export async function deleteAccessPermission(permissionId: string) {
  await prisma.accessPermission.delete({
    where: { id: permissionId },
  });
}

export async function createDepartment(input: Omit<Department, "id">) {
  await prisma.department.create({ data: input });
  await createPortalNotification({
    title: "Department added",
    detail: input.name,
  });
}

export async function createSubDepartment(input: Omit<SubDepartment, "id">) {
  await prisma.subDepartment.create({ data: input });
  await createPortalNotification({
    title: "Sub-department added",
    detail: input.name,
  });
}

export async function updateDepartment(departmentId: string, input: Omit<Department, "id">) {
  await prisma.department.update({
    where: { id: departmentId },
    data: input,
  });
}

export async function updateSubDepartment(subDepartmentId: string, input: Omit<SubDepartment, "id">) {
  await prisma.subDepartment.update({
    where: { id: subDepartmentId },
    data: input,
  });
}

export async function deleteDepartment(departmentId: string) {
  const [subDepartmentIds, permissionCount] = await Promise.all([
    prisma.subDepartment.findMany({
      where: { departmentId },
      select: { id: true },
    }),
    prisma.accessPermission.count({ where: { departmentId } }),
  ]);

  const sectionIds =
    subDepartmentIds.length > 0
      ? await prisma.section.findMany({
          where: { subDepartmentId: { in: subDepartmentIds.map((subDepartment) => subDepartment.id) } },
          select: { id: true },
        })
      : [];

  const volunteerCount =
    sectionIds.length > 0
      ? await prisma.volunteer.count({
          where: {
            OR: [
              { sectionId: { in: sectionIds.map((section) => section.id) } },
              { sectionIds: { hasSome: sectionIds.map((section) => section.id) } },
            ],
          },
        })
      : 0;

  if (volunteerCount > 0) {
    throw new Error("This department still has linked volunteers through its sections.");
  }

  if (permissionCount > 0) {
    throw new Error("This department still has linked access permissions.");
  }

  await prisma.department.delete({
    where: { id: departmentId },
  });
}

export async function deleteSubDepartment(subDepartmentId: string) {
  const [sectionIds, permissionCount] = await Promise.all([
    prisma.section.findMany({
      where: { subDepartmentId },
      select: { id: true },
    }),
    prisma.accessPermission.count({ where: { subDepartmentId } }),
  ]);

  const volunteerCount =
    sectionIds.length > 0
      ? await prisma.volunteer.count({
          where: {
            OR: [
              { sectionId: { in: sectionIds.map((section) => section.id) } },
              { sectionIds: { hasSome: sectionIds.map((section) => section.id) } },
            ],
          },
        })
      : 0;

  if (volunteerCount > 0) {
    throw new Error("This sub-department still has linked volunteers through its sections.");
  }

  if (permissionCount > 0) {
    throw new Error("This sub-department still has linked access permissions.");
  }

  await prisma.subDepartment.delete({
    where: { id: subDepartmentId },
  });
}

export async function createSection(input: Omit<Section, "id">) {
  await prisma.section.create({
    data: {
      name: input.name,
      subDepartmentId: input.subDepartmentId,
    },
  });
  await createPortalNotification({
    title: "Section added",
    detail: input.name,
  });
}

export async function updateSection(sectionId: string, input: Omit<Section, "id">) {
  await prisma.section.update({
    where: { id: sectionId },
    data: {
      name: input.name,
      subDepartmentId: input.subDepartmentId,
    },
  });
}

export async function deleteSection(sectionId: string) {
  const [volunteerCount, permissionCount] = await Promise.all([
    prisma.volunteer.count({
      where: {
        OR: [{ sectionId }, { sectionIds: { has: sectionId } }],
      },
    }),
    prisma.accessPermission.count({ where: { sectionId } }),
  ]);

  if (volunteerCount > 0) {
    throw new Error("This section still has linked volunteers.");
  }

  if (permissionCount > 0) {
    throw new Error("This section still has linked access permissions.");
  }

  await prisma.section.delete({
    where: { id: sectionId },
  });
}

export async function createUser(input: Omit<UserAccount, "id">) {
  const passwordHash = hashLoginCode(input.loginCode);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      userType: input.userType,
      passwordHash,
      volunteerId: input.volunteerId ?? null,
      campusId: input.campusIds[0] ?? input.campusId ?? null,
      campusIds: input.campusIds,
      departmentId: input.departmentIds[0] ?? input.departmentId ?? null,
      departmentIds: input.departmentIds,
      subDepartmentId: input.subDepartmentIds[0] ?? input.subDepartmentId ?? null,
      subDepartmentIds: input.subDepartmentIds,
      sectionId: input.sectionIds[0] ?? input.sectionId ?? null,
      sectionIds: input.sectionIds,
      pageAccess: input.pageAccess,
      actionAccess: input.actionAccess,
    },
    select: { id: true },
  });
  await syncCredentialAccountHash(user.id, passwordHash);
  await createPortalNotification({
    title: "User added",
    detail: input.name,
  });
}

export async function updateUser(userId: string, input: Omit<UserAccount, "id">) {
  const nextPasswordHash = input.loginCode.trim() ? hashLoginCode(input.loginCode) : null;
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      userType: input.userType,
      ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
      volunteerId: input.volunteerId ?? null,
      campusId: input.campusIds[0] ?? input.campusId ?? null,
      campusIds: input.campusIds,
      departmentId: input.departmentIds[0] ?? input.departmentId ?? null,
      departmentIds: input.departmentIds,
      subDepartmentId: input.subDepartmentIds[0] ?? input.subDepartmentId ?? null,
      subDepartmentIds: input.subDepartmentIds,
      sectionId: input.sectionIds[0] ?? input.sectionId ?? null,
      sectionIds: input.sectionIds,
      pageAccess: input.pageAccess,
      actionAccess: input.actionAccess,
    },
  });

  if (nextPasswordHash) {
    await syncCredentialAccountHash(userId, nextPasswordHash);
  }
}

export async function deleteUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });
}

export async function updateAccessPoint(
  accessPointId: string,
  input: Omit<AccessPoint, "id"> & { volunteerIds?: string[] } & DirectSectionAccessInput,
) {
  const { volunteerIds = [], sectionIds = [], excludedVolunteerIdsBySection = {}, ...accessPointData } = input;
  await prisma.accessPoint.update({
    where: { id: accessPointId },
    data: accessPointData,
  });
  await syncDirectSectionAccess(accessPointId, sectionIds, excludedVolunteerIdsBySection);

  const linkedVolunteers = await prisma.volunteer.findMany({
    where: { accessPointIds: { has: accessPointId } },
    select: { id: true, accessPointIds: true },
  });

  const nextVolunteerIdSet = new Set(volunteerIds);

  await Promise.all(
    linkedVolunteers.map((volunteer) =>
      prisma.volunteer.update({
        where: { id: volunteer.id },
        data: {
          accessPointIds: volunteer.accessPointIds.filter((entry) => entry !== accessPointId),
        },
      }),
    ),
  );

  const volunteersToAttach = await prisma.volunteer.findMany({
    where: { id: { in: Array.from(nextVolunteerIdSet) } },
    select: { id: true, accessPointIds: true },
  });

  await Promise.all(
    volunteersToAttach.map((volunteer) =>
      prisma.volunteer.update({
        where: { id: volunteer.id },
        data: {
          accessPointIds: Array.from(new Set([...(volunteer.accessPointIds ?? []), accessPointId])),
        },
      }),
    ),
  );
}

export async function deleteAccessPoint(accessPointId: string) {
  const [permissionCount, logCount] = await Promise.all([
    prisma.accessPermission.count({ where: { accessPointId } }),
    prisma.accessLog.count({ where: { accessPointId } }),
  ]);

  if (permissionCount > 0) {
    throw new Error("This access point still has linked permissions.");
  }

  if (logCount > 0) {
    throw new Error("This access point still has audit log history and cannot be deleted.");
  }

  const linkedVolunteers = await prisma.volunteer.findMany({
    where: { accessPointIds: { has: accessPointId } },
    select: { id: true, accessPointIds: true },
  });

  await Promise.all(
    linkedVolunteers.map((volunteer) =>
      prisma.volunteer.update({
        where: { id: volunteer.id },
        data: {
          accessPointIds: volunteer.accessPointIds.filter((entry) => entry !== accessPointId),
        },
      }),
    ),
  );

  await prisma.accessPoint.delete({
    where: { id: accessPointId },
  });
}
