"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/lib/nav";
import type { RoleName } from "@/lib/types/enums";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  facilityName: string | null;
  deactivatedAt: string | null;
}

export function UsersTable({ users: initial, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [users, setUsers] = useState(initial);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();

  async function toggle(user: UserRow) {
    const action = user.deactivatedAt ? "reactivate" : "deactivate";
    if (action === "deactivate" && !confirm(`Deactivate ${user.name}? They will be immediately signed out and unable to log in until reactivated.`)) return;
    setLoadingId(user.id);
    try {
      const data = await apiFetch<{ user: { deactivatedAt: string | null } }>(`/api/admin/users/${user.id}/${action}`, { method: "POST" });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, deactivatedAt: data.user.deactivatedAt } : u)));
      showToast(action === "deactivate" ? `${user.name} deactivated.` : `${user.name} reactivated.`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-400">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium">Facility</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="py-1.5">{u.name}</td>
              <td className="py-1.5 text-slate-500">{u.email}</td>
              <td className="py-1.5">{ROLE_LABELS[u.role as RoleName] ?? u.role}</td>
              <td className="py-1.5 text-slate-500">{u.facilityName ?? "-"}</td>
              <td className="py-1.5">
                <StatusBadge status={u.deactivatedAt ? "CANCELLED" : "COMPLETE"} label={u.deactivatedAt ? "Deactivated" : "Active"} />
              </td>
              <td className="py-1.5 text-right">
                {u.id !== currentUserId && (
                  <Button size="sm" variant={u.deactivatedAt ? "secondary" : "ghost"} loading={loadingId === u.id} onClick={() => toggle(u)}>
                    {u.deactivatedAt ? "Reactivate" : "Deactivate"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
