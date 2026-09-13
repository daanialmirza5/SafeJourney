import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/apiError";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/** Global search across referrals, scoped to what the current user is
 * authorized to see (spec section 29 -- never expose unauthorized records). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ results: [] });

    let scope: Prisma.ReferralCaseWhereInput = {};
    switch (user.role) {
      case "ADMIN":
        scope = {};
        break;
      case "DOCTOR":
      case "COORDINATOR":
        scope = { OR: [{ referringFacilityId: user.facilityId ?? "" }, { receivingFacilityId: user.facilityId ?? "" }] };
        break;
      case "PATIENT":
        scope = { patient: { userId: user.id } };
        break;
      case "CAREGIVER": {
        const access = await db.caregiverAccess.findMany({ where: { userId: user.id, revokedAt: null } });
        scope = { patientId: { in: access.map((a) => a.patientId) } };
        break;
      }
      case "FOLLOWUP":
        scope = { followUpTasks: { some: { assignedToId: user.id } } };
        break;
    }

    const results = await db.referralCase.findMany({
      where: {
        AND: [
          scope,
          {
            OR: [
              { referralCode: { contains: q } },
              { patient: { pseudonym: { contains: q } } },
              { referringFacility: { name: { contains: q } } },
              { receivingFacility: { name: { contains: q } } },
            ],
          },
        ],
      },
      include: { patient: true, referringFacility: true, receivingFacility: true },
      take: 20,
    });

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.id,
        referralCode: r.referralCode,
        status: r.status,
        patientPseudonym: r.patient.pseudonym,
        referringFacility: r.referringFacility.name,
        receivingFacility: r.receivingFacility.name,
      })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
