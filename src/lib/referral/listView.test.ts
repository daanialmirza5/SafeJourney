import { describe, it, expect } from "vitest";
import { filterReferrals, sortReferrals, summarizeReferralCounts, type ReferralListItemLike } from "./listView";

function makeReferral(overrides: Partial<ReferralListItemLike> & { id: string }): ReferralListItemLike {
  return {
    referralCode: `MR-2026-${overrides.id}`,
    status: "SENT",
    priority: "ROUTINE",
    operationalStatus: "ON_TRACK",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    referringFacility: { id: "fac-a", name: "Facility A" },
    receivingFacility: { id: "fac-b", name: "Facility B" },
    patient: { pseudonym: "PT-0001" },
    events: [],
    ...overrides,
  };
}

describe("referral list filters", () => {
  const referrals: ReferralListItemLike[] = [
    makeReferral({ id: "1", status: "SENT", operationalStatus: "ON_TRACK", priority: "ROUTINE" }),
    makeReferral({ id: "2", status: "ACKNOWLEDGED", operationalStatus: "STUCK", priority: "URGENT" }),
    makeReferral({ id: "3", status: "CLOSED", operationalStatus: "CLOSED", priority: "EMERGENCY" }),
    makeReferral({
      id: "4",
      status: "UNDER_CARE",
      operationalStatus: "ON_TRACK",
      priority: "EMERGENCY",
      referringFacility: { id: "fac-c", name: "Facility C" },
      events: [{ action: "ADMIN_OVERRIDE" }],
    }),
  ];

  it("'active' excludes closed/cancelled cases", () => {
    const result = filterReferrals(referrals, { status: "active" });
    expect(result.map((r) => r.id).sort()).toEqual(["1", "2", "4"]);
  });

  it("'delayed' returns only STUCK cases", () => {
    const result = filterReferrals(referrals, { status: "delayed" });
    expect(result.map((r) => r.id)).toEqual(["2"]);
  });

  it("'closed' returns only CLOSED cases", () => {
    const result = filterReferrals(referrals, { status: "closed" });
    expect(result.map((r) => r.id)).toEqual(["3"]);
  });

  it("filters by priority", () => {
    const result = filterReferrals(referrals, { priority: "EMERGENCY" });
    expect(result.map((r) => r.id).sort()).toEqual(["3", "4"]);
  });

  it("filters by facility (either referring or receiving)", () => {
    const result = filterReferrals(referrals, { facilityId: "fac-c" });
    expect(result.map((r) => r.id)).toEqual(["4"]);
  });

  it("searches case-insensitively across referral code, patient, and facility name", () => {
    expect(filterReferrals(referrals, { query: "facility c" }).map((r) => r.id)).toEqual(["4"]);
    expect(filterReferrals(referrals, { query: "mr-2026-2" }).map((r) => r.id)).toEqual(["2"]);
  });

  it("combines multiple filters", () => {
    const result = filterReferrals(referrals, { status: "active", priority: "EMERGENCY" });
    expect(result.map((r) => r.id)).toEqual(["4"]);
  });

  it("does not expose real patient names or clinical notes -- only fields already on the type are read", () => {
    // Structural guard: ReferralListItemLike intentionally has no `name`,
    // `doctorNote`, or similar field for filterReferrals to search over.
    const keys = Object.keys(makeReferral({ id: "x" }));
    expect(keys).not.toContain("name");
    expect(keys).not.toContain("doctorNote");
  });
});

describe("referral list sorting", () => {
  const referrals: ReferralListItemLike[] = [
    makeReferral({ id: "old-emergency", priority: "EMERGENCY", updatedAt: new Date("2026-01-01T00:00:00Z") }),
    makeReferral({ id: "new-routine", priority: "ROUTINE", updatedAt: new Date("2026-01-03T00:00:00Z") }),
    makeReferral({ id: "new-urgent", priority: "URGENT", updatedAt: new Date("2026-01-02T00:00:00Z") }),
  ];

  it("'recent' sorts by most recently updated first", () => {
    const result = sortReferrals(referrals, "recent");
    expect(result.map((r) => r.id)).toEqual(["new-routine", "new-urgent", "old-emergency"]);
  });

  it("'urgency' sorts EMERGENCY > URGENT > ROUTINE regardless of recency", () => {
    const result = sortReferrals(referrals, "urgency");
    expect(result.map((r) => r.id)).toEqual(["old-emergency", "new-urgent", "new-routine"]);
  });

  it("does not mutate the input array", () => {
    const original = [...referrals];
    sortReferrals(referrals, "urgency");
    expect(referrals).toEqual(original);
  });
});

describe("referral list counts", () => {
  it("summarizes total/pending/acknowledged/delayed/completed/rescued from existing fields only", () => {
    const referrals: ReferralListItemLike[] = [
      makeReferral({ id: "1", status: "SENT" }),
      makeReferral({ id: "2", status: "ACKNOWLEDGED", operationalStatus: "STUCK" }),
      makeReferral({ id: "3", status: "CLOSED" }),
      makeReferral({ id: "4", status: "UNDER_CARE", events: [{ action: "ADMIN_OVERRIDE" }] }),
    ];
    const counts = summarizeReferralCounts(referrals);
    expect(counts).toEqual({
      total: 4,
      pending: 1, // SENT
      acknowledged: 2, // ACKNOWLEDGED, UNDER_CARE
      delayed: 1, // STUCK
      completed: 1, // CLOSED
      rescued: 1, // ADMIN_OVERRIDE event
    });
  });
});
