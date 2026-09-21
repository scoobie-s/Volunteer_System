import type { UserRole } from "@/lib/types";
import { getAllowedActionsForPage, normalizePermissionSelection } from "@/lib/permissions";

export const USER_TYPE_CONFIG = {
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Full system access across all areas, settings, and user management.",
    role: "SUPER_ADMIN" as UserRole,
    pageAccess: [
      "Dashboard",
      "Volunteer Hub",
      "Events",
      "Access",
      "Scanner",
      "Reports",
      "Departments",
      "Sub-Departments",
      "Sections",
      "Attendance",
      "Campuses",
      "Users",
    ],
    actions: ["View", "Create", "Edit", "Delete", "Scan", "Approve Access", "Manage Users", "Export"],
  },
  PLATFORM_ADMIN: {
    label: "Platform Admin",
    description: "Runs daily operations across volunteers, events, access, reporting, and users.",
    role: "ADMIN" as UserRole,
    pageAccess: [
      "Dashboard",
      "Volunteer Hub",
      "Events",
      "Access",
      "Scanner",
      "Reports",
      "Departments",
      "Sub-Departments",
      "Sections",
      "Attendance",
      "Campuses",
      "Users",
    ],
    actions: ["View", "Create", "Edit", "Delete", "Scan", "Approve Access", "Manage Users", "Export"],
  },
  CAMPUS_COORDINATOR: {
    label: "Campus Coordinator",
    description: "Manages volunteers, departments, sections, attendance, and events for one campus.",
    role: "ADMIN" as UserRole,
    pageAccess: ["Dashboard", "Volunteer Hub", "Events", "Scanner", "Reports", "Departments", "Sub-Departments", "Sections", "Attendance"],
    actions: ["View", "Create", "Edit", "Delete", "Scan", "Export"],
  },
  DEPARTMENT_MANAGER: {
    label: "Department Manager",
    description: "Leads a department with volunteer, section, event, and reporting access.",
    role: "DEPARTMENT_HEAD" as UserRole,
    pageAccess: ["Dashboard", "Volunteer Hub", "Events", "Scanner", "Reports", "Departments", "Sub-Departments", "Sections", "Attendance"],
    actions: ["View", "Create", "Edit", "Scan", "Export"],
  },
  SECTION_COORDINATOR: {
    label: "Section Coordinator",
    description: "Works inside a section for team updates, scanning, and attendance follow-up.",
    role: "SECTION_LEADER" as UserRole,
    pageAccess: ["Dashboard", "Volunteer Hub", "Events", "Scanner", "Attendance"],
    actions: ["View", "Create", "Edit", "Scan"],
  },
  SCANNER_OPERATOR: {
    label: "Scanner Operator",
    description: "Uses the scanner only for attendance and access check-ins.",
    role: "ADMIN" as UserRole,
    pageAccess: ["Dashboard", "Scanner"],
    actions: ["View", "Scan"],
  },
  ACCESS_MANAGER: {
    label: "Access Manager",
    description: "Maintains access points, permissions, and scan-related operations.",
    role: "ADMIN" as UserRole,
    pageAccess: ["Dashboard", "Access", "Scanner", "Reports"],
    actions: ["View", "Create", "Edit", "Delete", "Approve Access", "Scan", "Export"],
  },
  REPORT_VIEWER: {
    label: "Report Viewer",
    description: "Reviews dashboards, attendance, and reports without operational editing.",
    role: "ADMIN" as UserRole,
    pageAccess: ["Dashboard", "Reports", "Attendance"],
    actions: ["View", "Export"],
  },
  VOLUNTEER_PORTAL: {
    label: "Volunteer Portal",
    description: "Limited self-service access for a linked volunteer profile.",
    role: "VOLUNTEER" as UserRole,
    pageAccess: ["Dashboard", "Volunteer Hub", "Events", "Scanner"],
    actions: ["View", "Scan"],
  },
} as const;

export type UserType = keyof typeof USER_TYPE_CONFIG;

export function getUserTypeConfig(userType: string) {
  return USER_TYPE_CONFIG[userType as UserType] ?? USER_TYPE_CONFIG.PLATFORM_ADMIN;
}

export function getRoleForUserType(userType: string): UserRole {
  return getUserTypeConfig(userType).role;
}

export function getPresetPermissionsForUserType(userType: string) {
  const config = getUserTypeConfig(userType);

  return normalizePermissionSelection(
    [...config.pageAccess],
    config.pageAccess.flatMap((page) =>
      getAllowedActionsForPage(page)
        .filter((action) => (config.actions as readonly string[]).includes(action))
        .map((action) => `${page}::${action}`),
    ),
  );
}
