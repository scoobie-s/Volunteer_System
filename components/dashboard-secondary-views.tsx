"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CirclePlus, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { Button, ConfirmDialog, Input, Select } from "@/components/ui";
import { pushPortalNotification } from "@/lib/client-notifications";
import {
  getActionsForPage,
  getAllowedActionsForPage,
  getScopedActionKey,
  normalizePermissionSelection,
  PAGE_LABELS,
} from "@/lib/permissions";
import type { AccessLog, AccessPoint, Attendance, Campus, Department, Event, Section, SubDepartment, UserAccount, Volunteer } from "@/lib/types";
import {
  getPresetPermissionsForUserType,
  getRoleForUserType,
  getUserTypeConfig,
} from "@/lib/user-types";

function generateLoginCode() {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function toggleSelection(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
}

async function readResponseError(response: Response, fallback: string) {
  const raw = await response.text();

  if (!raw) {
    return fallback;
  }

  try {
    const payload = JSON.parse(raw) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

function togglePageAccessWithActions(current: { pageAccess: string[]; actionAccess: string[] }, page: string) {
  const pageEnabled = current.pageAccess.includes(page);
  if (pageEnabled) {
    return normalizePermissionSelection(
      current.pageAccess.filter((entry) => entry !== page),
      current.actionAccess.filter((entry) => !entry.startsWith(`${page}::`)),
    );
  }

  return normalizePermissionSelection(
    [...current.pageAccess, page],
    [...current.actionAccess, getScopedActionKey(page, "View")],
  );
}

type UserFormState = {
  name: string;
  email: string;
  userType: UserAccount["userType"];
  loginCode: string;
  volunteerId: string;
  campusIds: string[];
  departmentIds: string[];
  subDepartmentIds: string[];
  sectionIds: string[];
  pageAccess: string[];
  actionAccess: string[];
};

function describeScopeSelection(names: string[], emptyLabel: string) {
  if (names.length === 0) {
    return emptyLabel;
  }

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

function ScopeMultiSelect({
  label,
  helper,
  options,
  selectedIds,
  onToggle,
  emptyLabel,
}: {
  label: string;
  helper?: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <div className="rounded-[20px] border border-[var(--line)] bg-slate-50/80 p-4">
        <p className="text-sm text-slate-600">
          {describeScopeSelection(
            options.filter((option) => selectedIds.includes(option.id)).map((option) => option.name),
            emptyLabel,
          )}
        </p>
        {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
        {options.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 rounded-[16px] border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={() => onToggle(option.id)}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white/74 p-5">
      <h4 className="text-lg font-semibold tracking-[-0.03em] text-slate-900">{title}</h4>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-white/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-900">{value}</p>
    </div>
  );
}

function InlineDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[26px] border border-white/60 bg-[#f8fafc] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h5>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-3 text-slate-700"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="mt-4 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

function CollapsibleBlock({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-[20px] border border-[var(--line)] bg-slate-50/80 p-4"
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        <span>{title}</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function ReportsModalView({
  departments,
  sections,
  volunteers,
  attendances,
  events,
  campuses,
  accessPoints,
  accessLogs,
  canExport = true,
}: {
  departments: Department[];
  sections: Section[];
  volunteers: Volunteer[];
  attendances: Attendance[];
  events: Event[];
  campuses: Campus[];
  accessPoints: AccessPoint[];
  accessLogs: AccessLog[];
  canExport?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("consistency");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const systemSummary = useMemo(() => {
    const grantedAccess = accessLogs.filter((log) => log.status === "GRANTED").length;
    return {
      activeAccessPoints: accessPoints.filter((point) => point.isActive).length,
      accessRate: accessLogs.length ? Math.round((grantedAccess / accessLogs.length) * 100) : 0,
      grantedAccess,
    };
  }, [accessLogs, accessPoints]);

  const campusRows = useMemo(() => campuses.map((campus) => {
    const campusDepartments = departments.filter((department) => department.campusId === campus.id);
    const departmentIds = new Set(campusDepartments.map((department) => department.id));
    const campusSections = sections.filter((section) => section.departmentId && departmentIds.has(section.departmentId));
    const sectionIds = new Set(campusSections.map((section) => section.id));
    const volunteerCount = volunteers.filter((volunteer) =>
      (volunteer.sectionIds.length ? volunteer.sectionIds : [volunteer.sectionId]).some((sectionId) => sectionIds.has(sectionId)),
    ).length;
    return { campus, departmentCount: campusDepartments.length, sectionCount: campusSections.length, volunteerCount };
  }), [campuses, departments, sections, volunteers]);

  const recentAccessLogs = useMemo(
    () => [...accessLogs].sort((left, right) => right.scannedAt.localeCompare(left.scannedAt)).slice(0, 6),
    [accessLogs],
  );

  const rows = useMemo(() => {
    const filteredEventIds = events
      .filter((event) => {
        const matchesType = eventTypeFilter === "ALL" || event.type === eventTypeFilter;
        const matchesFrom = !dateFrom || event.date >= dateFrom;
        const matchesTo = !dateTo || event.date <= dateTo;
        return matchesType && matchesFrom && matchesTo;
      })
      .map((event) => event.id);

    const mapped = departments.map((department) => {
      const departmentSections = sections.filter((section) => section.departmentId === department.id);
      const sectionIds = departmentSections.map((section) => section.id);
      const team = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId));
      const logs = attendances.filter((attendance) =>
        team.some((member) => member.id === attendance.volunteerId) &&
        filteredEventIds.includes(attendance.eventId),
      );

      return {
        id: department.id,
        name: department.name,
        sectionCount: departmentSections.length,
        volunteerCount: team.length,
        attendanceCount: logs.length,
        consistency: team.length ? Math.round((logs.length / team.length) * 100) : 0,
      };
    });

    return mapped
      .filter(
        (row) =>
          row.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (departmentFilter === "ALL" || row.id === departmentFilter),
      )
      .sort((left, right) => {
        if (sortBy === "name") return left.name.localeCompare(right.name);
        if (sortBy === "volunteers") return right.volunteerCount - left.volunteerCount;
        if (sortBy === "attendance") return right.attendanceCount - left.attendanceCount;
        return right.consistency - left.consistency;
      });
  }, [attendances, dateFrom, dateTo, departmentFilter, departments, eventTypeFilter, events, searchTerm, sections, sortBy, volunteers]);

  const absenteeRows = useMemo(() => {
    const filteredEventIds = events
      .filter((event) => {
        const matchesType = eventTypeFilter === "ALL" || event.type === eventTypeFilter;
        const matchesFrom = !dateFrom || event.date >= dateFrom;
        const matchesTo = !dateTo || event.date <= dateTo;
        return matchesType && matchesFrom && matchesTo;
      })
      .map((event) => event.id);

    return volunteers
      .map((volunteer) => {
        const section = sections.find((entry) => entry.id === volunteer.sectionId);
        const department = departments.find((entry) => entry.id === section?.departmentId);
        const hasAttendance = attendances.some(
          (entry) => entry.volunteerId === volunteer.id && filteredEventIds.includes(entry.eventId),
        );

        return {
          id: volunteer.id,
          fullName: volunteer.fullName,
          departmentId: department?.id ?? "",
          departmentName: department?.name ?? "Department",
          absent: !hasAttendance,
        };
      })
      .filter((row) => row.absent)
      .filter((row) => departmentFilter === "ALL" || row.departmentId === departmentFilter);
  }, [attendances, dateFrom, dateTo, departmentFilter, departments, eventTypeFilter, events, sections, volunteers]);

  function exportCsv() {
    const rowsToWrite = [
      ["Department", "Sections", "Volunteers", "Logs", "Consistency"].join(","),
      ...rows.map((row) => [row.name, row.sectionCount, row.volunteerCount, row.attendanceCount, `${row.consistency}%`].join(",")),
    ];
    const blob = new Blob([rowsToWrite.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "department-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) return;

    popup.document.write(`
      <html><head><title>Department Report</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">
      <h1>Department Attendance and Consistency</h1>
      <table border="1" cellspacing="0" cellpadding="8" style="border-collapse: collapse; width: 100%;">
        <thead><tr><th>Department</th><th>Sections</th><th>Volunteers</th><th>Logs</th><th>Consistency</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td>${row.name}</td><td>${row.sectionCount}</td><td>${row.volunteerCount}</td><td>${row.attendanceCount}</td><td>${row.consistency}%</td></tr>`).join("")}</tbody>
      </table>
      </body></html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Volunteers" value={volunteers.length} />
        <Stat label="Departments" value={departments.length} />
        <Stat label="Sections" value={sections.length} />
        <Stat label="Attendance Logs" value={rows.reduce((total, row) => total + row.attendanceCount, 0)} />
        <Stat label="Active Access Points" value={systemSummary.activeAccessPoints} />
        <Stat label="Access Granted" value={`${systemSummary.accessRate}%`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel title="Campus Coverage">
          <div className="space-y-3">
            {campusRows.map((row) => (
              <div key={row.campus.id} className="grid grid-cols-[1.2fr_repeat(3,0.7fr)] gap-3 rounded-[18px] border border-[var(--line)] bg-slate-50/80 px-4 py-3 text-sm">
                <div><p className="font-medium text-slate-900">{row.campus.name}</p><p className="text-xs text-slate-500">{row.campus.city}</p></div>
                <div><p className="text-xs text-slate-500">Departments</p><p className="font-semibold">{row.departmentCount}</p></div>
                <div><p className="text-xs text-slate-500">Sections</p><p className="font-semibold">{row.sectionCount}</p></div>
                <div><p className="text-xs text-slate-500">Volunteers</p><p className="font-semibold">{row.volunteerCount}</p></div>
              </div>
            ))}
            {!campusRows.length ? <p className="text-sm text-slate-500">No campus data is available in your scope.</p> : null}
          </div>
        </Panel>
        <Panel title="Access Control Health">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[18px] bg-emerald-50 p-4"><p className="text-sm text-emerald-800">Granted scans</p><p className="mt-2 text-3xl font-semibold text-emerald-950">{systemSummary.grantedAccess}</p></div>
            <div className="rounded-[18px] bg-slate-50 p-4"><p className="text-sm text-slate-600">Total access scans</p><p className="mt-2 text-3xl font-semibold text-slate-900">{accessLogs.length}</p></div>
            <p className="text-xs leading-5 text-slate-500">{systemSummary.activeAccessPoints} active access point{systemSummary.activeAccessPoints === 1 ? "" : "s"} are currently available to scanners.</p>
          </div>
        </Panel>
      </div>
      <Panel title="Department Reporting">
        {canExport ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" onClick={exportCsv}>Export CSV</Button>
            <Button type="button" onClick={exportPdf}>Print / Save PDF</Button>
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            placeholder="Search departments"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="ALL">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          <Select value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value)}>
            <option value="ALL">All event types</option>
            <option value="SUNDAY">Sunday</option>
            <option value="REHEARSAL">Rehearsal</option>
            <option value="SPECIAL">Special</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="consistency">Sort by consistency</option>
            <option value="volunteers">Sort by volunteers</option>
            <option value="attendance">Sort by attendance logs</option>
            <option value="name">Sort by name</option>
          </Select>
        </div>
        <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white/88">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <p>Department</p>
            <p>Sections</p>
            <p>Volunteers</p>
            <p>Logs</p>
            <p>Consistency</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4">
                <div>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="mt-1 text-sm text-slate-500">Volunteer operations summary</p>
                </div>
                <p className="text-sm text-slate-600">{row.sectionCount}</p>
                <p className="text-sm text-slate-600">{row.volunteerCount}</p>
                <p className="text-sm text-slate-600">{row.attendanceCount}</p>
                <p className="text-sm font-medium text-slate-900">{row.consistency}%</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="Absentee Tracking">
        <div className="space-y-3">
          {absenteeRows.length ? (
            absenteeRows.map((row) => (
              <div key={row.id} className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 px-4 py-3">
                <p className="font-medium text-slate-900">{row.fullName}</p>
                <p className="mt-1 text-sm text-slate-500">{row.departmentName}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 px-4 py-6 text-sm text-slate-500">
              No absentees found for the current filters.
            </div>
          )}
        </div>
      </Panel>
      <Panel title="Recent Access Activity">
        <div className="space-y-3">
          {recentAccessLogs.map((log) => {
            const volunteer = volunteers.find((entry) => entry.id === log.volunteerId);
            const accessPoint = accessPoints.find((entry) => entry.id === log.accessPointId);
            return <div key={log.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--line)] bg-slate-50/80 px-4 py-3"><div><p className="font-medium text-slate-900">{volunteer?.fullName ?? "Volunteer"}</p><p className="text-sm text-slate-500">{accessPoint?.name ?? "Access point"} · {new Date(log.scannedAt).toLocaleString()}</p></div><span className={log.status === "GRANTED" ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700"}>{log.status === "GRANTED" ? "Granted" : "Denied"}</span></div>;
          })}
          {!recentAccessLogs.length ? <p className="text-sm text-slate-500">No access scans have been recorded yet.</p> : null}
        </div>
      </Panel>
    </div>
  );
}

export function DatabaseModalView({
  campuses,
  departments,
  sections,
  volunteers,
}: {
  campuses: Campus[];
  departments: Department[];
  sections: Section[];
  volunteers: Volunteer[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const rows = useMemo(() => {
    return campuses
      .map((campus) => {
        const campusDepartments = departments.filter((department) => department.campusId === campus.id);
        const departmentIds = campusDepartments.map((department) => department.id);
        const campusSections = sections.filter(
          (section) => Boolean(section.departmentId) && departmentIds.includes(section.departmentId as string),
        );
        const sectionIds = campusSections.map((section) => section.id);
        const campusVolunteers = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId));

        return {
          ...campus,
          departmentCount: campusDepartments.length,
          sectionCount: campusSections.length,
          volunteerCount: campusVolunteers.length,
          departmentNames: campusDepartments.map((department) => department.name),
        };
      })
      .filter(
        (campus) =>
          campus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          campus.city.toLowerCase().includes(searchTerm.toLowerCase()),
      );
  }, [campuses, departments, searchTerm, sections, volunteers]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Campuses" value={campuses.length} />
        <Stat label="Departments" value={departments.length} />
        <Stat label="Sections" value={sections.length} />
        <Stat label="Volunteers" value={volunteers.length} />
      </div>
      <Panel title="Campus Database">
        <Input
          placeholder="Search campuses or cities"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {rows.map((campus) => (
            <div key={campus.id} className="rounded-[22px] border border-[var(--line)] bg-slate-50/90 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-[-0.03em] text-slate-900">{campus.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{campus.city}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {campus.id}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Stat label="Departments" value={campus.departmentCount} />
                <Stat label="Sections" value={campus.sectionCount} />
                <Stat label="Volunteers" value={campus.volunteerCount} />
              </div>
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Department Structure</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {campus.departmentNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-slate-600"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function DepartmentsModalView({
  campuses,
  departments,
  setDepartments,
  subDepartments,
  setSubDepartments,
  sections,
  setSections,
  volunteers,
}: {
  campuses: Campus[];
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  subDepartments: SubDepartment[];
  setSubDepartments: React.Dispatch<React.SetStateAction<SubDepartment[]>>;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  volunteers: Volunteer[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [campusFilter, setCampusFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    campusId: campuses[0]?.id ?? "",
  });

  async function refreshDepartmentData() {
    const [departmentsResponse, subDepartmentsResponse, sectionsResponse] = await Promise.all([
      fetch("/api/departments"),
      fetch("/api/sub-departments"),
      fetch("/api/sections"),
    ]);

    if (!departmentsResponse.ok || !subDepartmentsResponse.ok || !sectionsResponse.ok) {
      throw new Error("Unable to refresh department data.");
    }

    const [nextDepartments, nextSubDepartments, nextSections] = await Promise.all([
      departmentsResponse.json() as Promise<Department[]>,
      subDepartmentsResponse.json() as Promise<SubDepartment[]>,
      sectionsResponse.json() as Promise<Section[]>,
    ]);

    setDepartments(nextDepartments);
    setSubDepartments(nextSubDepartments);
    setSections(nextSections);
  }

  const rows = useMemo(() => {
    return departments
      .map((department) => {
        const campus = campuses.find((item) => item.id === department.campusId);
        const departmentSubDepartments = subDepartments.filter(
          (subDepartment) => subDepartment.departmentId === department.id,
        );
        const departmentSections = sections.filter((section) => section.departmentId === department.id);
        const sectionIds = departmentSections.map((section) => section.id);
        const team = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId));
        const leaders = team.filter(
          (volunteer) =>
            volunteer.role === "DEPARTMENT_HEAD" || volunteer.role === "SECTION_LEADER",
        );

        return {
          id: department.id,
          name: department.name,
          campusId: department.campusId,
          campusName: campus?.name ?? "Campus",
          subDepartmentCount: departmentSubDepartments.length,
          sectionCount: departmentSections.length,
          volunteerCount: team.length,
          leaderCount: leaders.length,
        };
      })
      .filter((row) => {
        const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCampus = campusFilter === "ALL" || row.campusName === campusFilter;
        return matchesSearch && matchesCampus;
      });
  }, [campusFilter, campuses, departments, searchTerm, sections, subDepartments, volunteers]);

  return (
    <Panel title="Department Breakdown">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1">
          <Input
            placeholder="Search departments"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={campusFilter} onChange={(event) => setCampusFilter(event.target.value)}>
            <option value="ALL">All campuses</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.name}>
                {campus.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="h-11 w-11 rounded-full px-0"
          aria-label="Add department"
        >
          <CirclePlus className="h-4.5 w-4.5" />
        </Button>
      </div>
      <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white/88">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <p>Department</p>
          <p>Campus</p>
          <p>Sub-Depts</p>
          <p>Sections</p>
          <p>Volunteers</p>
          <p>Leaders</p>
          <p className="text-right">Actions</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4">
              <p className="font-medium text-slate-900">{row.name}</p>
              <p className="text-sm text-slate-600">{row.campusName}</p>
              <p className="text-sm text-slate-600">{row.subDepartmentCount}</p>
              <p className="text-sm text-slate-600">{row.sectionCount}</p>
              <p className="text-sm text-slate-600">{row.volunteerCount}</p>
              <p className="text-sm text-slate-600">{row.leaderCount}</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setEditingDepartmentId(row.id);
                    setForm({ name: row.name, campusId: row.campusId });
                  }}
                  className="rounded-full border border-[var(--line)] bg-white p-2 text-slate-700 transition hover:bg-slate-50"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={deletingDepartmentId === row.id}
                  onClick={() => setPendingDelete({ id: row.id, name: row.name })}
                  className="rounded-full border border-[var(--line)] bg-white p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-4 text-sm text-rose-600">{errorMessage}</p>
      ) : null}
      {showCreateForm ? (
        <InlineDialog title="Add Department" onClose={() => setShowCreateForm(false)}>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Add a new volunteer department and link it directly to the correct campus.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Department Name
                </label>
                <Input
                  placeholder="Enter department name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Campus</label>
                <Select
                  value={form.campusId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, campusId: event.target.value }))
                  }
                >
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={isCreating}
              onClick={async () => {
                setErrorMessage(null);
                setIsCreating(true);
                const response = await fetch("/api/departments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });

                if (response.ok) {
                  await refreshDepartmentData();
                  const campusName = campuses.find((campus) => campus.id === form.campusId)?.name ?? "Assigned campus";
                  pushPortalNotification({
                    title: "Department added",
                    detail: `${form.name} • ${campusName}`,
                  });
                  setForm({ name: "", campusId: campuses[0]?.id ?? "" });
                  setShowCreateForm(false);
                } else {
                  const result = (await response.json()) as { error?: string };
                  setErrorMessage(result.error ?? "Unable to create department.");
                }

                setIsCreating(false);
              }}
            >
              {isCreating ? "Saving..." : "Create Department"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {editingDepartmentId ? (
        <InlineDialog
          title="Edit Department"
          onClose={() => {
            setEditingDepartmentId(null);
            setForm({ name: "", campusId: campuses[0]?.id ?? "" });
          }}
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Update the department name or move it to a different campus.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Department Name
                </label>
                <Input
                  placeholder="Enter department name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Campus</label>
                <Select
                  value={form.campusId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, campusId: event.target.value }))
                  }
                >
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setEditingDepartmentId(null);
                setForm({ name: "", campusId: campuses[0]?.id ?? "" });
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={async () => {
                setErrorMessage(null);
                setIsUpdating(true);

                const response = await fetch(`/api/departments/${editingDepartmentId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });

                if (response.ok) {
                  await refreshDepartmentData();
                  setEditingDepartmentId(null);
                  setForm({ name: "", campusId: campuses[0]?.id ?? "" });
                } else {
                  const result = (await response.json()) as { error?: string };
                  setErrorMessage(result.error ?? "Unable to update department.");
                }

                setIsUpdating(false);
              }}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete Department"
          message={`Delete ${pendingDelete.name}? This will also remove any empty sections under it.`}
          isLoading={deletingDepartmentId === pendingDelete.id}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            setErrorMessage(null);
            setDeletingDepartmentId(pendingDelete.id);

            const response = await fetch(`/api/departments/${pendingDelete.id}`, {
              method: "DELETE",
            });

            if (response.ok) {
              await refreshDepartmentData();
              setPendingDelete(null);
            } else {
              const result = (await response.json()) as { error?: string };
              setErrorMessage(result.error ?? "Unable to delete department.");
            }

            setDeletingDepartmentId(null);
          }}
        />
      ) : null}
    </Panel>
  );
}

export function SectionsModalView({
  departments,
  subDepartments,
  sections,
  setSections,
  volunteers,
}: {
  departments: Department[];
  subDepartments: SubDepartment[];
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  volunteers: Volunteer[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    subDepartmentId: subDepartments[0]?.id ?? "",
  });

  async function refreshSectionData() {
    const response = await fetch("/api/sections");

    if (!response.ok) {
      throw new Error("Unable to refresh section data.");
    }

    const nextSections = (await response.json()) as Section[];
    setSections(nextSections);
  }

  const rows = useMemo(() => {
    return sections
      .map((section) => {
        const subDepartment = subDepartments.find((item) => item.id === section.subDepartmentId);
        const department = departments.find((item) => item.id === subDepartment?.departmentId);
        const team = volunteers.filter((volunteer) => volunteer.sectionId === section.id);
        const leaders = team.filter((volunteer) => volunteer.role === "SECTION_LEADER");
        return {
          id: section.id,
          name: section.name,
          subDepartmentId: section.subDepartmentId,
          subDepartmentName: subDepartment?.name ?? "Sub-Department",
          departmentId: department?.id ?? "",
          departmentName: department?.name ?? "Department",
          volunteerCount: team.length,
          leaderCount: leaders.length,
        };
      })
      .filter((row) => {
        const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment =
          departmentFilter === "ALL" || row.departmentName === departmentFilter;
        return matchesSearch && matchesDepartment;
      });
  }, [departmentFilter, departments, searchTerm, sections, subDepartments, volunteers]);

  return (
    <Panel title="Section Breakdown">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1">
          <Input
            placeholder="Search sections"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="ALL">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="h-11 w-11 rounded-full px-0"
          aria-label="Add section"
        >
          <CirclePlus className="h-4.5 w-4.5" />
        </Button>
      </div>
      <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white/88">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_0.9fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <p>Section</p>
          <p>Sub-Department</p>
          <p>Department</p>
          <p>Volunteers</p>
          <p>Leaders</p>
          <p className="text-right">Actions</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.9fr_0.9fr] gap-3 px-4 py-4">
              <p className="font-medium text-slate-900">{row.name}</p>
              <p className="text-sm text-slate-600">{row.subDepartmentName}</p>
              <p className="text-sm text-slate-600">{row.departmentName}</p>
              <p className="text-sm text-slate-600">{row.volunteerCount}</p>
              <p className="text-sm text-slate-600">{row.leaderCount}</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setEditingSectionId(row.id);
                    setForm({ name: row.name, subDepartmentId: row.subDepartmentId });
                  }}
                  className="rounded-full border border-[var(--line)] bg-white p-2 text-slate-700 transition hover:bg-slate-50"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={deletingSectionId === row.id}
                  onClick={() => setPendingDelete({ id: row.id, name: row.name })}
                  className="rounded-full border border-[var(--line)] bg-white p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-4 text-sm text-rose-600">{errorMessage}</p>
      ) : null}
      {showCreateForm ? (
        <InlineDialog title="Add Section" onClose={() => setShowCreateForm(false)}>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Add a new volunteer section and link it to the correct sub-department.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Section Name
                </label>
                <Input
                  placeholder="Enter section name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sub-Department
                </label>
                <Select
                  value={form.subDepartmentId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subDepartmentId: event.target.value }))
                  }
                >
                  {subDepartments.map((subDepartment) => (
                    <option key={subDepartment.id} value={subDepartment.id}>
                      {subDepartment.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={isCreating}
              onClick={async () => {
                setErrorMessage(null);
                setIsCreating(true);
                const response = await fetch("/api/sections", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });

                if (response.ok) {
                  await refreshSectionData();
                  setForm({ name: "", subDepartmentId: subDepartments[0]?.id ?? "" });
                  setShowCreateForm(false);
                } else {
                  const result = (await response.json()) as { error?: string };
                  setErrorMessage(result.error ?? "Unable to create section.");
                }

                setIsCreating(false);
              }}
            >
              {isCreating ? "Saving..." : "Create Section"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {editingSectionId ? (
        <InlineDialog
          title="Edit Section"
          onClose={() => {
            setEditingSectionId(null);
            setForm({ name: "", subDepartmentId: subDepartments[0]?.id ?? "" });
          }}
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Update the section name or move it to a different sub-department.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Section Name
                </label>
                <Input
                  placeholder="Enter section name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sub-Department
                </label>
                <Select
                  value={form.subDepartmentId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subDepartmentId: event.target.value }))
                  }
                >
                  {subDepartments.map((subDepartment) => (
                    <option key={subDepartment.id} value={subDepartment.id}>
                      {subDepartment.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setEditingSectionId(null);
                setForm({ name: "", subDepartmentId: subDepartments[0]?.id ?? "" });
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={async () => {
                setErrorMessage(null);
                setIsUpdating(true);

                const response = await fetch(`/api/sections/${editingSectionId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });

                if (response.ok) {
                  await refreshSectionData();
                  setEditingSectionId(null);
                  setForm({ name: "", subDepartmentId: subDepartments[0]?.id ?? "" });
                } else {
                  const result = (await response.json()) as { error?: string };
                  setErrorMessage(result.error ?? "Unable to update section.");
                }

                setIsUpdating(false);
              }}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete Section"
          message={`Delete ${pendingDelete.name}?`}
          isLoading={deletingSectionId === pendingDelete.id}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            setErrorMessage(null);
            setDeletingSectionId(pendingDelete.id);

            const response = await fetch(`/api/sections/${pendingDelete.id}`, {
              method: "DELETE",
            });

            if (response.ok) {
              await refreshSectionData();
              setPendingDelete(null);
            } else {
              const result = (await response.json()) as { error?: string };
              setErrorMessage(result.error ?? "Unable to delete section.");
            }

            setDeletingSectionId(null);
          }}
        />
      ) : null}
    </Panel>
  );
}

export function SubDepartmentsModalView({
  departments,
  subDepartments,
  setSubDepartments,
  sections,
  setSections,
  volunteers,
}: {
  departments: Department[];
  subDepartments: SubDepartment[];
  setSubDepartments: React.Dispatch<React.SetStateAction<SubDepartment[]>>;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  volunteers: Volunteer[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSubDepartmentId, setEditingSubDepartmentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingSubDepartmentId, setDeletingSubDepartmentId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    departmentId: departments[0]?.id ?? "",
  });

  async function refreshSubDepartmentData() {
    const [subDepartmentsResponse, sectionsResponse] = await Promise.all([
      fetch("/api/sub-departments"),
      fetch("/api/sections"),
    ]);

    if (!subDepartmentsResponse.ok || !sectionsResponse.ok) {
      throw new Error("Unable to refresh sub-department data.");
    }

    const [nextSubDepartments, nextSections] = await Promise.all([
      subDepartmentsResponse.json() as Promise<SubDepartment[]>,
      sectionsResponse.json() as Promise<Section[]>,
    ]);

    setSubDepartments(nextSubDepartments);
    setSections(nextSections);
  }

  const rows = useMemo(() => {
    return subDepartments
      .map((subDepartment) => {
        const department = departments.find((item) => item.id === subDepartment.departmentId);
        const subDepartmentSections = sections.filter((section) => section.subDepartmentId === subDepartment.id);
        const sectionIds = subDepartmentSections.map((section) => section.id);
        const team = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId));
        const leaders = team.filter(
          (volunteer) =>
            volunteer.role === "DEPARTMENT_HEAD" || volunteer.role === "SECTION_LEADER",
        );

        return {
          id: subDepartment.id,
          name: subDepartment.name,
          departmentId: subDepartment.departmentId,
          departmentName: department?.name ?? "Department",
          sectionCount: subDepartmentSections.length,
          volunteerCount: team.length,
          leaderCount: leaders.length,
        };
      })
      .filter((row) => {
        const matchesSearch = row.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDepartment = departmentFilter === "ALL" || row.departmentName === departmentFilter;
        return matchesSearch && matchesDepartment;
      });
  }, [departmentFilter, departments, searchTerm, sections, subDepartments, volunteers]);

  return (
    <Panel title="Sub-Department Breakdown">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1">
          <Input
            placeholder="Search sub-departments"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="ALL">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="h-11 w-11 rounded-full px-0"
          aria-label="Add sub-department"
        >
          <CirclePlus className="h-4.5 w-4.5" />
        </Button>
      </div>
      <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white/88">
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <p>Sub-Department</p>
          <p>Department</p>
          <p>Sections</p>
          <p>Volunteers</p>
          <p>Leaders</p>
          <p className="text-right">Actions</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-4 py-4">
              <p className="font-medium text-slate-900">{row.name}</p>
              <p className="text-sm text-slate-600">{row.departmentName}</p>
              <p className="text-sm text-slate-600">{row.sectionCount}</p>
              <p className="text-sm text-slate-600">{row.volunteerCount}</p>
              <p className="text-sm text-slate-600">{row.leaderCount}</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setEditingSubDepartmentId(row.id);
                    setForm({ name: row.name, departmentId: row.departmentId });
                  }}
                  className="rounded-full border border-[var(--line)] bg-white p-2 text-slate-700 transition hover:bg-slate-50"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={deletingSubDepartmentId === row.id}
                  onClick={() => setPendingDelete({ id: row.id, name: row.name })}
                  className="rounded-full border border-[var(--line)] bg-white p-2 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {errorMessage ? <p className="mt-4 text-sm text-rose-600">{errorMessage}</p> : null}
      {showCreateForm ? (
        <InlineDialog title="Add Sub-Department" onClose={() => setShowCreateForm(false)}>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Add a sub-department under the correct department so sections can be grouped accurately.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Sub-Department Name</label>
                <Input
                  placeholder="Enter sub-department name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
                <Select
                  value={form.departmentId}
                  onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={isCreating}
              onClick={async () => {
                setErrorMessage(null);
                setIsCreating(true);
                const response = await fetch("/api/sub-departments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });

                if (response.ok) {
                  await refreshSubDepartmentData();
                  pushPortalNotification({
                    title: "Sub-department added",
                    detail: form.name,
                  });
                  setForm({ name: "", departmentId: departments[0]?.id ?? "" });
                  setShowCreateForm(false);
                } else {
                  const result = (await response.json()) as { error?: string };
                  setErrorMessage(result.error ?? "Unable to create sub-department.");
                }

                setIsCreating(false);
              }}
            >
              {isCreating ? "Saving..." : "Create Sub-Department"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {editingSubDepartmentId ? (
        <InlineDialog
          title="Edit Sub-Department"
          onClose={() => {
            setEditingSubDepartmentId(null);
            setForm({ name: "", departmentId: departments[0]?.id ?? "" });
          }}
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Update the sub-department name or move it to a different department.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Sub-Department Name</label>
                <Input
                  placeholder="Enter sub-department name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
                <Select
                  value={form.departmentId}
                  onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setEditingSubDepartmentId(null);
                setForm({ name: "", departmentId: departments[0]?.id ?? "" });
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={async () => {
                setErrorMessage(null);
                setIsUpdating(true);

                const response = await fetch(`/api/sub-departments/${editingSubDepartmentId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(form),
                });

                if (response.ok) {
                  await refreshSubDepartmentData();
                  setEditingSubDepartmentId(null);
                  setForm({ name: "", departmentId: departments[0]?.id ?? "" });
                } else {
                  const result = (await response.json()) as { error?: string };
                  setErrorMessage(result.error ?? "Unable to update sub-department.");
                }

                setIsUpdating(false);
              }}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete Sub-Department"
          message={`Delete ${pendingDelete.name}? This will also remove any empty sections under it.`}
          isLoading={deletingSubDepartmentId === pendingDelete.id}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            setErrorMessage(null);
            setDeletingSubDepartmentId(pendingDelete.id);

            const response = await fetch(`/api/sub-departments/${pendingDelete.id}`, {
              method: "DELETE",
            });

            if (response.ok) {
              await refreshSubDepartmentData();
              setPendingDelete(null);
            } else {
              const result = (await response.json()) as { error?: string };
              setErrorMessage(result.error ?? "Unable to delete sub-department.");
            }

            setDeletingSubDepartmentId(null);
          }}
        />
      ) : null}
    </Panel>
  );
}

export function AttendanceModalView({
  attendances,
  events,
  volunteers,
  sections,
  departments,
  totalAttendances,
  viewerVolunteerId,
}: {
  attendances: Attendance[];
  events: Event[];
  volunteers: Volunteer[];
  sections: Section[];
  departments: Department[];
  totalAttendances: number;
  viewerVolunteerId?: string;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedAttendances, setLoadedAttendances] = useState(attendances);
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    setLoadedAttendances(attendances);
    setCurrentPage(1);
  }, [attendances]);

  useEffect(() => {
    if (currentPage === 1) return;
    const controller = new AbortController();
    setIsPageLoading(true);
    void fetch(`/api/attendance?page=${currentPage}&pageSize=50`, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load attendance.");
        const payload = (await response.json()) as { items: Attendance[] };
        setLoadedAttendances(payload.items);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setIsRefreshing(false);
        }
      })
      .finally(() => setIsPageLoading(false));

    return () => controller.abort();
  }, [currentPage]);

  const rows = useMemo(() => {
    return loadedAttendances
      .map((entry) => {
        const event = events.find((item) => item.id === entry.eventId);
        const volunteer = volunteers.find((item) => item.id === entry.volunteerId);
        const section = sections.find((item) => item.id === volunteer?.sectionId);
        const department = departments.find((item) => item.id === section?.departmentId);
        return {
          id: entry.id,
          volunteerId: entry.volunteerId,
          volunteerName: volunteer?.fullName ?? "Volunteer",
          eventLabel: event ? `${event.name} ${event.sundayService}` : "Event",
          eventType: event?.type ?? "SPECIAL",
          departmentId: department?.id ?? "",
          departmentName: department?.name ?? "Department",
          eventDate: event?.date ?? "",
          status: entry.status,
          scannedAt: entry.scannedAt,
        };
      })
      .filter((row) => {
        const matchesSearch =
          row.volunteerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.eventLabel.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || row.status === statusFilter;
        const matchesDepartment = departmentFilter === "ALL" || row.departmentId === departmentFilter;
        const matchesEventType = eventTypeFilter === "ALL" || row.eventType === eventTypeFilter;
        const matchesVolunteer = !viewerVolunteerId || row.volunteerId === viewerVolunteerId;
        const matchesFrom = !dateFrom || (row.eventDate && row.eventDate >= dateFrom);
        const matchesTo = !dateTo || (row.eventDate && row.eventDate <= dateTo);
        return (
          matchesSearch &&
          matchesStatus &&
          matchesDepartment &&
          matchesEventType &&
          matchesVolunteer &&
          matchesFrom &&
          matchesTo
        );
      })
      .sort((left, right) => right.scannedAt.localeCompare(left.scannedAt));
  }, [dateFrom, dateTo, departments, departmentFilter, eventTypeFilter, events, loadedAttendances, searchTerm, sections, statusFilter, viewerVolunteerId, volunteers]);

  function exportCsv() {
    const lines = [
      ["Volunteer", "Department", "Event", "Event Type", "Status", "Event Date", "Scanned At"].join(","),
      ...rows.map((row) =>
        [
          row.volunteerName,
          row.departmentName,
          row.eventLabel,
          row.eventType,
          row.status,
          row.eventDate,
          row.scannedAt,
        ]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <head><title>Attendance Report</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h1>Attendance Report</h1>
          <table border="1" cellspacing="0" cellpadding="8" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th>Volunteer</th>
                <th>Department</th>
                <th>Event</th>
                <th>Event Type</th>
                <th>Status</th>
                <th>Event Date</th>
                <th>Scanned At</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) => `<tr>
                    <td>${row.volunteerName}</td>
                    <td>${row.departmentName}</td>
                    <td>${row.eventLabel}</td>
                    <td>${row.eventType}</td>
                    <td>${row.status}</td>
                    <td>${row.eventDate}</td>
                    <td>${row.scannedAt}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Attendance Logs" value={rows.length} />
        <Stat label="Present" value={rows.filter((item) => item.status === "PRESENT").length} />
        <Stat label="Duplicate" value={rows.filter((item) => item.status === "DUPLICATE").length} />
        <Stat label="Unique Volunteers" value={new Set(rows.map((item) => item.volunteerId)).size} />
      </div>
      <Panel title="Attendance History">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              router.refresh();
              window.setTimeout(() => setIsRefreshing(false), 900);
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button type="button" onClick={exportCsv}>Export CSV</Button>
          <Button type="button" onClick={exportPdf}>Export PDF</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Input
            placeholder="Search volunteers or events"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">All statuses</option>
            <option value="PRESENT">Present</option>
            <option value="DUPLICATE">Duplicate</option>
            <option value="DENIED">Denied</option>
          </Select>
          {!viewerVolunteerId ? (
            <Select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="ALL">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Select value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value)}>
            <option value="ALL">All event types</option>
            <option value="SUNDAY">Sunday</option>
            <option value="REHEARSAL">Rehearsal</option>
            <option value="SPECIAL">Special</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
        <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white/88">
          <div className="grid grid-cols-[1.1fr_1.1fr_0.7fr_1fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <p>Volunteer</p>
            <p>Event</p>
            <p>Status</p>
            <p>Scan Time</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-[1.1fr_1.1fr_0.7fr_1fr] gap-3 px-4 py-4">
                <p className="font-medium text-slate-900">{row.volunteerName}</p>
                <p className="text-sm text-slate-600">{row.eventLabel}</p>
                <p className="text-sm text-slate-600">{row.status}</p>
                <p className="text-sm text-slate-600">{new Date(row.scannedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
        {totalAttendances > 50 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>Page {currentPage} of {Math.ceil(totalAttendances / 50)}</span>
            <div className="flex items-center gap-2">
              <Button type="button" disabled={currentPage === 1 || isPageLoading} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>Previous</Button>
              <Button type="button" disabled={currentPage >= Math.ceil(totalAttendances / 50) || isPageLoading} onClick={() => setCurrentPage((page) => Math.min(Math.ceil(totalAttendances / 50), page + 1))}>Next</Button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

export function CampusesModalView({
  campuses,
  setCampuses,
  departments,
  subDepartments,
  sections,
  volunteers,
  events,
}: {
  campuses: Campus[];
  setCampuses: React.Dispatch<React.SetStateAction<Campus[]>>;
  departments: Department[];
  subDepartments: SubDepartment[];
  sections: Section[];
  volunteers: Volunteer[];
  events: Event[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingCampusId, setDeletingCampusId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", city: "" });
  const [editForm, setEditForm] = useState({ name: "", city: "" });
  const rows = useMemo(() => {
    return campuses
      .map((campus) => {
        const campusDepartments = departments.filter((department) => department.campusId === campus.id);
        const departmentIds = campusDepartments.map((department) => department.id);
        const campusSubDepartments = subDepartments.filter((entry) => departmentIds.includes(entry.departmentId));
        const subDepartmentIds = campusSubDepartments.map((entry) => entry.id);
        const campusSections = sections.filter((section) => subDepartmentIds.includes(section.subDepartmentId));
        const sectionIds = campusSections.map((section) => section.id);
        const campusVolunteers = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId));
        const campusEvents = events.filter((event) => event.campusId === campus.id);

        return {
          ...campus,
          departmentCount: campusDepartments.length,
          subDepartmentCount: campusSubDepartments.length,
          sectionCount: campusSections.length,
          volunteerCount: campusVolunteers.length,
          eventCount: campusEvents.length,
        };
      })
      .filter(
        (row) =>
          row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.city.toLowerCase().includes(searchTerm.toLowerCase()),
      );
  }, [campuses, departments, events, searchTerm, sections, subDepartments, volunteers]);

  async function refreshCampuses() {
    const refreshResponse = await fetch("/api/campuses");
    const nextCampuses = (await refreshResponse.json()) as Campus[];
    setCampuses(nextCampuses);
  }

  return (
    <Panel title="Campus Overview">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search campuses"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <Button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="h-11 w-11 rounded-full px-0"
          aria-label="Add campus"
        >
          <CirclePlus className="h-4.5 w-4.5" />
        </Button>
      </div>
      <div className="mt-5 overflow-x-auto rounded-[20px] border border-[var(--line)] bg-white/88">
        <div className="grid min-w-[1100px] grid-cols-[1.1fr_0.9fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <p>Campus</p>
          <p>City</p>
          <p>Departments</p>
          <p>Sub-departments</p>
          <p>Sections</p>
          <p>Volunteers</p>
          <p>Events</p>
          <p>Action</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {rows.map((row) => (
            <div key={row.id} className="grid min-w-[1100px] grid-cols-[1.1fr_0.9fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-3 px-4 py-4">
              <div>
                <p className="font-medium text-slate-900">{row.name}</p>
                <p className="mt-1 text-sm text-slate-500">{row.id}</p>
              </div>
              <p className="text-sm text-slate-600">{row.city}</p>
              <p className="text-sm text-slate-600">{row.departmentCount}</p>
              <p className="text-sm text-slate-600">{row.subDepartmentCount}</p>
              <p className="text-sm text-slate-600">{row.sectionCount}</p>
              <p className="text-sm text-slate-600">{row.volunteerCount}</p>
              <p className="text-sm text-slate-600">{row.eventCount}</p>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setEditingCampusId(row.id);
                    setEditForm({ name: row.name, city: row.city });
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ id: row.id, name: row.name })}
                  disabled={deletingCampusId === row.id}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {feedback ? (
        <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {feedback}
        </div>
      ) : null}

      {showCreateForm ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[26px] border border-white/60 bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
              <h5 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">Add Campus</h5>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-3 text-slate-700"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="rounded-[24px] border border-[var(--line)] bg-white/78 p-5">
                <p className="text-sm text-slate-600">
                  Add a volunteer campus so departments, sections, events, and profiles can be linked correctly.
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Campus Name</label>
                    <Input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Enter campus name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
                    <Input
                      value={form.city}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, city: event.target.value }))
                      }
                      placeholder="Enter campus city"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setForm({ name: "", city: "" });
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  disabled={isCreating || form.name.trim().length < 2 || form.city.trim().length < 2}
                  onClick={async () => {
                    setFeedback(null);
                    setIsCreating(true);
                    const response = await fetch("/api/campuses", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: form.name.trim(),
                        city: form.city.trim(),
                      }),
                    });

                    if (response.ok) {
                      await refreshCampuses();
                      pushPortalNotification({
                        title: "Campus added",
                        detail: `${form.name.trim()} • ${form.city.trim()}`,
                      });
                      setForm({ name: "", city: "" });
                      setShowCreateForm(false);
                    } else {
                      setFeedback(await readResponseError(response, "Unable to create campus."));
                    }

                    setIsCreating(false);
                  }}
                >
                  {isCreating ? "Saving..." : "Create Campus"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingCampusId ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[26px] border border-white/60 bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
              <h5 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">Edit Campus</h5>
              <button
                type="button"
                onClick={() => setEditingCampusId(null)}
                className="rounded-full border border-[var(--line)] bg-white px-3 py-3 text-slate-700"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="rounded-[24px] border border-[var(--line)] bg-white/78 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Campus Name</label>
                    <Input
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Enter campus name"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
                    <Input
                      value={editForm.city}
                      onChange={(event) =>
                        setEditForm((current) => ({ ...current, city: event.target.value }))
                      }
                      placeholder="Enter campus city"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCampusId(null)}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 py-3 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  disabled={isSavingEdit || editForm.name.trim().length < 2 || editForm.city.trim().length < 2}
                  onClick={async () => {
                    setFeedback(null);
                    setIsSavingEdit(true);
                    const response = await fetch("/api/campuses", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: editingCampusId,
                        name: editForm.name.trim(),
                        city: editForm.city.trim(),
                      }),
                    });

                    if (response.ok) {
                      await refreshCampuses();
                      setEditingCampusId(null);
                    } else {
                      setFeedback(await readResponseError(response, "Unable to update campus."));
                    }

                    setIsSavingEdit(false);
                  }}
                >
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog
          title="Delete Campus"
          message={`Delete ${pendingDelete.name}?`}
          isLoading={deletingCampusId === pendingDelete.id}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            setFeedback(null);
            setDeletingCampusId(pendingDelete.id);
            const response = await fetch(`/api/campuses?id=${encodeURIComponent(pendingDelete.id)}`, {
              method: "DELETE",
            });

            if (response.ok) {
              await refreshCampuses();
              setPendingDelete(null);
            } else {
              setFeedback(await readResponseError(response, "Unable to delete campus."));
            }

            setDeletingCampusId(null);
          }}
        />
      ) : null}
    </Panel>
  );
}

export function UsersModalView({
  users,
  setUsers,
  volunteers,
  campuses,
  departments,
  subDepartments,
  sections,
}: {
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  volunteers: Volunteer[];
  campuses: Campus[];
  departments: Department[];
  subDepartments: SubDepartment[];
  sections: Section[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const defaultPreset = getPresetPermissionsForUserType("PLATFORM_ADMIN");
  const [form, setForm] = useState<UserFormState>({
    name: "",
    email: "",
    userType: "PLATFORM_ADMIN",
    loginCode: "",
    volunteerId: "",
    campusIds: [],
    departmentIds: [],
    subDepartmentIds: [],
    sectionIds: [],
    pageAccess: defaultPreset.pageAccess,
    actionAccess: defaultPreset.actionAccess,
  });

  const linkedVolunteer = volunteers.find((volunteer) => volunteer.id === form.volunteerId);
  const linkedSection = linkedVolunteer
    ? sections.find((section) => section.id === linkedVolunteer.sectionId)
    : undefined;
  const linkedSubDepartment = linkedSection
    ? subDepartments.find((subDepartment) => subDepartment.id === linkedSection.subDepartmentId)
    : undefined;
  const linkedDepartment = linkedSection
    ? departments.find((department) => department.id === linkedSubDepartment?.departmentId)
    : undefined;
  const linkedCampus = linkedDepartment
    ? campuses.find((campus) => campus.id === linkedDepartment.campusId)
    : undefined;

  const availableDepartments = useMemo(
    () =>
      form.campusIds.length
        ? departments.filter((department) => form.campusIds.includes(department.campusId))
        : departments,
    [departments, form.campusIds],
  );
  const availableSubDepartments = useMemo(
    () =>
      form.departmentIds.length
        ? subDepartments.filter((subDepartment) => form.departmentIds.includes(subDepartment.departmentId))
        : subDepartments,
    [form.departmentIds, subDepartments],
  );
  const availableSections = useMemo(
    () => {
      if (form.subDepartmentIds.length) {
        return sections.filter((section) => form.subDepartmentIds.includes(section.subDepartmentId));
      }

      if (form.departmentIds.length) {
        const scopedSubDepartmentIds = subDepartments
          .filter((subDepartment) => form.departmentIds.includes(subDepartment.departmentId))
          .map((subDepartment) => subDepartment.id);

        return sections.filter((section) => scopedSubDepartmentIds.includes(section.subDepartmentId));
      }

      return sections;
    },
    [form.departmentIds, form.subDepartmentIds, sections, subDepartments],
  );

  function resetForm() {
    setForm({
      name: "",
      email: "",
      userType: "PLATFORM_ADMIN",
      loginCode: "",
      volunteerId: "",
      campusIds: [],
      departmentIds: [],
      subDepartmentIds: [],
      sectionIds: [],
      pageAccess: defaultPreset.pageAccess,
      actionAccess: defaultPreset.actionAccess,
    });
  }

  function closeForm() {
    setShowCreateForm(false);
    setEditingUserId(null);
    setFormError("");
    resetForm();
  }

  function getScopeNames(user: UserAccount) {
    const sectionNames = sections
      .filter((section) => user.sectionIds.includes(section.id))
      .map((section) => section.name);
    if (sectionNames.length > 0) {
      return sectionNames;
    }

    const departmentNames = departments
      .filter((department) => user.departmentIds.includes(department.id))
      .map((department) => department.name);
    if (departmentNames.length > 0) {
      return departmentNames;
    }

    return campuses
      .filter((campus) => user.campusIds.includes(campus.id))
      .map((campus) => campus.name);
  }

  function openEditForm(user: UserAccount) {
    setFormError("");
    setEditingUserId(user.id);
    setShowCreateForm(false);
    setForm({
      name: user.name,
      email: user.email,
      userType: user.userType,
      loginCode: "",
      volunteerId: user.volunteerId ?? "",
      campusIds: user.campusIds,
      departmentIds: user.departmentIds,
      subDepartmentIds: user.subDepartmentIds,
      sectionIds: user.sectionIds,
      pageAccess: user.pageAccess,
      actionAccess: user.actionAccess,
    });
  }

  async function resetUserCode(user: UserAccount) {
    setResettingId(user.id);
    const nextCode = generateLoginCode();
    const response = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        loginCode: nextCode,
        volunteerId: user.volunteerId,
        campusIds: user.campusIds,
        departmentIds: user.departmentIds,
        subDepartmentIds: user.subDepartmentIds,
        sectionIds: user.sectionIds,
        pageAccess: user.pageAccess,
        actionAccess: user.actionAccess,
      }),
    });

    if (response.ok) {
      setUsers((current) =>
        current.map((entry) => (entry.id === user.id ? { ...entry, loginCode: nextCode } : entry)),
      );
    }

    setResettingId(null);
  }

  function toggleCampusScope(campusId: string) {
    setForm((current) => {
      const campusIds = toggleSelection(current.campusIds, campusId);
      const departmentIds = current.departmentIds.filter((departmentId) => {
        const department = departments.find((entry) => entry.id === departmentId);
        return department ? campusIds.includes(department.campusId) : false;
      });
      const subDepartmentIds = current.subDepartmentIds.filter((subDepartmentId) => {
        const subDepartment = subDepartments.find((entry) => entry.id === subDepartmentId);
        return subDepartment ? departmentIds.includes(subDepartment.departmentId) : false;
      });
      const sectionIds = current.sectionIds.filter((sectionId) => {
        const section = sections.find((entry) => entry.id === sectionId);
        return section ? subDepartmentIds.includes(section.subDepartmentId) : false;
      });

      return {
        ...current,
        campusIds,
        departmentIds,
        subDepartmentIds,
        sectionIds,
      };
    });
  }

  function toggleDepartmentScope(departmentId: string) {
    setForm((current) => {
      const nextSelected = !current.departmentIds.includes(departmentId);
      const department = departments.find((entry) => entry.id === departmentId);
      const departmentIds = toggleSelection(current.departmentIds, departmentId);
      const campusIds =
        nextSelected && department && !current.campusIds.includes(department.campusId)
          ? [...current.campusIds, department.campusId]
          : current.campusIds;
      const subDepartmentIds = current.subDepartmentIds.filter((subDepartmentId) => {
        const subDepartment = subDepartments.find((entry) => entry.id === subDepartmentId);
        return subDepartment ? departmentIds.includes(subDepartment.departmentId) : false;
      });
      const sectionIds = current.sectionIds.filter((sectionId) => {
        const section = sections.find((entry) => entry.id === sectionId);
        return section ? subDepartmentIds.includes(section.subDepartmentId) : false;
      });

      return {
        ...current,
        campusIds,
        departmentIds,
        subDepartmentIds,
        sectionIds,
      };
    });
  }

  function toggleSubDepartmentScope(subDepartmentId: string) {
    setForm((current) => {
      const nextSelected = !current.subDepartmentIds.includes(subDepartmentId);
      const subDepartment = subDepartments.find((entry) => entry.id === subDepartmentId);
      const department = subDepartment
        ? departments.find((entry) => entry.id === subDepartment.departmentId)
        : undefined;
      const subDepartmentIds = toggleSelection(current.subDepartmentIds, subDepartmentId);
      const departmentIds =
        nextSelected && subDepartment && !current.departmentIds.includes(subDepartment.departmentId)
          ? [...current.departmentIds, subDepartment.departmentId]
          : current.departmentIds;
      const campusIds =
        nextSelected && department && !current.campusIds.includes(department.campusId)
          ? [...current.campusIds, department.campusId]
          : current.campusIds;
      const sectionIds = current.sectionIds.filter((sectionId) => {
        const section = sections.find((entry) => entry.id === sectionId);
        return section ? subDepartmentIds.includes(section.subDepartmentId) : false;
      });

      return {
        ...current,
        campusIds,
        departmentIds,
        subDepartmentIds,
        sectionIds,
      };
    });
  }

  function toggleSectionScope(sectionId: string) {
    setForm((current) => {
      const nextSelected = !current.sectionIds.includes(sectionId);
      const section = sections.find((entry) => entry.id === sectionId);
      const subDepartment = section
        ? subDepartments.find((entry) => entry.id === section.subDepartmentId)
        : undefined;
      const department = subDepartment
        ? departments.find((entry) => entry.id === subDepartment.departmentId)
        : undefined;
      const sectionIds = toggleSelection(current.sectionIds, sectionId);
      const departmentIds =
        nextSelected && subDepartment && !current.departmentIds.includes(subDepartment.departmentId)
          ? [...current.departmentIds, subDepartment.departmentId]
          : current.departmentIds;
      const subDepartmentIds =
        nextSelected && section && !current.subDepartmentIds.includes(section.subDepartmentId)
          ? [...current.subDepartmentIds, section.subDepartmentId]
          : current.subDepartmentIds;
      const campusIds =
        nextSelected && department && !current.campusIds.includes(department.campusId)
          ? [...current.campusIds, department.campusId]
          : current.campusIds;

      return {
        ...current,
        campusIds,
        departmentIds,
        subDepartmentIds,
        sectionIds,
      };
    });
  }

  async function submitUserForm() {
    setFormError("");

    const payload = {
      ...form,
      name: form.volunteerId ? undefined : form.name.trim(),
      email: form.volunteerId ? undefined : form.email.trim(),
      volunteerId: form.volunteerId || undefined,
      campusIds: form.campusIds,
      departmentIds: form.departmentIds,
      subDepartmentIds: form.subDepartmentIds,
      sectionIds: form.sectionIds,
    };

    if (editingUserId) {
      setIsUpdating(true);
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingUserId, ...payload }),
      });

      if (response.ok) {
        setUsers((current) =>
          current.map((entry) =>
            entry.id === editingUserId
              ? {
                  ...entry,
                  name: payload.volunteerId ? linkedVolunteer?.fullName ?? entry.name : payload.name ?? entry.name,
                  email: payload.volunteerId ? linkedVolunteer?.email ?? entry.email : payload.email ?? entry.email,
                  role: getRoleForUserType(form.userType),
                  userType: form.userType,
                  loginCode: form.loginCode,
                  volunteerId: payload.volunteerId,
                  campusId: payload.campusIds[0],
                  campusIds: payload.campusIds,
                  departmentId: payload.departmentIds[0],
                  departmentIds: payload.departmentIds,
                  subDepartmentId: payload.subDepartmentIds[0],
                  subDepartmentIds: payload.subDepartmentIds,
                  sectionId: payload.sectionIds[0],
                  sectionIds: payload.sectionIds,
                  pageAccess: form.pageAccess,
                  actionAccess: form.actionAccess,
                }
              : entry,
          ),
        );
        closeForm();
      } else {
        setFormError(await readResponseError(response, "Unable to update user."));
      }

      setIsUpdating(false);
      return;
    }

    setIsCreating(true);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const listResponse = await fetch("/api/users");
      const nextUsers = (await listResponse.json()) as UserAccount[];
      setUsers(nextUsers);
      pushPortalNotification({
        title: "User added",
        detail: payload.volunteerId
          ? `${linkedVolunteer?.fullName ?? payload.name ?? "Linked volunteer"} • ${form.userType}`
          : `${payload.name ?? "Portal user"} • ${form.userType}`,
      });
      closeForm();
    } else {
      setFormError(await readResponseError(response, "Unable to create user."));
    }

    setIsCreating(false);
  }

  const rows = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === "ALL" || user.userType === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, searchTerm, users]);

  return (
    <Panel title="Portal Users">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1">
          <Input
            placeholder="Search users"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="hidden md:block"
          >
            <option value="ALL">All account types</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="PLATFORM_ADMIN">Platform Admin</option>
            <option value="CAMPUS_COORDINATOR">Campus Coordinator</option>
            <option value="DEPARTMENT_MANAGER">Department Manager</option>
            <option value="SECTION_COORDINATOR">Section Coordinator</option>
            <option value="SCANNER_OPERATOR">Scanner Operator</option>
            <option value="ACCESS_MANAGER">Access Manager</option>
            <option value="REPORT_VIEWER">Report Viewer</option>
            <option value="VOLUNTEER_PORTAL">Volunteer Portal</option>
          </Select>
        </div>
        <Button
          type="button"
          onClick={() => {
            closeForm();
            setShowCreateForm(true);
          }}
          className="h-11 w-11 rounded-full px-0"
          aria-label="Add user"
        >
          <CirclePlus className="h-4.5 w-4.5" />
        </Button>
      </div>

      <div className="mt-5 space-y-3 lg:hidden">
        {rows.map((user) => (
          <div key={user.id} className="rounded-[20px] border border-[var(--line)] bg-white/88 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{user.name}</p>
                <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {volunteers.find((volunteer) => volunteer.id === user.volunteerId)?.fullName ?? "No linked volunteer"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
                  {getUserTypeConfig(user.userType).label}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedUserId((current) => (current === user.id ? null : user.id))}
                  className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {expandedUserId === user.id ? "View Less" : "View More"}
                </button>
              </div>
            </div>

            {expandedUserId === user.id ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[16px] bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Pages</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {user.pageAccess.length ? user.pageAccess.join(", ") : "No pages"}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Actions</p>
                    <div className="mt-2 space-y-2">
                      {user.pageAccess.length ? (
                        user.pageAccess.map((page) => {
                          const actions = getActionsForPage(user.actionAccess, page);
                          return (
                            <div key={page} className="text-sm text-slate-900">
                              <span className="font-medium">{page}:</span>{" "}
                              <span>{actions.length ? actions.join(", ") : "No actions"}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm font-medium text-slate-900">No actions</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-slate-50 px-3 py-3 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Login Code</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {user.hasLoginCode ? "Stored securely" : "Not set"}
                    </p>
                  </div>
                  <div className="rounded-[16px] bg-slate-50 px-3 py-3 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Scope</p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {describeScopeSelection(getScopeNames(user), "No scope assigned")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => openEditForm(user)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                    aria-label={`Edit ${user.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resetUserCode(user)}
                    disabled={resettingId === user.id}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Reset code for ${user.name}`}
                  >
                    <RefreshCw className={`h-4 w-4 ${resettingId === user.id ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ id: user.id, name: user.name })}
                    disabled={deletingId === user.id}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Delete ${user.name}`}
                  >
                    {deletingId === user.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[20px] border border-[var(--line)] bg-white/88 lg:block">
        <div className="grid grid-cols-[1.05fr_0.9fr_0.7fr_0.95fr_1.1fr_1fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <p>User</p>
          <p>Email</p>
          <p>Account Type</p>
          <p>Pages</p>
          <p>Login Code</p>
          <p className="text-right">Action</p>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {rows.map((user) => (
            <div key={user.id} className="grid grid-cols-[1.05fr_0.9fr_0.7fr_0.95fr_1.1fr_1fr] gap-3 px-4 py-4">
              <div>
                <p className="font-medium text-slate-900">{user.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {volunteers.find((volunteer) => volunteer.id === user.volunteerId)?.fullName ?? "No linked volunteer"}
                </p>
              </div>
              <p className="text-sm text-slate-600">{user.email}</p>
              <p className="text-sm text-slate-600">{getUserTypeConfig(user.userType).label}</p>
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-900">
                  {user.pageAccess.length ? user.pageAccess.slice(0, 2).join(", ") : "No pages"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {describeScopeSelection(getScopeNames(user), "No scope")} |{" "}
                  {user.actionAccess.length
                    ? `${user.actionAccess.length} page action${user.actionAccess.length === 1 ? "" : "s"}`
                    : "No actions"}
                </p>
              </div>
              <p className="text-sm font-medium text-slate-900">
                {user.hasLoginCode ? "Stored securely" : "Not set"}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEditForm(user)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                  aria-label={`Edit ${user.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => resetUserCode(user)}
                  disabled={resettingId === user.id}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Reset code for ${user.name}`}
                >
                  <RefreshCw className={`h-4 w-4 ${resettingId === user.id ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ id: user.id, name: user.name })}
                  disabled={deletingId === user.id}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Delete ${user.name}`}
                >
                  {deletingId === user.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateForm || editingUserId ? (
        <InlineDialog title={editingUserId ? "Edit User" : "Add User"} onClose={closeForm}>
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              {editingUserId
                ? "Update the account type, scope, login code, and page permissions."
                : "Create a portal user account that signs in using a code only."}
            </p>
            {formError ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            ) : null}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Linked Volunteer</label>
                <Select
                  value={form.volunteerId}
                  onChange={(event) => {
                    const volunteerId = event.target.value;
                    const selectedVolunteer = volunteers.find((volunteer) => volunteer.id === volunteerId);
                    const selectedSection = selectedVolunteer
                      ? sections.find((section) => section.id === selectedVolunteer.sectionId)
                      : undefined;
                    const selectedSubDepartment = selectedSection
                      ? subDepartments.find((subDepartment) => subDepartment.id === selectedSection.subDepartmentId)
                      : undefined;
                    const selectedDepartment = selectedSubDepartment
                      ? departments.find((department) => department.id === selectedSubDepartment.departmentId)
                      : undefined;
                    const nextCampusId = selectedDepartment?.campusId;
                    const nextDepartmentId = selectedDepartment?.id;
                    const nextSubDepartmentId = selectedSubDepartment?.id;
                    const nextSectionId = selectedSection?.id;
                    setFormError("");
                    setForm((current) => ({
                      ...current,
                      volunteerId,
                      campusIds: nextCampusId
                        ? Array.from(new Set([...current.campusIds, nextCampusId]))
                        : current.campusIds,
                      departmentIds: nextDepartmentId
                        ? Array.from(new Set([...current.departmentIds, nextDepartmentId]))
                        : current.departmentIds,
                      subDepartmentIds: nextSubDepartmentId
                        ? Array.from(new Set([...current.subDepartmentIds, nextSubDepartmentId]))
                        : current.subDepartmentIds,
                      sectionIds: nextSectionId
                        ? Array.from(new Set([...current.sectionIds, nextSectionId]))
                        : current.sectionIds,
                    }));
                  }}
                >
                  <option value="">No linked volunteer</option>
                  {volunteers.map((volunteer) => (
                    <option key={volunteer.id} value={volunteer.id}>
                      {volunteer.fullName}
                    </option>
                  ))}
                </Select>
              </div>
              {linkedVolunteer ? (
                <div className="md:col-span-2 rounded-[20px] border border-[var(--line)] bg-slate-50 px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">{linkedVolunteer.fullName}</p>
                  <p className="mt-1 text-sm text-slate-600">{linkedVolunteer.email}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                    Name and email will be taken from the linked volunteer profile.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Name</label>
                    <Input
                      placeholder="Enter user name"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                    <Input
                      placeholder="Enter email address"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Account Type</label>
                <Select
                  value={form.userType}
                  onChange={(event) => {
                    const userType = event.target.value as UserAccount["userType"];
                    const preset = getPresetPermissionsForUserType(userType);
                    setForm((current) => ({
                      ...current,
                      userType,
                      pageAccess: preset.pageAccess,
                      actionAccess: preset.actionAccess,
                    }));
                    setFormError("");
                  }}
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="PLATFORM_ADMIN">Platform Admin</option>
                  <option value="CAMPUS_COORDINATOR">Campus Coordinator</option>
                  <option value="DEPARTMENT_MANAGER">Department Manager</option>
                  <option value="SECTION_COORDINATOR">Section Coordinator</option>
                  <option value="SCANNER_OPERATOR">Scanner Operator</option>
                  <option value="ACCESS_MANAGER">Access Manager</option>
                  <option value="REPORT_VIEWER">Report Viewer</option>
                  <option value="VOLUNTEER_PORTAL">Volunteer Portal</option>
                </Select>
                <p className="mt-2 text-xs text-slate-500">{getUserTypeConfig(form.userType).description}</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Login Code</label>
                <Input
                  placeholder={editingUserId ? "Leave blank to keep the current code" : "Enter digits only"}
                  inputMode="numeric"
                  value={form.loginCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      loginCode: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                />
                {editingUserId ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Leave this empty to keep the stored code. Enter a new code only when rotating credentials.
                  </p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <ScopeMultiSelect
                  label="Campus"
                  helper="Select one or more campuses."
                  options={campuses}
                  selectedIds={form.campusIds}
                  onToggle={toggleCampusScope}
                  emptyLabel="No campus scope"
                />
              </div>
              <div className="md:col-span-2">
                <ScopeMultiSelect
                  label="Department"
                  helper="Departments stay aligned with the selected campuses."
                  options={availableDepartments}
                  selectedIds={form.departmentIds}
                  onToggle={toggleDepartmentScope}
                  emptyLabel="No department scope"
                />
              </div>
              <div className="md:col-span-2">
                <ScopeMultiSelect
                  label="Sub-Department"
                  helper="Sub-departments stay aligned with the selected departments."
                  options={availableSubDepartments}
                  selectedIds={form.subDepartmentIds}
                  onToggle={toggleSubDepartmentScope}
                  emptyLabel="No sub-department scope"
                />
              </div>
              <div className="md:col-span-2">
                <ScopeMultiSelect
                  label="Section"
                  helper="Sections stay aligned with the selected sub-departments."
                  options={availableSections}
                  selectedIds={form.sectionIds}
                  onToggle={toggleSectionScope}
                  emptyLabel="No section scope"
                />
              </div>
              {linkedVolunteer && linkedSection && linkedSubDepartment && linkedDepartment ? (
                <div className="md:col-span-2 rounded-[20px] border border-[var(--line)] bg-slate-50 px-4 py-4">
                  <p className="text-sm font-medium text-slate-900">Linked volunteer scope</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {linkedCampus?.name ? `${linkedCampus.name} / ` : ""}
                    {linkedDepartment.name} / {linkedSubDepartment.name} / {linkedSection.name}
                  </p>
                </div>
              ) : null}
              <div className="md:col-span-2">
                <CollapsibleBlock title={`Page Access (${form.pageAccess.length}/${PAGE_LABELS.length})`}>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {PAGE_LABELS.map((page) => (
                      <label
                        key={page}
                        className="flex items-center gap-3 rounded-[16px] border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={form.pageAccess.includes(page)}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              ...togglePageAccessWithActions(current, page),
                            }))
                          }
                        />
                        <span>{page}</span>
                      </label>
                    ))}
                  </div>
                </CollapsibleBlock>
              </div>
              <div className="md:col-span-2">
                <CollapsibleBlock
                  title={`Page Actions (${form.actionAccess.length})`}
                  defaultOpen={form.pageAccess.length > 0}
                >
                  <div className="space-y-3">
                    {form.pageAccess.map((page) => (
                      <details key={page} open className="rounded-[18px] border border-[var(--line)] bg-white p-3">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                          {page}
                        </summary>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {getAllowedActionsForPage(page).map((action) => (
                            <label
                              key={`${page}-${action}`}
                              className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={form.actionAccess.includes(getScopedActionKey(page, action))}
                                disabled={action === "View"}
                                onChange={() =>
                                  setForm((current) => ({
                                    ...current,
                                    ...normalizePermissionSelection(
                                      current.pageAccess,
                                      toggleSelection(
                                        current.actionAccess,
                                        getScopedActionKey(page, action),
                                      ),
                                    ),
                                  }))
                                }
                              />
                              <span>{action}</span>
                            </label>
                          ))}
                        </div>
                      </details>
                    ))}
                    {!form.pageAccess.length ? (
                      <div className="rounded-[18px] border border-dashed border-[var(--line)] bg-slate-50 px-4 py-5 text-sm text-slate-500">
                        Select a page above to assign actions.
                      </div>
                    ) : null}
                  </div>
                </CollapsibleBlock>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={
                isCreating ||
                isUpdating ||
                (!editingUserId && form.loginCode.trim().length < 4) ||
                (!form.volunteerId && (!form.name.trim() || !form.email.trim()))
              }
              onClick={submitUserForm}
            >
              {editingUserId ? (isUpdating ? "Saving..." : "Save Changes") : isCreating ? "Saving..." : "Create User"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete User"
          message={`Delete ${pendingDelete.name}?`}
          isLoading={deletingId === pendingDelete.id}
          onClose={() => setPendingDelete(null)}
          onConfirm={async () => {
            setDeletingId(pendingDelete.id);
            const response = await fetch(`/api/users?id=${pendingDelete.id}`, { method: "DELETE" });
            if (response.ok) {
              setUsers((current) => current.filter((entry) => entry.id !== pendingDelete.id));
              setExpandedUserId((current) => (current === pendingDelete.id ? null : current));
              setPendingDelete(null);
            }
            setDeletingId(null);
          }}
        />
      ) : null}
    </Panel>
  );
}
