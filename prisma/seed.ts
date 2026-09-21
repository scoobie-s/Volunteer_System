import { PrismaClient } from "@prisma/client";
import { createLocalAccountIssuer } from "@better-auth/core/db";
import { hashLoginCode } from "../lib/credentials";
import { getPresetPermissionsForUserType } from "../lib/user-types";

const prisma = new PrismaClient();
const credentialIssuer = createLocalAccountIssuer("credential");

async function main() {
  const superAdminPermissions = getPresetPermissionsForUserType("SUPER_ADMIN");
  const platformAdminPermissions = getPresetPermissionsForUserType("PLATFORM_ADMIN");
  const sectionCoordinatorPermissions = getPresetPermissionsForUserType("SECTION_COORDINATOR");

  await prisma.accessLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.accessPermission.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.volunteer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.section.deleteMany();
  await prisma.subDepartment.deleteMany();
  await prisma.department.deleteMany();
  await prisma.accessPoint.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.campus.deleteMany();

  const campus = await prisma.campus.create({
    data: {
      name: "CRC Johannesburg",
      city: "Johannesburg",
    },
  });

  const worship = await prisma.department.create({
    data: {
      name: "Worship",
      campusId: campus.id,
    },
  });

  const guestExperience = await prisma.department.create({
    data: {
      name: "Guest Experience",
      campusId: campus.id,
    },
  });

  const music = await prisma.subDepartment.create({
    data: {
      name: "Music",
      departmentId: worship.id,
    },
  });

  const guestServices = await prisma.subDepartment.create({
    data: {
      name: "Guest Services",
      departmentId: guestExperience.id,
    },
  });

  const band = await prisma.section.create({
    data: {
      name: "Band",
      subDepartmentId: music.id,
    },
  });

  const hosts = await prisma.section.create({
    data: {
      name: "Hosts",
      subDepartmentId: guestServices.id,
    },
  });

  const ayanda = await prisma.volunteer.create({
    data: {
      fullName: "Ayanda Mokoena",
      phone: "+27 82 555 0101",
      email: "ayanda@crc.local",
      membershipStatus: "MEMBER",
      role: "SECTION_LEADER",
      availability: "BOTH",
      sectionId: band.id,
      sectionIds: [band.id],
      qrToken: "CRC-AYANDA-MOKOENA-DEMO01",
      notes: "Seeded section leader profile.",
      pastor: "Ps. Demo",
      zone: "North",
      campusPhysicalAddress: "CRC Johannesburg",
      accessPointIds: [],
    },
  });

  const thabo = await prisma.volunteer.create({
    data: {
      fullName: "Thabo Ndlovu",
      phone: "+27 82 555 0102",
      email: "thabo@crc.local",
      membershipStatus: "MEMBER",
      role: "VOLUNTEER",
      availability: "SUNDAY",
      sectionId: hosts.id,
      sectionIds: [hosts.id],
      qrToken: "CRC-THABO-NDLOVU-DEMO02",
      notes: "Seeded volunteer profile for scanner testing.",
      pastor: "Ps. Demo",
      zone: "Central",
      campusPhysicalAddress: "CRC Johannesburg",
      accessPointIds: [],
    },
  });

  const backstage = await prisma.accessPoint.create({
    data: {
      name: "Backstage",
      location: "Main Auditorium",
      campusId: campus.id,
      color: "#22c55e",
      isActive: true,
    },
  });

  await prisma.volunteer.update({
    where: { id: ayanda.id },
    data: { accessPointIds: [backstage.id] },
  });

  const sundayService = await prisma.event.create({
    data: {
      name: "Sunday Celebration",
      date: new Date("2026-08-30"),
      type: "SUNDAY",
      sundayService: "AM1",
      startTime: "08:00",
      endTime: "10:00",
      campusId: campus.id,
      allowDuplicate: false,
      isRecurring: true,
      recurringDays: ["SUNDAY"],
    },
  });

  await prisma.accessPermission.create({
    data: {
      accessPointId: backstage.id,
      sectionId: band.id,
    },
  });

  await prisma.attendance.create({
    data: {
      volunteerId: ayanda.id,
      eventId: sundayService.id,
      status: "PRESENT",
      scannedAt: new Date("2026-08-23T07:58:00.000Z"),
    },
  });

  await prisma.accessLog.create({
    data: {
      volunteerId: ayanda.id,
      accessPointId: backstage.id,
      status: "GRANTED",
      scannedAt: new Date("2026-08-23T08:02:00.000Z"),
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      name: "Local Super Admin",
      email: "admin@crc.local",
      emailVerified: true,
      passwordHash: hashLoginCode("1234"),
      role: "SUPER_ADMIN",
      userType: "SUPER_ADMIN",
      campusId: campus.id,
      campusIds: [campus.id],
      departmentIds: [worship.id, guestExperience.id],
      subDepartmentIds: [music.id, guestServices.id],
      sectionIds: [band.id, hosts.id],
      pageAccess: superAdminPermissions.pageAccess,
      actionAccess: superAdminPermissions.actionAccess,
    },
  });

  if (!ayanda.email) {
    throw new Error("The seeded section coordinator must have an email for their user account.");
  }

  const sectionCoordinator = await prisma.user.create({
    data: {
      name: ayanda.fullName,
      email: ayanda.email,
      emailVerified: true,
      passwordHash: hashLoginCode("2468"),
      role: "SECTION_LEADER",
      userType: "SECTION_COORDINATOR",
      volunteerId: ayanda.id,
      campusId: campus.id,
      campusIds: [campus.id],
      departmentId: worship.id,
      departmentIds: [worship.id],
      subDepartmentId: music.id,
      subDepartmentIds: [music.id],
      sectionId: band.id,
      sectionIds: [band.id],
      pageAccess: sectionCoordinatorPermissions.pageAccess,
      actionAccess: sectionCoordinatorPermissions.actionAccess,
    },
  });

  const platformAdmin = await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "platform-admin@crc.local",
      emailVerified: true,
      passwordHash: hashLoginCode("1357"),
      role: "ADMIN",
      userType: "PLATFORM_ADMIN",
      campusId: campus.id,
      campusIds: [campus.id],
      pageAccess: platformAdminPermissions.pageAccess,
      actionAccess: platformAdminPermissions.actionAccess,
    },
  });

  await prisma.account.createMany({
    data: [
      {
        accountId: superAdmin.id,
        providerId: "credential",
        issuer: credentialIssuer,
        userId: superAdmin.id,
        password: hashLoginCode("1234"),
      },
      {
        accountId: sectionCoordinator.id,
        providerId: "credential",
        issuer: credentialIssuer,
        userId: sectionCoordinator.id,
        password: hashLoginCode("2468"),
      },
      {
        accountId: platformAdmin.id,
        providerId: "credential",
        issuer: credentialIssuer,
        userId: platformAdmin.id,
        password: hashLoginCode("1357"),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        title: "Seed complete",
        detail: "Baseline CRC Johannesburg data loaded.",
      },
      {
        title: "Volunteer added",
        detail: ayanda.fullName,
      },
      {
        title: "Volunteer added",
        detail: thabo.fullName,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
