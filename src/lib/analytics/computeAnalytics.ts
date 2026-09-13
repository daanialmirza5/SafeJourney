import { db } from "@/lib/db";
import { referralScopeFor } from "@/lib/referral/queries";
import { getAckTimeoutMinutes } from "@/lib/config";
import { decorateOperationalStatus } from "@/lib/referral/decorate";
import { STATUS_ORDER, statusIndex } from "@/lib/referral/stateMachine";
import { summarizeReferralCounts } from "@/lib/referral/listView";
import {
  countTransportPending,
  computeBenefitChecklistCompletion,
  computeBackReferralCompletionRate,
  computeFollowUpCompletionByGroup,
  countOverdueFollowUps,
} from "@/lib/analytics/kpi";
import type { User } from "@prisma/client";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export async function computeAnalytics(user: User, range: DateRange = {}) {
  const scope = await referralScopeFor(user);
  const ackTimeoutMinutes = await getAckTimeoutMinutes();

  const where =
    range.from || range.to
      ? { AND: [scope, { createdAt: { gte: range.from, lte: range.to } }] }
      : scope;

  const referrals = await db.referralCase.findMany({
    where,
    include: {
      adminTasks: true,
      documents: true,
      followUpTasks: true,
      transportRequests: true,
      backReferral: true,
      referringFacility: true,
      receivingFacility: true,
      patient: true,
      events: true,
    },
  });
  const decorated = referrals.map((r) => decorateOperationalStatus(r, ackTimeoutMinutes));
  const counts = summarizeReferralCounts(decorated);

  const totalInitiated = counts.total;
  const closed = counts.completed;
  const closedLoopReferralRate = totalInitiated > 0 ? Math.round((closed / totalInitiated) * 1000) / 10 : 0;

  const funnel = STATUS_ORDER.filter((s) => s !== "DRAFT").map((status) => {
    const reached = referrals.filter((r) => r.status !== "CANCELLED" && statusIndex(r.status as never) >= statusIndex(status)).length;
    return { status, count: reached };
  });

  const stuckReferrals = decorated.filter((r) => r.operationalStatus === "STUCK");
  const averageStuckMinutes =
    stuckReferrals.length > 0 ? Math.round(stuckReferrals.reduce((sum, r) => sum + r.minutesWaiting, 0) / stuckReferrals.length) : 0;

  const handoffDurations = referrals
    .filter((r) => r.sentAt && r.acknowledgedAt)
    .map((r) => (r.acknowledgedAt!.getTime() - r.sentAt!.getTime()) / 60000);
  const averageHandoffMinutes = handoffDurations.length > 0 ? Math.round(handoffDurations.reduce((a, b) => a + b, 0) / handoffDurations.length) : 0;

  const activeReferrals = decorated.filter((r) => !["CLOSED", "CANCELLED"].includes(r.status));
  const averageAdminCompleteness =
    activeReferrals.length > 0 ? Math.round(activeReferrals.reduce((sum, r) => sum + r.administrativeReadiness, 0) / activeReferrals.length) : 100;

  const allDocuments = referrals.flatMap((r) => r.documents);
  const documentCompleteness =
    allDocuments.length > 0 ? Math.round((allDocuments.filter((d) => d.status === "CONFIRMED").length / allDocuments.length) * 100) : 0;

  const followUpCompletion = computeFollowUpCompletionByGroup(referrals);

  return {
    totalInitiated,
    pending: counts.pending,
    acknowledged: counts.acknowledged,
    closed,
    rescued: counts.rescued,
    closedLoopReferralRate,
    funnel,
    stuckCount: stuckReferrals.length,
    averageStuckMinutes,
    averageHandoffMinutes,
    averageAdminCompleteness,
    documentCompleteness,
    maternalFollowUpCompletionRate: followUpCompletion.maternal,
    newbornFollowUpCompletionRate: followUpCompletion.newborn,
    transportPendingCount: countTransportPending(referrals),
    benefitChecklistCompletion: computeBenefitChecklistCompletion(referrals),
    backReferralCompletionRate: computeBackReferralCompletionRate(referrals),
    overdueFollowUpCount: countOverdueFollowUps(referrals),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof computeAnalytics>>;
