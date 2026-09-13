"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<{ unreadCount: number }>("/api/notifications");
        if (!cancelled) setUnreadCount(data.unreadCount);
      } catch {
        // silent -- the bell just won't show a count
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
    <Link
      href="/notifications"
      className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
    >
      <Bell className="size-5" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-semibold text-white"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
