import { describe, it, expect } from "vitest";
import { getClosureBlockers } from "./closureSafeguards";

describe("getClosureBlockers", () => {
  it("returns no blockers when every follow-up/admin task is resolved and back-referral is acknowledged", () => {
    const referral = {
      followUpTasks: [{ status: "COMPLETED" }, { status: "CANCELLED" }],
      adminTasks: [{ status: "COMPLETE" }, { status: "NOT_APPLICABLE" }],
      backReferral: { acknowledgedAt: new Date("2026-01-01T00:00:00Z") },
    };
    expect(getClosureBlockers(referral)).toEqual([]);
  });

  it("returns no blockers when there is no back-referral at all (e.g. still early in the lifecycle)", () => {
    const referral = { followUpTasks: [], adminTasks: [], backReferral: null };
    expect(getClosureBlockers(referral)).toEqual([]);
  });

  it("flags incomplete follow-up tasks with an accurate count and singular/plural wording", () => {
    const referral = {
      followUpTasks: [{ status: "PENDING" }, { status: "OVERDUE" }, { status: "COMPLETED" }],
      adminTasks: [],
      backReferral: null,
    };
    const blockers = getClosureBlockers(referral);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].code).toBe("INCOMPLETE_FOLLOW_UP_TASKS");
    expect(blockers[0].count).toBe(2);
    expect(blockers[0].message).toContain("2 follow-up tasks");

    const singular = getClosureBlockers({ ...referral, followUpTasks: [{ status: "PENDING" }] });
    expect(singular[0].message).toContain("1 follow-up task ");
  });

  it("flags incomplete admin tasks (documents/benefits), excluding NOT_APPLICABLE ones", () => {
    const referral = {
      followUpTasks: [],
      adminTasks: [{ status: "PENDING" }, { status: "NEEDS_REVIEW" }, { status: "NOT_APPLICABLE" }, { status: "COMPLETE" }],
      backReferral: null,
    };
    const blockers = getClosureBlockers(referral);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].code).toBe("INCOMPLETE_ADMIN_TASKS");
    expect(blockers[0].count).toBe(2);
  });

  it("flags an unacknowledged back-referral", () => {
    const referral = { followUpTasks: [], adminTasks: [], backReferral: { acknowledgedAt: null } };
    const blockers = getClosureBlockers(referral);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].code).toBe("BACK_REFERRAL_NOT_ACKNOWLEDGED");
  });

  it("can return multiple blockers at once, in a stable order", () => {
    const referral = {
      followUpTasks: [{ status: "PENDING" }],
      adminTasks: [{ status: "PENDING" }],
      backReferral: { acknowledgedAt: null },
    };
    const blockers = getClosureBlockers(referral);
    expect(blockers.map((b) => b.code)).toEqual([
      "INCOMPLETE_FOLLOW_UP_TASKS",
      "INCOMPLETE_ADMIN_TASKS",
      "BACK_REFERRAL_NOT_ACKNOWLEDGED",
    ]);
  });
});
