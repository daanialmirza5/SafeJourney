import { Circle } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { DecoratedReferral } from "@/lib/referral/queries";

const ACTION_LABELS: Record<string, string> = {
  REFERRAL_CREATED: "Referral created",
  REFERRAL_SENT: "Receiving facility notified",
  REFERRAL_ACCEPTED: "Referral accepted",
  CLARIFICATION_REQUESTED: "Clarification requested",
  REFERRAL_DECLINED: "Referral declined",
  TRANSPORT_REQUESTED: "Transport requested",
  TRANSPORT_ASSIGNED: "Transport assigned",
  TRANSPORT_EN_ROUTE_TO_PICKUP: "Transport en route to pickup",
  TRANSPORT_PICKED_UP: "Patient picked up",
  PATIENT_IN_TRANSIT: "Patient in transit",
  PATIENT_ARRIVED: "Patient arrived",
  UNDER_CARE: "Under receiving facility's care",
  DISCHARGE_CREATED: "Discharge recorded",
  BACK_REFERRAL_CREATED: "Back-referral sent",
  BACK_REFERRAL_ACKNOWLEDGED: "Back-referral acknowledged by origin facility",
  FOLLOW_UP_ASSIGNED: "Follow-up assigned",
  FOLLOW_UP_COMPLETED: "Follow-up completed",
  REFERRAL_CLOSED: "Referral closed",
  ADMIN_OVERRIDE: "Administrative override",
  REFERRAL_REOPENED: "Referral reopened (administrative override)",
  RESCUE_ACTION_APPLIED: "Rescue action applied",
};

export function ReferralTimeline({ referral }: { referral: DecoratedReferral }) {
  if (referral.events.length === 0) {
    return <p className="text-sm text-slate-400">No events recorded yet.</p>;
  }
  return (
    <ol className="space-y-0">
      {referral.events.map((event, i) => (
        <li key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Circle className="size-2.5 fill-brand text-brand" />
            {i < referral.events.length - 1 && <div className="mt-0.5 h-full w-px flex-1 bg-slate-200" />}
          </div>
          <div className="pb-5">
            <p className="text-xs text-slate-400">{formatDateTime(event.createdAt)}</p>
            <p className="text-sm font-medium text-slate-800">{ACTION_LABELS[event.action] ?? event.action}</p>
            {event.note && <p className="mt-0.5 text-xs text-slate-500">{event.note}</p>}
            <p className="mt-0.5 text-[11px] text-slate-400">
              {event.actor?.name ?? "System"} {event.actorRole ? `· ${event.actorRole.toLowerCase()}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
