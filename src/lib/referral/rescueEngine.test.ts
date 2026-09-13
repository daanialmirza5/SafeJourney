import { describe, it, expect } from "vitest";
import { computeOperationalStatus } from "./rescueEngine";

const BASE = {
  ackTimeoutMinutes: 10,
  hasNeedsReviewAdminTask: false,
  hasUnconfirmedDocuments: false,
};

describe("Referral Rescue Engine / operational status", () => {
  it("is ON_TRACK for a freshly sent referral within the timeout window", () => {
    const now = new Date("2026-01-01T10:05:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "SENT",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
    });
    expect(result.operationalStatus).toBe("ON_TRACK");
  });

  it("flags STUCK once a SENT referral exceeds the acknowledgement timeout", () => {
    const now = new Date("2026-01-01T10:15:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "SENT",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
    });
    expect(result.operationalStatus).toBe("STUCK");
    expect(result.reason).toMatch(/not been acknowledged/i);
    expect(result.minutesWaiting).toBe(15);
  });

  it("flags STUCK for transport requested beyond the timeout", () => {
    const now = new Date("2026-01-01T11:00:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "TRANSPORT_REQUESTED",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
    });
    expect(result.operationalStatus).toBe("STUCK");
  });

  it("is ACTION_REQUIRED when a document needs confirmation, absent a timeout breach", () => {
    const now = new Date("2026-01-01T10:02:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "ACKNOWLEDGED",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
      hasUnconfirmedDocuments: true,
    });
    expect(result.operationalStatus).toBe("ACTION_REQUIRED");
  });

  it("is ACTION_REQUIRED when an admin task needs review", () => {
    const now = new Date("2026-01-01T10:02:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "UNDER_CARE",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
      hasNeedsReviewAdminTask: true,
    });
    expect(result.operationalStatus).toBe("ACTION_REQUIRED");
  });

  it("is always CLOSED for a terminal referral regardless of dwell time", () => {
    const now = new Date("2026-01-05T10:00:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "CLOSED",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
    });
    expect(result.operationalStatus).toBe("CLOSED");

    const cancelled = computeOperationalStatus({
      ...BASE,
      status: "CANCELLED",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
    });
    expect(cancelled.operationalStatus).toBe("CLOSED");
  });

  it("stays ON_TRACK in FOLLOW_UP_PENDING even long past the short ack timeout, absent an overdue task", () => {
    // The newborn continuity journey can span months, far beyond the
    // minutes-to-hours-scale ackTimeoutMinutes used for the rest of the
    // workflow -- FOLLOW_UP_PENDING must not be judged by that clock.
    const now = new Date("2026-04-01T10:00:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "FOLLOW_UP_PENDING",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"), // 90 days ago
      now,
      hasOverdueFollowUpTask: false,
    });
    expect(result.operationalStatus).toBe("ON_TRACK");
  });

  it("flags STUCK in FOLLOW_UP_PENDING when a follow-up task is overdue", () => {
    const now = new Date("2026-01-01T10:05:00Z");
    const result = computeOperationalStatus({
      ...BASE,
      status: "FOLLOW_UP_PENDING",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
      hasOverdueFollowUpTask: true,
    });
    expect(result.operationalStatus).toBe("STUCK");
    expect(result.reason).toMatch(/overdue/i);
  });

  it("respects a configured (non-default) ack timeout", () => {
    const now = new Date("2026-01-01T10:03:00Z");
    const shortTimeout = computeOperationalStatus({
      status: "SENT",
      statusEnteredAt: new Date("2026-01-01T10:00:00Z"),
      now,
      ackTimeoutMinutes: 2,
      hasNeedsReviewAdminTask: false,
      hasUnconfirmedDocuments: false,
    });
    expect(shortTimeout.operationalStatus).toBe("STUCK");
  });
});
