"use client";

import { useEffect, useState } from "react";
import type { PortalNotification } from "@/lib/types";

const CHANGE_EVENT = "crc-portal-notifications-change";
const POLL_INTERVAL_MS = 30000;

export function refreshPortalNotifications() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function pushPortalNotification(...args: Array<{ title: string; detail: string } | undefined>) {
  void args;
  refreshPortalNotifications();
}

export async function deletePortalNotification(notificationId: string) {
  const response = await fetch(`/api/notifications?id=${encodeURIComponent(notificationId)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to remove notification.");
  }

  refreshPortalNotifications();
}

export async function clearPortalNotifications() {
  const response = await fetch("/api/notifications?all=true", {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to clear notifications.");
  }

  refreshPortalNotifications();
}

async function fetchPortalNotifications() {
  const response = await fetch("/api/notifications", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load notifications.");
  }

  return (await response.json()) as PortalNotification[];
}

export function usePortalNotifications() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        const nextNotifications = await fetchPortalNotifications();
        if (active) {
          setNotifications(nextNotifications);
        }
      } catch {
        if (active) {
          setNotifications([]);
        }
      }
    }

    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    };

    const handleRefresh = () => {
      void loadNotifications();
    };

    window.addEventListener(CHANGE_EVENT, handleRefresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener(CHANGE_EVENT, handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return notifications;
}
