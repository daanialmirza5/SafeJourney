import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { closeCase } from "@/lib/referral/referralService";
import { closeCaseSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

/** Explicit, human-initiated case closure -- available to either side of
 * the referral (referring doctor, coordinator at either facility) or an
 * admin, not only through the automatic last-follow-up-task path or the
 * ADMIN-only override. See closeCase in referralService.ts for the
 * closure-completeness safeguards this enforces. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("DOCTOR", "COORDINATOR", "ADMIN");
    const { reason, confirmOutstanding } = closeCaseSchema.parse(await req.json());
    const referral = await closeCase(params.id, actor, reason, confirmOutstanding);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
