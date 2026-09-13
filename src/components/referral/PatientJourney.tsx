import { CheckCircle2, Circle, Dot } from "lucide-react";
import { statusIndex } from "@/lib/referral/stateMachine";
import { translate } from "@/lib/i18n/translate";
import { FOLLOW_UP_TASK_CATEGORY_LABELS, deriveFollowUpTaskState } from "@/lib/referral/newbornContinuity";
import { formatDate } from "@/lib/format";
import type { DecoratedReferral } from "@/lib/referral/queries";

interface Stop {
  key: string;
  label: string;
  atIndex: number;
  applicable: boolean;
}

function nextActionFor(referral: DecoratedReferral): string {
  if (referral.status === "CANCELLED") return "This referral was cancelled. Please speak with your doctor about next steps.";
  switch (referral.status) {
    case "DRAFT":
    case "CREATED":
    case "SENT":
      return referral.operationalStatus === "STUCK"
        ? "Your referral is taking longer than expected to be acknowledged. Your care team has been notified."
        : "Waiting for the receiving facility to accept your referral.";
    case "ACKNOWLEDGED":
      return referral.transportRequired
        ? "Your referral was accepted. Transport is being arranged."
        : "Your referral was accepted. Please make your way to the receiving facility with your documents.";
    case "TRANSPORT_REQUESTED":
      return "Transport has been requested and is being assigned.";
    case "TRANSPORT_ASSIGNED":
      return "Transport has been assigned. Please keep your documents ready.";
    case "IN_TRANSIT":
      return "You are on the way. Show your Referral Passport QR code at the receiving facility.";
    case "ARRIVED":
    case "UNDER_CARE":
      return "You have arrived and are under the receiving facility's care.";
    case "DISCHARGED":
      return "Discharge is complete. A back-referral is being prepared to hand your care back.";
    case "BACK_REFERRED":
    case "FOLLOW_UP_PENDING":
      return "A follow-up worker will reach out to complete your handoff.";
    case "FOLLOW_UP_CONFIRMED":
    case "CLOSED":
      return "Your referral journey is complete.";
    default:
      return "Your care team is coordinating the next step.";
  }
}

export function PatientJourney({ referral, language = "en" }: { referral: DecoratedReferral; language?: string }) {
  const t = (text: string) => translate(language, text);
  const idx = statusIndex(referral.status as never);
  // Caregivers see only what's still coming or overdue -- never a task
  // marked COMPLETED (already shown as "done" implicitly) or SKIPPED (an
  // internal coordination decision they don't need surfaced).
  const upcomingFollowUps = referral.followUpTasks
    .filter((task) => ["UPCOMING", "OVERDUE"].includes(deriveFollowUpTaskState(task)))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const stops: Stop[] = [
    { key: "created", label: "Doctor referral created", atIndex: statusIndex("CREATED" as never), applicable: true },
    { key: "accepted", label: "Hospital accepted", atIndex: statusIndex("ACKNOWLEDGED" as never), applicable: true },
    { key: "transport", label: "Transport assigned", atIndex: statusIndex("TRANSPORT_ASSIGNED" as never), applicable: referral.transportRequired },
    { key: "in_transit", label: "In transit", atIndex: statusIndex("IN_TRANSIT" as never), applicable: referral.transportRequired },
    { key: "arrived", label: "Arrival confirmed", atIndex: statusIndex("ARRIVED" as never), applicable: true },
    { key: "discharged", label: "Discharged", atIndex: statusIndex("DISCHARGED" as never), applicable: true },
    { key: "followup", label: "Follow-up complete", atIndex: statusIndex("CLOSED" as never), applicable: true },
  ].filter((s) => s.applicable);

  return (
    <div>
      <div className="rounded-xl border border-brand bg-brand-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">{t("What happens next?")}</p>
        <p className="mt-1 text-sm text-slate-700">{t(nextActionFor(referral))}</p>
      </div>
      <ul className="mt-4 space-y-0">
        {stops.map((stop, i) => {
          const done = referral.status !== "CANCELLED" && idx > stop.atIndex;
          const current = referral.status !== "CANCELLED" && idx === stop.atIndex;
          return (
            <li key={stop.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                {done ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : current ? (
                  <Dot className="size-5 text-brand" />
                ) : (
                  <Circle className="size-5 text-slate-300" />
                )}
                {i < stops.length - 1 && <div className={`mt-0.5 h-6 w-px ${done ? "bg-emerald-300" : "bg-slate-200"}`} />}
              </div>
              <p className={`pb-5 text-sm ${done ? "text-slate-700 line-through decoration-emerald-300" : current ? "font-medium text-slate-900" : "text-slate-400"}`}>
                {t(stop.label)}
              </p>
            </li>
          );
        })}
      </ul>

      {upcomingFollowUps.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("Upcoming care check-ins")}
          </p>
          <ul className="space-y-2">
            {upcomingFollowUps.map((task) => (
              <li key={task.id} className="rounded-lg border border-border bg-white px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{t(task.title)}</p>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">
                    {FOLLOW_UP_TASK_CATEGORY_LABELS[task.category] ?? task.category}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {deriveFollowUpTaskState(task) === "OVERDUE"
                    ? `${t("Was due")} ${formatDate(task.dueDate)}`
                    : `${t("Expected around")} ${formatDate(task.dueDate)}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
