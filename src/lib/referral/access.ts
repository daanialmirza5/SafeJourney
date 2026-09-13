import { db } from "@/lib/db";
import type { User } from "@prisma/client";
import type { ReferralWithRelations } from "@/lib/referral/referralService";

/** Server-side authorization for viewing a referral case. UI-level hiding
 * is never sufficient on its own (spec section 48) -- every read path that
 * exposes a single referral must call this. */
export async function canAccessReferral(user: User, referral: ReferralWithRelations): Promise<boolean> {
  switch (user.role) {
    case "ADMIN":
      return true;
    case "DOCTOR":
    case "COORDINATOR":
      return user.facilityId === referral.referringFacilityId || user.facilityId === referral.receivingFacilityId;
    case "PATIENT":
      return referral.patient.userId === user.id;
    case "CAREGIVER": {
      const access = await db.caregiverAccess.findFirst({
        where: { patientId: referral.patientId, userId: user.id, revokedAt: null },
      });
      return Boolean(access);
    }
    case "FOLLOWUP":
      return referral.followUpTasks.some((t) => t.assignedToId === user.id);
    default:
      return false;
  }
}

/** Whether `actor` may perform a receiving-facility-only workflow action
 * (accept, decline, request clarification, confirm arrival, discharge,
 * generate a back-referral) on this referral. ADMIN bypasses the facility
 * match, mirroring canAccessReferral/referralScopeFor above.
 *
 * Before this, referralService.ts inlined
 * `actor.facilityId !== referral.receivingFacilityId` at six call sites
 * with no ADMIN exemption -- every seeded admin account has
 * `facilityId: null`, so every one of those routes' own
 * `requireRole(..., "ADMIN")` was silently unreachable for ADMIN in
 * practice (verified live: a real admin account got 403 on
 * POST /api/referrals/{id}/accept). Pure and DB-free so it's directly
 * unit-testable. */
export function canActOnReceivingFacility(
  actor: { role: string; facilityId: string | null },
  referral: { receivingFacilityId: string }
): boolean {
  if (actor.role === "ADMIN") return true;
  return actor.facilityId === referral.receivingFacilityId;
}

/** Same idea as canActOnReceivingFacility, for actions that belong to the
 * *origin* (referring) facility -- currently just acknowledging a
 * back-referral. */
export function canActOnReferringFacility(
  actor: { role: string; facilityId: string | null },
  referral: { referringFacilityId: string }
): boolean {
  if (actor.role === "ADMIN") return true;
  return actor.facilityId === referral.referringFacilityId;
}
