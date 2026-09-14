import Link from "next/link";
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Baby
} from "lucide-react";
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

  const stateById = new Map(tasks.map((t) => [t.id, deriveFollowUpTaskState(t, now)]));
  const pending = tasks.filter((t) => ["UPCOMING", "OVERDUE"].includes(stateById.get(t.id)!));
  const dueToday = pending.filter((t) => t.dueDate >= startOfToday && t.dueDate < endOfToday);
  const overdue = pending.filter((t) => stateById.get(t.id) === "OVERDUE");
  const completed = tasks.filter((t) => stateById.get(t.id) === "COMPLETED");

  // Determine ASHA's next action prompt
  function getFollowUpNextAction() {
    if (overdue.length > 0) {
      return {
        title: `Overdue Post-Discharge Visits (${overdue.length})`,
        description: `You have ${overdue.length} community continuity visit(s) whose target dates have elapsed. Visit the family and record the check-in to close the loop.`,
        tone: "urgent" as const,
      };
    }
    if (dueToday.length > 0) {
      return {
        title: `Visits Scheduled for Today (${dueToday.length})`,
        description: `Conduct scheduled postpartum/newborn check-ins for ${dueToday.length} family today and record findings.`,
        tone: "info" as const,
      };
    }
    if (pending.length > 0) {
      return {
        title: `Upcoming Community Follow-ups (${pending.length})`,
        description: "Review scheduled newborn continuity visits and administrative check-ins for the coming week.",
        tone: "normal" as const,
      };
    }
    return {
      title: "All Follow-up Handoffs Completed",
      description: "No pending post-discharge visits currently assigned. New handoffs from discharged hospital patients will appear here automatically.",
      tone: "success" as const,
    };
  }

  const nextAction = getFollowUpNextAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community Follow-Up & Continuity Center"
        description="Conduct post-discharge home visits, verify maternal and newborn recovery milestones, and close referral loops."
      />

      {/* Guided Next Action Banner */}
      <div className={`rounded-xl border p-4 shadow-2xs ${
        nextAction.tone === "urgent"
          ? "border-rose-300 bg-rose-50/90 text-rose-950"
          : nextAction.tone === "info"
          ? "border-teal-200 bg-teal-50/80 text-teal-950"
          : nextAction.tone === "success"
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
          : "border-slate-200 bg-slate-50/70 text-slate-900"
      }`}>
        <div className="flex items-start gap-3">
          {nextAction.tone === "urgent" ? (
            <AlertTriangle className="size-5 shrink-0 mt-0.5 text-rose-600" />
          ) : nextAction.tone === "info" ? (
            <Clock className="size-5 shrink-0 mt-0.5 text-teal-600" />
          ) : (
            <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider">Your Next Action</span>
              {nextAction.tone === "urgent" && (
                <span className="rounded bg-rose-200 px-1.5 py-0.2 text-[10px] font-bold text-rose-900 animate-pulse">
                  Visit Overdue
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold mt-0.5">{nextAction.title}</h3>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">{nextAction.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Due Today" value={dueToday.length} tone={dueToday.length > 0 ? "warning" : "default"} />
        <StatCard label="Overdue" value={overdue.length} tone={overdue.length > 0 ? "danger" : "default"} />
        <StatCard label="Pending Handoffs" value={pending.length} />
        <StatCard label="Completed Visits" value={completed.length} tone="success" />
      </div>

      {overdue.length > 0 && (
        <p className="text-xs text-slate-400">
          &ldquo;Overdue&rdquo; indicates that the post-discharge target coordination date has passed without recorded completion -- an administrative prompt to prioritize continuity, not a medical alarm.
        </p>
      )}

      {/* Task Queue */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Assigned Follow-Up Tasks ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="size-8 text-slate-400" />}
            title="No pending follow-up visits"
            description="Completed handoffs and newly back-referred patients will appear here automatically."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((task) => (
              <Link
                key={task.id}
                href={`/referrals/${task.referralId}`}
                className="block rounded-xl border border-border bg-white p-4 shadow-2xs hover:shadow-xs hover:border-teal-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {task.category === "NEWBORN_CONTINUITY" ? (
                      <Baby className="size-4 text-teal-600" />
                    ) : (
                      <UserCheck className="size-4 text-slate-600" />
                    )}
                    <p className="text-sm font-bold text-slate-900">{task.title}</p>
                  </div>
                  <StatusBadge status={stateById.get(task.id) === "OVERDUE" ? "OVERDUE" : task.status} />
                </div>
                <p className="mt-1 text-xs text-slate-600">{task.description}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <span>
                    {FOLLOW_UP_TASK_CATEGORY_LABELS[task.category] ?? task.category} · Case:{" "}
                    <strong className="text-slate-800">{task.referral.referralCode}</strong> · Patient:{" "}
                    <strong>{task.referral.patient.name || task.referral.patient.pseudonym}</strong>
                  </span>
                  <span className={`font-semibold ${stateById.get(task.id) === "OVERDUE" ? "text-rose-600" : "text-teal-800"}`}>
                    {stateById.get(task.id) === "OVERDUE" ? `Was due ${formatDate(task.dueDate)}` : `Due ${formatDate(task.dueDate)}`} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
