"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  NotebookPen,
  QrCode,
  ShieldCheck,
  Settings,
  Trash2,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import {
  clearPortalNotifications,
  deletePortalNotification,
  usePortalNotifications,
} from "@/lib/client-notifications";
import { getFirstAccessibleRoute, hasPageAccess } from "@/lib/permissions";
import type { UserAccount } from "@/lib/types";

const sidebarLinks = [
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
];

const mobileNavLinks = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "schedule", href: "/events", label: "Schedule", icon: CalendarDays },
  { id: "qr", href: "/scanner", label: "QR", icon: QrCode, standout: true },
  { id: "volunteers", href: "/volunteers", label: "Volunteers", icon: UsersRound },
  { id: "users", href: "/users", label: "Users", icon: UserRoundCog },
];

const pageMeta: Record<string, { eyebrow: string; title: string }> = {
  "/volunteers": { eyebrow: "Volunteer Hub", title: "Volunteers" },
  "/events": { eyebrow: "Event Control", title: "Schedule" },
  "/attendance": { eyebrow: "Attendance", title: "Attendance" },
  "/departments": { eyebrow: "Management", title: "Departments" },
  "/sub-departments": { eyebrow: "Management", title: "Sub-Departments" },
  "/campuses": { eyebrow: "Management", title: "Campuses" },
  "/reports": { eyebrow: "Reporting", title: "Reports" },
  "/scanner": { eyebrow: "Scanner", title: "QR Scanner" },
  "/access": { eyebrow: "Security", title: "Access Control" },
  "/sections": { eyebrow: "Management", title: "Sections" },
  "/users": { eyebrow: "Administration", title: "Users & Roles" },
};

function canOpenNavHref(user: UserAccount | null, href: string) {
  if (!user) {
    return false;
  }

  switch (href) {
    case "/dashboard":
      return hasPageAccess(user, "Dashboard");
    case "/volunteers":
      return hasPageAccess(user, "Volunteer Hub");
    case "/events":
      return hasPageAccess(user, "Events");
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

function NavButton({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "flex w-full items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-[15px] font-medium text-[#ffd166] transition"
          : "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] text-slate-200 transition hover:bg-white/8 hover:text-white"
      }
    >
      <Icon className="h-4.5 w-4.5" />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({
  children,
  currentUser = null,
}: {
  children: React.ReactNode;
  currentUser?: UserAccount | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const notifications = usePortalNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationActionPending, setNotificationActionPending] = useState(false);
  const notificationCount = Math.min(notifications.length, 99);
  const renderedAt = useMemo(() => new Date(), []);
  const southAfricaDateTimeLabel = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(renderedAt);
  const currentPage = pageMeta[pathname] ?? { eyebrow: "CRC Church", title: "Volunteer Management" };
  const currentUserInitials = useMemo(() => getInitials(currentUser?.name ?? "CRC Portal"), [currentUser?.name]);
  const visibleSidebarLinks = useMemo(
    () => sidebarLinks.filter((link) => canOpenNavHref(currentUser, link.href)),
    [currentUser],
  );
  const visibleMobileNavLinks = mobileNavLinks;

  if (pathname === "/") {
    return <>{children}</>;
  }

  if (pathname === "/dashboard") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function openProfileSettings() {
    setProfileMenuOpen(false);
    router.push(canOpenNavHref(currentUser, "/users") ? "/users" : currentUser ? getFirstAccessibleRoute(currentUser) : "/");
  }

  function openNotifications() {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    setNotificationsOpen(true);
  }

  async function handleClearAllNotifications() {
    if (notificationActionPending || notifications.length === 0) {
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f7fb] pb-24 md:pb-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(10,42,88,0.12),transparent_26%),radial-gradient(circle_at_right_top,rgba(245,158,11,0.12),transparent_18%),linear-gradient(180deg,#f7f8fc_0%,#eef2f8_100%)]" />

      <div className="relative z-10 flex min-h-screen">
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
            {visibleSidebarLinks.map((link) => (
              <NavButton key={`${link.href}-${link.label}`} {...link} active={pathname === link.href} />
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col xl:min-h-screen xl:pl-[278px]">
          <div className="md:hidden">
            <div className="app-safe-top app-safe-x sticky top-0 z-30 px-1 pt-5">
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
                      priority
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
                    onClick={openNotifications}
                    className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)]"
                    aria-label="Open alerts"
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
                    {currentUserInitials}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-4 pt-3">
              <div>
                <p className="text-[30px] font-semibold tracking-[-0.06em] text-slate-900">
                  {currentPage.title}
                </p>
              </div>
            </div>

          </div>

          <header className="fixed left-0 right-0 top-0 z-40 hidden border-b border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:block md:px-6 xl:left-[278px] xl:px-9">
            <div className="flex flex-wrap items-center gap-3 xl:gap-6">
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
                onClick={openNotifications}
                className="relative hidden h-11 w-11 items-center justify-center rounded-full text-slate-700 md:inline-flex"
                aria-label="Open notifications"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 ? (
                  <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {notificationCount}
                  </span>
                ) : null}
              </button>

              {currentUser ? (
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
                    {currentUserInitials}
                  </div>
                </button>
              ) : null}
            </div>
          </header>

          <div className="flex-1 px-4 py-5 md:px-6 md:pt-24 xl:px-9 xl:py-7 xl:pt-24">
            <section className="pwa-bottom-content min-h-[calc(100vh-180px)] pb-28 md:pb-0">
              {children}
            </section>
          </div>
        </div>
      </div>

      <nav className="pwa-bottom-dock app-safe-x app-safe-bottom fixed inset-x-3 bottom-3 z-40 rounded-[28px] border border-white/70 bg-white/92 px-1.5 py-2 shadow-[0_20px_45px_rgba(15,23,42,0.16)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5 items-end gap-1">
          {visibleMobileNavLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;

            return (
                <button
                  key={link.id}
                  type="button"
                  aria-label={link.label}
                  onPointerEnter={() => {
                    if (canOpenNavHref(currentUser, link.href)) router.prefetch(link.href);
                  }}
                  onClick={canOpenNavHref(currentUser, link.href) ? () => router.push(link.href) : undefined}
                disabled={!canOpenNavHref(currentUser, link.href)}
                className={
                  link.standout
                    ? "relative mb-2 flex min-h-[70px] flex-col items-center justify-center gap-1 rounded-full bg-[#0b1f4d] px-1 py-1.5 text-[11px] font-medium leading-[1.05] text-white shadow-[0_18px_36px_rgba(11,31,77,0.34)] transition hover:bg-[#0a1a40]"
                    : active
                      ? "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-1.5 text-[11px] font-medium leading-[1.05] text-[#0b1f4d] transition hover:bg-slate-100"
                      : "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-[18px] px-0.5 py-1.5 text-[11px] font-medium leading-[1.05] text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                }
              >
                <Icon className={link.standout ? "h-6 w-6" : "h-5 w-5"} />
              </button>
            );
          })}
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

      {notificationsOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setNotificationsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
          />
          <div className="fixed inset-x-4 top-24 z-50 max-h-[min(70vh,620px)] overflow-y-auto rounded-[28px] border border-white/70 bg-white/96 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur md:left-auto md:right-6 md:top-24 md:w-[380px] xl:right-9">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Notifications
                </p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-900">
                  Latest activity
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length ? (
                  <button
                    type="button"
                    onClick={() => void handleClearAllNotifications()}
                    disabled={notificationActionPending}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear all
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div key={notification.id} className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{notification.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{notification.detail}</p>
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        <p className="pt-1 text-xs text-slate-400">
                          {formatNotificationAge(notification.createdAt)}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleDeleteNotification(notification.id)}
                          disabled={notificationActionPending}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Clear ${notification.title} notification`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-6 text-sm text-slate-500">
                  No notifications yet.
                </div>
              )}
            </div>
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

            <nav className="mt-8 space-y-1.5">
              {visibleSidebarLinks.map((link) => (
                <button
                  key={`mobile-sidebar-${link.href}-${link.label}`}
                  type="button"
                  onPointerEnter={() => router.prefetch(link.href)}
                  onClick={() => {
                      setMobileMenuOpen(false);
                    router.push(link.href);
                  }}
                  className={pathname === link.href ? getMobileDrawerActiveClass() : getMobileDrawerClass()}
                >
                    <link.icon className="h-4.5 w-4.5" />
                    <span>{link.label}</span>
                  </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleLogout();
                }}
                className={getMobileDrawerClass()}
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Log Out</span>
              </button>
            </nav>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function getMobileDrawerClass() {
  return "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[15px] text-slate-200 transition hover:bg-white/8 hover:text-white";
}

function getMobileDrawerActiveClass() {
  return "flex w-full items-center gap-3 rounded-2xl bg-white/12 px-4 py-3 text-left text-[15px] font-medium text-[#ffd166] transition";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatNotificationAge(createdAt: string) {
  const minutes = Math.max(Math.round((Date.now() - new Date(createdAt).getTime()) / 60000), 0);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}
