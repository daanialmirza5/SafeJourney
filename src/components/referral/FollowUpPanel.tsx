"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, AlertTriangle, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/clientApi";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import {
  FOLLOW_UP_TASK_CATEGORY_LABELS,
  canCompleteFollowUpTask,
  canSkipFollowUpTask,
  deriveFollowUpTaskState,
} from "@/lib/referral/newbornContinuity";
import { formatDate } from "@/lib/format";
import type { RoleName } from "@/lib/types/enums";

interface FollowUpTaskLike {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  dueDate: Date;
  assignedToId: string | null;
  assignedTo?: { name: string } | null;
  resolvedBy?: { name: string } | null;
  resolutionNote?: string | null;
}

const STATE_ICON = {
  COMPLETED: <CheckCircle2 className="size-4 text-emerald-600" />,
  SKIPPED: <XCircle className="size-4 text-slate-400" />,
  OVERDUE: <AlertTriangle className="size-4 text-rose-600" />,
  UPCOMING: <CircleDashed className="size-4 text-slate-300" />,
} as const;

/** Dedicated staff-facing timeline of a referral's follow-up tasks -- both
 * the near-term post-discharge handoffs and (when the case has a linked
 * newborn) the six-to-eight-month continuity milestones. Previously these
 * were an undifferentiated checklist buried inside the generic Actions
 * card with no category, due date, or completed/upcoming/overdue/skipped
 * distinction; this is its own timeline so a care-team member can see the
 * whole continuity journey at a glance. Purely coordination/reminder
 * tracking -- nothing here diagnoses or scores clinical risk. */
export function FollowUpPanel({ tasks, role, userId }: { tasks: FollowUpTaskLike[]; role: RoleName; userId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const sorted = [...tasks].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  async function complete(taskId: string) {
    setLoadingId(taskId);
    try {
      await apiFetch(`/api/follow-ups/${taskId}/complete`, { method: "POST", body: JSON.stringify({}) });
      showToast("Follow-up marked complete.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to complete task. Please check your connection or retry.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  async function skip(taskId: string) {
    const reason = window.prompt("Why should this milestone be skipped? (e.g. family relocated, no longer applicable)");
    if (!reason) return;
    setLoadingId(taskId);
    try {
      await apiFetch(`/api/follow-ups/${taskId}/skip`, { method: "POST", body: JSON.stringify({ reason }) });
      showToast("Follow-up marked skipped.");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to skip task. Please check your connection or retry.", "error");
    } finally {
      setLoadingId(null);
    }
  }

  if (sorted.length === 0) {
    return <p className="text-sm text-slate-400">No follow-up tasks yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {sorted.map((task, i) => {
        const state = deriveFollowUpTaskState(task);
        const mayComplete = canCompleteFollowUpTask(task, role, userId);
        const mayShow = canSkipFollowUpTask(task, role);
        return (
          <li key={task.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              {STATE_ICON[state]}
              {i < sorted.length - 1 && <div className="mt-0.5 h-full w-px flex-1 bg-slate-200" />}
            </div>
            <div className="w-full pb-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${state === "SKIPPED" ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>
                </div>
                <StatusBadge status={state === "SKIPPED" ? "CANCELLED" : state === "UPCOMING" ? task.status : state} label={state === "SKIPPED" ? "Skipped" : undefined} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  {FOLLOW_UP_TASK_CATEGORY_LABELS[task.category] ?? task.category} ·{" "}
                  {state === "OVERDUE" ? `was due ${formatDate(task.dueDate)}` : `due ${formatDate(task.dueDate)}`}
                  {task.assignedTo ? ` · ${task.assignedTo.name}` : ""}
                </span>
                <div className="flex gap-2">
                  {mayShow && (
                    <Button size="sm" variant="ghost" loading={loadingId === task.id} onClick={() => skip(task.id)}>
                      Skip
                    </Button>
                  )}
                  {mayComplete && (
                    <Button size="sm" variant="secondary" loading={loadingId === task.id} onClick={() => complete(task.id)}>
                      Mark complete
                    </Button>
                  )}
                </div>
              </div>
              {(state === "COMPLETED" || state === "SKIPPED") && (task.resolvedBy || task.resolutionNote) && (
                <p className="mt-1 text-[11px] text-slate-400">
                  {state === "COMPLETED" ? "Completed" : "Skipped"} by {task.resolvedBy?.name ?? "unknown"}
                  {task.resolutionNote ? `: "${task.resolutionNote}"` : ""}
                </p>
              )}
              {state === "OVERDUE" && (
                <p className="mt-1 text-[11px] text-rose-500">
                  Past its intended coordination date and not yet marked complete or skipped -- this is an administrative
                  reminder, not a clinical emergency indicator.
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
