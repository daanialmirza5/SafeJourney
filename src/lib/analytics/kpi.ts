import { statusIndex } from "@/lib/referral/stateMachine";
import { deriveFollowUpTaskState } from "@/lib/referral/newbornContinuity";

/**
 * Pure KPI calculations, separated from computeAnalytics.ts's DB fetch so
 * they're testable against plain synthetic arrays (same pattern as
 * listView.ts / newbornContinuity.ts). Every number here is operational or
 * administrative -- counts and completion rates -- never a clinical risk
 * score or diagnostic signal.
 */

export interface ReferralForKpi {
  status: string;
  transportRequired: boolean;
  transportRequests: { status: string }[];
  backReferral: unknown | null;
  adminTasks: { category: string; status: string }[];
  followUpTasks: { category: string; status: string; dueDate: Date }[];
}

/** Categories created only at back-referral time as near-term admin
 * handoffs (see referralService.ts) vs. the newborn continuity milestones
 * (see newbornContinuity.ts) -- kept in sync with FollowUpTaskCategory. */
const MATERNAL_FOLLOWUP_CATEGORIES = ["DISCHARGE_HANDOFF", "ADMIN_FOLLOW_UP"];
const NEWBORN_FOLLOWUP_CATEGORIES = ["HOME_VISIT", "IMMUNIZATION_REMINDER", "GROWTH_CHECK", "CONTINUITY_REVIEW"];

/** Referrals that need transport and haven't reached ARRIVED (or had
 * transport cancelled) yet -- includes the case where transport is
 * required but not even requested yet, which is still "pending." */
export function countTransportPending(referrals: ReferralForKpi[]): number {
  return referrals.filter((r) => {
    if (!r.transportRequired) return false;
    const transport = r.transportRequests[0];
    if (!transport) return true;
    return !["ARRIVED", "CANCELLED"].includes(transport.status);
  }).length;
}

/** Completion rate of just the "financial" (benefit/entitlement) admin
 * task category -- narrower than the blended administrativeReadiness,
 * which mixes in referral/transport/identity/birth/discharge tasks too. */
export function computeBenefitChecklistCompletion(referrals: ReferralForKpi[]): number {
  const financialTasks = referrals
    .flatMap((r) => r.adminTasks)
    .filter((t) => t.category === "financial" && t.status !== "NOT_APPLICABLE");
  if (financialTasks.length === 0) return 100;
  const complete = financialTasks.filter((t) => t.status === "COMPLETE").length;
  return Math.round((complete / financialTasks.length) * 100);
}

/** Among referrals that reached DISCHARGED or beyond, what fraction
 * actually got a back-referral generated. */
export function computeBackReferralCompletionRate(referrals: ReferralForKpi[]): number {
  const eligible = referrals.filter((r) => r.status !== "CANCELLED" && statusIndex(r.status as never) >= statusIndex("DISCHARGED" as never));
  if (eligible.length === 0) return 100;
  const withBackReferral = eligible.filter((r) => r.backReferral !== null).length;
  return Math.round((withBackReferral / eligible.length) * 100);
}

export interface FollowUpCompletionByGroup {
  maternal: number;
  newborn: number;
}

/** Splits the blended follow-up completion rate into maternal/
 * administrative handoffs vs. the newborn continuity schedule -- these
 * are different journeys with different timescales (days vs. months) and
 * blending them into one number hides that. */
export function computeFollowUpCompletionByGroup(referrals: ReferralForKpi[]): FollowUpCompletionByGroup {
  const allTasks = referrals.flatMap((r) => r.followUpTasks);
  const rate = (tasks: typeof allTasks) =>
    tasks.length === 0 ? 100 : Math.round((tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100);
  return {
    maternal: rate(allTasks.filter((t) => MATERNAL_FOLLOWUP_CATEGORIES.includes(t.category))),
    newborn: rate(allTasks.filter((t) => NEWBORN_FOLLOWUP_CATEGORIES.includes(t.category))),
  };
}

/** Count of follow-up tasks (maternal or newborn) that are currently
 * overdue -- still open, past their due date. Uses the same
 * deriveFollowUpTaskState the referral-detail timeline uses, so the two
 * views can never disagree about what "overdue" means. */
export function countOverdueFollowUps(referrals: ReferralForKpi[], now: Date = new Date()): number {
  return referrals.flatMap((r) => r.followUpTasks).filter((t) => deriveFollowUpTaskState(t, now) === "OVERDUE").length;
}
