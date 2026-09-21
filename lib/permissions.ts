import type { UserAccount } from "@/lib/types";

export const PAGE_LABELS = [
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
] as const;

export const PAGE_ACTIONS = ["View", "Create", "Edit", "Delete", "Scan", "Approve Access", "Manage Users", "Export"] as const;

export const TOOL_PAGE_MAP: Record<string, (typeof PAGE_LABELS)[number]> = {
  "volunteer-hub": "Volunteer Hub",
  events: "Events",
  access: "Access",
  scanner: "Scanner",
  reports: "Reports",
  departments: "Departments",
  "sub-departments": "Sub-Departments",
  sections: "Sections",
  attendance: "Attendance",
  campuses: "Campuses",
  users: "Users",
};

export const PAGE_ROUTE_MAP: Record<(typeof PAGE_LABELS)[number], string> = {
  Dashboard: "/dashboard",
  "Volunteer Hub": "/volunteers",
  Events: "/events",
  Access: "/access",
  Scanner: "/scanner",
  Reports: "/reports",
  Departments: "/departments",
  "Sub-Departments": "/sub-departments",
  Sections: "/sections",
  Attendance: "/attendance",
  Campuses: "/campuses",
  Users: "/users",
};

export const PAGE_ACTION_OPTIONS: Record<(typeof PAGE_LABELS)[number], readonly (typeof PAGE_ACTIONS)[number][]> = {
  Dashboard: ["View", "Export"],
  "Volunteer Hub": ["View", "Create", "Edit", "Delete", "Export"],
  Events: ["View", "Create", "Edit", "Delete", "Export"],
  Access: ["View", "Create", "Edit", "Delete", "Approve Access"],
  Scanner: ["View", "Scan"],
  Reports: ["View", "Export"],
  Departments: ["View", "Create", "Edit", "Delete"],
  "Sub-Departments": ["View", "Create", "Edit", "Delete"],
  Sections: ["View", "Create", "Edit", "Delete"],
  Attendance: ["View", "Export", "Delete"],
  Campuses: ["View", "Create", "Edit", "Delete"],
  Users: ["View", "Create", "Edit", "Delete", "Manage Users"],
};

export function getScopedActionKey(page: string, action: string) {
  return `${page}::${action}`;
}

export function getAllowedActionsForPage(page: string) {
  return PAGE_ACTION_OPTIONS[page as keyof typeof PAGE_ACTION_OPTIONS] ?? [];
}

export function hasPageAccess(user: UserAccount, page: string) {
  return user.role === "SUPER_ADMIN" || user.pageAccess.includes(page);
}

export function getActionsForPage(actionAccess: string[], page: string) {
  const scopedActions = actionAccess
    .filter((entry) => entry.startsWith(`${page}::`))
    .map((entry) => entry.split("::")[1])
    .filter(Boolean);

  if (scopedActions.length) {
    return scopedActions;
  }

  return actionAccess.filter((entry) =>
    getAllowedActionsForPage(page).includes(
      entry as (typeof PAGE_ACTIONS)[number],
    ),
  );
}

export function normalizePermissionSelection(pageAccess: string[], actionAccess: string[]) {
  const nextPageAccess = PAGE_LABELS.filter((page) => pageAccess.includes(page));
  const nextActionAccess = nextPageAccess.flatMap((page) => {
    const allowedActions = getAllowedActionsForPage(page);
    const selectedActions = allowedActions.filter(
      (action) =>
        action === "View" || actionAccess.includes(getScopedActionKey(page, action)) || actionAccess.includes(action),
    );
    const ensuredActions = selectedActions.includes("View") ? selectedActions : ["View", ...selectedActions];
    return Array.from(new Set(ensuredActions)).map((action) => getScopedActionKey(page, action));
  });

  return {
    pageAccess: nextPageAccess,
    actionAccess: nextActionAccess,
  };
}

export function hasActionAccess(user: UserAccount, page: string, action: string) {
  return user.role === "SUPER_ADMIN" || getActionsForPage(user.actionAccess, page).includes(action);
}

export function canOpenTool(user: UserAccount, toolId: string) {
  const page = TOOL_PAGE_MAP[toolId];
  if (!page) {
    return false;
  }

  return hasPageAccess(user, page);
}

export function getFirstAccessibleRoute(user: UserAccount) {
  if (user.role === "SUPER_ADMIN") {
    return PAGE_ROUTE_MAP.Dashboard;
  }

  const firstPage = PAGE_LABELS.find((page) => hasPageAccess(user, page));
  return firstPage ? PAGE_ROUTE_MAP[firstPage] : PAGE_ROUTE_MAP.Dashboard;
}
