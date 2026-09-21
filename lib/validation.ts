import { z } from "zod";

export const volunteerSchema = z.object({
  fullName: z.string().min(3),
  phone: z.string().min(7),
  email: z.string().trim().pipe(z.union([z.email(), z.literal("")])).nullish().transform((value) => value ?? ""),
  membershipStatus: z.enum(["MEMBER", "NON_MEMBER", "NEW_COMER"]),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "DEPARTMENT_HEAD", "SECTION_LEADER", "VOLUNTEER"]),
  availability: z.enum(["SUNDAY", "THURSDAY", "BOTH"]),
  sectionId: z.string().min(1),
  sectionIds: z.array(z.string()).min(1, "Select at least one section.").default([]),
  notes: z.string().optional(),
  pastor: z.string().optional(),
  zone: z.string().optional(),
  campusPhysicalAddress: z.string().optional(),
  photoDataUrl: z.string().optional(),
  accessPointIds: z.array(z.string()).default([]),
});

export const eventSchema = z.object({
  name: z.string().min(3),
  date: z.string().min(1),
  type: z.enum(["REHEARSAL", "SUNDAY", "SPECIAL"]),
  sundayService: z.enum(["AM1", "AM2", "PM", "NONE"]),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  campusId: z.string().min(1),
  allowDuplicate: z.boolean(),
  isRecurring: z.boolean(),
  recurringDays: z
    .array(
      z.enum([
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ]),
    )
    .default([]),
});

export const accessPointSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  campusId: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
  color: z.string().regex(/^#([0-9a-fA-F]{6})$/, "Color must be a valid hex value."),
  isActive: z.boolean(),
  volunteerIds: z.array(z.string()).default([]),
  sectionIds: z.array(z.string()).default([]),
  excludedVolunteerIdsBySection: z.record(z.string(), z.array(z.string())).default({}),
});

export const accessPermissionSchema = z
  .object({
    accessPointId: z.string().min(1),
    departmentId: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
    subDepartmentId: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
    sectionId: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
    role: z
      .enum(["SUPER_ADMIN", "ADMIN", "DEPARTMENT_HEAD", "SECTION_LEADER", "VOLUNTEER"])
      .optional(),
  })
  .refine(
    (value) => Boolean(value.departmentId || value.subDepartmentId || value.sectionId || value.role),
    "At least one department, sub-department, section, or role is required.",
  );

export const campusSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
});

export const departmentSchema = z.object({
  name: z.string().min(2),
  campusId: z.string().min(1),
});

export const sectionSchema = z.object({
  name: z.string().min(2),
  subDepartmentId: z.string().min(1),
});

export const subDepartmentSchema = z.object({
  name: z.string().min(2),
  departmentId: z.string().min(1),
});

export const userSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.email().optional(),
    userType: z.enum([
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
      "CAMPUS_COORDINATOR",
      "DEPARTMENT_MANAGER",
      "SECTION_COORDINATOR",
      "SCANNER_OPERATOR",
      "ACCESS_MANAGER",
      "REPORT_VIEWER",
      "VOLUNTEER_PORTAL",
    ]),
    loginCode: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{4,12}$/.test(value), "Login code must contain digits only."),
    volunteerId: z.string().optional(),
    campusIds: z.array(z.string()).default([]),
    departmentIds: z.array(z.string()).default([]),
    subDepartmentIds: z.array(z.string()).default([]),
    sectionIds: z.array(z.string()).default([]),
    pageAccess: z.array(z.string()).default([]),
    actionAccess: z.array(z.string()).default([]),
  })
  .refine(
    (value) => Boolean(value.volunteerId || (value.name?.trim() && value.email?.trim())),
    "Provide a linked volunteer or enter both name and email.",
  );

export const attendanceScanSchema = z.object({
  mode: z.literal("attendance"),
  token: z.string().min(3),
  eventId: z.string().min(1),
});

export const accessScanSchema = z.object({
  mode: z.literal("access"),
  token: z.string().min(3),
  accessPointId: z.string().min(1),
});
