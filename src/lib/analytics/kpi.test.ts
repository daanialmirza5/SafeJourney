import { describe, it, expect } from "vitest";
import {
  countTransportPending,
  computeBenefitChecklistCompletion,
  computeBackReferralCompletionRate,
  computeFollowUpCompletionByGroup,
  countOverdueFollowUps,
  type ReferralForKpi,
} from "./kpi";

function makeReferral(overrides: Partial<ReferralForKpi> = {}): ReferralForKpi {
  return {
    status: "SENT",
    transportRequired: false,
    transportRequests: [],
    backReferral: null,
    adminTasks: [],
    followUpTasks: [],
    ...overrides,
  };
}

describe("countTransportPending", () => {
  it("counts referrals that need transport but have none arranged yet", () => {
    const referrals = [makeReferral({ transportRequired: true, transportRequests: [] }), makeReferral({ transportRequired: false })];
    expect(countTransportPending(referrals)).toBe(1);
  });

  it("counts a referral with transport in progress (not yet arrived)", () => {
    const referrals = [makeReferral({ transportRequired: true, transportRequests: [{ status: "EN_ROUTE_TO_PICKUP" }] })];
    expect(countTransportPending(referrals)).toBe(1);
  });

  it("does not count transport that has already arrived", () => {
    const referrals = [makeReferral({ transportRequired: true, transportRequests: [{ status: "ARRIVED" }] })];
    expect(countTransportPending(referrals)).toBe(0);
  });

  it("does not count cancelled transport", () => {
    const referrals = [makeReferral({ transportRequired: true, transportRequests: [{ status: "CANCELLED" }] })];
    expect(countTransportPending(referrals)).toBe(0);
  });
});

describe("computeBenefitChecklistCompletion", () => {
  it("returns 100 when there are no financial tasks at all", () => {
    expect(computeBenefitChecklistCompletion([makeReferral()])).toBe(100);
  });

  it("only counts the 'financial' category, ignoring other admin task categories", () => {
    const referrals = [
      makeReferral({
        adminTasks: [
          { category: "financial", status: "COMPLETE" },
          { category: "referral", status: "PENDING" }, // should not affect the rate
        ],
      }),
    ];
    expect(computeBenefitChecklistCompletion(referrals)).toBe(100);
  });

  it("excludes NOT_APPLICABLE financial tasks from the denominator", () => {
    const referrals = [
      makeReferral({
        adminTasks: [
          { category: "financial", status: "COMPLETE" },
          { category: "financial", status: "NOT_APPLICABLE" },
        ],
      }),
    ];
    expect(computeBenefitChecklistCompletion(referrals)).toBe(100);
  });

  it("computes a partial rate correctly", () => {
    const referrals = [
      makeReferral({
        adminTasks: [
          { category: "financial", status: "COMPLETE" },
          { category: "financial", status: "PENDING" },
        ],
      }),
    ];
    expect(computeBenefitChecklistCompletion(referrals)).toBe(50);
  });
});

describe("computeBackReferralCompletionRate", () => {
  it("returns 100 when nothing has reached DISCHARGED yet", () => {
    expect(computeBackReferralCompletionRate([makeReferral({ status: "SENT" })])).toBe(100);
  });

  it("counts a discharged referral without a back-referral as incomplete", () => {
    const referrals = [makeReferral({ status: "DISCHARGED", backReferral: null })];
    expect(computeBackReferralCompletionRate(referrals)).toBe(0);
  });

  it("counts a referral with a back-referral as complete", () => {
    const referrals = [makeReferral({ status: "BACK_REFERRED", backReferral: { id: "br-1" } })];
    expect(computeBackReferralCompletionRate(referrals)).toBe(100);
  });

  it("ignores referrals that haven't reached DISCHARGED and cancelled ones", () => {
    const referrals = [
      makeReferral({ status: "SENT" }),
      makeReferral({ status: "CANCELLED" }),
      makeReferral({ status: "CLOSED", backReferral: { id: "br-1" } }),
    ];
    expect(computeBackReferralCompletionRate(referrals)).toBe(100);
  });
});

describe("computeFollowUpCompletionByGroup", () => {
  it("splits maternal (handoff/admin) from newborn (continuity) categories", () => {
    const referrals = [
      makeReferral({
        followUpTasks: [
          { category: "DISCHARGE_HANDOFF", status: "COMPLETED", dueDate: new Date() },
          { category: "ADMIN_FOLLOW_UP", status: "PENDING", dueDate: new Date() },
          { category: "HOME_VISIT", status: "COMPLETED", dueDate: new Date() },
          { category: "GROWTH_CHECK", status: "COMPLETED", dueDate: new Date() },
          { category: "IMMUNIZATION_REMINDER", status: "PENDING", dueDate: new Date() },
        ],
      }),
    ];
    const result = computeFollowUpCompletionByGroup(referrals);
    expect(result.maternal).toBe(50); // 1 of 2 completed
    expect(result.newborn).toBe(67); // 2 of 3 completed, rounded
  });

  it("returns 100 for a group with no tasks", () => {
    expect(computeFollowUpCompletionByGroup([makeReferral()])).toEqual({ maternal: 100, newborn: 100 });
  });
});

describe("countOverdueFollowUps", () => {
  const now = new Date("2026-06-01T00:00:00Z");

  it("counts only open tasks past their due date", () => {
    const referrals = [
      makeReferral({
        followUpTasks: [
          { category: "HOME_VISIT", status: "PENDING", dueDate: new Date("2026-05-01T00:00:00Z") }, // overdue
          { category: "HOME_VISIT", status: "PENDING", dueDate: new Date("2026-07-01T00:00:00Z") }, // upcoming
          { category: "HOME_VISIT", status: "COMPLETED", dueDate: new Date("2026-05-01T00:00:00Z") }, // done, not overdue
          { category: "HOME_VISIT", status: "CANCELLED", dueDate: new Date("2026-05-01T00:00:00Z") }, // skipped, not overdue
        ],
      }),
    ];
    expect(countOverdueFollowUps(referrals, now)).toBe(1);
  });

  it("returns 0 when there are no follow-up tasks", () => {
    expect(countOverdueFollowUps([makeReferral()], now)).toBe(0);
  });
});
