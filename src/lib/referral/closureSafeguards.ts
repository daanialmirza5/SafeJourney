import { getIncompleteAdminTasks, type AdminTaskLike } from "@/lib/referral/adminCompleteness";

/** One concrete, human-readable reason a referral is not yet safe to close.
 * Purely administrative/coordination bookkeeping -- never a clinical
 * judgment about whether the patient is "fit" to have their case closed. */
export interface ClosureBlocker {
  code: "INCOMPLETE_FOLLOW_UP_TASKS" | "INCOMPLETE_ADMIN_TASKS" | "BACK_REFERRAL_NOT_ACKNOWLEDGED";
  count?: number;
  message: string;
}

export interface ClosureReferralLike {
  followUpTasks: { status: string }[];
  adminTasks: AdminTaskLike[];
  backReferral: { acknowledgedAt: Date | null } | null;
}

/** The follow-up task statuses that still count as "open" -- shared with
 * closeReferralIfFollowUpComplete's own query in referralService.ts so the
 * two never drift apart on what "resolved" means. */
export const OPEN_FOLLOW_UP_STATUSES = ["PENDING", "DUE", "OVERDUE"];

/**
 * The normal auto-close path (closeReferralIfFollowUpComplete in
 * referralService.ts) only ever closes a referral once every follow-up
 * task is COMPLETED or CANCELLED/skipped -- it can never fire while
 * anything is still open. adminOverrideStatus is a separate, ADMIN-only
 * escape hatch that can force *any* non-terminal status straight to
 * CLOSED, and previously did so without looking at follow-up completeness,
 * outstanding admin/document tasks, or back-referral acknowledgment at
 * all. This is the shared, pure check both that override path and the
 * closure-confirmation UI use, so an admin always sees the same list of
 * outstanding items the system would have blocked on automatically.
 */
export function getClosureBlockers(referral: ClosureReferralLike): ClosureBlocker[] {
  const blockers: ClosureBlocker[] = [];

  const incompleteFollowUps = referral.followUpTasks.filter((t) => OPEN_FOLLOW_UP_STATUSES.includes(t.status));
  if (incompleteFollowUps.length > 0) {
    blockers.push({
      code: "INCOMPLETE_FOLLOW_UP_TASKS",
      count: incompleteFollowUps.length,
      message: `${incompleteFollowUps.length} follow-up task${incompleteFollowUps.length === 1 ? "" : "s"} not yet completed or skipped.`,
    });
  }

  const incompleteAdminTasks = getIncompleteAdminTasks(referral.adminTasks);
  if (incompleteAdminTasks.length > 0) {
    blockers.push({
      code: "INCOMPLETE_ADMIN_TASKS",
      count: incompleteAdminTasks.length,
      message: `${incompleteAdminTasks.length} administrative task${incompleteAdminTasks.length === 1 ? "" : "s"} (documents/benefits) not yet marked complete.`,
    });
  }

  if (referral.backReferral && !referral.backReferral.acknowledgedAt) {
    blockers.push({
      code: "BACK_REFERRAL_NOT_ACKNOWLEDGED",
      message: "The back-referral has been sent but the origin facility has not yet acknowledged it.",
    });
  }

  return blockers;
}
