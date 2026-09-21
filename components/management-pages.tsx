"use client";

import { useState } from "react";
import { AccessView, EventsView } from "@/components/dashboard-launcher";
import { ModulePageHeader } from "@/components/module-layout";
import type { Snapshot } from "@/lib/data";

export function EventsManagementPageClient({ snapshot }: { snapshot: Snapshot }) {
  const [events, setEvents] = useState(snapshot.events);

  return (
    <>
      <ModulePageHeader
        eyebrow="Event Control"
        title="Create rehearsals and Sunday services"
        description="Manage service schedules, rehearsal coverage, and attendance-ready event records from the same visual system used across the dashboard."
      />
      <EventsView events={events} setEvents={setEvents} campuses={snapshot.campuses} />
    </>
  );
}

export function AccessManagementPageClient({ snapshot }: { snapshot: Snapshot }) {
  const [accessPoints, setAccessPoints] = useState(snapshot.accessPoints);
  const [accessLogs, setAccessLogs] = useState(snapshot.accessLogs);
  const [permissions, setPermissions] = useState(snapshot.permissions);

  return (
    <>
      <ModulePageHeader
        eyebrow="Access Control"
        title="Register controlled areas and permission rules"
        description="Keep access points, clearance logic, and recent scans inside the same dashboard-style command surface used across the rest of the portal."
      />
      <AccessView
        accessPoints={accessPoints}
        setAccessPoints={setAccessPoints}
        permissions={permissions}
        setPermissions={setPermissions}
        accessLogs={accessLogs}
        setAccessLogs={setAccessLogs}
        volunteers={snapshot.volunteers}
        departments={snapshot.departments}
        sections={snapshot.sections}
        campuses={snapshot.campuses}
      />
    </>
  );
}
