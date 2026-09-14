"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<{ unreadCount: number }>("/api/notifications");
        if (!cancelled) {
          setUnreadCount(data.unreadCount);
          setLastSync(new Date());
        }
      } catch {
        // silent fallback
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/notifications"
        className="relative flex size-9 items-center justify-center rounded-lg border border-border text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shadow-2xs"
        aria-label={unreadCount > 0 ? `Notifications: ${unreadCount} unread` : "Notifications"}
        title={lastSync ? `Updated ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Notifications"}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}

