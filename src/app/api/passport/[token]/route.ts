import { NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth";
import { getReferralByCodeOrToken } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { decorateOperationalStatus } from "@/lib/referral/decorate";
import { getAckTimeoutMinutes } from "@/lib/config";
import { apiErrorResponse } from "@/lib/apiError";

/** Resolves a Referral Passport by its opaque QR token OR its human-typed
 * referral code (manual fallback, spec section 10). The token never
 * carries patient data itself -- it's purely a lookup key -- and resolution
 * still requires the caller to be authorized to view that referral. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  try {
    const user = await requireUser();
    const referral = await getReferralByCodeOrToken(params.token);
    if (!(await canAccessReferral(user, referral))) throw new ForbiddenError();
    const ackTimeoutMinutes = await getAckTimeoutMinutes();
    return NextResponse.json({ referral: decorateOperationalStatus(referral, ackTimeoutMinutes) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
