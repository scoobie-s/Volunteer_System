import { getPresetPermissionsForUserType } from "@/lib/user-types";
import type {
  AccessLog,
  AccessPermission,
  AccessPoint,
  Attendance,
  Campus,
  Department,
  Event,
  SubDepartment,
  Section,
  UserAccount,
  Volunteer,
} from "@/lib/types";

const campuses: Campus[] = [
  {
    id: "campus-jhb",
    name: "CRC Johannesburg",
    city: "Johannesburg",
  },
];

const departments: Department[] = [
  {
    id: "dept-worship",
    name: "Worship",
    campusId: "campus-jhb",
  },
  {
    id: "dept-guest-experience",
    name: "Guest Experience",
    campusId: "campus-jhb",
  },
];

const subDepartments: SubDepartment[] = [
  {
    id: "subdept-music",
    name: "Music",
    departmentId: "dept-worship",
  },
  {
    id: "subdept-guest-services",
    name: "Guest Services",
    departmentId: "dept-guest-experience",
  },
];

const sections: Section[] = [
  {
    id: "section-band",
    name: "Band",
    subDepartmentId: "subdept-music",
    departmentId: "dept-worship",
  },
  {
    id: "section-hosts",
    name: "Hosts",
    subDepartmentId: "subdept-guest-services",
    departmentId: "dept-guest-experience",
  },
];

const volunteers: Volunteer[] = [
  {
    id: "vol-ayanda",
    fullName: "Ayanda Mokoena",
    phone: "+27 82 555 0101",
    email: "ayanda@crc.local",
    membershipStatus: "MEMBER",
    role: "SECTION_LEADER",
    availability: "BOTH",
    sectionId: "section-band",
    sectionIds: ["section-band"],
    qrToken: "CRC-AYANDA-MOKOENA-DEMO01",
    notes: "Mock-mode volunteer for local development.",
    pastor: "Ps. Demo",
    zone: "North",
    campusPhysicalAddress: "Johannesburg Campus",
    accessPointIds: ["access-backstage"],
  },
  {
    id: "vol-thabo",
    fullName: "Thabo Ndlovu",
    phone: "+27 82 555 0102",
    email: "thabo@crc.local",
    membershipStatus: "MEMBER",
    role: "VOLUNTEER",
    availability: "SUNDAY",
    sectionId: "section-hosts",
    sectionIds: ["section-hosts"],
    qrToken: "CRC-THABO-NDLOVU-DEMO02",
    notes: "Mock-mode volunteer for scanner testing.",
    pastor: "Ps. Demo",
    zone: "Central",
    campusPhysicalAddress: "Johannesburg Campus",
    accessPointIds: [],
  },
];

const events: Event[] = [
  {
    id: "event-sunday-am1",
    name: "Sunday Celebration",
    date: "2026-08-23",
    type: "SUNDAY",
    sundayService: "AM1",
    startTime: "08:00",
    endTime: "10:00",
    campusId: "campus-jhb",
    allowDuplicate: false,
    isRecurring: true,
    recurringDays: ["SUNDAY"],
  },
  {
    id: "event-thursday-rehearsal",
    name: "Thursday Rehearsal",
    date: "2026-08-20",
    type: "REHEARSAL",
    sundayService: "NONE",
    startTime: "18:00",
    endTime: "20:00",
    campusId: "campus-jhb",
    allowDuplicate: true,
    isRecurring: true,
    recurringDays: ["THURSDAY"],
  },
];

const attendances: Attendance[] = [
  {
    id: "attendance-1",
    volunteerId: "vol-ayanda",
    eventId: "event-thursday-rehearsal",
    status: "PRESENT",
    scannedAt: "2026-08-18T17:58:00.000Z",
  },
];

const accessPoints: AccessPoint[] = [
  {
    id: "access-backstage",
    name: "Backstage",
    location: "Main Auditorium",
    campusId: "campus-jhb",
    color: "#22c55e",
    isActive: true,
  },
];

const permissions: AccessPermission[] = [
  {
    id: "permission-band-backstage",
    accessPointId: "access-backstage",
    sectionId: "section-band",
  },
];

const accessLogs: AccessLog[] = [
  {
    id: "access-log-1",
    volunteerId: "vol-ayanda",
    accessPointId: "access-backstage",
    status: "GRANTED",
    scannedAt: "2026-08-18T18:02:00.000Z",
  },
];

const superAdminPermissions = getPresetPermissionsForUserType("SUPER_ADMIN");
const platformAdminPermissions = getPresetPermissionsForUserType("PLATFORM_ADMIN");

const users: UserAccount[] = [
  {
    id: "user-super-admin",
    name: "Local Super Admin",
    email: "admin@crc.local",
    role: "SUPER_ADMIN",
    userType: "SUPER_ADMIN",
    loginCode: "1234",
    campusIds: ["campus-jhb"],
    departmentIds: ["dept-worship", "dept-guest-experience"],
    subDepartmentIds: ["subdept-music", "subdept-guest-services"],
    sectionIds: ["section-band", "section-hosts"],
    pageAccess: superAdminPermissions.pageAccess,
    actionAccess: superAdminPermissions.actionAccess,
  },
  {
    id: "user-ayanda",
    name: "Ayanda Mokoena",
    email: "ayanda@crc.local",
    role: "SECTION_LEADER",
    userType: "SECTION_COORDINATOR",
    loginCode: "2468",
    volunteerId: "vol-ayanda",
    campusId: "campus-jhb",
    campusIds: ["campus-jhb"],
    departmentId: "dept-worship",
    departmentIds: ["dept-worship"],
    subDepartmentId: "subdept-music",
    subDepartmentIds: ["subdept-music"],
    sectionId: "section-band",
    sectionIds: ["section-band"],
    pageAccess: platformAdminPermissions.pageAccess,
    actionAccess: platformAdminPermissions.actionAccess,
  },
];

export function getMockSnapshot() {
  return {
    campuses: structuredClone(campuses),
    departments: structuredClone(departments),
    subDepartments: structuredClone(subDepartments),
    sections: structuredClone(sections),
    volunteers: structuredClone(volunteers),
    events: structuredClone(events),
    attendances: structuredClone(attendances),
    accessPoints: structuredClone(accessPoints),
    permissions: structuredClone(permissions),
    accessLogs: structuredClone(accessLogs),
    users: structuredClone(users),
  };
}

export function findMockUserByCode(loginCode: string) {
  return getMockSnapshot().users.find((user) => user.loginCode === loginCode) ?? null;
}

export function findMockUserById(userId: string) {
  return getMockSnapshot().users.find((user) => user.id === userId) ?? null;
}
