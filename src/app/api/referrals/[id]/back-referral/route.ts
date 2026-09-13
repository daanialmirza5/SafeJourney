import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { generateAndSendBackReferral, getReferralOrThrow } from "@/lib/referral/referralService";
import { aiService } from "@/lib/ai/aiService";
import { backReferralSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

/** GET returns an AI-drafted (deterministic, editable) discharge summary the
 * coordinator can review before confirming the send (spec section 21). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("COORDINATOR", "ADMIN");
    const referral = await getReferralOrThrow(params.id);
    const pendingAdminItems = referral.adminTasks
      .filter((t) => t.status === "PENDING" || t.status === "NEEDS_REVIEW")
      .map((t) => t.title);
    const draft = aiService.generateHandoffSummary({
      referralCode: referral.referralCode,
      patientPseudonym: referral.patient.pseudonym,
      referringFacility: referral.referringFacility.name,
      receivingFacility: referral.receivingFacility.name,
      dischargedAt: referral.dischargedAt?.toISOString() ?? new Date().toISOString(),
      pendingAdminItems,
    });
    return Response.json({ draftSummary: draft, pendingAdminItems });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("COORDINATOR", "ADMIN");
    const input = backReferralSchema.parse(await req.json());
    const referral = await generateAndSendBackReferral(params.id, actor, input);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
