import { computeOperationalStatus } from "@/lib/referral/rescueEngine";
import type { ReferralStatus } from "@/lib/referral/stateMachine";
import { computeAdministrativeReadiness, type AdminTaskLike } from "@/lib/referral/adminCompleteness";

/**
 * Operational status (ON_TRACK/ACTION_REQUIRED/STUCK/CLOSED) is computed
 * fresh on every read rather than trusting the cached DB column -- this
 * keeps dashboards and the Rescue Engine accurate without a background
 * job/cron recomputing it on a schedule (spec section 13-14).
 */
export interface DecoratableReferral {
  status: string;
  updatedAt: Date;
  adminTasks: { status: string }[];
  documents: { status: string }[];
  followUpTasks: { status: string; dueDate: Date }[];
}

export function decorateOperationalStatus<T extends DecoratableReferral>(
  referral: T,
  ackTimeoutMinutes: number,
  now: Date = new Date()
) {
  const computed = computeOperationalStatus({
    status: referral.status as ReferralStatus,
    statusEnteredAt: referral.updatedAt,
    now,
    ackTimeoutMinutes,
    hasNeedsReviewAdminTask: referral.adminTasks.some((t) => t.status === "NEEDS_REVIEW"),
    hasUnconfirmedDocuments: referral.documents.some((d) => d.status === "UPLOADED" || d.status === "EXTRACTED"),
    hasOverdueFollowUpTask: referral.followUpTasks.some(
      (t) => ["PENDING", "DUE", "OVERDUE"].includes(t.status) && t.dueDate < now
    ),
  });
  const administrativeReadiness = computeAdministrativeReadiness(referral.adminTasks as AdminTaskLike[]);
  return {
    ...referral,
    operationalStatus: computed.operationalStatus,
    operationalStatusReason: computed.reason,
    minutesWaiting: computed.minutesWaiting,
    administrativeReadiness,
  };
}
