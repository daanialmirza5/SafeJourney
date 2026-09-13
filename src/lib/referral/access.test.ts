import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    caregiverAccess: {
      findFirst: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { canAccessReferral, canActOnReceivingFacility, canActOnReferringFacility } from "./access";
import type { User } from "@prisma/client";
import type { ReferralWithRelations } from "./referralService";

function user(overrides: Partial<User>): User {
  return {
    id: "user-1",
    email: "test@demo.local",
    passwordHash: "hash",
    name: "Test User",
    role: "DOCTOR",
    language: "en",
    phone: null,
    facilityId: null,
    isDemo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function referral(overrides: Partial<ReferralWithRelations>): ReferralWithRelations {
  return {
    id: "referral-1",
    patientId: "patient-1",
    referringFacilityId: "facility-a",
    receivingFacilityId: "facility-b",
    patient: { userId: null } as never,
    followUpTasks: [],
    ...overrides,
  } as ReferralWithRelations;
}

describe("canAccessReferral (spec sections 6, 29, 48)", () => {
  it("always grants ADMIN access", async () => {
    const admin = user({ role: "ADMIN" });
    expect(await canAccessReferral(admin, referral({}))).toBe(true);
  });

  it("grants DOCTOR/COORDINATOR access only at the referring or receiving facility", async () => {
    const doctorAtReferring = user({ role: "DOCTOR", facilityId: "facility-a" });
    const doctorAtReceiving = user({ role: "DOCTOR", facilityId: "facility-b" });
    const doctorElsewhere = user({ role: "DOCTOR", facilityId: "facility-z" });
    const r = referral({});
    expect(await canAccessReferral(doctorAtReferring, r)).toBe(true);
    expect(await canAccessReferral(doctorAtReceiving, r)).toBe(true);
    expect(await canAccessReferral(doctorElsewhere, r)).toBe(false);
  });

  it("grants PATIENT access only to their own linked case", async () => {
    const owner = user({ role: "PATIENT", id: "patient-user-1" });
    const stranger = user({ role: "PATIENT", id: "patient-user-2" });
    const r = referral({ patient: { userId: "patient-user-1" } as never });
    expect(await canAccessReferral(owner, r)).toBe(true);
    expect(await canAccessReferral(stranger, r)).toBe(false);
  });

  it("grants FOLLOWUP access only when assigned to a follow-up task on the case", async () => {
    const assigned = user({ role: "FOLLOWUP", id: "worker-1" });
    const unassigned = user({ role: "FOLLOWUP", id: "worker-2" });
    const r = referral({ followUpTasks: [{ assignedToId: "worker-1" } as never] });
    expect(await canAccessReferral(assigned, r)).toBe(true);
    expect(await canAccessReferral(unassigned, r)).toBe(false);
  });

  it("grants CAREGIVER access only with an active, non-revoked CaregiverAccess row", async () => {
    const caregiver = user({ role: "CAREGIVER", id: "caregiver-1" });
    const r = referral({});

    vi.mocked(db.caregiverAccess.findFirst).mockResolvedValueOnce({ id: "access-1" } as never);
    expect(await canAccessReferral(caregiver, r)).toBe(true);

    vi.mocked(db.caregiverAccess.findFirst).mockResolvedValueOnce(null);
    expect(await canAccessReferral(caregiver, r)).toBe(false);
  });
});

describe("canActOnReceivingFacility", () => {
  const receivingReferral = { receivingFacilityId: "facility-b" };

  it("always allows ADMIN, regardless of facilityId (including null)", () => {
    expect(canActOnReceivingFacility({ role: "ADMIN", facilityId: null }, receivingReferral)).toBe(true);
    expect(canActOnReceivingFacility({ role: "ADMIN", facilityId: "some-other-facility" }, receivingReferral)).toBe(true);
  });

  it("allows a COORDINATOR/DOCTOR only when their facilityId matches the receiving facility", () => {
    expect(canActOnReceivingFacility({ role: "COORDINATOR", facilityId: "facility-b" }, receivingReferral)).toBe(true);
    expect(canActOnReceivingFacility({ role: "COORDINATOR", facilityId: "facility-a" }, receivingReferral)).toBe(false);
    expect(canActOnReceivingFacility({ role: "DOCTOR", facilityId: "facility-b" }, receivingReferral)).toBe(true);
  });

  it("refuses a facility-less non-admin (this is the exact bug this function fixed)", () => {
    expect(canActOnReceivingFacility({ role: "COORDINATOR", facilityId: null }, receivingReferral)).toBe(false);
  });
});

describe("canActOnReferringFacility", () => {
  const referringReferral = { referringFacilityId: "facility-a" };

  it("always allows ADMIN, regardless of facilityId (including null)", () => {
    expect(canActOnReferringFacility({ role: "ADMIN", facilityId: null }, referringReferral)).toBe(true);
  });

  it("allows a DOCTOR/COORDINATOR only when their facilityId matches the referring (origin) facility", () => {
    expect(canActOnReferringFacility({ role: "DOCTOR", facilityId: "facility-a" }, referringReferral)).toBe(true);
    expect(canActOnReferringFacility({ role: "DOCTOR", facilityId: "facility-b" }, referringReferral)).toBe(false);
  });

  it("refuses a facility-less non-admin", () => {
    expect(canActOnReferringFacility({ role: "COORDINATOR", facilityId: null }, referringReferral)).toBe(false);
  });
});
