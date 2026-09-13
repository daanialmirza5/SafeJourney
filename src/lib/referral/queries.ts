import { db } from "@/lib/db";
import { decorateOperationalStatus } from "@/lib/referral/decorate";
import { getAckTimeoutMinutes } from "@/lib/config";
import { referralInclude } from "@/lib/referral/referralService";
import type { User } from "@prisma/client";
import type { Prisma } from "@prisma/client";

/** Returns the Prisma where-clause that scopes referrals to what a given
 * user is authorized to see (spec sections 6, 29, 48). Mirrors the logic
 * in src/lib/referral/access.ts but as a query filter for list views. */
export async function referralScopeFor(user: User): Promise<Prisma.ReferralCaseWhereInput> {
  switch (user.role) {
    case "ADMIN":
      return {};
    case "DOCTOR":
    case "COORDINATOR":
      return { OR: [{ referringFacilityId: user.facilityId ?? "__none__" }, { receivingFacilityId: user.facilityId ?? "__none__" }] };
    case "PATIENT":
      return { patient: { userId: user.id } };
    case "CAREGIVER": {
      const access = await db.caregiverAccess.findMany({ where: { userId: user.id, revokedAt: null } });
      return { patientId: { in: access.map((a) => a.patientId) } };
    }
    case "FOLLOWUP":
      return { followUpTasks: { some: { assignedToId: user.id } } };
    default:
      return { id: "__none__" };
  }
}

export async function listReferralsForUser(user: User, extra?: Prisma.ReferralCaseWhereInput) {
  const scope = await referralScopeFor(user);
  const ackTimeoutMinutes = await getAckTimeoutMinutes();
  const referrals = await db.referralCase.findMany({
    where: extra ? { AND: [scope, extra] } : scope,
    include: referralInclude,
    orderBy: { createdAt: "desc" },
  });
  return referrals.map((r) => decorateOperationalStatus(r, ackTimeoutMinutes));
}

export type DecoratedReferral = Awaited<ReturnType<typeof listReferralsForUser>>[number];
