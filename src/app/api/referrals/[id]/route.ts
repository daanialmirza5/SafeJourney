import { NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth";
import { getReferralOrThrow } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { decorateOperationalStatus } from "@/lib/referral/decorate";
import { getAckTimeoutMinutes } from "@/lib/config";
import { apiErrorResponse } from "@/lib/apiError";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const referral = await getReferralOrThrow(params.id);
    if (!(await canAccessReferral(user, referral))) throw new ForbiddenError();
    const ackTimeoutMinutes = await getAckTimeoutMinutes();
    return NextResponse.json({ referral: decorateOperationalStatus(referral, ackTimeoutMinutes) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
