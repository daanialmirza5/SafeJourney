"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  async function syncNotifications() {
    setIsSyncing(true);
    try {
      const data = await apiFetch<{ unreadCount: number }>("/api/notifications");
      setUnreadCount(data.unreadCount);
      setLastSync(new Date());
    } catch {
      // silent fallback
    } finally {
      setIsSyncing(false);
    }
  }

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

  function handleManualSync() {
    syncNotifications();
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {/* Live Synchronization Status Pill */}
      <button
        type="button"
        onClick={handleManualSync}
        className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
        title="Live updates via automatic synchronization (30s polling). Click to refresh now."
      >
        <RefreshCw className={`size-3 text-teal-600 ${isSyncing ? "animate-spin" : ""}`} />
        <span>
          {isSyncing ? "Syncing..." : lastSync ? `Synced ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live Sync"}
        </span>
      </button>

      {/* In-app Notification Bell */}
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
            className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs animate-pulse"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
