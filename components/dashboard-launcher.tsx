"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CirclePlus,
  CheckCircle2,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileBarChart2,
  Globe,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  NotebookPen,
  PieChart,
  QrCode,
  ShieldCheck,
  Settings,
  Trash2,
  TrendingUp,
  UserRoundCog,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import { Button, ConfirmDialog, Input, Select } from "@/components/ui";
import { PasskeySettingsPanel } from "@/components/passkey-settings";
import type { getSnapshot } from "@/lib/data";
import {
  clearPortalNotifications,
  deletePortalNotification,
  pushPortalNotification,
  usePortalNotifications,
} from "@/lib/client-notifications";
import { canOpenTool, hasActionAccess, hasPageAccess } from "@/lib/permissions";
import { formatEnum } from "@/lib/utils";
import type {
  AccessPermission,
  AccessLog,
  AccessPoint,
  Attendance,
  Department,
  Event,
  Section,
  UserAccount,
  Volunteer,
} from "@/lib/types";

type Snapshot = Awaited<ReturnType<typeof getSnapshot>>;
type Tool = {
  id: string;
  name: string;
  group: "tools" | "areas";
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  description: string;
};

function readApiError(raw: string, fallback: string) {
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

const TOOL_ROUTE_MAP: Record<string, string> = {
  "volunteer-hub": "/volunteers",
  events: "/events",
  access: "/access",
  reports: "/reports",
  scanner: "/scanner",
  departments: "/departments",
  "sub-departments": "/sub-departments",
  sections: "/sections",
  attendance: "/attendance",
  campuses: "/campuses",
  users: "/users",
};

const DASHBOARD_SIDEBAR_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/volunteers", label: "Volunteers", icon: UsersRound },
  { href: "/attendance", label: "Attendance", icon: BriefcaseBusiness },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/sub-departments", label: "Sub-Departments", icon: Building2 },
  { href: "/sections", label: "Sections", icon: NotebookPen },
  { href: "/campuses", label: "Campuses", icon: MapPin },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/events", label: "Events & Services", icon: CalendarDays },
  { href: "/scanner", label: "QR Scanner", icon: QrCode },
  { href: "/access", label: "Access Control", icon: ShieldCheck },
  { href: "/users", label: "Users & Roles", icon: UserRoundCog },
] as const;

function canOpenDashboardNavHref(user: UserAccount, href: string) {
  switch (href) {
    case "/dashboard":
      return hasPageAccess(user, "Dashboard");
    case "/volunteers":
      return hasPageAccess(user, "Volunteer Hub");
    case "/attendance":
      return hasPageAccess(user, "Attendance");
    case "/departments":
      return hasPageAccess(user, "Departments");
    case "/sub-departments":
      return hasPageAccess(user, "Sub-Departments");
    case "/sections":
      return hasPageAccess(user, "Sections");
    case "/campuses":
      return hasPageAccess(user, "Campuses");
    case "/reports":
      return hasPageAccess(user, "Reports");
    case "/events":
      return hasPageAccess(user, "Events");
    case "/scanner":
      return hasPageAccess(user, "Scanner");
    case "/access":
      return hasPageAccess(user, "Access");
    case "/users":
      return hasPageAccess(user, "Users");
    default:
      return false;
  }
}

const tools: Tool[] = [
  {
    id: "volunteer-hub",
    name: "Volunteer Hub",
    group: "areas",
    icon: UsersRound,
    tone: "bg-violet-100 text-violet-700",
    description: "Volunteer profiles, QR identity, and section placement.",
  },
  {
    id: "events",
    name: "Events",
    group: "tools",
    icon: CalendarDays,
    tone: "bg-emerald-100 text-emerald-700",
    description: "Sunday services, rehearsals, and special event scheduling.",
  },
  {
    id: "access",
    name: "Access",
    group: "tools",
    icon: ShieldCheck,
    tone: "bg-amber-100 text-amber-700",
    description: "Access point permissions, approvals, and denied scans.",
  },
  {
    id: "reports",
    name: "Reports",
    group: "areas",
    icon: FileBarChart2,
    tone: "bg-sky-100 text-sky-700",
    description: "Attendance analysis and volunteer consistency summaries.",
  },
  {
    id: "scanner",
    name: "Scanner",
    group: "tools",
    icon: Video,
    tone: "bg-emerald-100 text-emerald-700",
    description: "Live QR camera scanner for attendance and access modes.",
  },
  {
    id: "departments",
    name: "Departments",
    group: "areas",
    icon: Building2,
    tone: "bg-blue-100 text-blue-700",
    description: "Department-level ownership and team distribution.",
  },
  {
    id: "sub-departments",
    name: "Sub-Departments",
    group: "areas",
    icon: Building2,
    tone: "bg-cyan-100 text-cyan-700",
    description: "Sub-department grouping between departments and sections.",
  },
  {
    id: "sections",
    name: "Sections",
    group: "areas",
    icon: NotebookPen,
    tone: "bg-fuchsia-100 text-fuchsia-700",
    description: "Section assignment and leadership coverage.",
  },
  {
    id: "attendance",
    name: "Attendance",
    group: "areas",
    icon: BriefcaseBusiness,
    tone: "bg-cyan-100 text-cyan-700",
    description: "Attendance history across events and services.",
  },
  {
    id: "campuses",
    name: "Campuses",
    group: "areas",
    icon: Globe,
    tone: "bg-indigo-100 text-indigo-700",
    description: "Campus overview with departments, sections, and volunteers.",
  },
  {
    id: "users",
    name: "Users",
    group: "areas",
    icon: UserRoundCog,
    tone: "bg-rose-100 text-rose-700",
    description: "Portal users, login codes, and volunteer-linked accounts.",
  },
];

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatTimeLabel(value: string) {
  const [hours, minutes] = value.split(":").map((entry) => Number(entry));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hours, minutes));
}

function formatRelativeMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function buildPolylinePoints(values: number[]) {
  const width = 420;
  const height = 170;
  const padding = 14;
  const maxValue = Math.max(...values, 1);

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - (value / maxValue) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function formatSouthAfricaDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(value);
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/28 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/50 bg-[#f8fafc]/94 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Volunteer System Page
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-3 text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function InlineDialog({
  title,
  onClose,
  className,
  children,
}: {
  title: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-safe-top app-safe-bottom fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/20 p-3 backdrop-blur-sm md:items-center md:p-4">
      <div
        className={`flex max-h-[calc(100dvh-1.5rem-var(--safe-top)-var(--safe-bottom))] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-white/60 bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:max-h-[92vh] ${className ?? ""}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <h5 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">{title}</h5>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] bg-white px-3 py-3 text-slate-700"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-[calc(6.5rem+var(--safe-bottom))] md:pb-4">
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function SearchableVolunteerMultiSelect({
  volunteers,
  selectedIds,
  onToggle,
  emptyLabel,
}: {
  volunteers: Volunteer[];
  selectedIds: string[];
  onToggle: (volunteerId: string) => void;
  emptyLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();

  const filteredVolunteers = useMemo(() => {
    const term = trimmedSearch.toLowerCase();
    if (!term) {
      return [];
    }

    return volunteers.filter((volunteer) =>
      [volunteer.fullName, volunteer.email, volunteer.phone].join(" ").toLowerCase().includes(term),
    );
  }, [trimmedSearch, volunteers]);

  const selectedLabels = volunteers
    .filter((volunteer) => selectedIds.includes(volunteer.id))
    .map((volunteer) => volunteer.fullName);

  return (
    <div className="rounded-[20px] border border-[var(--line)] bg-slate-50/80 p-4">
      <button
        type="button"
        onClick={() =>
          setIsOpen((current) => {
            if (current) {
              setSearch("");
            }
            return !current;
          })
        }
        className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-[var(--line)] bg-white px-4 py-3 text-left text-sm text-slate-700"
      >
        <span className="truncate">
          {selectedLabels.length ? selectedLabels.join(", ") : "Select volunteers"}
        </span>
        <span className="text-xs font-medium text-slate-500">{isOpen ? "Close" : "Open"}</span>
      </button>
      <p className="mt-2 text-sm text-slate-600">
        Select one or more volunteers who should scan directly at this access point.
      </p>
      {isOpen ? (
        <div className="mt-3 space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search volunteer by name, email, or phone"
          />
          {!trimmedSearch ? (
            <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-slate-500">
              Start typing to search volunteers.
            </div>
          ) : filteredVolunteers.length ? (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {filteredVolunteers.map((volunteer) => (
                <label
                  key={volunteer.id}
                  className="flex items-center gap-3 rounded-[16px] border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(volunteer.id)}
                    onChange={() => onToggle(volunteer.id)}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{volunteer.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{volunteer.email}</p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-slate-500">
              {emptyLabel}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DirectSectionAccessEditor({
  sections,
  volunteers,
  selectedSectionIds,
  excludedVolunteerIdsBySection,
  onToggleSection,
  onToggleExcludedVolunteer,
}: {
  sections: Section[];
  volunteers: Volunteer[];
  selectedSectionIds: string[];
  excludedVolunteerIdsBySection: Record<string, string[]>;
  onToggleSection: (sectionId: string) => void;
  onToggleExcludedVolunteer: (sectionId: string, volunteerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? sections.filter((section) => section.name.toLowerCase().includes(term)) : sections;
  }, [search, sections]);

  return (
    <div className="space-y-3 rounded-[20px] border border-[var(--line)] bg-slate-50/80 p-4">
      <p className="text-sm text-slate-600">
        Select a section to grant access to everyone in it. The list only includes sections from the selected campus.
      </p>
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search sections"
        aria-label="Search sections with direct access"
      />
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
      {filteredSections.map((section) => {
        const selected = selectedSectionIds.includes(section.id);
        const members = volunteers.filter((volunteer) => (volunteer.sectionIds.length ? volunteer.sectionIds : [volunteer.sectionId]).includes(section.id));
        const excludedIds = excludedVolunteerIdsBySection[section.id] ?? [];
        return <div key={section.id} className="rounded-[16px] border border-[var(--line)] bg-white p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-800">
            <span className="font-medium">{section.name}</span>
            <span className="flex items-center gap-2 text-xs text-slate-500">{members.length} volunteer{members.length === 1 ? "" : "s"}<input type="checkbox" checked={selected} onChange={() => onToggleSection(section.id)} /></span>
          </label>
          {selected ? <details className="mt-3 border-t border-slate-100 pt-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-600">Manage people with access {excludedIds.length ? `(${excludedIds.length} removed)` : ""}</summary>
            <div className="mt-3 space-y-2">
              {members.map((volunteer) => {
                const hasAccess = !excludedIds.includes(volunteer.id);
                return <label key={volunteer.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                  <span>{volunteer.fullName}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">{hasAccess ? "Has access" : "Removed"}<input type="checkbox" checked={hasAccess} onChange={() => onToggleExcludedVolunteer(section.id, volunteer.id)} /></span>
                </label>;
              })}
              {!members.length ? <p className="text-xs text-slate-500">No volunteers are assigned to this section.</p> : null}
            </div>
          </details> : null}
        </div>;
      })}
      {!sections.length ? <p className="text-sm text-slate-500">Select a campus to view its sections.</p> : null}
      {sections.length && !filteredSections.length ? <p className="text-sm text-slate-500">No sections match your search.</p> : null}
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
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function getVolunteerMeta(
  volunteer: Volunteer,
  sections: Section[],
  departments: Department[],
) {
  const section = sections.find((entry) => entry.id === volunteer.sectionId);
  const department = departments.find((entry) => entry.id === section?.departmentId);
  return {
    section: section?.name ?? "Unassigned",
    department: department?.name ?? "Unknown department",
  };
}

export function VolunteerHubView({
  campuses,
  volunteers,
  setVolunteers,
  sections,
  departments,
  accessPoints,
  currentUser,
}: {
  campuses: Snapshot["campuses"];
  volunteers: Volunteer[];
  setVolunteers: React.Dispatch<React.SetStateAction<Volunteer[]>>;
  sections: Section[];
  departments: Department[];
  accessPoints: AccessPoint[];
  currentUser: UserAccount;
}) {
  const initialCampusId = departments[0]?.campusId ?? campuses[0]?.id ?? "";
  const initialDepartmentId = departments[0]?.id ?? "";
  const initialSectionId =
    sections.find((section) => section.departmentId === initialDepartmentId)?.id ??
    sections[0]?.id ??
    "";

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    campusId: initialCampusId,
    departmentId: initialDepartmentId,
    sectionId: initialSectionId,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    membershipStatus: "MEMBER",
    role: "VOLUNTEER",
    campusId: initialCampusId,
    departmentId: initialDepartmentId,
    sectionId: initialSectionId,
    notes: "",
    pastor: "",
    zone: "",
    campusPhysicalAddress: "",
    photoDataUrl: "",
    accessPointIds: [] as string[],
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [volunteerError, setVolunteerError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [pendingDeleteVolunteer, setPendingDeleteVolunteer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const viewerVolunteerId = currentUser.role === "VOLUNTEER" ? currentUser.volunteerId : undefined;
  const canCreateVolunteer = hasActionAccess(currentUser, "Volunteer Hub", "Create");
  const canDeleteVolunteer = hasActionAccess(currentUser, "Volunteer Hub", "Delete");
  const scopedVolunteers = viewerVolunteerId
    ? volunteers.filter((volunteer) => volunteer.id === viewerVolunteerId)
    : volunteers;

  const filteredVolunteers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return scopedVolunteers.filter((volunteer) => {
      const meta = getVolunteerMeta(volunteer, sections, departments);
      const matchesSearch =
        term.length === 0 ||
        volunteer.fullName.toLowerCase().includes(term) ||
        volunteer.email.toLowerCase().includes(term) ||
        volunteer.phone.toLowerCase().includes(term) ||
        meta.department.toLowerCase().includes(term) ||
        meta.section.toLowerCase().includes(term);

      const matchesRole = roleFilter === "ALL" || volunteer.role === roleFilter;
      const matchesSection = sectionFilter === "ALL" || volunteer.sectionId === sectionFilter;

      return matchesSearch && matchesRole && matchesSection;
    });
  }, [departments, roleFilter, scopedVolunteers, search, sectionFilter, sections]);

  const availableSections = useMemo(
    () => sections.filter((section) => section.departmentId === form.departmentId),
    [form.departmentId, sections],
  );
  const availableDepartments = useMemo(
    () => departments.filter((department) => department.campusId === form.campusId),
    [departments, form.campusId],
  );
  const editAvailableSections = useMemo(
    () => sections.filter((section) => section.departmentId === editForm.departmentId),
    [editForm.departmentId, sections],
  );
  const editAvailableDepartments = useMemo(
    () => departments.filter((department) => department.campusId === editForm.campusId),
    [departments, editForm.campusId],
  );
  const editDirectAccessPoints = useMemo(() => {
    return accessPoints.filter((point) => {
      if (!point.isActive) {
        return editForm.accessPointIds.includes(point.id);
      }

      return !point.campusId || point.campusId === editForm.campusId;
    });
  }, [accessPoints, editForm.accessPointIds, editForm.campusId]);

  function readApiError(raw: string, fallback: string) {
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

  async function submit() {
    setIsSubmitting(true);
    const response = await fetch("/api/volunteers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        campusId: form.campusId,
        departmentId: form.departmentId,
        sectionId: form.sectionId,
        membershipStatus: "MEMBER",
        role: "VOLUNTEER",
        availability: "BOTH",
        accessPointIds: [],
      }),
    });

    if (response.ok) {
      const createdSection = sections.find((entry) => entry.id === form.sectionId);
      const createdDepartment = departments.find((entry) => entry.id === createdSection?.departmentId);
      const createdCampus = campuses.find((entry) => entry.id === createdDepartment?.campusId);
      const listResponse = await fetch("/api/volunteers");
      const nextVolunteers = (await listResponse.json()) as Volunteer[];
      setVolunteers(nextVolunteers);
      pushPortalNotification({
        title: "Volunteer added",
        detail: [form.fullName, createdCampus?.name, createdDepartment?.name].filter(Boolean).join(" • "),
      });
      setShowCreateForm(false);
      setForm({
        fullName: "",
        phone: "",
        email: "",
        campusId: initialCampusId,
        departmentId: initialDepartmentId,
        sectionId: initialSectionId,
      });
    }

    setIsSubmitting(false);
  }

  async function removeVolunteer(volunteerId: string) {
    setIsDeletingId(volunteerId);
    const response = await fetch("/api/volunteers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: volunteerId }),
    });

    if (response.ok) {
      const listResponse = await fetch("/api/volunteers");
      const nextVolunteers = (await listResponse.json()) as Volunteer[];
      setVolunteers(nextVolunteers);
    }

    setIsDeletingId(null);
  }

  function openEditVolunteer(volunteer: Volunteer) {
    const meta = getVolunteerMeta(volunteer, sections, departments);
    const department =
      departments.find((entry) => entry.name === meta.department)?.id ?? initialDepartmentId;
    const campusId =
      departments.find((entry) => entry.id === department)?.campusId ?? initialCampusId;
    setVolunteerError("");
    setEditingVolunteer(volunteer);
    setEditForm({
      fullName: volunteer.fullName,
      phone: volunteer.phone,
      email: volunteer.email,
      membershipStatus: volunteer.membershipStatus,
      role: volunteer.role,
      campusId,
      departmentId: department,
      sectionId: volunteer.sectionId,
      notes: volunteer.notes ?? "",
      pastor: volunteer.pastor ?? "",
      zone: volunteer.zone ?? "",
      campusPhysicalAddress: volunteer.campusPhysicalAddress ?? "",
      photoDataUrl: volunteer.photoDataUrl ?? "",
      accessPointIds: volunteer.accessPointIds ?? [],
    });
  }

  async function saveVolunteerEdits() {
    if (!editingVolunteer) {
      return;
    }

    setVolunteerError("");
    setIsSavingEdit(true);
    const response = await fetch("/api/volunteers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingVolunteer.id,
        fullName: editForm.fullName,
        phone: editForm.phone,
        email: editForm.email,
        membershipStatus: editForm.membershipStatus,
        role: editForm.role,
        campusId: editForm.campusId,
        departmentId: editForm.departmentId,
        availability: editingVolunteer.availability,
        sectionId: editForm.sectionId,
        notes: editForm.notes,
        pastor: editForm.pastor,
        zone: editForm.zone,
        campusPhysicalAddress: editForm.campusPhysicalAddress,
        photoDataUrl: editForm.photoDataUrl,
        accessPointIds: editForm.accessPointIds,
      }),
    });

    if (response.ok) {
      const listResponse = await fetch("/api/volunteers");
      const nextVolunteers = (await listResponse.json()) as Volunteer[];
      setVolunteers(nextVolunteers);
      setVolunteerError("");
      setEditingVolunteer(null);
    } else {
      const raw = await response.text();
      setVolunteerError(readApiError(raw, "Unable to update volunteer access."));
    }

    setIsSavingEdit(false);
  }

  async function handleVolunteerPhotoSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setEditForm((current) => ({ ...current, photoDataUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <Panel title="Volunteer Table">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">
                {viewerVolunteerId
                  ? "View your volunteer profile and placement."
                  : "Search, filter, and manage volunteer records."}
              </p>
            </div>
            {canCreateVolunteer && !viewerVolunteerId ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              >
                <CirclePlus className="h-4 w-4" />
                Add Volunteer
              </button>
            ) : null}
          </div>

          <div className={`grid gap-3 ${viewerVolunteerId ? "md:grid-cols-1 xl:grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
            <Input
              placeholder="Search volunteers"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {!viewerVolunteerId ? (
              <Select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="hidden md:block"
              >
                <option value="ALL">All roles</option>
                <option value="VOLUNTEER">Volunteer</option>
                <option value="SECTION_LEADER">Section Leader</option>
                <option value="DEPARTMENT_HEAD">Department Head</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </Select>
            ) : null}
            {!viewerVolunteerId ? (
              <Select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="hidden xl:block"
              >
                <option value="ALL">All sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[var(--line)]">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white/75 text-left">
                <thead className="bg-slate-100/90 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Volunteer</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVolunteers.map((volunteer) => {
                    const meta = getVolunteerMeta(volunteer, sections, departments);

                    return (
                      <tr
                        key={volunteer.id}
                        className="cursor-pointer border-t border-slate-200/80 text-sm text-slate-700 transition hover:bg-slate-50/80"
                        onClick={() => openEditVolunteer(volunteer)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{volunteer.fullName}</p>
                            <p className="text-xs text-slate-500">
                              {formatEnum(volunteer.membershipStatus)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p>{volunteer.email}</p>
                            <p className="text-xs text-slate-500">{volunteer.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatEnum(volunteer.role)}</td>
                        <td className="px-4 py-3">{meta.department}</td>
                        <td className="px-4 py-3">{meta.section}</td>
                        <td className="px-4 py-3">
                          {canDeleteVolunteer && !viewerVolunteerId ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPendingDeleteVolunteer({
                                  id: volunteer.id,
                                  name: volunteer.fullName,
                                });
                              }}
                              disabled={isDeletingId === volunteer.id}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                            >
                              {isDeletingId === volunteer.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">View</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVolunteers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No volunteers match the current search or filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Panel>

      {showCreateForm ? (
        <InlineDialog title="Add Volunteer" onClose={() => setShowCreateForm(false)}>
          <div className="mb-4 rounded-[18px] border border-[var(--line)] bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Quick add captures the core volunteer details now. Extra profile information like
            address, pastor, and extended notes can be added later during editing.
          </div>
          <div className="rounded-[22px] border border-[var(--line)] bg-white/80 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name (required)">
                <Input
                  placeholder="Enter volunteer full name"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Phone Number (required)">
                <Input
                  placeholder="Enter contact number"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </Field>
              <Field label="Email Address (optional)">
                <Input
                  placeholder="Enter email address"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </Field>
              <Field label="Campus (required)">
                <Select
                  value={form.campusId}
                  onChange={(event) => {
                    const campusId = event.target.value;
                    const firstDepartment =
                      departments.find((department) => department.campusId === campusId)?.id ?? "";
                    const firstSection =
                      sections.find((section) => section.departmentId === firstDepartment)?.id ?? "";
                    setForm((current) => ({
                      ...current,
                      campusId,
                      departmentId: firstDepartment,
                      sectionId: firstSection,
                    }));
                  }}
                >
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Department (required)">
                <Select
                  value={form.departmentId}
                  onChange={(event) => {
                    const departmentId = event.target.value;
                    const firstSection =
                      sections.find((section) => section.departmentId === departmentId)?.id ?? "";
                    setForm((current) => ({
                      ...current,
                      departmentId,
                      sectionId: firstSection,
                    }));
                  }}
                >
                  {availableDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section (required)">
                <Select
                  value={form.sectionId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sectionId: event.target.value }))
                  }
                >
                  {availableSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </Select>
              </Field>
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
              onClick={() => void submit()}
              disabled={isSubmitting}
              className="px-5"
            >
              {isSubmitting ? "Saving..." : "Add Volunteer"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}

      {editingVolunteer ? (
        <InlineDialog
          title="Edit Volunteer"
          onClose={() => {
            setVolunteerError("");
            setEditingVolunteer(null);
          }}
          className="max-w-6xl"
        >
          {volunteerError ? (
            <div className="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {volunteerError}
            </div>
          ) : null}
          <div className="rounded-[22px] border border-[var(--line)] bg-white/80 p-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name">
                <Input
                  value={editForm.fullName}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Phone Number">
                <Input
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </Field>
              <Field label="Email Address (optional)">
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </Field>
              <Field label="Membership Status">
                <Select
                  value={editForm.membershipStatus}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      membershipStatus: event.target.value,
                    }))
                  }
                >
                  <option value="MEMBER">Member</option>
                  <option value="NON_MEMBER">Non Member</option>
                  <option value="NEW_COMER">New Comer</option>
                </Select>
              </Field>
              <Field label="Campus">
                <Select
                  value={editForm.campusId}
                  onChange={(event) => {
                    const campusId = event.target.value;
                    const firstDepartment =
                      departments.find((department) => department.campusId === campusId)?.id ?? "";
                    const firstSection =
                      sections.find((section) => section.departmentId === firstDepartment)?.id ?? "";
                    setEditForm((current) => ({
                      ...current,
                      campusId,
                      departmentId: firstDepartment,
                      sectionId: firstSection,
                    }));
                  }}
                >
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role">
                <Select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="VOLUNTEER">Volunteer</option>
                  <option value="SECTION_LEADER">Section Leader</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  </Select>
              </Field>
              <Field label="Department">
                <Select
                  value={editForm.departmentId}
                  onChange={(event) => {
                    const departmentId = event.target.value;
                    const firstSection =
                      sections.find((section) => section.departmentId === departmentId)?.id ?? "";
                    setEditForm((current) => ({
                      ...current,
                      departmentId,
                      sectionId: firstSection,
                    }));
                  }}
                >
                  {editAvailableDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Pastor">
                <Input
                  value={editForm.pastor}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, pastor: event.target.value }))
                  }
                  placeholder="Assigned pastor"
                />
              </Field>
              <Field label="Section">
                <Select
                  value={editForm.sectionId}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, sectionId: event.target.value }))
                  }
                >
                  {editAvailableSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Zone">
                <Input
                  value={editForm.zone}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, zone: event.target.value }))
                  }
                  placeholder="Volunteer zone"
                />
              </Field>
                <Field label="Campus Physical Address">
                  <textarea
                    value={editForm.campusPhysicalAddress}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        campusPhysicalAddress: event.target.value,
                      }))
                    }
                    placeholder="Campus physical address"
                    rows={3}
                    className="min-h-[92px] w-full resize-y rounded-[18px] border border-transparent bg-[#273046] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[var(--line-strong)]"
                  />
                </Field>
                <Field label="Notes">
                  <textarea
                    value={editForm.notes}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Add profile notes"
                    rows={3}
                    className="min-h-[92px] w-full resize-y rounded-[18px] border border-transparent bg-[#273046] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-[var(--line-strong)]"
                  />
                </Field>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Direct Access Permissions
                  </label>
                  <div className="mb-3 rounded-[16px] border border-[var(--line)] bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    Select the access points this volunteer can use directly from their profile. These
                    permissions are checked immediately when their QR code is scanned on the Access scanner.
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {editDirectAccessPoints.map((point) => (
                      <label
                        key={point.id}
                        className="flex items-start gap-3 rounded-[16px] border border-[var(--line)] bg-slate-50 px-3 py-3 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.accessPointIds.includes(point.id)}
                          onChange={() =>
                            setEditForm((current) => ({
                              ...current,
                              accessPointIds: current.accessPointIds.includes(point.id)
                                ? current.accessPointIds.filter((entry) => entry !== point.id)
                                : [...current.accessPointIds, point.id],
                            }))
                          }
                        />
                        <span className="flex-1">
                          <span className="flex items-center gap-2 font-medium text-slate-900">
                            <span
                              className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
                              style={{ backgroundColor: point.color }}
                            />
                            {point.name}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {point.location}
                            {point.campusId
                              ? ` · ${campuses.find((campus) => campus.id === point.campusId)?.name ?? "Linked campus"}`
                              : " · No campus linked"}
                            {!point.isActive ? " · Inactive access point" : ""}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {editDirectAccessPoints.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500">
                      No access points are available for this campus yet. Create them in Access first.
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Assign profile-specific access points. These show in the QR access scanner result.
                  </p>
                </div>
              </div>
              <div className="rounded-[20px] border border-[var(--line)] bg-slate-50/80 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Volunteer QR Code
                </p>
                <div className="mt-4 flex justify-center rounded-[20px] border border-[var(--line)] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                  <Image
                    src={`/api/qr?token=${encodeURIComponent(editingVolunteer.qrToken)}`}
                    alt={`${editingVolunteer.fullName} QR code`}
                    width={160}
                    height={160}
                    unoptimized
                    className="h-36 w-36"
                  />
                </div>
                <p className="mt-4 break-all rounded-[16px] border border-[var(--line)] bg-white px-3 py-2 font-mono text-[11px] text-slate-700">
                  {editingVolunteer.qrToken}
                </p>
                <div className="mt-4 grid gap-2">
                  <a
                    href={`/api/qr?token=${encodeURIComponent(editingVolunteer.qrToken)}`}
                    download={`${editingVolunteer.fullName.replace(/\s+/g, "-").toLowerCase()}-qr.png`}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Download QR
                  </a>
                </div>
                <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                    Volunteer Picture
                  </p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      void handleVolunteerPhotoSelected(event.target.files?.[0])
                    }
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="mt-3 flex w-full flex-col items-center rounded-[18px] bg-[linear-gradient(180deg,#eef2ff,#f8fafc)] px-4 py-5 text-center transition hover:bg-[linear-gradient(180deg,#e6ecff,#f3f6fb)]"
                  >
                    {editForm.photoDataUrl ? (
                      <div className="relative h-44 w-full overflow-hidden rounded-[16px] border border-white/70 shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
                        <Image
                          src={editForm.photoDataUrl}
                          alt={`${editingVolunteer.fullName} profile picture`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#dbe4ff,#f8fafc)] text-3xl font-semibold tracking-[-0.04em] text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
                        {editingVolunteer.fullName
                          .split(" ")
                          .slice(0, 2)
                          .map((name) => name[0])
                          .join("")}
                      </div>
                    )}
                    <p className="mt-3 text-sm font-medium text-slate-900">
                      {editingVolunteer.fullName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{editForm.role.replaceAll("_", " ")}</p>
                    <p className="mt-3 text-xs font-medium text-violet-700">Click to upload picture</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setVolunteerError("");
                setEditingVolunteer(null);
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button type="button" onClick={() => void saveVolunteerEdits()} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {pendingDeleteVolunteer ? (
        <ConfirmDialog
          title="Delete Volunteer"
          message={`Delete ${pendingDeleteVolunteer.name}?`}
          isLoading={isDeletingId === pendingDeleteVolunteer.id}
          onClose={() => setPendingDeleteVolunteer(null)}
          onConfirm={async () => {
            await removeVolunteer(pendingDeleteVolunteer.id);
            setPendingDeleteVolunteer(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function EventsView({
  events,
  setEvents,
  campuses,
}: {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  campuses: Snapshot["campuses"];
}) {
  const recurringDayOptions = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;

  const [form, setForm] = useState({
    name: "",
    date: "",
    type: "SUNDAY",
    sundayService: "NONE",
    startTime: "",
    endTime: "",
    campusId: campuses[0]?.id ?? "",
    allowDuplicate: false,
    isRecurring: false,
    recurringDays: [] as Event["recurringDays"],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [eventError, setEventError] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    date: "",
    type: "SUNDAY",
    sundayService: "NONE",
    startTime: "",
    endTime: "",
    campusId: campuses[0]?.id ?? "",
    allowDuplicate: false,
    isRecurring: false,
    recurringDays: [] as Event["recurringDays"],
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<{ id: string; name: string } | null>(
    null,
  );

  async function reloadEvents() {
    const listResponse = await fetch("/api/events");
    const nextEvents = (await listResponse.json()) as Event[];
    setEvents(nextEvents);
  }

  function toggleRecurringDay(
    day: (typeof recurringDayOptions)[number],
    mode: "create" | "edit",
  ) {
    if (mode === "create") {
      setForm((current) => ({
        ...current,
        recurringDays: current.recurringDays.includes(day)
          ? current.recurringDays.filter((entry) => entry !== day)
          : [...current.recurringDays, day],
      }));
      return;
    }

    setEditForm((current) => ({
      ...current,
      recurringDays: current.recurringDays.includes(day)
        ? current.recurringDays.filter((entry) => entry !== day)
        : [...current.recurringDays, day],
    }));
  }

  async function submit() {
    setEventError("");
    if (
      !form.name.trim() ||
      !form.date ||
      !form.startTime ||
      !form.endTime ||
      !form.campusId
    ) {
      setEventError("Complete the event name, date, times, and campus.");
      return;
    }

    if (form.isRecurring && form.recurringDays.length === 0) {
      setEventError("Select at least one recurring day for a recurring event.");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      await reloadEvents();
      const campusName = campuses.find((entry) => entry.id === form.campusId)?.name ?? "Assigned campus";
      pushPortalNotification({
        title: "Event added",
        detail: `${form.name} • ${campusName}`,
      });
      setShowCreateForm(false);
      setEventError("");
      setForm({
        name: "",
        date: "",
        type: "SUNDAY",
        sundayService: "NONE",
        startTime: "",
        endTime: "",
        campusId: campuses[0]?.id ?? "",
        allowDuplicate: false,
        isRecurring: false,
        recurringDays: [],
      });
    } else {
      const raw = await response.text();
      setEventError(readApiError(raw, "Unable to create event."));
    }

    setIsSubmitting(false);
  }

  function openEditEvent(event: Event) {
    setEditingEvent(event);
    setEditForm({
      name: event.name,
      date: event.date,
      type: event.type,
      sundayService: event.sundayService,
      startTime: event.startTime,
      endTime: event.endTime,
      campusId: event.campusId,
      allowDuplicate: event.allowDuplicate,
      isRecurring: event.isRecurring,
      recurringDays: event.recurringDays,
    });
  }

  async function saveEventEdits() {
    if (!editingEvent) {
      return;
    }

    setEventError("");
    if (
      !editForm.name.trim() ||
      !editForm.date ||
      !editForm.startTime ||
      !editForm.endTime ||
      !editForm.campusId
    ) {
      setEventError("Complete the event name, date, times, and campus.");
      return;
    }

    if (editForm.isRecurring && editForm.recurringDays.length === 0) {
      setEventError("Select at least one recurring day for a recurring event.");
      return;
    }

    setIsSavingEdit(true);
    const response = await fetch("/api/events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingEvent.id,
        ...editForm,
      }),
    });

    if (response.ok) {
      await reloadEvents();
      setEditingEvent(null);
      setEventError("");
    } else {
      const raw = await response.text();
      setEventError(readApiError(raw, "Unable to update event."));
    }

    setIsSavingEdit(false);
  }

  async function removeEvent(eventId: string) {
    setEventError("");
    setIsDeletingId(eventId);
    const response = await fetch("/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventId }),
    });

    if (response.ok) {
      await reloadEvents();
    } else {
      const raw = await response.text();
      setEventError(readApiError(raw, "Unable to delete event."));
    }

    setIsDeletingId(null);
  }

  return (
    <div className="space-y-4">
      <Panel title="Event Schedule">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Create, edit, delete, and manage recurring services or rehearsals.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              <CirclePlus className="h-4 w-4" />
              Add Event
            </button>
          </div>

          <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              onClick={() => openEditEvent(event)}
              className="cursor-pointer rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4 transition hover:bg-slate-100/90"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{event.name}</p>
                  <p className="text-sm text-slate-500">
                    {event.date} · {event.startTime} - {event.endTime}
                  </p>
                  {event.isRecurring && event.recurringDays.length > 0 ? (
                    <p className="mt-2 text-xs text-violet-700">
                      Recurs on {event.recurringDays.map((day) => formatEnum(day)).join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">
                    <p>{formatEnum(event.type)}</p>
                    <p>{event.sundayService !== "NONE" ? event.sundayService : "General"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      setPendingDeleteEvent({ id: event.id, name: event.name });
                    }}
                    disabled={isDeletingId === event.id}
                    className="mt-3 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                  >
                    {isDeletingId === event.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </Panel>

      {showCreateForm ? (
        <InlineDialog title="Add Event" onClose={() => setShowCreateForm(false)}>
          <div className="mb-4 rounded-[18px] border border-[var(--line)] bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            Turn on recurring events and choose the service day or rehearsal day once, instead of
            re-adding the same schedule every week.
          </div>
          {eventError ? (
            <div className="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {eventError}
            </div>
          ) : null}
          <div className="rounded-[22px] border border-[var(--line)] bg-white/80 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Event Name">
                <Input
                  placeholder="Enter event name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </Field>
              <Field label="Start Time">
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </Field>
              <Field label="End Time">
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                />
              </Field>
              <Field label="Campus">
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
              </Field>
              <Field label="Event Type">
                <Select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  <option value="REHEARSAL">Rehearsal</option>
                  <option value="SUNDAY">Sunday</option>
                  <option value="SPECIAL">Special</option>
                </Select>
              </Field>
              <Field label="Sunday Service Slot">
                <Select
                  value={form.sundayService}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sundayService: event.target.value }))
                  }
                >
                  <option value="NONE">None</option>
                  <option value="AM1">AM1</option>
                  <option value="AM2">AM2</option>
                  <option value="PM">PM</option>
                </Select>
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isRecurring}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isRecurring: event.target.checked,
                    recurringDays: event.target.checked ? current.recurringDays : [],
                  }))
                }
              />
              Make this a recurring event
            </label>
            {form.isRecurring ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">Recurring Days</p>
                <div className="flex flex-wrap gap-2">
                  {recurringDayOptions.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleRecurringDay(day, "create")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        form.recurringDays.includes(day)
                          ? "border-violet-300 bg-violet-100 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {formatEnum(day)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.allowDuplicate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, allowDuplicate: event.target.checked }))
                }
              />
              Allow duplicate check-ins
            </label>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setEventError("");
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Create Event"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}

      {editingEvent ? (
        <InlineDialog title="Edit Event" onClose={() => setEditingEvent(null)}>
          {eventError ? (
            <div className="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {eventError}
            </div>
          ) : null}
          <div className="rounded-[22px] border border-[var(--line)] bg-white/80 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Event Name">
                <Input
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
              </Field>
              <Field label="Start Time">
                <Input
                  type="time"
                  value={editForm.startTime}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </Field>
              <Field label="End Time">
                <Input
                  type="time"
                  value={editForm.endTime}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, endTime: event.target.value }))
                  }
                />
              </Field>
              <Field label="Campus">
                <Select
                  value={editForm.campusId}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, campusId: event.target.value }))
                  }
                >
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Event Type">
                <Select
                  value={editForm.type}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, type: event.target.value }))
                  }
                >
                  <option value="REHEARSAL">Rehearsal</option>
                  <option value="SUNDAY">Sunday</option>
                  <option value="SPECIAL">Special</option>
                </Select>
              </Field>
              <Field label="Sunday Service Slot">
                <Select
                  value={editForm.sundayService}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      sundayService: event.target.value,
                    }))
                  }
                >
                  <option value="NONE">None</option>
                  <option value="AM1">AM1</option>
                  <option value="AM2">AM2</option>
                  <option value="PM">PM</option>
                </Select>
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editForm.isRecurring}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    isRecurring: event.target.checked,
                    recurringDays: event.target.checked ? current.recurringDays : [],
                  }))
                }
              />
              Make this a recurring event
            </label>
            {editForm.isRecurring ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-slate-700">Recurring Days</p>
                <div className="flex flex-wrap gap-2">
                  {recurringDayOptions.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleRecurringDay(day, "edit")}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        editForm.recurringDays.includes(day)
                          ? "border-violet-300 bg-violet-100 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {formatEnum(day)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editForm.allowDuplicate}
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    allowDuplicate: event.target.checked,
                  }))
                }
              />
              Allow duplicate check-ins
            </label>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setEditingEvent(null);
                setEventError("");
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button type="button" onClick={() => void saveEventEdits()} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {pendingDeleteEvent ? (
        <ConfirmDialog
          title="Delete Event"
          message={`Delete ${pendingDeleteEvent.name}?`}
          isLoading={isDeletingId === pendingDeleteEvent.id}
          onClose={() => setPendingDeleteEvent(null)}
          onConfirm={async () => {
            await removeEvent(pendingDeleteEvent.id);
            setPendingDeleteEvent(null);
          }}
        />
      ) : null}
    </div>
  );
}

export function AccessView({
  accessPoints,
  setAccessPoints,
  permissions,
  setPermissions,
  accessLogs,
  setAccessLogs,
  volunteers,
  departments,
  sections,
  campuses,
}: {
  accessPoints: AccessPoint[];
  setAccessPoints: React.Dispatch<React.SetStateAction<AccessPoint[]>>;
  permissions: AccessPermission[];
  setPermissions: React.Dispatch<React.SetStateAction<AccessPermission[]>>;
  accessLogs: AccessLog[];
  setAccessLogs: React.Dispatch<React.SetStateAction<AccessLog[]>>;
  volunteers: Volunteer[];
  departments: Department[];
  sections: Section[];
  campuses: Snapshot["campuses"];
}) {
  const [portalVolunteers, setPortalVolunteers] = useState(volunteers);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<AccessPoint | null>(null);
  const [showPermissionForm, setShowPermissionForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<AccessPermission | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [form, setForm] = useState({
    name: "",
    location: "",
    campusId: "",
    color: "#22c55e",
    isActive: true,
    volunteerIds: [] as string[],
    sectionIds: [] as string[],
    excludedVolunteerIdsBySection: {} as Record<string, string[]>,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    campusId: "",
    color: "#22c55e",
    isActive: true,
    volunteerIds: [] as string[],
    sectionIds: [] as string[],
    excludedVolunteerIdsBySection: {} as Record<string, string[]>,
  });
  const [permissionForm, setPermissionForm] = useState({
    accessPointId: accessPoints[0]?.id ?? "",
    departmentId: "",
    sectionId: "",
    role: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSavingPermission, setIsSavingPermission] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingPermissionId, setDeletingPermissionId] = useState<string | null>(null);
  const [pendingDeletePoint, setPendingDeletePoint] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [pendingDeletePermission, setPendingDeletePermission] = useState<{
    id: string;
    name: string;
  } | null>(null);

  function readApiError(raw: string, fallback: string) {
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

  const filteredAccessPoints = useMemo(() => {
    return accessPoints.filter((point) => {
      const matchesSearch =
        point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campuses.find((campus) => campus.id === point.campusId)?.name ?? "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && point.isActive) ||
        (statusFilter === "INACTIVE" && !point.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [accessPoints, campuses, searchTerm, statusFilter]);

  const availablePermissionSections = useMemo(
    () => sections.filter((section) => section.departmentId === permissionForm.departmentId),
    [permissionForm.departmentId, sections],
  );
  const availableCreateVolunteers = useMemo(
    () =>
      form.campusId
        ? portalVolunteers.filter((volunteer) => {
            const section = sections.find((entry) => entry.id === volunteer.sectionId);
            const departmentId = section?.departmentId;
            const department = departmentId ? departments.find((entry) => entry.id === departmentId) : undefined;
            return department?.campusId === form.campusId;
          })
        : portalVolunteers,
    [departments, form.campusId, portalVolunteers, sections],
  );
  const availableEditVolunteers = useMemo(
    () =>
      editForm.campusId
        ? portalVolunteers.filter((volunteer) => {
            const section = sections.find((entry) => entry.id === volunteer.sectionId);
            const departmentId = section?.departmentId;
            const department = departmentId ? departments.find((entry) => entry.id === departmentId) : undefined;
            return department?.campusId === editForm.campusId;
          })
        : portalVolunteers,
    [departments, editForm.campusId, portalVolunteers, sections],
  );
  const availableCreateSections = useMemo(
    () => form.campusId ? sections.filter((section) => departments.some((department) => department.id === section.departmentId && department.campusId === form.campusId)) : [],
    [departments, form.campusId, sections],
  );
  const availableEditSections = useMemo(
    () => editForm.campusId ? sections.filter((section) => departments.some((department) => department.id === section.departmentId && department.campusId === editForm.campusId)) : [],
    [departments, editForm.campusId, sections],
  );

  function filterVolunteerIdsByCampus(volunteerIds: string[], campusId: string) {
    if (!campusId) {
      return volunteerIds;
    }

    return volunteerIds.filter((volunteerId) => {
      const volunteer = portalVolunteers.find((entry) => entry.id === volunteerId);
      const section = volunteer ? sections.find((entry) => entry.id === volunteer.sectionId) : undefined;
      const departmentId = section?.departmentId;
      const department = departmentId ? departments.find((entry) => entry.id === departmentId) : undefined;
      return department?.campusId === campusId;
    });
  }

  function filterSectionAccessByCampus(sectionIds: string[], exclusions: Record<string, string[]>, campusId: string) {
    const nextSectionIds = campusId ? sectionIds.filter((sectionId) => {
      const section = sections.find((entry) => entry.id === sectionId);
      return departments.some((department) => department.id === section?.departmentId && department.campusId === campusId);
    }) : sectionIds;
    return { sectionIds: nextSectionIds, excludedVolunteerIdsBySection: Object.fromEntries(nextSectionIds.map((id) => [id, exclusions[id] ?? []])) };
  }

  function toggleSectionAccess(
    current: { sectionIds: string[]; excludedVolunteerIdsBySection: Record<string, string[]> },
    sectionId: string,
  ) {
    const selected = current.sectionIds.includes(sectionId);
    const sectionIds = selected ? current.sectionIds.filter((id) => id !== sectionId) : [...current.sectionIds, sectionId];
    return {
      sectionIds,
      excludedVolunteerIdsBySection: Object.fromEntries(sectionIds.map((id) => [id, current.excludedVolunteerIdsBySection[id] ?? []])),
    };
  }

  function toggleSectionMemberExclusion(
    current: { excludedVolunteerIdsBySection: Record<string, string[]> },
    sectionId: string,
    volunteerId: string,
  ) {
    const excludedIds = current.excludedVolunteerIdsBySection[sectionId] ?? [];
    return {
      excludedVolunteerIdsBySection: {
        ...current.excludedVolunteerIdsBySection,
        [sectionId]: excludedIds.includes(volunteerId)
          ? excludedIds.filter((id) => id !== volunteerId)
          : [...excludedIds, volunteerId],
      },
    };
  }

  function resetForm() {
    setForm({
      name: "",
      location: "",
      campusId: campuses[0]?.id ?? "",
      color: "#22c55e",
      isActive: true,
      volunteerIds: [],
      sectionIds: [],
      excludedVolunteerIdsBySection: {},
    });
  }

  function openEditPoint(point: AccessPoint) {
    setEditingPoint(point);
    const linkedVolunteerIds = portalVolunteers
      .filter((volunteer) => volunteer.accessPointIds.includes(point.id))
      .map((volunteer) => volunteer.id);
    const sectionPermissions = permissions.filter((permission) => permission.accessPointId === point.id && permission.sectionId);
    setEditForm({
      name: point.name,
      location: point.location,
      campusId: point.campusId ?? "",
      color: point.color || "#22c55e",
      isActive: point.isActive,
      volunteerIds: linkedVolunteerIds,
      sectionIds: sectionPermissions.map((permission) => permission.sectionId as string),
      excludedVolunteerIdsBySection: Object.fromEntries(sectionPermissions.map((permission) => [permission.sectionId as string, permission.excludedVolunteerIds ?? []])),
    });
  }

  function updateVolunteerAssignments(accessPointId: string, volunteerIds: string[]) {
    const selectedIds = new Set(volunteerIds);
    setPortalVolunteers((current) =>
      current.map((volunteer) => {
        const hasAccessPoint = volunteer.accessPointIds.includes(accessPointId);
        const shouldHaveAccessPoint = selectedIds.has(volunteer.id);

        if (hasAccessPoint === shouldHaveAccessPoint) {
          return volunteer;
        }

        return {
          ...volunteer,
          accessPointIds: shouldHaveAccessPoint
            ? Array.from(new Set([...volunteer.accessPointIds, accessPointId]))
            : volunteer.accessPointIds.filter((entry) => entry !== accessPointId),
        };
      }),
    );
  }

  function resetPermissionForm() {
    setPermissionForm({
      accessPointId: accessPoints[0]?.id ?? "",
      departmentId: "",
      sectionId: "",
      role: "",
    });
  }

  async function createPoint() {
    setAccessError("");
    if (!form.name.trim() || !form.location.trim()) {
      setAccessError("Access point name and location are required.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        const listResponse = await fetch("/api/access");
        const nextPoints = (await listResponse.json()) as AccessPoint[];
        setAccessPoints(nextPoints);
        const createdPoint = nextPoints.find(
          (point) =>
            point.name === form.name &&
            point.location === form.location &&
            point.campusId === form.campusId &&
            point.color === form.color,
        );
        if (createdPoint) {
          updateVolunteerAssignments(createdPoint.id, form.volunteerIds);
        }
        const campusName = campuses.find((campus) => campus.id === form.campusId)?.name ?? "Assigned campus";
        pushPortalNotification({
          title: "Access point added",
          detail: `${form.name} • ${campusName}`,
        });
        resetForm();
        setAccessError("");
        setShowCreateForm(false);
      } else {
        const raw = await response.text();
        setAccessError(readApiError(raw, "Unable to create access point."));
      }
    } catch {
      setAccessError("Unable to reach the server while creating the access point.");
    }
    setIsCreating(false);
  }

  async function savePointEdits() {
    if (!editingPoint) {
      return;
    }

    setAccessError("");
    if (!editForm.name.trim() || !editForm.location.trim()) {
      setAccessError("Access point name and location are required.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch("/api/access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingPoint.id, ...editForm }),
      });

      if (response.ok) {
        const listResponse = await fetch("/api/access");
        const nextPoints = (await listResponse.json()) as AccessPoint[];
        setAccessPoints(nextPoints);
        updateVolunteerAssignments(editingPoint.id, editForm.volunteerIds);
        setAccessError("");
        setEditingPoint(null);
      } else {
        const raw = await response.text();
        setAccessError(readApiError(raw, "Unable to update access point."));
      }
    } catch {
      setAccessError("Unable to reach the server while updating the access point.");
    }
    setIsSavingEdit(false);
  }

  async function removePoint(accessPointId: string) {
    setAccessError("");
    setDeletingId(accessPointId);
    try {
      const response = await fetch(`/api/access?id=${accessPointId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAccessPoints((current) => current.filter((point) => point.id !== accessPointId));
        setAccessLogs((current) => current.filter((log) => log.accessPointId !== accessPointId));
        updateVolunteerAssignments(accessPointId, []);
        setAccessError("");

        if (editingPoint?.id === accessPointId) {
          setEditingPoint(null);
        }
      } else {
        const raw = await response.text();
        setAccessError(readApiError(raw, "Unable to delete access point."));
      }
    } catch {
      setAccessError("Unable to reach the server while deleting the access point.");
    }
    setDeletingId(null);
  }

  async function createPermission() {
    setAccessError("");
    setIsSavingPermission(true);
    try {
      const response = await fetch("/api/access-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessPointId: permissionForm.accessPointId,
          departmentId: permissionForm.departmentId || undefined,
          sectionId: permissionForm.sectionId || undefined,
          role: permissionForm.role || undefined,
        }),
      });

      if (response.ok) {
        const listResponse = await fetch("/api/access-permissions");
        const nextPermissions = (await listResponse.json()) as AccessPermission[];
        setPermissions(nextPermissions);
        resetPermissionForm();
        setAccessError("");
        setShowPermissionForm(false);
      } else {
        const raw = await response.text();
        setAccessError(readApiError(raw, "Unable to create access permission."));
      }
    } catch {
      setAccessError("Unable to reach the server while creating the access permission.");
    }
    setIsSavingPermission(false);
  }

  async function savePermissionEdits() {
    if (!editingPermission) {
      return;
    }

    setAccessError("");
    setIsSavingPermission(true);
    try {
      const response = await fetch("/api/access-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPermission.id,
          accessPointId: permissionForm.accessPointId,
          departmentId: permissionForm.departmentId || undefined,
          sectionId: permissionForm.sectionId || undefined,
          role: permissionForm.role || undefined,
        }),
      });

      if (response.ok) {
        const listResponse = await fetch("/api/access-permissions");
        const nextPermissions = (await listResponse.json()) as AccessPermission[];
        setPermissions(nextPermissions);
        setAccessError("");
        setEditingPermission(null);
        resetPermissionForm();
      } else {
        const raw = await response.text();
        setAccessError(readApiError(raw, "Unable to update access permission."));
      }
    } catch {
      setAccessError("Unable to reach the server while updating the access permission.");
    }
    setIsSavingPermission(false);
  }

  async function removePermission(permissionId: string) {
    setAccessError("");
    setDeletingPermissionId(permissionId);
    try {
      const response = await fetch(`/api/access-permissions?id=${permissionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPermissions((current) => current.filter((permission) => permission.id !== permissionId));
        setAccessError("");
        if (editingPermission?.id === permissionId) {
          setEditingPermission(null);
        }
      } else {
        const raw = await response.text();
        setAccessError(readApiError(raw, "Unable to delete access permission."));
      }
    } catch {
      setAccessError("Unable to reach the server while deleting the access permission.");
    }
    setDeletingPermissionId(null);
  }

  return (
    <div className="space-y-4">
      <Panel title="Access Points">
        {accessError ? (
          <div className="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {accessError}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1">
            <Input
              placeholder="Search access points"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>
          <Button type="button" onClick={() => setShowCreateForm(true)}>
            <CirclePlus className="mr-2 h-4 w-4" />
            Add Access Point
          </Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white/88">
          <div className="grid grid-cols-[1.4fr_1.2fr_0.7fr_0.9fr] gap-3 border-b border-[var(--line)] bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <p>Access Point</p>
            <p>Location</p>
            <p>Status</p>
            <p className="text-right">Action</p>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {filteredAccessPoints.map((point) => (
              <div
                key={point.id}
                onClick={() => openEditPoint(point)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openEditPoint(point);
                  }
                }}
                role="button"
                tabIndex={0}
                className="grid cursor-pointer grid-cols-[1.4fr_1.2fr_0.7fr_0.9fr] gap-3 px-4 py-4 text-left transition hover:bg-slate-50"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: point.color || "#22c55e" }}
                    />
                    <p className="font-medium text-slate-900">{point.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{point.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">{point.location}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {campuses.find((campus) => campus.id === point.campusId)?.name ?? "No campus linked"}
                  </p>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      point.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {point.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDeletePoint({ id: point.id, name: point.name });
                    }}
                    disabled={deletingId === point.id}
                    className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === point.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
            {filteredAccessPoints.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No access points match the current search or filter.
              </div>
            ) : null}
          </div>
        </div>
      </Panel>

      {false ? (
        <Panel title="Recent Access Activity">
        <div className="space-y-3">
          {accessLogs.map((log) => {
            const point = accessPoints.find((item) => item.id === log.accessPointId);
            const volunteer = volunteers.find((item) => item.id === log.volunteerId);

            return (
              <div key={log.id} className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{volunteer?.fullName ?? "Volunteer"}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {point?.name ?? log.accessPointId} · {point?.location ?? "Access point"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      log.status === "GRANTED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {formatEnum(log.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {new Date(log.scannedAt).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
        </Panel>
      ) : null}

      {showCreateForm ? (
        <InlineDialog
          title="Add Access Point"
          onClose={() => {
            setAccessError("");
            setShowCreateForm(false);
          }}
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Create a volunteer access location for controlled entry, backstage access, or team-only spaces.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Access Point Name">
                <Input
                  placeholder="Enter access point name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Location">
                <Input
                  placeholder="Enter campus location"
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </Field>
              <Field label="Campus">
                <Select
                  value={form.campusId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      campusId: event.target.value,
                      volunteerIds: filterVolunteerIdsByCampus(current.volunteerIds, event.target.value),
                      ...filterSectionAccessByCampus(current.sectionIds, current.excludedVolunteerIdsBySection, event.target.value),
                    }))
                  }
                >
                  <option value="">No campus linked</option>
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Access Color">
                <div className="flex items-center gap-3 rounded-[20px] border border-[var(--line)] bg-slate-50 px-4 py-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, color: event.target.value }))
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                    aria-label="Choose access point color"
                  />
                  <Input
                    value={form.color}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, color: event.target.value }))
                    }
                    placeholder="#22c55e"
                    className="flex-1"
                  />
                </div>
              </Field>
              <div className="md:col-span-2">
                <Field label="Volunteers With Direct Access">
                  <SearchableVolunteerMultiSelect
                    volunteers={availableCreateVolunteers}
                    selectedIds={form.volunteerIds}
                    onToggle={(volunteerId) =>
                      setForm((current) => ({
                        ...current,
                        volunteerIds: current.volunteerIds.includes(volunteerId)
                          ? current.volunteerIds.filter((entry) => entry !== volunteerId)
                          : [...current.volunteerIds, volunteerId],
                      }))
                    }
                    emptyLabel="No volunteers matched your search or campus selection."
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Sections With Direct Access">
                  <DirectSectionAccessEditor
                    sections={availableCreateSections}
                    volunteers={availableCreateVolunteers}
                    selectedSectionIds={form.sectionIds}
                    excludedVolunteerIdsBySection={form.excludedVolunteerIdsBySection}
                    onToggleSection={(sectionId) => setForm((current) => ({ ...current, ...toggleSectionAccess(current, sectionId) }))}
                    onToggleExcludedVolunteer={(sectionId, volunteerId) => setForm((current) => ({ ...current, ...toggleSectionMemberExclusion(current, sectionId, volunteerId) }))}
                  />
                </Field>
              </div>
            </div>
            <label className="mt-5 flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Set this access point as active
            </label>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setAccessError("");
                setShowCreateForm(false);
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button type="button" onClick={() => void createPoint()} disabled={isCreating}>
              {isCreating ? "Saving..." : "Create Access Point"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}

      {editingPoint ? (
        <InlineDialog
          title="Edit Access Point"
          onClose={() => {
            setAccessError("");
            setEditingPoint(null);
          }}
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Update the access point details, location wording, and whether scanning should remain active.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Access Point Name">
                <Input
                  placeholder="Enter access point name"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Location">
                <Input
                  placeholder="Enter campus location"
                  value={editForm.location}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </Field>
              <Field label="Campus">
                <Select
                  value={editForm.campusId}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      campusId: event.target.value,
                      volunteerIds: filterVolunteerIdsByCampus(current.volunteerIds, event.target.value),
                      ...filterSectionAccessByCampus(current.sectionIds, current.excludedVolunteerIdsBySection, event.target.value),
                    }))
                  }
                >
                  <option value="">No campus linked</option>
                  {campuses.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Access Color">
                <div className="flex items-center gap-3 rounded-[20px] border border-[var(--line)] bg-slate-50 px-4 py-3">
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, color: event.target.value }))
                    }
                    className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                    aria-label="Choose access point color"
                  />
                  <Input
                    value={editForm.color}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, color: event.target.value }))
                    }
                    placeholder="#22c55e"
                    className="flex-1"
                  />
                </div>
              </Field>
              <div className="md:col-span-2">
                <Field label="Volunteers With Direct Access">
                  <SearchableVolunteerMultiSelect
                    volunteers={availableEditVolunteers}
                    selectedIds={editForm.volunteerIds}
                    onToggle={(volunteerId) =>
                      setEditForm((current) => ({
                        ...current,
                        volunteerIds: current.volunteerIds.includes(volunteerId)
                          ? current.volunteerIds.filter((entry) => entry !== volunteerId)
                          : [...current.volunteerIds, volunteerId],
                      }))
                    }
                    emptyLabel="No volunteers matched your search or campus selection."
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Sections With Direct Access">
                  <DirectSectionAccessEditor
                    sections={availableEditSections}
                    volunteers={availableEditVolunteers}
                    selectedSectionIds={editForm.sectionIds}
                    excludedVolunteerIdsBySection={editForm.excludedVolunteerIdsBySection}
                    onToggleSection={(sectionId) => setEditForm((current) => ({ ...current, ...toggleSectionAccess(current, sectionId) }))}
                    onToggleExcludedVolunteer={(sectionId, volunteerId) => setEditForm((current) => ({ ...current, ...toggleSectionMemberExclusion(current, sectionId, volunteerId) }))}
                  />
                </Field>
              </div>
            </div>
            <label className="mt-5 flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Keep this access point active for scanners
            </label>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setAccessError("");
                setEditingPoint(null);
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button type="button" onClick={() => void savePointEdits()} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}

      {showPermissionForm ? (
        <InlineDialog
          title="Add Access Permission"
          onClose={() => {
            setAccessError("");
            setShowPermissionForm(false);
            resetPermissionForm();
          }}
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Link an access point to a department, section, or role so approved volunteers can scan in.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Access Point">
                <Select
                  value={permissionForm.accessPointId}
                  onChange={(event) =>
                    setPermissionForm((current) => ({ ...current, accessPointId: event.target.value }))
                  }
                >
                  {accessPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role">
                <Select
                  value={permissionForm.role}
                  onChange={(event) =>
                    setPermissionForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="">Any role</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="SECTION_LEADER">Section Leader</option>
                  <option value="VOLUNTEER">Volunteer</option>
                </Select>
              </Field>
              <Field label="Department">
                <Select
                  value={permissionForm.departmentId}
                  onChange={(event) =>
                    setPermissionForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                      sectionId: "",
                    }))
                  }
                >
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section">
                <Select
                  value={permissionForm.sectionId}
                  onChange={(event) =>
                    setPermissionForm((current) => ({ ...current, sectionId: event.target.value }))
                  }
                >
                  <option value="">All sections</option>
                  {availablePermissionSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setAccessError("");
                setShowPermissionForm(false);
                resetPermissionForm();
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button type="button" onClick={() => void createPermission()} disabled={isSavingPermission}>
              {isSavingPermission ? "Saving..." : "Create Permission"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}

      {editingPermission ? (
        <InlineDialog
          title="Edit Access Permission"
          onClose={() => {
            setAccessError("");
            setEditingPermission(null);
          }}
        >
          <div className="rounded-[24px] border border-[var(--line)] bg-white/82 p-5">
            <p className="text-sm text-slate-600">
              Update the access rule for this point by changing the department, section, or role scope.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Access Point">
                <Select
                  value={permissionForm.accessPointId}
                  onChange={(event) =>
                    setPermissionForm((current) => ({ ...current, accessPointId: event.target.value }))
                  }
                >
                  {accessPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Role">
                <Select
                  value={permissionForm.role}
                  onChange={(event) =>
                    setPermissionForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="">Any role</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DEPARTMENT_HEAD">Department Head</option>
                  <option value="SECTION_LEADER">Section Leader</option>
                  <option value="VOLUNTEER">Volunteer</option>
                </Select>
              </Field>
              <Field label="Department">
                <Select
                  value={permissionForm.departmentId}
                  onChange={(event) =>
                    setPermissionForm((current) => ({
                      ...current,
                      departmentId: event.target.value,
                      sectionId: "",
                    }))
                  }
                >
                  <option value="">All departments</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Section">
                <Select
                  value={permissionForm.sectionId}
                  onChange={(event) =>
                    setPermissionForm((current) => ({ ...current, sectionId: event.target.value }))
                  }
                >
                  <option value="">All sections</option>
                  {availablePermissionSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={() => {
                setAccessError("");
                setEditingPermission(null);
              }}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <Button type="button" onClick={() => void savePermissionEdits()} disabled={isSavingPermission}>
              {isSavingPermission ? "Saving..." : "Save Permission"}
            </Button>
          </div>
        </InlineDialog>
      ) : null}
      {pendingDeletePoint ? (
        <ConfirmDialog
          title="Delete Access Point"
          message={`Delete ${pendingDeletePoint.name}?`}
          isLoading={deletingId === pendingDeletePoint.id}
          onClose={() => setPendingDeletePoint(null)}
          onConfirm={async () => {
            await removePoint(pendingDeletePoint.id);
            setPendingDeletePoint(null);
          }}
        />
      ) : null}
      {pendingDeletePermission ? (
        <ConfirmDialog
          title="Delete Access Permission"
          message={`Delete this permission for ${pendingDeletePermission.name}?`}
          isLoading={deletingPermissionId === pendingDeletePermission.id}
          onClose={() => setPendingDeletePermission(null)}
          onConfirm={async () => {
            await removePermission(pendingDeletePermission.id);
            setPendingDeletePermission(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function ReportsView({
  departments,
  sections,
  volunteers,
  attendances,
}: {
  departments: Department[];
  sections: Section[];
  volunteers: Volunteer[];
  attendances: Attendance[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("consistency");

  const rows = useMemo(() => {
    const mapped = departments.map((department) => {
      const departmentSections = sections.filter((section) => section.departmentId === department.id);
      const sectionIds = departmentSections.map((section) => section.id);
      const team = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId));
      const entries = attendances.filter((attendance) =>
        team.some((member) => member.id === attendance.volunteerId),
      );

      return {
        id: department.id,
        name: department.name,
        sectionCount: departmentSections.length,
        volunteers: team.length,
        attendances: entries.length,
        consistency: team.length ? Math.round((entries.length / team.length) * 100) : 0,
      };
    });

    const filtered = mapped.filter((row) =>
      row.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return filtered.sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      if (sortBy === "volunteers") return right.volunteers - left.volunteers;
      if (sortBy === "attendances") return right.attendances - left.attendances;
      return right.consistency - left.consistency;
    });
  }, [attendances, departments, searchTerm, sections, sortBy, volunteers]);

  const topDepartment = rows[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Departments" value={departments.length} />
        <Stat label="Sections" value={sections.length} />
        <Stat label="Attendance Logs" value={attendances.length} />
        <Stat
          label="Top Consistency"
          value={topDepartment ? `${topDepartment.name} ${topDepartment.consistency}%` : "No data"}
        />
      </div>
      <Panel title="Department Reporting">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            placeholder="Search departments"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="consistency">Sort by consistency</option>
            <option value="volunteers">Sort by volunteers</option>
            <option value="attendances">Sort by attendance logs</option>
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
                <p className="text-sm text-slate-600">{row.volunteers}</p>
                <p className="text-sm text-slate-600">{row.attendances}</p>
                <p className="text-sm font-medium text-slate-900">{row.consistency}%</p>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                No departments match the current search.
              </div>
            ) : null}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function DatabaseView({
  campuses,
  departments,
  sections,
  volunteers,
}: {
  campuses: Snapshot["campuses"];
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
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Campus Structure">
        <div className="space-y-3">
          {campuses.map((campus) => {
            const campusDepartments = departments.filter((department) => department.campusId === campus.id);
            const campusSections = sections.filter((section) =>
              campusDepartments.some((department) => department.id === section.departmentId),
            );
            return (
              <div key={campus.id} className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
                <p className="font-medium text-slate-900">{campus.name}</p>
                <p className="text-sm text-slate-500">{campus.city}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {campusDepartments.length} departments · {campusSections.length} sections
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Volunteer Record Count">
        <div className="grid gap-3 md:grid-cols-2">
          <Stat label="Campuses" value={campuses.length} />
          <Stat label="Departments" value={departments.length} />
          <Stat label="Sections" value={sections.length} />
          <Stat label="Volunteers" value={volunteers.length} />
        </div>
      </Panel>
    </div>
  );
}

function DepartmentsView({
  departments,
  sections,
  volunteers,
}: {
  departments: Department[];
  sections: Section[];
  volunteers: Volunteer[];
}) {
  return (
    <Panel title="Department Breakdown">
      <div className="space-y-3">
        {departments.map((department) => {
          const sectionIds = sections.filter((section) => section.departmentId === department.id).map((section) => section.id);
          const teamSize = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId)).length;
          return (
            <div key={department.id} className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{department.name}</p>
                <p className="text-sm text-slate-500">{teamSize} volunteers</p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SectionsView({
  sections,
  volunteers,
}: {
  sections: Section[];
  volunteers: Volunteer[];
}) {
  return (
    <Panel title="Section Breakdown">
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.id} className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-900">{section.name}</p>
              <p className="text-sm text-slate-500">
                {volunteers.filter((volunteer) => volunteer.sectionId === section.id).length} volunteers
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AttendanceView({
  attendances,
  events,
  volunteers,
}: {
  attendances: Attendance[];
  events: Event[];
  volunteers: Volunteer[];
}) {
  return (
    <Panel title="Attendance History">
      <div className="space-y-3">
        {attendances.map((entry) => {
          const event = events.find((item) => item.id === entry.eventId);
          const volunteer = volunteers.find((item) => item.id === entry.volunteerId);
          return (
            <div key={entry.id} className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{volunteer?.fullName ?? "Volunteer"}</p>
                  <p className="text-sm text-slate-500">{event?.name ?? "Event"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-700">{formatEnum(entry.status)}</p>
                  <p className="text-xs text-slate-500">{new Date(entry.scannedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function CampusesView({
  campuses,
  departments,
  sections,
}: {
  campuses: Snapshot["campuses"];
  departments: Department[];
  sections: Section[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {campuses.map((campus) => {
        const campusDepartments = departments.filter((department) => department.campusId === campus.id);
        const campusSections = sections.filter((section) =>
          campusDepartments.some((department) => department.id === section.departmentId),
        );
        return (
          <Panel key={campus.id} title={campus.name}>
            <div className="grid gap-3 md:grid-cols-2">
              <Stat label="City" value={campus.city} />
              <Stat label="Departments" value={campusDepartments.length} />
              <Stat label="Sections" value={campusSections.length} />
              <Stat label="Campus ID" value={campus.id} />
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* eslint-enable @typescript-eslint/no-unused-vars */
export function DashboardLauncher({
  snapshot,
  currentUser,
}: {
  snapshot: Snapshot;
  currentUser: UserAccount;
}) {
  const router = useRouter();
  const notifications = usePortalNotifications();
  const [activeUtility, setActiveUtility] = useState<"notifications" | "settings" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationActionPending, setNotificationActionPending] = useState(false);
  const departments = snapshot.departments;
  const sections = snapshot.sections;
  const volunteers = snapshot.volunteers;
  const events = snapshot.events;
  const campuses = snapshot.campuses;
  const accessPoints = snapshot.accessPoints;
  const accessLogs = snapshot.accessLogs;
  const topRef = useRef<HTMLDivElement | null>(null);
  const overviewRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveUtility(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const getToolById = (toolId: Tool["id"]) => tools.find((tool) => tool.id === toolId) ?? null;
  const scannerTool = getToolById("scanner");
  const usersTool = getToolById("users");
  const volunteerHubTool = getToolById("volunteer-hub");
  const departmentsTool = getToolById("departments");
  const subDepartmentsTool = getToolById("sub-departments");
  const sectionsTool = getToolById("sections");
  const eventsTool = getToolById("events");
  const attendanceTool = getToolById("attendance");
  const campusesTool = getToolById("campuses");
  const reportsTool = getToolById("reports");
  const accessTool = getToolById("access");
  const now = useMemo(() => new Date(), []);
  const southAfricaDateTimeLabel = formatSouthAfricaDateTime(now);
  const notificationCount = Math.min(notifications.length, 99);
  const visibleDashboardSidebarLinks = useMemo(
    () => DASHBOARD_SIDEBAR_LINKS.filter((link) => canOpenDashboardNavHref(currentUser, link.href)),
    [currentUser],
  );
  const notificationEntries = useMemo(() => {
    return notifications.map((entry) => ({
      ...entry,
      minutesAgo: Math.max(Math.round((now.getTime() - new Date(entry.createdAt).getTime()) / 60000), 0),
    }));
  }, [notifications, now]);

  function scrollToSection(ref: React.RefObject<HTMLElement | HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openToolIfAllowed(tool: Tool | null) {
    if (!tool || !canOpenTool(currentUser, tool.id)) {
      return;
    }

    const route = TOOL_ROUTE_MAP[tool.id];
    if (!route) {
      return;
    }

    setActiveUtility(null);
    setMobileMenuOpen(false);
    router.push(route);
  }

  async function handleClearAllNotifications() {
    if (notificationActionPending || notificationEntries.length === 0) {
      return;
    }

    setNotificationActionPending(true);
    try {
      await clearPortalNotifications();
    } finally {
      setNotificationActionPending(false);
    }
  }

  async function handleDeleteNotification(notificationId: string) {
    if (notificationActionPending) {
      return;
    }

    setNotificationActionPending(true);
    try {
      await deletePortalNotification(notificationId);
    } finally {
      setNotificationActionPending(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function openUtilityPanel(panel: "notifications" | "settings") {
    setActiveUtility(panel);
  }

  function openProfileSettings() {
    setProfileMenuOpen(false);
    router.push("/users");
  }

  function getSidebarButtonClass(tool: Tool | null, active = false) {
    if (active) {
      return "flex w-full items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-[15px] font-medium text-[#ffd166] transition";
    }

    if (tool) {
      return "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] text-slate-200 transition hover:bg-white/8 hover:text-white";
    }

    return "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] text-slate-500 transition";
  }

  const campusVolunteerCounts = useMemo(() => {
    return campuses.map((campus) => {
      const departmentIds = departments
        .filter((department) => department.campusId === campus.id)
        .map((department) => department.id);
      const sectionIds = sections
        .filter((section) => Boolean(section.departmentId) && departmentIds.includes(section.departmentId as string))
        .map((section) => section.id);

      return {
        campusId: campus.id,
        expected: volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId)).length,
      };
    });
  }, [campuses, departments, sections, volunteers]);

  const weekSeries = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - (6 - index));
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      const count = snapshot.attendances.filter((attendance) => {
        const scannedAt = new Date(attendance.scannedAt);
        return scannedAt >= date && scannedAt < nextDate;
      }).length;

      return {
        label: new Intl.DateTimeFormat("en-ZA", { weekday: "short" }).format(date),
        count,
      };
    });
  }, [now, snapshot.attendances]);

  const activeVolunteerCount = useMemo(() => {
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 7);
    return new Set(
      snapshot.attendances
        .filter((attendance) => new Date(attendance.scannedAt) >= cutoff)
        .map((attendance) => attendance.volunteerId),
    ).size;
  }, [now, snapshot.attendances]);

  const previousActiveVolunteerCount = useMemo(() => {
    const end = new Date(now);
    end.setDate(now.getDate() - 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    return new Set(
      snapshot.attendances
        .filter((attendance) => {
          const scannedAt = new Date(attendance.scannedAt);
          return scannedAt >= start && scannedAt < end;
        })
        .map((attendance) => attendance.volunteerId),
    ).size;
  }, [now, snapshot.attendances]);

  const attendanceRate = volunteers.length
    ? Math.round((activeVolunteerCount / volunteers.length) * 100)
    : 0;
  const attendanceDelta = attendanceRate - (
    volunteers.length
      ? Math.round((previousActiveVolunteerCount / volunteers.length) * 100)
      : 0
  );
  const activeVolunteerDelta = activeVolunteerCount - previousActiveVolunteerCount;
  const inactiveVolunteerCount = Math.max(volunteers.length - activeVolunteerCount, 0);
  const activeAccessPoints = accessPoints.filter((point) => point.isActive).length;
  const accessGrantRate = accessLogs.length
    ? Math.round((accessLogs.filter((log) => log.status === "GRANTED").length / accessLogs.length) * 100)
    : 0;
  const linePoints = buildPolylinePoints(weekSeries.map((entry) => entry.count));
  const currentHour = now.getHours();
  const greetingLabel = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const viewerFirstName = currentUser.name.trim().split(/\s+/)[0] ?? "there";

  const serviceRows = useMemo(() => {
    const sortedEvents = events
      .slice()
      .sort((left, right) => {
        const leftDate = new Date(`${left.date}T${left.startTime}`);
        const rightDate = new Date(`${right.date}T${right.startTime}`);
        return leftDate.getTime() - rightDate.getTime();
      });
    const futureEvents = sortedEvents.filter((event) => new Date(`${event.date}T${event.startTime}`) >= now);
    const source = futureEvents.length ? futureEvents : sortedEvents.slice(-3);

    return source.slice(0, 3).map((event) => {
      const checkedIn = snapshot.attendances.filter((attendance) => attendance.eventId === event.id).length;
      const expected = campusVolunteerCounts.find((entry) => entry.campusId === event.campusId)?.expected ?? volunteers.length;
      const rate = expected ? Math.min(Math.round((checkedIn / expected) * 100), 100) : 0;

      return {
        id: event.id,
        name: event.name,
        subLabel: `${formatShortDate(new Date(event.date))} · ${formatTimeLabel(event.startTime)}`,
        expected,
        checkedIn,
        rate,
        tone:
          event.sundayService === "AM1"
            ? "bg-violet-500"
            : event.sundayService === "AM2"
              ? "bg-amber-400"
              : "bg-blue-500",
      };
    });
  }, [campusVolunteerCounts, events, now, snapshot.attendances, volunteers.length]);

  const recentActivity = useMemo(() => {
    const attendanceItems = snapshot.attendances.map((attendance) => {
      const event = events.find((entry) => entry.id === attendance.eventId);
      const volunteer = volunteers.find((entry) => entry.id === attendance.volunteerId);
      const scannedAt = new Date(attendance.scannedAt);
      return {
        id: attendance.id,
        title: `${volunteer?.fullName ?? "Volunteer"} checked in`,
        detail: event ? `${event.name} · ${formatEnum(attendance.status)}` : formatEnum(attendance.status),
        minutes: Math.max(Math.round((now.getTime() - scannedAt.getTime()) / 60000), 0),
        tone: "bg-emerald-100 text-emerald-700",
      };
    });

    const accessItems = accessLogs.map((log) => {
      const accessPoint = accessPoints.find((entry) => entry.id === log.accessPointId);
      const volunteer = volunteers.find((entry) => entry.id === log.volunteerId);
      const scannedAt = new Date(log.scannedAt);
      return {
        id: log.id,
        title: `${volunteer?.fullName ?? "Volunteer"} access ${log.status.toLowerCase()}`,
        detail: accessPoint?.name ?? "Access point",
        minutes: Math.max(Math.round((now.getTime() - scannedAt.getTime()) / 60000), 0),
        tone: log.status === "GRANTED" ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700",
      };
    });

    return [...attendanceItems, ...accessItems]
      .sort((left, right) => left.minutes - right.minutes)
      .slice(0, 4);
  }, [accessLogs, accessPoints, events, now, snapshot.attendances, volunteers]);
  void recentActivity;

  const departmentPerformance = useMemo(() => {
    return departments
      .map((department) => {
        const sectionIds = sections
          .filter((section) => section.departmentId === department.id)
          .map((section) => section.id);
        const team = volunteers.filter((volunteer) => sectionIds.includes(volunteer.sectionId));
        const teamIds = team.map((volunteer) => volunteer.id);
        const attendanceCount = snapshot.attendances.filter((attendance) =>
          teamIds.includes(attendance.volunteerId),
        ).length;
        const score = team.length ? Math.min(Math.round((attendanceCount / team.length) * 10), 100) : 0;

        return {
          id: department.id,
          name: department.name,
          score,
          tone:
            score >= 90
              ? "bg-emerald-500"
              : score >= 75
                ? "bg-amber-500"
                : "bg-blue-500",
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }, [departments, sections, snapshot.attendances, volunteers]);

  const roleDistribution = useMemo(() => {
    const roleTones = ["#7c3aed", "#2563eb", "#22c55e", "#f59e0b", "#8b5cf6"];
    const rows = ["VOLUNTEER", "SECTION_LEADER", "DEPARTMENT_HEAD", "ADMIN", "SUPER_ADMIN"]
      .map((role, index) => {
        const count = volunteers.filter((volunteer) => volunteer.role === role).length;
        return {
          role,
          count,
          percentage: volunteers.length ? Math.round((count / volunteers.length) * 100) : 0,
          color: roleTones[index],
        };
      })
      .filter((row) => row.count > 0);

    const gradient = rows.length
      ? `conic-gradient(${rows
          .map((row, index) => {
            const start = rows.slice(0, index).reduce((total, item) => total + item.percentage, 0);
            const end = start + row.percentage;
            return `${row.color} ${start}% ${end}%`;
          })
          .join(", ")})`
      : "conic-gradient(#e5e7eb 0% 100%)";

    return { rows, gradient };
  }, [volunteers]);

  const utilityBody = (() => {
    if (activeUtility === "notifications") {
      return (
        <div className="space-y-4">
          <Panel title="Recent Notifications">
            {notificationEntries.length ? (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleClearAllNotifications()}
                  disabled={notificationActionPending}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear all
                </button>
              </div>
            ) : null}
            <div className="space-y-3">
              {notificationEntries.length ? (
                notificationEntries.map((entry) => (
                  <div key={entry.id} className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.detail}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <p className="pt-1 text-sm text-slate-400">{formatRelativeMinutes(entry.minutesAgo)}</p>
                        <button
                          type="button"
                          onClick={() => void handleDeleteNotification(entry.id)}
                          disabled={notificationActionPending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white text-slate-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Clear ${entry.title} notification`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 px-4 py-6 text-sm text-slate-500">
                  No recent notifications available.
                </div>
              )}
            </div>
          </Panel>
        </div>
      );
    }

    if (activeUtility === "settings") {
      return (
        <div className="space-y-4">
          <Panel title="Account Settings">
            <div className="grid gap-3 md:grid-cols-2">
              <Stat label="Name" value={currentUser.name} />
              <Stat label="Role" value={formatEnum(currentUser.role)} />
              <Stat label="User Type" value={formatEnum(currentUser.userType)} />
              <Stat label="Pages" value={currentUser.pageAccess.length} />
            </div>
          </Panel>
          <Panel title="Access Summary">
            <div className="space-y-3">
              <div className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
                <p className="text-sm font-medium text-slate-900">Email</p>
                <p className="mt-1 text-sm text-slate-500">{currentUser.email}</p>
              </div>
              <div className="rounded-[18px] border border-[var(--line)] bg-slate-50/90 p-4">
                <p className="text-sm font-medium text-slate-900">Accessible Modules</p>
                <p className="mt-1 text-sm text-slate-500">{currentUser.pageAccess.join(", ")}</p>
              </div>
            </div>
          </Panel>
          <Panel title="Device Login">
            <PasskeySettingsPanel />
          </Panel>
        </div>
      );
    }

    return null;
  })();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f7fb] pb-24 md:pb-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(10,42,88,0.12),transparent_26%),radial-gradient(circle_at_right_top,rgba(245,158,11,0.12),transparent_18%),linear-gradient(180deg,#f7f8fc_0%,#eef2f8_100%)]" />

      <div ref={topRef} className="relative z-10 flex min-h-screen">
        <aside className="hidden h-screen w-[278px] shrink-0 overflow-y-auto bg-[linear-gradient(180deg,#07203d_0%,#03152b_100%)] px-6 py-8 text-white xl:fixed xl:inset-y-0 xl:left-0 xl:flex xl:flex-col">
          <div className="flex items-center gap-3">
            <Image
              src="/crc-logo.svg"
              alt="CRC logo"
              width={44}
              height={44}
              priority
              className="h-11 w-11 object-contain"
            />
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">
              Volunteer Management
            </p>
          </div>

          <nav className="mt-10 space-y-1.5">
            <button
              type="button"
              onClick={() => scrollToSection(topRef)}
              className="flex w-full items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-[15px] font-medium text-[#ffd166] transition"
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>Dashboard</span>
            </button>
            {volunteerHubTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(volunteerHubTool)}
                disabled={!canOpenTool(currentUser, volunteerHubTool.id)}
                className={getSidebarButtonClass(volunteerHubTool)}
              >
                <UsersRound className="h-4.5 w-4.5" />
                <span>Volunteers</span>
              </button>
            ) : null}
            {attendanceTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(attendanceTool)}
                disabled={!canOpenTool(currentUser, attendanceTool.id)}
                className={getSidebarButtonClass(attendanceTool)}
              >
                <BriefcaseBusiness className="h-4.5 w-4.5" />
                <span>Attendance</span>
              </button>
            ) : null}
            {departmentsTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(departmentsTool)}
                disabled={!canOpenTool(currentUser, departmentsTool.id)}
                className={getSidebarButtonClass(departmentsTool)}
              >
                <Building2 className="h-4.5 w-4.5" />
                <span>Departments</span>
              </button>
            ) : null}
            {subDepartmentsTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(subDepartmentsTool)}
                disabled={!canOpenTool(currentUser, subDepartmentsTool.id)}
                className={getSidebarButtonClass(subDepartmentsTool)}
              >
                <Building2 className="h-4.5 w-4.5" />
                <span>Sub-Departments</span>
              </button>
            ) : null}
            {sectionsTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(sectionsTool)}
                disabled={!canOpenTool(currentUser, sectionsTool.id)}
                className={getSidebarButtonClass(sectionsTool)}
              >
                <NotebookPen className="h-4.5 w-4.5" />
                <span>Sections</span>
              </button>
            ) : null}
            {campusesTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(campusesTool)}
                disabled={!canOpenTool(currentUser, campusesTool.id)}
                className={getSidebarButtonClass(campusesTool)}
              >
                <MapPin className="h-4.5 w-4.5" />
                <span>Campuses</span>
              </button>
            ) : null}
            {reportsTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(reportsTool)}
                disabled={!canOpenTool(currentUser, reportsTool.id)}
                className={getSidebarButtonClass(reportsTool)}
              >
                <FileBarChart2 className="h-4.5 w-4.5" />
                <span>Reports</span>
              </button>
            ) : null}
            {eventsTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(eventsTool)}
                disabled={!canOpenTool(currentUser, eventsTool.id)}
                className={getSidebarButtonClass(eventsTool)}
              >
                <CalendarDays className="h-4.5 w-4.5" />
                <span>Events & Services</span>
              </button>
            ) : null}
            {scannerTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(scannerTool)}
                disabled={!canOpenTool(currentUser, scannerTool.id)}
                className={getSidebarButtonClass(scannerTool)}
              >
                <Video className="h-4.5 w-4.5" />
                <span>QR Scanner</span>
              </button>
            ) : null}
            {accessTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(accessTool)}
                disabled={!canOpenTool(currentUser, accessTool.id)}
                className={getSidebarButtonClass(accessTool)}
              >
                <ShieldCheck className="h-4.5 w-4.5" />
                <span>Access Control</span>
              </button>
            ) : null}
            {usersTool ? (
              <button
                type="button"
                onClick={() => openToolIfAllowed(usersTool)}
                disabled={!canOpenTool(currentUser, usersTool.id)}
                className={getSidebarButtonClass(usersTool)}
              >
                <UserRoundCog className="h-4.5 w-4.5" />
                <span>Users & Roles</span>
              </button>
            ) : null}
          </nav>

        </aside>

        <div className="flex min-w-0 flex-1 flex-col xl:pl-[278px]">
          <header className="fixed left-0 right-0 top-0 z-40 hidden border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:block md:px-6 xl:left-[278px] xl:px-9">
            <div className="flex flex-wrap items-center gap-3 xl:gap-6">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.05)] xl:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_6px_18px_rgba(15,23,42,0.05)] md:inline-flex">
                <span suppressHydrationWarning>{southAfricaDateTimeLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                className="ml-auto hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-[0_6px_18px_rgba(15,23,42,0.08)] hover:bg-slate-800 lg:inline-flex"
              >
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </button>

              <button
                type="button"
                onClick={() => openUtilityPanel("notifications")}
                className="relative hidden h-11 w-11 items-center justify-center rounded-full text-slate-700 md:inline-flex"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 ? (
                  <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {notificationCount}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={openProfileSettings}
                className="hidden items-center gap-3 rounded-2xl px-1 text-left md:flex"
              >
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
                  <p className="text-xs text-slate-500">{currentUser.email}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1d4ed8,#f59e0b)] text-sm font-semibold text-white">
                  {getInitials(currentUser.name)}
                </div>
              </button>
            </div>
          </header>

          <div className="flex-1 px-4 py-5 md:px-6 md:pt-24 xl:px-9 xl:py-7 xl:pt-24">
            <div className="space-y-4 pb-28 md:hidden">
              <section
                ref={topRef}
                className="app-safe-top app-safe-x px-1 pb-6 pt-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-600"
                    aria-label="Open menu"
                  >
                    <Menu className="h-6 w-6" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/crc-logo.svg"
                        alt="CRC logo"
                        width={44}
                        height={44}
                        className="h-11 w-11 object-contain"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold tracking-[-0.03em] text-slate-900">
                          CRC CHURCH
                        </p>
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          Volunteer Management
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openUtilityPanel("notifications")}
                      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
                    >
                      <Bell className="h-5 w-5" />
                      {notificationCount > 0 ? (
                        <span className="absolute right-0.5 top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                          {notificationCount}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen((current) => !current)}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-sm font-semibold text-white shadow-[0_10px_25px_rgba(15,23,42,0.14)]"
                      aria-label="Open profile menu"
                    >
                      {getInitials(currentUser.name)}
                    </button>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-[34px] font-semibold tracking-[-0.06em] text-slate-900">
                    {greetingLabel}, {viewerFirstName}!{" "}
                    <span className="inline-block rotate-[8deg] text-[28px]">👋</span>
                  </p>
                  <p className="mt-2 text-base text-slate-500">Here&apos;s what&apos;s happening today.</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <UsersRound className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">{volunteers.length}</p>
                    <p className="text-base text-slate-700">Total Volunteers</p>
                    <p className="mt-3 text-sm font-medium text-emerald-600">
                      +{Math.max(activeVolunteerDelta, 0)} this week
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">{activeVolunteerCount}</p>
                    <p className="text-base text-slate-700">Active Volunteers</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-slate-500">{attendanceRate}% of total</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">{inactiveVolunteerCount}</p>
                    <p className="text-base text-slate-700">Inactive Volunteers</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-slate-500">
                        {volunteers.length ? Math.round((inactiveVolunteerCount / volunteers.length) * 100) : 0}% of total
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-amber-500"
                          style={{
                            width: `${volunteers.length ? Math.round((inactiveVolunteerCount / volunteers.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <PieChart className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-[34px] font-semibold tracking-[-0.05em] text-slate-900">{attendanceRate}%</p>
                    <p className="text-base text-slate-700">Overall Attendance</p>
                    <p className="mt-3 text-sm font-medium text-emerald-600">
                      {attendanceDelta >= 0 ? "+" : ""}
                      {attendanceDelta}% vs last week
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[24px] font-semibold tracking-[-0.05em] text-slate-900">Today&apos;s Services</p>
                  <button
                    type="button"
                    onClick={() => openToolIfAllowed(eventsTool)}
                    className="text-sm font-medium text-blue-600"
                  >
                    View all
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  {serviceRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => openToolIfAllowed(eventsTool)}
                      className="flex w-full items-center gap-3 rounded-[22px] border border-slate-100 px-2 py-2 text-left transition hover:bg-slate-50"
                    >
                      <span className={`h-3 w-3 rounded-full ${row.tone}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-medium tracking-[-0.03em] text-slate-900">{row.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{row.subLabel}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">{row.expected}</p>
                        <p className="text-xs text-slate-500">Expected</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[22px] font-semibold tracking-[-0.04em] text-slate-900">{row.checkedIn}</p>
                        <p className="text-xs text-slate-500">Checked In</p>
                      </div>
                      <div className="relative flex h-14 w-14 items-center justify-center">
                        <svg viewBox="0 0 44 44" className="h-14 w-14 -rotate-90">
                          <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                          <circle
                            cx="22"
                            cy="22"
                            r="18"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray={`${row.rate * 1.13} 999`}
                          />
                        </svg>
                        <span className="absolute text-sm font-semibold text-emerald-600">{row.rate}%</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[24px] font-semibold tracking-[-0.05em] text-slate-900">Attendance Overview</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="text-[44px] font-semibold tracking-[-0.06em] text-slate-900">{attendanceRate}%</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                        {attendanceDelta >= 0 ? "+" : ""}
                        {attendanceDelta}% vs last week
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openToolIfAllowed(attendanceTool)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    This Week
                  </button>
                </div>

                <div className="mt-5">
                  <svg viewBox="0 0 420 170" className="h-[210px] w-full">
                    <defs>
                      <linearGradient id="attendanceAreaMobile" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((row) => (
                      <line
                        key={row}
                        x1="14"
                        x2="406"
                        y1={18 + row * 38}
                        y2={18 + row * 38}
                        stroke="#e2e8f0"
                        strokeDasharray="4 6"
                      />
                    ))}
                    <polygon points={`14,156 ${linePoints} 406,156`} fill="url(#attendanceAreaMobile)" />
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {weekSeries.map((entry, index) => {
                      const pointList = linePoints.split(" ");
                      const [x, y] = pointList[index].split(",");
                      return <circle key={entry.label} cx={x} cy={y} r="4.5" fill="#7c3aed" stroke="white" strokeWidth="2" />;
                    })}
                  </svg>
                  <div className="mt-2 grid grid-cols-7 text-center text-sm text-slate-500">
                    {weekSeries.map((entry) => (
                      <div key={entry.label}>
                        <p>{entry.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[24px] font-semibold tracking-[-0.05em] text-slate-900">Upcoming</p>
                  <button
                    type="button"
                    onClick={() => openToolIfAllowed(eventsTool)}
                    className="text-sm font-medium text-blue-600"
                  >
                    View all
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {serviceRows.map((row) => (
                    <button
                      key={`${row.id}-upcoming`}
                      type="button"
                      onClick={() => openToolIfAllowed(eventsTool)}
                      className="flex w-full items-center gap-3 rounded-[22px] border border-slate-100 px-2 py-2 text-left transition hover:bg-slate-50"
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${row.tone}/15`}>
                        <CalendarDays className="h-5 w-5 text-slate-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[18px] font-medium tracking-[-0.03em] text-slate-900">{row.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{row.subLabel}</p>
                      </div>
                      <div className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-700">
                        {row.expected} Expected
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="hidden xl:block">
              <section ref={overviewRef} className="grid gap-5 2xl:grid-cols-4 xl:grid-cols-2">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <UsersRound className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[42px] font-semibold tracking-[-0.06em] text-slate-900">{volunteers.length}</p>
                      <p className="text-sm text-slate-600">Total Volunteers</p>
                      <p className="mt-2 text-sm font-medium text-emerald-600">
                        {Math.max(activeVolunteerDelta, 0)} active this week
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[42px] font-semibold tracking-[-0.06em] text-slate-900">
                            {activeVolunteerCount}
                          </p>
                          <p className="text-sm text-slate-600">Active Volunteers</p>
                        </div>
                        <p className="text-sm font-medium text-slate-500">{attendanceRate}% of total</p>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <Clock3 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[42px] font-semibold tracking-[-0.06em] text-slate-900">
                            {inactiveVolunteerCount}
                          </p>
                          <p className="text-sm text-slate-600">Inactive Volunteers</p>
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                          {volunteers.length ? Math.round((inactiveVolunteerCount / volunteers.length) * 100) : 0}% of total
                        </p>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-amber-500"
                          style={{
                            width: `${volunteers.length ? Math.round((inactiveVolunteerCount / volunteers.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <PieChart className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[42px] font-semibold tracking-[-0.06em] text-slate-900">{accessGrantRate}%</p>
                      <p className="text-sm text-slate-600">Access Clearance Rate</p>
                      <p className="mt-2 text-sm font-medium text-emerald-600">
                        {activeAccessPoints} active access points
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_0.88fr]">
                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xl font-semibold tracking-[-0.04em] text-slate-900">Attendance Overview</p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-[44px] font-semibold tracking-[-0.06em] text-slate-900">
                          {attendanceRate}%
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                          <TrendingUp className="mr-1 inline h-4 w-4" />
                          {attendanceDelta >= 0 ? "+" : ""}
                          {attendanceDelta}% vs last week
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openToolIfAllowed(attendanceTool)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      This Week
                    </button>
                  </div>

                  <div className="mt-6">
                    <svg viewBox="0 0 420 170" className="h-[220px] w-full">
                      <defs>
                        <linearGradient id="attendanceArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {[0, 1, 2, 3].map((row) => (
                        <line
                          key={row}
                          x1="14"
                          x2="406"
                          y1={18 + row * 38}
                          y2={18 + row * 38}
                          stroke="#e2e8f0"
                          strokeDasharray="4 6"
                        />
                      ))}
                      <polygon
                        points={`14,156 ${linePoints} 406,156`}
                        fill="url(#attendanceArea)"
                      />
                      <polyline
                        points={linePoints}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {weekSeries.map((entry, index) => {
                        const pointList = linePoints.split(" ");
                        const [x, y] = pointList[index].split(",");
                        return (
                          <g key={entry.label}>
                            <circle cx={x} cy={y} r="4.5" fill="#7c3aed" stroke="white" strokeWidth="2" />
                          </g>
                        );
                      })}
                    </svg>
                    <div className="mt-2 grid grid-cols-7 text-center text-sm text-slate-500">
                      {weekSeries.map((entry) => (
                        <div key={entry.label}>
                          <p>{entry.label}</p>
                          <p className="mt-1 text-xs text-slate-400">{entry.count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xl font-semibold tracking-[-0.04em] text-slate-900">
                      Upcoming Services & Events
                    </p>
                    <button
                      type="button"
                      onClick={() => openToolIfAllowed(eventsTool)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      View All
                    </button>
                  </div>
                  <div className="mt-5 space-y-3">
                    {serviceRows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => openToolIfAllowed(eventsTool)}
                        className="flex w-full items-center gap-4 rounded-[22px] border border-slate-200 px-4 py-4 text-left transition hover:bg-slate-50"
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${row.tone}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-medium tracking-[-0.03em] text-slate-900">
                            {row.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{row.subLabel}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                            {row.expected}
                          </p>
                          <p className="text-sm text-slate-500">Expected</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[28px] font-semibold tracking-[-0.05em] text-slate-900">
                            {row.checkedIn}
                          </p>
                          <p className="text-sm text-slate-500">Checked In</p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-500/20 text-sm font-semibold text-emerald-600">
                          {row.rate}%
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-6 grid gap-6 2xl:grid-cols-[0.86fr_0.96fr_0.82fr]">
                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <p className="text-xl font-semibold tracking-[-0.04em] text-slate-900">Department Performance</p>
                  <div className="mt-5 space-y-4">
                    {departmentPerformance.map((department) => (
                      <button
                        key={department.id}
                        type="button"
                        onClick={() => openToolIfAllowed(departmentsTool)}
                        className="block w-full text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-base font-medium text-slate-900">{department.name}</p>
                          <p className="text-sm font-semibold text-slate-700">{department.score}%</p>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                          <div className={`h-1.5 rounded-full ${department.tone}`} style={{ width: `${department.score}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="mt-6 grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <p className="text-xl font-semibold tracking-[-0.04em] text-slate-900">Volunteer Role Breakdown</p>
                  <div className="mt-6 flex items-center gap-8">
                    <div className="relative flex h-56 w-56 shrink-0 items-center justify-center rounded-full" style={{ background: roleDistribution.gradient }}>
                      <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white">
                        <p className="text-[40px] font-semibold tracking-[-0.06em] text-slate-900">{volunteers.length}</p>
                        <p className="text-sm text-slate-500">Volunteers</p>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      {roleDistribution.rows.map((row) => (
                        <div key={row.role} className="flex items-center justify-between gap-4 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                            <span className="text-slate-600">{formatEnum(row.role)}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{row.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="pwa-bottom-dock app-safe-x app-safe-bottom fixed inset-x-3 bottom-3 z-40 rounded-[28px] border border-white/70 bg-white/92 px-1.5 py-2 shadow-[0_20px_45px_rgba(15,23,42,0.16)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 items-end gap-1">
          <button
            type="button"
            onClick={() => scrollToSection(topRef)}
            aria-label="Dashboard"
            className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-1.5 text-[11px] font-medium leading-[1.05] text-[#0b1f4d] transition hover:bg-slate-100"
          >
            <House className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => openToolIfAllowed(eventsTool)}
            aria-label="Schedule"
            className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-1.5 text-[11px] font-medium leading-[1.05] text-slate-700 transition hover:bg-slate-100"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => openToolIfAllowed(scannerTool)}
            aria-label="QR"
            className="mb-2 flex min-h-[70px] flex-col items-center justify-center gap-1 rounded-full bg-[#0b1f4d] px-1 py-1.5 text-[11px] font-medium leading-[1.05] text-white shadow-[0_18px_36px_rgba(11,31,77,0.34)] transition hover:bg-[#0a1a40]"
          >
            <QrCode className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => openToolIfAllowed(volunteerHubTool)}
            disabled={!canOpenTool(currentUser, volunteerHubTool?.id ?? "")}
            aria-label="Volunteers"
            className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-1.5 text-[11px] font-medium leading-[1.05] text-slate-700 transition hover:bg-slate-100"
          >
            <UsersRound className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => openToolIfAllowed(usersTool)}
            disabled={!canOpenTool(currentUser, usersTool?.id ?? "")}
            aria-label="Users"
            className="flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-1.5 text-[11px] font-medium leading-[1.05] text-slate-700 transition hover:bg-slate-100"
          >
            <UserRoundCog className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {profileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close profile menu"
            onClick={() => setProfileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-transparent md:hidden"
          />
          <div className="fixed right-4 top-24 z-50 w-[220px] rounded-[24px] border border-white/70 bg-white/96 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur md:hidden">
            <button
              type="button"
              onClick={openProfileSettings}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" />
              <span>Profile Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                void handleLogout();
              }}
              className="flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </>
      ) : null}

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/32 backdrop-blur-sm md:hidden">
          <div className="h-full w-[86%] max-w-[320px] overflow-y-auto bg-[linear-gradient(180deg,#07203d_0%,#03152b_100%)] px-5 py-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.26)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/crc-logo.svg"
                  alt="CRC logo"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
                <div>
                  <p className="text-sm font-semibold">CRC Church</p>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    Volunteer Management
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8">
              <div className="space-y-1.5">
                {visibleDashboardSidebarLinks.map((link) => (
                  <button
                    key={`drawer-link-${link.href}`}
                    type="button"
                    onPointerEnter={() => router.prefetch(link.href)}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push(link.href);
                    }}
                    className={link.href === "/dashboard" ? getDashboardDrawerActiveClass() : getDashboardDrawerClass()}
                  >
                    <link.icon className="h-4.5 w-4.5" />
                    <span>{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeUtility && utilityBody ? (
        <ModalShell
          title={activeUtility === "notifications" ? "Notifications" : "Settings"}
          subtitle={
            activeUtility === "notifications"
              ? "Recent system activity and operator updates."
              : "Account details and current access scope."
          }
          onClose={() => setActiveUtility(null)}
        >
          {utilityBody}
        </ModalShell>
      ) : null}
    </main>
  );
}

function getDashboardDrawerClass() {
  return "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] text-slate-200 transition hover:bg-white/8 hover:text-white";
}

function getDashboardDrawerActiveClass() {
  return "flex w-full items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-[15px] font-medium text-[#ffd166] transition";
}
