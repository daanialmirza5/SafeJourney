/**
 * Pure filter/sort/summary logic for the referral list screen (spec
 * section 25/29). Kept separate from the page component so it's testable
 * without a database, following the same pattern as adminCompleteness.ts /
 * newbornContinuity.ts.
 */

export interface ReferralListItemLike {
  id: string;
  referralCode: string;
  status: string;
  priority: string;
  operationalStatus: string;
  updatedAt: Date;
  referringFacility: { id: string; name: string };
  receivingFacility: { id: string; name: string };
  patient: { pseudonym: string };
  events: { action: string }[];
}

export type ReferralStatusFilter = "all" | "active" | "delayed" | "closed";
export type ReferralSortKey = "recent" | "urgency" | "status";

export interface ReferralListFilters {
  status?: ReferralStatusFilter;
  priority?: string;
  facilityId?: string;
  query?: string;
}

const PRIORITY_RANK: Record<string, number> = { EMERGENCY: 3, URGENT: 2, ROUTINE: 1 };

export function filterReferrals<T extends ReferralListItemLike>(referrals: T[], filters: ReferralListFilters): T[] {
  let result = referrals;
  const status = filters.status ?? "all";

  if (status === "active") result = result.filter((r) => !["CLOSED", "CANCELLED"].includes(r.status));
  else if (status === "delayed") result = result.filter((r) => r.operationalStatus === "STUCK");
  else if (status === "closed") result = result.filter((r) => r.status === "CLOSED");

  if (filters.priority && filters.priority !== "all") {
    result = result.filter((r) => r.priority === filters.priority);
  }

  if (filters.facilityId && filters.facilityId !== "all") {
    result = result.filter(
      (r) => r.referringFacility.id === filters.facilityId || r.receivingFacility.id === filters.facilityId
    );
  }

  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.referralCode.toLowerCase().includes(q) ||
        r.patient.pseudonym.toLowerCase().includes(q) ||
        r.referringFacility.name.toLowerCase().includes(q) ||
        r.receivingFacility.name.toLowerCase().includes(q)
    );
  }

  return result;
}

export function sortReferrals<T extends ReferralListItemLike>(referrals: T[], sort: ReferralSortKey = "recent"): T[] {
  const copy = [...referrals];
  if (sort === "urgency") {
    copy.sort(
      (a, b) => (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0) || b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  } else if (sort === "status") {
    copy.sort((a, b) => a.status.localeCompare(b.status) || b.updatedAt.getTime() - a.updatedAt.getTime());
  } else {
    copy.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  return copy;
}

export interface ReferralListCounts {
  total: number;
  pending: number;
  acknowledged: number;
  delayed: number;
  completed: number;
  rescued: number;
}

/** Not yet acknowledged by the receiving facility. */
const PENDING_STATUSES = ["DRAFT", "CREATED", "SENT"];
/** Accepted and actively moving through the workflow, short of closure. */
const ACKNOWLEDGED_STATUSES = [
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
];

/** Counts shown on the referral list. "Rescued" means an administrative
 * override was ever applied to this case (recorded as an ADMIN_OVERRIDE
 * referral event) -- the one concept in the existing data model that maps
 * to "needed the Rescue Engine's escalation path to be acted on," as
 * opposed to "delayed", which is the case's operational status right now. */
export function summarizeReferralCounts<T extends ReferralListItemLike>(referrals: T[]): ReferralListCounts {
  return {
    total: referrals.length,
    pending: referrals.filter((r) => PENDING_STATUSES.includes(r.status)).length,
    acknowledged: referrals.filter((r) => ACKNOWLEDGED_STATUSES.includes(r.status)).length,
    delayed: referrals.filter((r) => r.operationalStatus === "STUCK").length,
    completed: referrals.filter((r) => r.status === "CLOSED").length,
    rescued: referrals.filter((r) => r.events.some((e) => e.action === "ADMIN_OVERRIDE")).length,
  };
}
