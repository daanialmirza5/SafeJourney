import { describe, it, expect } from "vitest";
import {
  createReferralSchema,
  assignTransportSchema,
  adminOverrideSchema,
  addCaregiverSchema,
  loginSchema,
  formatZodError,
} from "./validation";

/**
 * These zod schemas are the real, server-enforced source of truth behind
 * every form this stage touched (required-field indicators, real labels,
 * etc. are UI-level; this is what actually rejects bad input at the API
 * boundary regardless of what the UI does).
 */
describe("createReferralSchema (required-field validation)", () => {
  const valid = {
    patient: { name: "Ananya Patil", sex: "Female" as const },
    receivingFacilityId: "fac-1",
    priority: "ROUTINE" as const,
    transportRequired: false,
    doctorNote: "Routine antenatal referral.",
  };

  it("accepts a minimal valid referral", () => {
    expect(createReferralSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty patient name", () => {
    const result = createReferralSchema.safeParse({ ...valid, patient: { ...valid.patient, name: "" } });
    expect(result.success).toBe(false);
  });

  it("rejects a missing receiving facility", () => {
    const result = createReferralSchema.safeParse({ ...valid, receivingFacilityId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty referral note", () => {
    const result = createReferralSchema.safeParse({ ...valid, doctorNote: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    const result = createReferralSchema.safeParse({ ...valid, priority: "SUPER_URGENT" });
    expect(result.success).toBe(false);
  });

  it("accepts an optional newborn case, and rejects one with an empty name", () => {
    expect(createReferralSchema.safeParse({ ...valid, includeNewborn: { name: "Baby" } }).success).toBe(true);
    expect(createReferralSchema.safeParse({ ...valid, includeNewborn: { name: "" } }).success).toBe(false);
  });

  it("does not require adminNotes (optional field)", () => {
    expect(createReferralSchema.safeParse(valid).success).toBe(true);
  });
});

describe("assignTransportSchema", () => {
  it("accepts a valid vehicle pseudonym and ETA", () => {
    expect(assignTransportSchema.safeParse({ vehiclePseudo: "DEMO-AMB-01", etaMinutes: 30 }).success).toBe(true);
  });

  it("rejects an empty vehicle pseudonym", () => {
    expect(assignTransportSchema.safeParse({ vehiclePseudo: "", etaMinutes: 30 }).success).toBe(false);
  });

  it("rejects a non-positive or absurdly large ETA", () => {
    expect(assignTransportSchema.safeParse({ vehiclePseudo: "DEMO-AMB-01", etaMinutes: 0 }).success).toBe(false);
    expect(assignTransportSchema.safeParse({ vehiclePseudo: "DEMO-AMB-01", etaMinutes: 9999 }).success).toBe(false);
  });
});

describe("adminOverrideSchema (both target status and reason are required)", () => {
  it("accepts a target status with a reason", () => {
    expect(adminOverrideSchema.safeParse({ toStatus: "CANCELLED", reason: "Duplicate case" }).success).toBe(true);
  });

  it("rejects a missing target status", () => {
    expect(adminOverrideSchema.safeParse({ toStatus: "", reason: "Duplicate case" }).success).toBe(false);
  });

  it("rejects a missing reason -- overrides must always be explained", () => {
    expect(adminOverrideSchema.safeParse({ toStatus: "CANCELLED", reason: "" }).success).toBe(false);
  });
});

describe("addCaregiverSchema", () => {
  it("rejects a malformed email", () => {
    expect(addCaregiverSchema.safeParse({ email: "not-an-email", name: "Priya", permission: "VIEW_ONLY" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("rejects a malformed email and an empty password", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("accepts a well-formed login", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "demo1234" }).success).toBe(true);
  });
});

describe("formatZodError helper", () => {
  it("formats schema errors into clean message strings", () => {
    const parse = loginSchema.safeParse({ email: "invalid", password: "" });
    if (!parse.success) {
      const msg = formatZodError(parse.error);
      expect(msg).toContain("email");
      expect(msg).toContain(";");
    }
  });
});
