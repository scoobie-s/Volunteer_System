"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CirclePlus, Download, Pencil, Search, Trash2, X } from "lucide-react";
import {
  AttendanceModalView,
  CampusesModalView,
  DepartmentsModalView,
  SectionsModalView,
  SubDepartmentsModalView,
  UsersModalView,
} from "@/components/dashboard-secondary-views";
import { AccessPointForm, EventForm } from "@/components/forms";
import { ModulePageHeader, ModuleStack } from "@/components/module-layout";
import { Button, Card, Chip, ConfirmDialog, Input, Label, Select } from "@/components/ui";
import { pushPortalNotification } from "@/lib/client-notifications";
import type { Snapshot } from "@/lib/data";
import { formatEnum } from "@/lib/utils";
import type { Campus, UserAccount, Volunteer } from "@/lib/types";

type VolunteerWithQr = Volunteer & { qrDataUrl: string };
const VOLUNTEERS_PER_PAGE = 15;

function readApiError(raw: string, fallback: string) {
  if (!raw) {
    return fallback;
  }

  try {
    const payload = JSON.parse(raw) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return raw || fallback;
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getVolunteerStructure(snapshot: Snapshot, volunteer: Volunteer) {
  const sectionIds = volunteer.sectionIds.length ? volunteer.sectionIds : [volunteer.sectionId];
  const sections = snapshot.sections.filter((entry) => sectionIds.includes(entry.id));
  const subDepartments = snapshot.subDepartments.filter((subDepartment) =>
    sections.some((section) => section.subDepartmentId === subDepartment.id),
  );
  const departments = snapshot.departments.filter((department) =>
    subDepartments.some((subDepartment) => subDepartment.departmentId === department.id),
  );
  const campuses = snapshot.campuses.filter((campus) =>
    departments.some((department) => department.campusId === campus.id),
  );

  return { campuses, departments, subDepartments, sections };
}

function getVolunteerAccessPoints(snapshot: Snapshot, volunteer: Volunteer) {
  const structure = getVolunteerStructure(snapshot, volunteer);
  const sectionIds = new Set(structure.sections.map((section) => section.id));
  const subDepartmentIds = new Set(structure.subDepartments.map((subDepartment) => subDepartment.id));
  const departmentIds = new Set(structure.departments.map((department) => department.id));

  return snapshot.accessPoints.filter((accessPoint) => {
    if (volunteer.accessPointIds.includes(accessPoint.id)) return true;

    return snapshot.permissions.some(
      (permission) =>
        permission.accessPointId === accessPoint.id &&
        !(permission.excludedVolunteerIds ?? []).includes(volunteer.id) &&
        (Boolean(permission.sectionId && sectionIds.has(permission.sectionId)) ||
          Boolean(permission.subDepartmentId && subDepartmentIds.has(permission.subDepartmentId)) ||
          Boolean(permission.departmentId && departmentIds.has(permission.departmentId)) ||
          permission.role === volunteer.role),
    );
  });
}

function VolunteerProfileModal({
  volunteer,
  snapshot,
  onClose,
  onEdit,
}: {
  volunteer: VolunteerWithQr;
  snapshot: Snapshot;
  onClose: () => void;
  onEdit: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const structure = getVolunteerStructure(snapshot, volunteer);
  const accessPoints = getVolunteerAccessPoints(snapshot, volunteer);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const details = [
    ["Phone", volunteer.phone],
    ["Email", volunteer.email || "Not provided"],
    ["Membership status", formatEnum(volunteer.membershipStatus)],
    ["Availability", formatEnum(volunteer.availability)],
    ["Campus", structure.campuses.map((entry) => entry.name).join(", ")],
    ["Departments", structure.departments.map((entry) => entry.name).join(", ")],
    ["Sub-departments", structure.subDepartments.map((entry) => entry.name).join(", ")],
    ["Sections", structure.sections.map((entry) => entry.name).join(", ")],
    ["Access points", accessPoints.map((entry) => entry.name).join(", ")],
    ["Pastor", volunteer.pastor],
    ["Zone", volunteer.zone],
    ["Campus physical address", volunteer.campusPhysicalAddress],
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="volunteer-profile-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-[30px] border border-slate-200 bg-[#f8fafc] p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/25 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {volunteer.photoDataUrl ? (
              <Image src={volunteer.photoDataUrl} alt={`${volunteer.fullName} profile`} width={80} height={80} unoptimized className="h-20 w-20 rounded-[20px] object-cover" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[20px] border border-slate-200 bg-white text-2xl font-semibold text-slate-400">
                {getInitials(volunteer.fullName)}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Volunteer profile</p>
              <h2 id="volunteer-profile-title" className="mt-1 text-2xl font-semibold">{volunteer.fullName}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip>{formatEnum(volunteer.role)}</Chip>
                {accessPoints.map((accessPoint) => (
                  <Chip
                    key={accessPoint.id}
                    className={accessPoint.isActive ? "" : "bg-slate-100 text-slate-500"}
                  >
                    {accessPoint.name}{accessPoint.isActive ? "" : " (inactive)"}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="Close volunteer profile" className="rounded-full border border-slate-200 bg-white p-3 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="mt-6 grid gap-5 rounded-[20px] border border-slate-200 bg-white p-5 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || "Not provided"}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{volunteer.notes || "No notes"}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-5 rounded-[20px] border border-slate-200 bg-white p-5">
          <Image src={volunteer.qrDataUrl} alt={`QR code for ${volunteer.fullName}`} width={128} height={128} unoptimized />
          <div className="min-w-0 flex-1">
            <p className="break-all font-mono text-xs text-slate-500">{volunteer.qrToken}</p>
            <a href={volunteer.qrDataUrl} download={`${volunteer.fullName.replace(/\s+/g, "-").toLowerCase()}-qr.png`} className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white">
              <Download className="h-4 w-4" /> Download QR
            </a>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" onClick={onClose} className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-100">Close</Button>
          <Button type="button" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Edit Volunteer</Button>
        </div>
      </div>
    </dialog>
  );
}

function CreateModal({
  eyebrow,
  title,
  description,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-slate-950/25 px-4 py-6 backdrop-blur-sm md:py-8">
      <div className="mt-4 flex max-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-white/60 bg-[#f8fafc] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.2)] md:mt-6 md:max-h-[calc(100vh-5rem)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
              {eyebrow}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
              {title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label="Close form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 overflow-y-auto pr-1">{children}</div>
        <div className="mt-5 flex justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function VolunteersPageClient({
  snapshot,
  volunteers,
  canExport,
}: {
  snapshot: Snapshot;
  volunteers: VolunteerWithQr[];
  canExport: boolean;
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<VolunteerWithQr | null>(null);
  const [viewingVolunteer, setViewingVolunteer] = useState<VolunteerWithQr | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VolunteerWithQr | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    membershipStatus: "MEMBER",
    role: "VOLUNTEER",
    campusId: snapshot.departments[0]?.campusId ?? snapshot.campuses[0]?.id ?? "",
    departmentIds: snapshot.departments[0]?.id ? [snapshot.departments[0].id] : [],
    subDepartmentIds: snapshot.subDepartments[0]?.id ? [snapshot.subDepartments[0].id] : [],
    sectionIds: snapshot.sections[0]?.id ? [snapshot.sections[0].id] : [],
    notes: "",
    pastor: "",
    zone: "",
    campusPhysicalAddress: "",
    photoDataUrl: "",
  });

  const filteredVolunteers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return volunteers;
    }

    return volunteers.filter((volunteer) => {
      const structure = getVolunteerStructure(snapshot, volunteer);

      return [
        volunteer.fullName,
        volunteer.email,
        volunteer.phone,
        volunteer.qrToken,
        structure.sections.map((section) => section.name).join(" "),
        structure.departments.map((department) => department.name).join(" "),
        structure.campuses.map((campus) => campus.name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, snapshot, volunteers]);

  const availableDepartments = useMemo(
    () => snapshot.departments.filter((department) => department.campusId === form.campusId),
    [form.campusId, snapshot.departments],
  );
  const availableSubDepartments = useMemo(
    () =>
      snapshot.subDepartments.filter((subDepartment) => form.departmentIds.includes(subDepartment.departmentId)),
    [form.departmentIds, snapshot.subDepartments],
  );
  const availableSections = useMemo(
    () => snapshot.sections.filter((section) => form.subDepartmentIds.includes(section.subDepartmentId)),
    [form.subDepartmentIds, snapshot.sections],
  );
  const totalPages = Math.max(1, Math.ceil(filteredVolunteers.length / VOLUNTEERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedVolunteers = useMemo(() => {
    const start = (safeCurrentPage - 1) * VOLUNTEERS_PER_PAGE;
    return filteredVolunteers.slice(start, start + VOLUNTEERS_PER_PAGE);
  }, [filteredVolunteers, safeCurrentPage]);

  function resetForm() {
    const nextCampusId = snapshot.departments[0]?.campusId ?? snapshot.campuses[0]?.id ?? "";
    const nextDepartmentId = snapshot.departments[0]?.id ?? "";
    const nextSubDepartmentId =
      snapshot.subDepartments.find((subDepartment) => subDepartment.departmentId === nextDepartmentId)?.id ??
      snapshot.subDepartments[0]?.id ??
      "";
    const nextSectionId =
      snapshot.sections.find((section) => section.subDepartmentId === nextSubDepartmentId)?.id ??
      snapshot.sections[0]?.id ??
      "";

    setForm({
      fullName: "",
      phone: "",
      email: "",
      membershipStatus: "MEMBER",
      role: "VOLUNTEER",
      campusId: nextCampusId,
      departmentIds: nextDepartmentId ? [nextDepartmentId] : [],
      subDepartmentIds: nextSubDepartmentId ? [nextSubDepartmentId] : [],
      sectionIds: nextSectionId ? [nextSectionId] : [],
      notes: "",
      pastor: "",
      zone: "",
      campusPhysicalAddress: "",
      photoDataUrl: "",
    });
    setError("");
  }

  function openCreate() {
    resetForm();
    setEditingVolunteer(null);
    setIsCreateOpen(true);
  }

  function openEdit(volunteer: VolunteerWithQr) {
    const structure = getVolunteerStructure(snapshot, volunteer);
    setEditingVolunteer(volunteer);
    setError("");
    setForm({
      fullName: volunteer.fullName,
      phone: volunteer.phone,
      email: volunteer.email,
      membershipStatus: volunteer.membershipStatus,
      role: volunteer.role,
      campusId: structure.campuses[0]?.id ?? snapshot.campuses[0]?.id ?? "",
      departmentIds: structure.departments.map((department) => department.id),
      subDepartmentIds: structure.subDepartments.map((subDepartment) => subDepartment.id),
      sectionIds: structure.sections.map((section) => section.id),
      notes: volunteer.notes ?? "",
      pastor: volunteer.pastor ?? "",
      zone: volunteer.zone ?? "",
      campusPhysicalAddress: volunteer.campusPhysicalAddress ?? "",
      photoDataUrl: volunteer.photoDataUrl ?? "",
    });
    setIsCreateOpen(true);
  }

  async function handleVolunteerPhotoSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, photoDataUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  async function refreshAfterMutation() {
    router.refresh();
  }

  async function submitVolunteer() {
    setIsSubmitting(true);
    setError("");

    const payload = {
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      membershipStatus: form.membershipStatus,
      role: form.role,
      campusId: form.campusId,
      departmentIds: form.departmentIds,
      subDepartmentIds: form.subDepartmentIds,
      availability: editingVolunteer?.availability ?? "BOTH",
      sectionId: form.sectionIds[0],
      sectionIds: form.sectionIds,
      notes: form.notes || undefined,
      pastor: form.pastor || undefined,
      zone: form.zone || undefined,
      campusPhysicalAddress: form.campusPhysicalAddress || undefined,
      photoDataUrl: form.photoDataUrl || undefined,
      accessPointIds: [],
    };

    const response = await fetch("/api/volunteers", {
      method: editingVolunteer ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingVolunteer ? { id: editingVolunteer.id, ...payload } : payload,
      ),
    });

    if (!response.ok) {
      const raw = await response.text();
      setError(readApiError(raw, "Unable to save volunteer."));
      setIsSubmitting(false);
      return;
    }

    setIsCreateOpen(false);
    setEditingVolunteer(null);
    resetForm();
    await refreshAfterMutation();
    if (!editingVolunteer) {
      const createdCampus = snapshot.campuses.find((entry) => entry.id === form.campusId);
      const createdDepartments = snapshot.departments
        .filter((entry) => form.departmentIds.includes(entry.id))
        .map((entry) => entry.name)
        .join(", ");
      pushPortalNotification({
        title: "Volunteer added",
        detail: [form.fullName, createdCampus?.name, createdDepartments].filter(Boolean).join(" • "),
      });
    }
    setIsSubmitting(false);
  }

  async function deleteVolunteer() {
    if (!pendingDelete) return;

    setIsSubmitting(true);
    setError("");
    const response = await fetch("/api/volunteers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pendingDelete.id }),
    });

    if (!response.ok) {
      const raw = await response.text();
      setError(readApiError(raw, "Unable to delete volunteer."));
      setIsSubmitting(false);
      return;
    }

    setPendingDelete(null);
    await refreshAfterMutation();
    setIsSubmitting(false);
  }

  async function exportVolunteers(filtered: boolean) {
    setError("");
    const params = new URLSearchParams();
    if (filtered && search.trim()) params.set("search", search.trim());
    const response = await fetch(`/api/volunteers/export?${params.toString()}`);

    if (!response.ok) {
      setError(readApiError(await response.text(), "Unable to export volunteers."));
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filtered && search.trim() ? "filtered-volunteers.csv" : "volunteers.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function printVolunteers() {
    const popup = window.open("", "_blank", "width=1200,height=800");
    if (!popup) {
      setError("Your browser blocked the print window. Please allow pop-ups and try again.");
      return;
    }
    const escapeHtml = (value: string) => value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
    const rows = filteredVolunteers.map((volunteer) => {
      const structure = getVolunteerStructure(snapshot, volunteer);
      return `<tr><td>${escapeHtml(volunteer.fullName)}</td><td>${escapeHtml(volunteer.email)}</td><td>${escapeHtml(volunteer.phone)}</td><td>${escapeHtml(formatEnum(volunteer.role))}</td><td>${escapeHtml(structure.campuses.map((item) => item.name).join(", "))}</td><td>${escapeHtml(structure.departments.map((item) => item.name).join(", "))}</td><td>${escapeHtml(structure.sections.map((item) => item.name).join(", "))}</td></tr>`;
    }).join("");
    popup.document.write(`<!doctype html><html><head><title>Volunteer list</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;font-size:12px}th{background:#f1f5f9}@media print{body{padding:0}}</style></head><body><h1>Volunteer list</h1><p>${filteredVolunteers.length} volunteer${filteredVolunteers.length === 1 ? "" : "s"}${search.trim() ? ` matching “${escapeHtml(search.trim())}”` : ""}</p><table><thead><tr><th>Full name</th><th>Email</th><th>Phone</th><th>Role</th><th>Campus</th><th>Department</th><th>Section</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <>
      <ModulePageHeader
        eyebrow="Volunteer Hub"
        title="Add profile and assign structure"
        description="Each volunteer is placed under a campus, department, and section via the section mapping, with a printable QR identity card generated automatically."
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search volunteers, phone, email, token, campus, department, or section"
              className="pl-11"
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {canExport ? <>
              <button type="button" onClick={() => void exportVolunteers(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Download className="h-4 w-4" /> Export filtered CSV
              </button>
              <button type="button" onClick={() => void exportVolunteers(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <Download className="h-4 w-4" /> Export all CSV
              </button>
              <button type="button" onClick={printVolunteers} className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Print / Save PDF
              </button>
            </> : null}
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <CirclePlus className="h-4 w-4" />
              Add Volunteer
            </button>
          </div>
        </div>
        {error ? <p className="px-5 pt-4 text-sm text-rose-700">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Volunteer
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Structure
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  QR
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedVolunteers.map((volunteer) => {
                const structure = getVolunteerStructure(snapshot, volunteer);

                return (
                  <tr
                    key={volunteer.id}
                    className="cursor-pointer align-top transition hover:bg-slate-50"
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest("button, a")) {
                        setViewingVolunteer(volunteer);
                      }
                    }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
                          {volunteer.photoDataUrl ? (
                            <Image
                              src={volunteer.photoDataUrl}
                              alt={`${volunteer.fullName} profile`}
                              width={80}
                              height={80}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="text-2xl font-semibold tracking-[-0.04em] text-slate-400">
                              {getInitials(volunteer.fullName)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingVolunteer(volunteer)}
                              aria-label={`View ${volunteer.fullName}'s profile`}
                              aria-haspopup="dialog"
                              className="text-left text-lg font-semibold tracking-[-0.03em] text-slate-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                            >
                              {volunteer.fullName}
                            </button>
                            <Chip className="border-0 bg-slate-100 text-slate-700">
                              {formatEnum(volunteer.role)}
                            </Chip>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">{volunteer.email}</p>
                          <p className="text-sm text-slate-500">{volunteer.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {structure.campuses.map((campus) => (
                          <Chip key={campus.id}>{campus.name}</Chip>
                        ))}
                        {structure.departments.map((department) => (
                          <Chip key={department.id}>{department.name}</Chip>
                        ))}
                        {structure.subDepartments.map((subDepartment) => (
                          <Chip key={subDepartment.id}>{subDepartment.name}</Chip>
                        ))}
                        {structure.sections.map((section) => (
                          <Chip key={section.id}>{section.name}</Chip>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col items-start gap-3">
                        <p className="max-w-[240px] break-all font-mono text-xs text-slate-500">
                          {volunteer.qrToken}
                        </p>
                        <a
                          href={volunteer.qrDataUrl}
                          download={`${volunteer.fullName.replace(/\s+/g, "-").toLowerCase()}-qr.png`}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(volunteer)}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(volunteer)}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredVolunteers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            No volunteers matched your search.
          </div>
        ) : filteredVolunteers.length > VOLUNTEERS_PER_PAGE ? (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            <p>
              Showing {(safeCurrentPage - 1) * VOLUNTEERS_PER_PAGE + 1}-
              {Math.min(safeCurrentPage * VOLUNTEERS_PER_PAGE, filteredVolunteers.length)} of {filteredVolunteers.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="min-w-[72px] text-center font-medium text-slate-700">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      {viewingVolunteer ? (
        <VolunteerProfileModal
          volunteer={viewingVolunteer}
          snapshot={snapshot}
          onClose={() => setViewingVolunteer(null)}
          onEdit={() => {
            setViewingVolunteer(null);
            openEdit(viewingVolunteer);
          }}
        />
      ) : null}

      {isCreateOpen ? (
        <CreateModal
          eyebrow={editingVolunteer ? "Edit Volunteer" : "Register Volunteer"}
          title={editingVolunteer ? "Update volunteer profile" : "Add profile and assign structure"}
          description={
            editingVolunteer
              ? "Update the volunteer record, structure assignment, and serving details."
              : "Capture the core identity record, assign the serving structure, and issue the volunteer badge in one flow."
          }
          onClose={() => {
            setIsCreateOpen(false);
            setEditingVolunteer(null);
            resetForm();
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitVolunteer();
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <Label htmlFor="fullName">Full Name (required)</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone (required)</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="membershipStatus">Membership Status (required)</Label>
              <Select
                id="membershipStatus"
                value={form.membershipStatus}
                onChange={(event) =>
                  setForm((current) => ({ ...current, membershipStatus: event.target.value }))
                }
              >
                <option value="MEMBER">Member</option>
                <option value="NON_MEMBER">Non Member</option>
                <option value="NEW_COMER">New Comer</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Role (required)</Label>
              <Select
                id="role"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              >
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="ADMIN">Admin</option>
                <option value="DEPARTMENT_HEAD">Department Head</option>
                <option value="SECTION_LEADER">Section Leader</option>
                <option value="VOLUNTEER">Volunteer</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="campusId">Campus (required)</Label>
              <Select
                id="campusId"
                value={form.campusId}
                onChange={(event) => {
                  const campusId = event.target.value;
                  const nextDepartmentId =
                    snapshot.departments.find((department) => department.campusId === campusId)?.id ?? "";
                  const nextSubDepartmentId =
                    snapshot.subDepartments.find((subDepartment) => subDepartment.departmentId === nextDepartmentId)?.id ?? "";
                  const nextSectionId =
                    snapshot.sections.find((section) => section.subDepartmentId === nextSubDepartmentId)?.id ?? "";
                  setForm((current) => ({
                    ...current,
                    campusId,
                    departmentIds: nextDepartmentId ? [nextDepartmentId] : [],
                    subDepartmentIds: nextSubDepartmentId ? [nextSubDepartmentId] : [],
                    sectionIds: nextSectionId ? [nextSectionId] : [],
                  }));
                }}
              >
                {snapshot.campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Departments (at least one required)</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {availableDepartments.map((department) => (
                  <label key={department.id} className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.departmentIds.includes(department.id)}
                      onChange={() =>
                        setForm((current) => {
                          const nextDepartmentIds = current.departmentIds.includes(department.id)
                            ? current.departmentIds.filter((entry) => entry !== department.id)
                            : [...current.departmentIds, department.id];
                          const nextSubDepartmentIds = current.subDepartmentIds.filter((subDepartmentId) => {
                            const subDepartment = snapshot.subDepartments.find((entry) => entry.id === subDepartmentId);
                            return subDepartment ? nextDepartmentIds.includes(subDepartment.departmentId) : false;
                          });
                          const nextSectionIds = current.sectionIds.filter((sectionId) => {
                            const section = snapshot.sections.find((entry) => entry.id === sectionId);
                            return section ? nextSubDepartmentIds.includes(section.subDepartmentId) : false;
                          });
                          return {
                            ...current,
                            departmentIds: nextDepartmentIds,
                            subDepartmentIds: nextSubDepartmentIds,
                            sectionIds: nextSectionIds,
                          };
                        })
                      }
                    />
                    <span>{department.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Sub-Departments (at least one required)</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {availableSubDepartments.map((subDepartment) => (
                  <label key={subDepartment.id} className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.subDepartmentIds.includes(subDepartment.id)}
                      onChange={() =>
                        setForm((current) => {
                          const nextSubDepartmentIds = current.subDepartmentIds.includes(subDepartment.id)
                            ? current.subDepartmentIds.filter((entry) => entry !== subDepartment.id)
                            : [...current.subDepartmentIds, subDepartment.id];
                          const nextDepartmentIds = nextSubDepartmentIds.length
                            ? Array.from(
                                new Set([
                                  ...current.departmentIds,
                                  ...nextSubDepartmentIds
                                    .map((subDepartmentId) =>
                                      snapshot.subDepartments.find((entry) => entry.id === subDepartmentId)?.departmentId ?? "",
                                    )
                                    .filter(Boolean),
                                ]),
                              )
                            : current.departmentIds;
                          const nextSectionIds = current.sectionIds.filter((sectionId) => {
                            const section = snapshot.sections.find((entry) => entry.id === sectionId);
                            return section ? nextSubDepartmentIds.includes(section.subDepartmentId) : false;
                          });
                          return {
                            ...current,
                            departmentIds: nextDepartmentIds,
                            subDepartmentIds: nextSubDepartmentIds,
                            sectionIds: nextSectionIds,
                          };
                        })
                      }
                    />
                    <span>{subDepartment.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Sections (at least one required)</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {availableSections.map((section) => (
                  <label key={section.id} className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.sectionIds.includes(section.id)}
                      onChange={() =>
                        setForm((current) => {
                          const nextSectionIds = current.sectionIds.includes(section.id)
                            ? current.sectionIds.filter((entry) => entry !== section.id)
                            : [...current.sectionIds, section.id];
                          const nextSubDepartmentIds = Array.from(
                            new Set(
                              nextSectionIds
                                .map((sectionId) => snapshot.sections.find((entry) => entry.id === sectionId)?.subDepartmentId ?? "")
                                .filter(Boolean),
                            ),
                          );
                          const nextDepartmentIds = Array.from(
                            new Set(
                              nextSubDepartmentIds
                                .map((subDepartmentId) =>
                                  snapshot.subDepartments.find((entry) => entry.id === subDepartmentId)?.departmentId ?? "",
                                )
                                .filter(Boolean),
                            ),
                          );
                          return {
                            ...current,
                            departmentIds: nextDepartmentIds,
                            subDepartmentIds: nextSubDepartmentIds,
                            sectionIds: nextSectionIds,
                          };
                        })
                      }
                    />
                    <span>{section.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="pastor">Pastor</Label>
              <Input
                id="pastor"
                value={form.pastor}
                onChange={(event) => setForm((current) => ({ ...current, pastor: event.target.value }))}
                placeholder="Assigned pastor"
              />
            </div>
            <div>
              <Label htmlFor="zone">Zone</Label>
              <Input
                id="zone"
                value={form.zone}
                onChange={(event) => setForm((current) => ({ ...current, zone: event.target.value }))}
                placeholder="Volunteer zone"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="campusPhysicalAddress">Address</Label>
              <textarea
                id="campusPhysicalAddress"
                value={form.campusPhysicalAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, campusPhysicalAddress: event.target.value }))
                }
                rows={3}
                placeholder="Physical address"
                className="min-h-[96px] w-full resize-y rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Profile Image</Label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleVolunteerPhotoSelected(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="mt-2 flex w-full flex-col items-center rounded-[22px] border border-slate-200 bg-white px-4 py-5 text-center transition hover:bg-slate-50"
              >
                {form.photoDataUrl ? (
                  <div className="relative h-44 w-full overflow-hidden rounded-[18px] border border-slate-200">
                    <Image
                      src={form.photoDataUrl}
                      alt={`${form.fullName || "Volunteer"} profile`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-[18px] bg-slate-100 text-3xl font-semibold tracking-[-0.04em] text-slate-500">
                    {form.fullName.trim()
                      ? form.fullName
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                      : "VP"}
                  </div>
                )}
                <p className="mt-3 text-sm font-medium text-slate-900">
                  {form.fullName || "Volunteer profile"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Click to upload image</p>
              </button>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Add profile notes"
                className="min-h-[96px] w-full resize-y rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300"
              />
            </div>
            {error ? (
              <div className="md:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? editingVolunteer
                    ? "Saving..."
                    : "Creating..."
                  : editingVolunteer
                    ? "Save Changes"
                    : "Add Volunteer"}
              </Button>
            </div>
          </form>
        </CreateModal>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete Volunteer"
          message={`Delete ${pendingDelete.fullName}? This cannot be undone.`}
          confirmLabel="Delete Volunteer"
          isLoading={isSubmitting}
          onConfirm={deleteVolunteer}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}

export function EventsPageClient({
  snapshot,
}: {
  snapshot: Snapshot;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return snapshot.events;
    }

    return snapshot.events.filter((event) => {
      const campus = snapshot.campuses.find((entry) => entry.id === event.campusId);
      return [
        event.name,
        event.date,
        event.startTime,
        event.endTime,
        event.type,
        event.sundayService,
        campus?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, snapshot.campuses, snapshot.events]);

  return (
    <>
      <ModulePageHeader
        eyebrow="Event Control"
        title="Create rehearsals and Sunday services"
        description="Manage service schedules, rehearsal coverage, and attendance-ready event records from the same visual system used across the dashboard."
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search events, campus, service slot, or date"
              className="pl-11"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <CirclePlus className="h-4 w-4" />
            Add Event
          </button>
        </div>
        <div className="p-5">
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
            Scheduled events
          </h3>
          <div className="mt-4 space-y-3">
            {filteredEvents.map((event) => {
            const campus = snapshot.campuses.find((entry) => entry.id === event.campusId);
            const attendanceCount = snapshot.attendances.filter(
              (attendance) => attendance.eventId === event.id,
            ).length;

            return (
              <div
                key={event.id}
                className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{event.name}</p>
                    <p className="text-sm text-slate-500">
                      {event.date} · {event.startTime} · {campus?.name}
                    </p>
                  </div>
                  <Chip className="border-0 bg-white">
                    {formatEnum(event.type)}
                    {event.sundayService !== "NONE" ? ` · ${event.sundayService}` : ""}
                  </Chip>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Chip>{attendanceCount} attendance logs</Chip>
                  <Chip>Duplicate {event.allowDuplicate ? "enabled" : "blocked"}</Chip>
                </div>
              </div>
              );
            })}
            {filteredEvents.length === 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 px-4 py-6 text-sm text-slate-500">
                No events matched your search.
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {isCreateOpen ? (
        <CreateModal
          eyebrow="Create Event"
          title="Create rehearsals and Sunday services"
          description="Build a service or rehearsal record without keeping the form pinned on the page."
          onClose={() => setIsCreateOpen(false)}
        >
          <EventForm campuses={snapshot.campuses as Campus[]} />
        </CreateModal>
      ) : null}
    </>
  );
}

export function AccessPageClient({
  snapshot,
}: {
  snapshot: Snapshot;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filteredPermissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return snapshot.permissions;
    }

    return snapshot.permissions.filter((permission) => {
      const accessPoint = snapshot.accessPoints.find(
        (entry) => entry.id === permission.accessPointId,
      );
      const department = snapshot.departments.find(
        (entry) => entry.id === permission.departmentId,
      );
      const section = snapshot.sections.find((entry) => entry.id === permission.sectionId);

      return [
        accessPoint?.name ?? "",
        department?.name ?? "",
        section?.name ?? "",
        permission.role ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, snapshot.accessPoints, snapshot.departments, snapshot.permissions, snapshot.sections]);
  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return snapshot.accessLogs;
    }

    return snapshot.accessLogs.filter((log) => {
      const volunteer = snapshot.volunteers.find((entry) => entry.id === log.volunteerId);
      const accessPoint = snapshot.accessPoints.find((entry) => entry.id === log.accessPointId);
      return [volunteer?.fullName ?? "", accessPoint?.name ?? "", log.status]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, snapshot.accessLogs, snapshot.accessPoints, snapshot.volunteers]);

  return (
    <>
      <ModulePageHeader
        eyebrow="Access Control"
        title="Register controlled areas and permission rules"
        description="Keep access points, clearance logic, and recent scans inside the same dashboard-style command surface used across the rest of the portal."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ModuleStack>
          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search access points, departments, sections, volunteers, or status"
                  className="pl-11"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <CirclePlus className="h-4 w-4" />
                Add Access Point
              </button>
            </div>
            <div className="p-5">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
              Permission rules
            </h3>
            <div className="mt-4 space-y-3">
              {filteredPermissions.map((permission) => {
                const accessPoint = snapshot.accessPoints.find(
                  (entry) => entry.id === permission.accessPointId,
                );
                const department = snapshot.departments.find(
                  (entry) => entry.id === permission.departmentId,
                );
                const section = snapshot.sections.find(
                  (entry) => entry.id === permission.sectionId,
                );

                return (
                  <div
                    key={permission.id}
                    className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4"
                  >
                    <p className="font-semibold text-slate-900">{accessPoint?.name}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      {section?.name ??
                        department?.name ??
                        formatEnum(permission.role ?? "VOLUNTEER")}
                    </p>
                  </div>
                );
              })}
              {filteredPermissions.length === 0 ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 px-4 py-6 text-sm text-slate-500">
                  No permission rules matched your search.
                </div>
              ) : null}
            </div>
            </div>
          </Card>
        </ModuleStack>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
              Recent access logs
            </h3>
            <Chip>{snapshot.accessLogs.length} scans</Chip>
          </div>
          <div className="mt-4 space-y-3">
            {filteredLogs.map((log) => {
              const volunteer = snapshot.volunteers.find((entry) => entry.id === log.volunteerId);
              const accessPoint = snapshot.accessPoints.find(
                (entry) => entry.id === log.accessPointId,
              );

              return (
                <div
                  key={log.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/90 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{volunteer?.fullName}</p>
                      <p className="text-sm text-slate-500">{accessPoint?.name}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          log.status === "GRANTED" ? "text-teal-600" : "text-rose-600"
                        }`}
                      >
                        {formatEnum(log.status)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(log.scannedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredLogs.length === 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 px-4 py-6 text-sm text-slate-500">
                No access logs matched your search.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {isCreateOpen ? (
        <CreateModal
          eyebrow="Access Point"
          title="Register controlled area"
          description="Create a gate, room, or checkpoint from a modal instead of keeping the form pinned on the page."
          onClose={() => setIsCreateOpen(false)}
        >
          <AccessPointForm />
        </CreateModal>
      ) : null}
    </>
  );
}

export function DepartmentsPageClient({ snapshot }: { snapshot: Snapshot }) {
  const [departments, setDepartments] = useState(snapshot.departments);
  const [subDepartments, setSubDepartments] = useState(snapshot.subDepartments);
  const [sections, setSections] = useState(snapshot.sections);

  return (
    <>
      <ModulePageHeader
        eyebrow="Departments"
        title="Organize teams by campus and oversight"
        description="Manage department structure, campus ownership, volunteer counts, and leadership coverage inside the same mobile-friendly surface used across the portal."
      />
      <DepartmentsModalView
        campuses={snapshot.campuses}
        departments={departments}
        setDepartments={setDepartments}
        subDepartments={subDepartments}
        setSubDepartments={setSubDepartments}
        sections={sections}
        setSections={setSections}
        volunteers={snapshot.volunteers}
      />
    </>
  );
}

export function SectionsPageClient({ snapshot }: { snapshot: Snapshot }) {
  const [sections, setSections] = useState(snapshot.sections);

  return (
    <>
      <ModulePageHeader
        eyebrow="Sections"
        title="Map serving sections inside every department"
        description="Keep section assignments, leader coverage, and volunteer distribution aligned with the same shared mobile design system."
      />
      <SectionsModalView
        departments={snapshot.departments}
        subDepartments={snapshot.subDepartments}
        sections={sections}
        setSections={setSections}
        volunteers={snapshot.volunteers}
      />
    </>
  );
}

export function SubDepartmentsPageClient({ snapshot }: { snapshot: Snapshot }) {
  const [subDepartments, setSubDepartments] = useState(snapshot.subDepartments);
  const [sections, setSections] = useState(snapshot.sections);

  return (
    <>
      <ModulePageHeader
        eyebrow="Sub-Departments"
        title="Group sections inside every department"
        description="Manage the sub-department layer between departments and sections so volunteer structure stays consistent everywhere."
      />
      <SubDepartmentsModalView
        departments={snapshot.departments}
        subDepartments={subDepartments}
        setSubDepartments={setSubDepartments}
        sections={sections}
        setSections={setSections}
        volunteers={snapshot.volunteers}
      />
    </>
  );
}

export function AttendancePageClient({
  snapshot,
  currentUser,
}: {
  snapshot: Snapshot;
  currentUser: UserAccount;
}) {
  return (
    <>
      <ModulePageHeader
        eyebrow="Attendance"
        title="Review attendance history and export activity"
        description="Search attendance by volunteer, department, event type, and date range with the same mobile-first framing used across the rest of the app."
      />
      <AttendanceModalView
        attendances={snapshot.attendances}
        events={snapshot.events}
        volunteers={snapshot.volunteers}
        sections={snapshot.sections}
        departments={snapshot.departments}
        viewerVolunteerId={currentUser.role === "VOLUNTEER" ? currentUser.volunteerId : undefined}
      />
    </>
  );
}

export function CampusesPageClient({ snapshot }: { snapshot: Snapshot }) {
  const [campuses, setCampuses] = useState(snapshot.campuses);

  return (
    <>
      <ModulePageHeader
        eyebrow="Campuses"
        title="Track each campus, team footprint, and activity"
        description="Review campus structure, volunteer scale, and event coverage from the same consistent mobile and desktop layout system."
      />
      <CampusesModalView
        campuses={campuses}
        setCampuses={setCampuses}
        departments={snapshot.departments}
        subDepartments={snapshot.subDepartments}
        sections={snapshot.sections}
        volunteers={snapshot.volunteers}
        events={snapshot.events}
      />
    </>
  );
}

export function UsersPageClient({ snapshot }: { snapshot: Snapshot }) {
  const [users, setUsers] = useState(snapshot.users);

  return (
    <>
      <ModulePageHeader
        eyebrow="Users"
        title="Manage portal accounts, access scope, and login codes"
        description="Handle user roles, linked volunteers, scoped permissions, and account resets with the same shared page presentation across the portal."
      />
      <UsersModalView
        users={users}
        setUsers={setUsers}
        volunteers={snapshot.volunteers}
        campuses={snapshot.campuses}
        departments={snapshot.departments}
        subDepartments={snapshot.subDepartments}
        sections={snapshot.sections}
      />
    </>
  );
}
