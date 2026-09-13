"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/clientApi";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";

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

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      // best-effort
    }
  }

  return (
    <div className="space-y-2">
      {notifications.map((n) => {
        const body = (
          <div
            onClick={() => !n.isRead && markRead(n.id)}
            className={`rounded-xl border p-4 transition-colors ${n.isRead ? "border-border bg-white" : "border-brand bg-brand-soft"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{n.title}</p>
              <StatusBadge status={n.category} label={n.category.replace(/_/g, " ")} />
            </div>
            <p className="mt-1 text-sm text-slate-600">{n.body}</p>
            <p className="mt-1.5 text-xs text-slate-400">{formatDateTime(n.createdAt)}</p>
          </div>
        );
        return n.referralId ? (
          <Link key={n.id} href={`/referrals/${n.referralId}`} className="block" onClick={() => !n.isRead && markRead(n.id)}>
            {body}
          </Link>
        ) : (
          <div key={n.id}>{body}</div>
        );
      })}
    </div>
  );
}
