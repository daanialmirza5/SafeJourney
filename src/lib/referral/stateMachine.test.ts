import { describe, it, expect } from "vitest";
import {
  canTransition,
  transition,
  overrideTransition,
  InvalidTransitionError,
  nextStatuses,
  isTerminalStatus,
  getRemainingLifecycleSteps,
  calculateLifecycleProgressPercentage,
  validateTransitionSequence,
  applyIdempotentTransition,
  generateAuditTrailEntry,
} from "./stateMachine";

describe("referral state machine", () => {
  it("allows the full happy-path sequence (spec section 51)", () => {
    const sequence = [
      "DRAFT",
      "CREATED",
      "SENT",
      "ACKNOWLEDGED",
      "TRANSPORT_REQUESTED",
      "TRANSPORT_ASSIGNED",
      "IN_TRANSIT",
      "ARRIVED",
      "UNDER_CARE",
      "DISCHARGED",
      "BACK_REFERRED",
      "FOLLOW_UP_PENDING",
      "FOLLOW_UP_CONFIRMED",
      "CLOSED",
    ] as const;
    for (let i = 0; i < sequence.length - 1; i++) {
      expect(canTransition(sequence[i], sequence[i + 1])).toBe(true);
      expect(transition(sequence[i], sequence[i + 1])).toBe(sequence[i + 1]);
    }
  });

  it("allows skipping transport when not required (ACKNOWLEDGED -> ARRIVED)", () => {
    expect(canTransition("ACKNOWLEDGED", "ARRIVED")).toBe(true);
  });

  it("rejects a closed referral moving backward to IN_TRANSIT", () => {
    expect(canTransition("CLOSED", "IN_TRANSIT")).toBe(false);
    expect(() => transition("CLOSED", "IN_TRANSIT")).toThrow(InvalidTransitionError);
  });

  it("rejects DRAFT jumping straight to CLOSED", () => {
    expect(canTransition("DRAFT", "CLOSED")).toBe(false);
    expect(() => transition("DRAFT", "CLOSED")).toThrow(InvalidTransitionError);
  });

  it("rejects ARRIVED reverting to CREATED", () => {
    expect(canTransition("ARRIVED", "CREATED")).toBe(false);
  });

  it("rejects skipping steps, e.g. SENT straight to ARRIVED", () => {
    expect(canTransition("SENT", "ARRIVED")).toBe(false);
  });

  it("lists valid next statuses for a given state", () => {
    expect(nextStatuses("ACKNOWLEDGED")).toEqual(["TRANSPORT_REQUESTED", "ARRIVED"]);
    expect(nextStatuses("CLOSED")).toEqual([]);
  });

  describe("administrative overrides", () => {
    it("allows cancelling any non-terminal referral with a reason", () => {
      expect(overrideTransition("SENT", "CANCELLED", "Family withdrew consent")).toBe("CANCELLED");
      expect(overrideTransition("IN_TRANSIT", "CANCELLED", "Duplicate referral")).toBe("CANCELLED");
    });

    it("rejects cancelling an already-terminal referral", () => {
      expect(() => overrideTransition("CLOSED", "CANCELLED", "reason")).toThrow(InvalidTransitionError);
      expect(() => overrideTransition("CANCELLED", "CANCELLED", "reason")).toThrow(InvalidTransitionError);
    });

    it("requires a non-empty reason for any override", () => {
      expect(() => overrideTransition("SENT", "CANCELLED", "")).toThrow(/reason/);
      expect(() => overrideTransition("SENT", "CANCELLED", "   ")).toThrow(/reason/);
    });

    it("rejects a same-status override", () => {
      expect(() => overrideTransition("SENT", "SENT", "no-op")).toThrow(InvalidTransitionError);
    });
  });

  describe("lifecycle progress & sequence analysis", () => {
    it("identifies terminal and non-terminal states correctly", () => {
      expect(isTerminalStatus("CLOSED")).toBe(true);
      expect(isTerminalStatus("CANCELLED")).toBe(true);
      expect(isTerminalStatus("UNDER_CARE")).toBe(false);
      expect(isTerminalStatus("DRAFT")).toBe(false);
    });

    it("calculates remaining lifecycle steps from any active state", () => {
      const remainingFromUnderCare = getRemainingLifecycleSteps("UNDER_CARE");
      expect(remainingFromUnderCare).toEqual([
        "DISCHARGED",
        "BACK_REFERRED",
        "FOLLOW_UP_PENDING",
        "FOLLOW_UP_CONFIRMED",
        "CLOSED",
      ]);
      expect(getRemainingLifecycleSteps("CLOSED")).toEqual([]);
      expect(getRemainingLifecycleSteps("CANCELLED")).toEqual([]);
    });

    it("computes accurate percentage completion through the clinical journey", () => {
      expect(calculateLifecycleProgressPercentage("DRAFT")).toBe(0);
      expect(calculateLifecycleProgressPercentage("CLOSED")).toBe(100);
      expect(calculateLifecycleProgressPercentage("CANCELLED")).toBe(0);
      expect(calculateLifecycleProgressPercentage("ARRIVED")).toBeGreaterThan(40);
      expect(calculateLifecycleProgressPercentage("ARRIVED")).toBeLessThan(70);
    });

    it("validates valid and invalid transition sequences", () => {
      const validSeq = ["DRAFT", "CREATED", "SENT", "ACKNOWLEDGED", "ARRIVED", "UNDER_CARE"] as const;
      expect(validateTransitionSequence([...validSeq])).toEqual({ valid: true });

      const invalidSeq = ["DRAFT", "SENT", "UNDER_CARE"] as const;
      const res = validateTransitionSequence([...invalidSeq]);
      expect(res.valid).toBe(false);
      expect(res.errorIndex).toBe(1);
    });
  });

  describe("idempotent transitions & out-of-order event protection", () => {
    it("detects and short-circuits duplicate events with idempotency keys", () => {
      const processedKeys = new Set(["KEY-101"]);
      const res = applyIdempotentTransition({
        currentStatus: "SENT",
        targetStatus: "ACKNOWLEDGED",
        eventTimestamp: 2000,
        lastEventTimestamp: 1000,
        idempotencyKey: "KEY-101",
        processedKeys,
      });

      expect(res.success).toBe(true);
      expect(res.isDuplicate).toBe(true);
      expect(res.status).toBe("SENT");
    });

    it("rejects out-of-order timestamps from delayed network replay", () => {
      const res = applyIdempotentTransition({
        currentStatus: "IN_TRANSIT",
        targetStatus: "ARRIVED",
        eventTimestamp: 1500, // Earlier than last recorded event
        lastEventTimestamp: 2000,
      });

      expect(res.success).toBe(false);
      expect(res.isOutOfOrder).toBe(true);
      expect(res.error).toMatch(/Out-of-order event rejected/);
    });

    it("strictly prevents transitioning out of terminal states (CLOSED / CANCELLED)", () => {
      const closedRes = applyIdempotentTransition({
        currentStatus: "CLOSED",
        targetStatus: "UNDER_CARE",
        eventTimestamp: 3000,
        lastEventTimestamp: 2000,
      });
      expect(closedRes.success).toBe(false);
      expect(closedRes.error).toMatch(/Cannot transition from terminal status/);

      const cancelledRes = applyIdempotentTransition({
        currentStatus: "CANCELLED",
        targetStatus: "SENT",
        eventTimestamp: 3000,
        lastEventTimestamp: 2000,
      });
      expect(cancelledRes.success).toBe(false);
    });

    it("handles valid state transitions successfully", () => {
      const res = applyIdempotentTransition({
        currentStatus: "SENT",
        targetStatus: "ACKNOWLEDGED",
        eventTimestamp: 2000,
        lastEventTimestamp: 1000,
        idempotencyKey: "KEY-NEW",
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe("ACKNOWLEDGED");
      expect(res.isDuplicate).toBe(false);
    });
  });

  describe("immutable audit trail ledger", () => {
    it("generates deterministic audit trail entries with verification checksums", () => {
      const entry = generateAuditTrailEntry(
        "REF-2026-9042",
        "SENT",
        "ACKNOWLEDGED",
        "USER-DR-MEHTA",
        "RECEIVING_FACILITY_DOCTOR",
        "Bed confirmed in obstetric ICU",
        1725900000000
      );

      expect(entry.referralId).toBe("REF-2026-9042");
      expect(entry.checksum).toMatch(/^AUDIT-[0-9A-F]{8}$/);

      // Same parameters must generate identical checksum
      const entry2 = generateAuditTrailEntry(
        "REF-2026-9042",
        "SENT",
        "ACKNOWLEDGED",
        "USER-DR-MEHTA",
        "RECEIVING_FACILITY_DOCTOR",
        "Bed confirmed in obstetric ICU",
        1725900000000
      );
      expect(entry.checksum).toBe(entry2.checksum);
    });
  });
});
