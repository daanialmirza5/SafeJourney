import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { db } from "@/lib/db";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState, PageHeader } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { FOLLOW_UP_TASK_CATEGORY_LABELS, deriveFollowUpTaskState } from "@/lib/referral/newbornContinuity";
import { formatDate } from "@/lib/format";
import type { User } from "@prisma/client";

export async function FollowUpDashboard({ user }: { user: User }) {
  const tasks = await db.followUpTask.findMany({
    where: { assignedToId: user.id },
    include: { referral: { include: { patient: true, referringFacility: true, receivingFacility: true } } },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  // Single source of truth for "is this overdue" -- same
  // deriveFollowUpTaskState the referral-detail timeline uses, so the two
  // views (and the stat counts vs. the per-task badges below) can never
  // silently disagree the way a separately-computed day-level cutoff could.
  const stateById = new Map(tasks.map((t) => [t.id, deriveFollowUpTaskState(t, now)]));
  const pending = tasks.filter((t) => ["UPCOMING", "OVERDUE"].includes(stateById.get(t.id)!));
  const dueToday = pending.filter((t) => t.dueDate >= startOfToday && t.dueDate < endOfToday);
  const overdue = pending.filter((t) => stateById.get(t.id) === "OVERDUE");
  const completed = tasks.filter((t) => stateById.get(t.id) === "COMPLETED");

  return (
    <div className="space-y-6">
      <PageHeader title="Follow-up dashboard" description="Community handoffs and administrative follow-ups assigned to you." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Due today" value={dueToday.length} tone={dueToday.length > 0 ? "warning" : "default"} />
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length > 0 ? "danger" : "default"} />
        <StatCard label="Pending handoffs" value={pending.length} />
        <StatCard label="Completed" value={completed.length} tone="success" />
      </div>
      {overdue.length > 0 && (
        <p className="text-xs text-slate-400">
          &ldquo;Overdue&rdquo; means the task&apos;s intended coordination due date has passed without it being marked
          complete or skipped -- an administrative reminder to follow up, not a clinical emergency indicator.
        </p>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Pending tasks</h2>
        {pending.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="size-8" />} title="Nothing pending" description="Completed handoffs and new assignments will show up here." />
        ) : (
          <div className="space-y-3">
            {pending.map((task) => (
              <Link
                key={task.id}
                href={`/referrals/${task.referralId}`}
                className="block rounded-xl border border-border bg-white p-4 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <StatusBadge status={stateById.get(task.id) === "OVERDUE" ? "OVERDUE" : task.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{task.description}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {FOLLOW_UP_TASK_CATEGORY_LABELS[task.category] ?? task.category} · {task.referral.referralCode} ·{" "}
                  {task.referral.patient.pseudonym} ·{" "}
                  {stateById.get(task.id) === "OVERDUE" ? `was due ${formatDate(task.dueDate)}` : `due ${formatDate(task.dueDate)}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
