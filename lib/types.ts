export type MembershipStatus = "MEMBER" | "NON_MEMBER" | "NEW_COMER";
export type VolunteerRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DEPARTMENT_HEAD"
  | "SECTION_LEADER"
  | "VOLUNTEER";
export type Availability = "SUNDAY" | "THURSDAY" | "BOTH";
export type EventType = "REHEARSAL" | "SUNDAY" | "SPECIAL";
export type SundayService = "AM1" | "AM2" | "PM" | "NONE";
export type RecurringDay =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";
export type AttendanceStatus = "PRESENT" | "DUPLICATE" | "DENIED";
export type AccessStatus = "GRANTED" | "DENIED";
export type UserRole = VolunteerRole;
export type UserType =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "CAMPUS_COORDINATOR"
  | "DEPARTMENT_MANAGER"
  | "SECTION_COORDINATOR"
  | "SCANNER_OPERATOR"
  | "ACCESS_MANAGER"
  | "REPORT_VIEWER"
  | "VOLUNTEER_PORTAL";

export type Campus = {
  id: string;
  name: string;
  city: string;
};

export type Department = {
  id: string;
  name: string;
  campusId: string;
};

export type SubDepartment = {
  id: string;
  name: string;
  departmentId: string;
};

export type Section = {
  id: string;
  name: string;
  subDepartmentId: string;
  departmentId?: string;
};

export type Volunteer = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  membershipStatus: MembershipStatus;
  role: VolunteerRole;
  availability: Availability;
  sectionId: string;
  sectionIds: string[];
  qrToken: string;
  notes?: string;
  pastor?: string;
  zone?: string;
  campusPhysicalAddress?: string;
  photoDataUrl?: string;
  accessPointIds: string[];
};

export type Event = {
  id: string;
  name: string;
  date: string;
  type: EventType;
  sundayService: SundayService;
  startTime: string;
  endTime: string;
  campusId: string;
  allowDuplicate: boolean;
  isRecurring: boolean;
  recurringDays: RecurringDay[];
};

export type Attendance = {
  id: string;
  volunteerId: string;
  eventId: string;
  status: AttendanceStatus;
  scannedAt: string;
};

export type AccessPoint = {
  id: string;
  name: string;
  location: string;
  campusId?: string;
  color: string;
  isActive: boolean;
};

export type AccessPermission = {
  id: string;
  accessPointId: string;
  departmentId?: string;
  subDepartmentId?: string;
  sectionId?: string;
  role?: VolunteerRole;
  excludedVolunteerIds?: string[];
};

export type AccessLog = {
  id: string;
  volunteerId: string;
  accessPointId: string;
  status: AccessStatus;
  scannedAt: string;
};

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType: UserType;
  loginCode: string;
  hasLoginCode?: boolean;
  volunteerId?: string;
  campusId?: string;
  campusIds: string[];
  departmentId?: string;
  departmentIds: string[];
  subDepartmentId?: string;
  subDepartmentIds: string[];
  sectionId?: string;
  sectionIds: string[];
  pageAccess: string[];
  actionAccess: string[];
};

export type PortalNotification = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
};
