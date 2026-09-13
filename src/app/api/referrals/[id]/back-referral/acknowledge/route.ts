import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { acknowledgeBackReferral } from "@/lib/referral/referralService";
import { acknowledgeBackReferralSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

/** The origin (referring) facility acknowledges receipt of a back-referral,
 * closing the "acknowledged" gap in the loop
 * (created -> notified -> acknowledged -> follow-up assigned). Follow-up
 * tasks (including the newborn continuity schedule, if applicable) are
 * only created once this happens. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("DOCTOR", "COORDINATOR", "ADMIN");
    const input = acknowledgeBackReferralSchema.parse(await req.json().catch(() => ({})));
    const referral = await acknowledgeBackReferral(params.id, actor, input);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
