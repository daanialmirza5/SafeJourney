import type { ReferralStatus } from "./stateMachine";

/**
 * No-Patient-Left-Behind operational status engine (spec section 14) and
 * Referral Rescue Engine (spec section 13).
 *
 * This is a purely operational escalation signal -- it flags workflow
 * handoffs that have not progressed within a configurable window. It must
 * NEVER be read as a clinical risk or urgency prediction.
 */

export type OperationalStatus = "ON_TRACK" | "ACTION_REQUIRED" | "STUCK" | "CLOSED";

const TERMINAL: ReferralStatus[] = ["CLOSED", "CANCELLED"];

/** Statuses where the referral is waiting on another party to act within the
 * short operational SLA window (`ackTimeoutMinutes`, minutes-to-hours
 * scale). If the case has dwelled in one of these beyond the configured
 * timeout, it is escalated to STUCK.
 *
 * FOLLOW_UP_PENDING is deliberately NOT in this list: once the newborn
 * continuity journey (spec section 30) can span six to eight months, the
 * same fast ack-timeout window would flag every follow-up referral STUCK
 * within minutes of back-referral. Follow-up gets its own check below,
 * driven by whether an individual follow-up task's own due date has passed,
 * not by how long the referral has sat in the status overall. */
const WAITING_STATUSES: ReferralStatus[] = [
  "SENT",
  "TRANSPORT_REQUESTED",
  "TRANSPORT_ASSIGNED",
  "IN_TRANSIT",
  "DISCHARGED",
  "BACK_REFERRED",
];

export interface OperationalStatusInput {
  status: ReferralStatus;
  /** Timestamp the case entered its current `status`. */
  statusEnteredAt: Date;
  now: Date;
  ackTimeoutMinutes: number;
  hasNeedsReviewAdminTask: boolean;
  hasUnconfirmedDocuments: boolean;
  /** True if any of the referral's follow-up tasks (see FollowUpTask /
   * newbornContinuity.ts) is past its own due date and not yet completed.
   * Drives FOLLOW_UP_PENDING's STUCK signal instead of ackTimeoutMinutes. */
  hasOverdueFollowUpTask?: boolean;
}

export interface OperationalStatusResult {
  operationalStatus: OperationalStatus;
  reason: string;
  minutesWaiting: number;
}

export function computeOperationalStatus(input: OperationalStatusInput): OperationalStatusResult {
  const { status, statusEnteredAt, now, ackTimeoutMinutes, hasNeedsReviewAdminTask, hasUnconfirmedDocuments, hasOverdueFollowUpTask } = input;

  if (TERMINAL.includes(status)) {
    return { operationalStatus: "CLOSED", reason: "Referral has reached a terminal state.", minutesWaiting: 0 };
  }

  const minutesWaiting = Math.max(0, (now.getTime() - statusEnteredAt.getTime()) / 60000);

  if (status === "FOLLOW_UP_PENDING") {
    return hasOverdueFollowUpTask
      ? { operationalStatus: "STUCK", reason: "A scheduled follow-up task is overdue.", minutesWaiting: Math.round(minutesWaiting) }
      : { operationalStatus: "ON_TRACK", reason: "Follow-up is progressing on schedule.", minutesWaiting: Math.round(minutesWaiting) };
  }

  if (WAITING_STATUSES.includes(status) && minutesWaiting > ackTimeoutMinutes) {
    return {
      operationalStatus: "STUCK",
      reason: stuckReason(status),
      minutesWaiting: Math.round(minutesWaiting),
    };
  }

  if (hasNeedsReviewAdminTask || hasUnconfirmedDocuments) {
    return {
      operationalStatus: "ACTION_REQUIRED",
      reason: hasNeedsReviewAdminTask
        ? "An administrative task needs review."
        : "A document needs confirmation before it can be attached to the referral.",
      minutesWaiting: Math.round(minutesWaiting),
    };
  }

  return { operationalStatus: "ON_TRACK", reason: "Referral is progressing as expected.", minutesWaiting: Math.round(minutesWaiting) };
}

function stuckReason(status: ReferralStatus): string {
  switch (status) {
    case "SENT":
      return "Referral has not been acknowledged by the receiving facility.";
    case "TRANSPORT_REQUESTED":
      return "Transport has not yet been assigned.";
    case "TRANSPORT_ASSIGNED":
      return "Transport has not yet picked up the patient.";
    case "IN_TRANSIT":
      return "Patient has not been confirmed arrived at the receiving facility.";
    case "DISCHARGED":
      return "Back-referral has not yet been generated.";
    case "BACK_REFERRED":
      return "Follow-up has not yet been assigned.";
    default:
      return "Referral workflow has stalled.";
  }
}

export const RESCUE_ACTIONS = [
  { id: "CONTACT_FACILITY", label: "Contact receiving facility" },
  { id: "ESCALATE_COORDINATOR", label: "Escalate to coordinator" },
  { id: "ALTERNATE_FACILITY", label: "Choose alternate demo facility" },
  { id: "RETRY_NOTIFICATION", label: "Retry notification" },
] as const;

export type RescueActionId = (typeof RESCUE_ACTIONS)[number]["id"];
