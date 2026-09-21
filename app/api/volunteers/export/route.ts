import { requireApiPermission } from "@/lib/auth";
import { getScopedSnapshot } from "@/lib/data";
import { formatEnum } from "@/lib/utils";

function escapeCsvValue(value: string | undefined) {
  const text = value ?? "";
  // Prevent spreadsheet applications from interpreting volunteer input as a formula.
  const safeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const auth = await requireApiPermission("Volunteer Hub", "Export");
  if (auth.error) return auth.error;

  const snapshot = await getScopedSnapshot(auth.user);
  const search = new URL(request.url).searchParams.get("search")?.trim().toLowerCase() ?? "";
  const volunteers = search
    ? snapshot.volunteers.filter((volunteer) => {
        const sectionIds = volunteer.sectionIds.length ? volunteer.sectionIds : [volunteer.sectionId];
        const sections = snapshot.sections.filter((section) => sectionIds.includes(section.id));
        const subDepartmentIds = new Set(sections.map((section) => section.subDepartmentId));
        const departments = snapshot.departments.filter((department) =>
          snapshot.subDepartments.some(
            (subDepartment) => subDepartmentIds.has(subDepartment.id) && subDepartment.departmentId === department.id,
          ),
        );
        const campuses = snapshot.campuses.filter((campus) => departments.some((department) => department.campusId === campus.id));
        return [
          volunteer.fullName,
          volunteer.email,
          volunteer.phone,
          volunteer.qrToken,
          ...sections.map((section) => section.name),
          ...departments.map((department) => department.name),
          ...campuses.map((campus) => campus.name),
        ].join(" ").toLowerCase().includes(search);
      })
    : snapshot.volunteers;
  const rows = volunteers.map((volunteer) => {
    const sectionIds = volunteer.sectionIds.length ? volunteer.sectionIds : [volunteer.sectionId];
    const sections = snapshot.sections.filter((section) => sectionIds.includes(section.id));
    const subDepartments = snapshot.subDepartments.filter((subDepartment) =>
      sections.some((section) => section.subDepartmentId === subDepartment.id),
    );
    const departments = snapshot.departments.filter((department) =>
      subDepartments.some((subDepartment) => subDepartment.departmentId === department.id),
    );
    const campuses = snapshot.campuses.filter((campus) =>
      departments.some((department) => department.campusId === campus.id),
    );

    return [
      volunteer.fullName,
      volunteer.email,
      volunteer.phone,
      formatEnum(volunteer.membershipStatus),
      formatEnum(volunteer.role),
      formatEnum(volunteer.availability),
      campuses.map((campus) => campus.name).join("; "),
      departments.map((department) => department.name).join("; "),
      subDepartments.map((subDepartment) => subDepartment.name).join("; "),
      sections.map((section) => section.name).join("; "),
      volunteer.pastor,
      volunteer.zone,
      volunteer.campusPhysicalAddress,
      volunteer.notes,
    ].map(escapeCsvValue).join(",");
  });

  const csv = [
    [
      "Full Name",
      "Email",
      "Phone",
      "Membership Status",
      "Role",
      "Availability",
      "Campuses",
      "Departments",
      "Sub-departments",
      "Sections",
      "Pastor",
      "Zone",
      "Campus Physical Address",
      "Notes",
    ].map(escapeCsvValue).join(","),
    ...rows,
  ].join("\r\n");

  // Excel honours this directive even when a computer's regional list separator is not a comma.
  return new Response(`\uFEFFsep=,\r\n${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="volunteers.csv"',
      "Cache-Control": "no-store",
    },
  });
}
