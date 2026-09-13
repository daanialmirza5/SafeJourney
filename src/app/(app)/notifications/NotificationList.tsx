"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/clientApi";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import {
  Bell,
  Truck,
  FileText,
  CheckCheck,
  ArrowRight,
  Inbox,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";

interface Notification {
  id: string;
  category: string;
  title: string;
  body: string;
  referralId: string | null;
  isRead: boolean;
  createdAt: Date;
}

export function NotificationList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const categories = useMemo(() => {
    const cats = new Set(notifications.map((n) => n.category.toUpperCase()));
    return ["ALL", ...Array.from(cats)];
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    if (activeTab === "UNREAD") return notifications.filter((n) => !n.isRead);
    return notifications.filter((n) => n.category.toUpperCase() === activeTab);
  }, [notifications, activeTab]);

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      // best-effort
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await Promise.all(
        unreadIds.map((id) => apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }).catch(() => null))
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function getCategoryIcon(cat: string) {
    const c = cat.toLowerCase();
    if (c.includes("transport") || c.includes("ambulance")) return <Truck className="size-4 text-amber-600" />;
    if (c.includes("referral") || c.includes("handover") || c.includes("bed")) return <FileText className="size-4 text-brand" />;
    if (c.includes("followup") || c.includes("visit") || c.includes("asha")) return <CalendarCheck className="size-4 text-emerald-600" />;
    if (c.includes("alert") || c.includes("urgent")) return <AlertCircle className="size-4 text-rose-600" />;
    return <Bell className="size-4 text-slate-500" />;
  }

  return (
    <div className="space-y-4">
      {/* Action bar and filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "ALL"
                ? "bg-brand text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({notifications.length})
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("UNREAD")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === "UNREAD"
                  ? "bg-brand text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <span className="size-1.5 rounded-full bg-rose-500" />
              Unread ({unreadCount})
            </button>
          )}
          {categories
            .filter((c) => c !== "ALL")
            .map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === cat
                    ? "bg-brand text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.replace(/_/g, " ")}
              </button>
            ))}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <CheckCheck className="size-3.5 text-emerald-600" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-xs text-slate-400">
            <Inbox className="size-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">No notifications found</p>
          <p className="mt-1 text-xs text-slate-500">
            {activeTab === "UNREAD" ? "You have read all notifications." : "No notifications match this category filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map((n) => {
            const cardContent = (
              <div
                className={`group relative rounded-2xl border p-4 transition-all hover:shadow-xs ${
                  n.isRead
                    ? "border-slate-200/80 bg-white"
                    : "border-brand-100 bg-gradient-to-r from-brand-50/60 to-white shadow-xs"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${
                      n.isRead ? "bg-slate-100 text-slate-600" : "bg-brand-100 text-brand shadow-xs"
                    }`}
                  >
                    {getCategoryIcon(n.category)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <span className="size-2 shrink-0 rounded-full bg-brand animate-pulse" title="Unread" />
                        )}
                        <p className={`text-sm font-semibold ${n.isRead ? "text-slate-800" : "text-slate-950 font-bold"}`}>
                          {n.title}
                        </p>
                      </div>
                      <StatusBadge status={n.category} label={n.category.replace(/_/g, " ")} />
                    </div>

                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{n.body}</p>

                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                      <span>{formatDateTime(n.createdAt)}</span>
                      {n.referralId && (
                        <span className="flex items-center gap-1 font-medium text-brand group-hover:underline">
                          View Referral Passport <ArrowRight className="size-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );

            return n.referralId ? (
              <Link
                key={n.id}
                href={`/referrals/${n.referralId}`}
                className="block focus:outline-none"
                onClick={() => !n.isRead && markRead(n.id)}
              >
                {cardContent}
              </Link>
            ) : (
              <div key={n.id} onClick={() => !n.isRead && markRead(n.id)} className="cursor-pointer">
                {cardContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

