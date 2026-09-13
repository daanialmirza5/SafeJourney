import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { applyRescueAction } from "@/lib/referral/referralService";
import { rescueActionSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

/** Applies a Referral Rescue Engine suggested action (contact facility,
 * escalate to coordinator, choose an alternate facility, or retry the
 * notification) to a referral. See applyRescueAction for what each does. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("DOCTOR", "COORDINATOR", "ADMIN");
    const { action, note } = rescueActionSchema.parse(await req.json());
    const referral = await applyRescueAction(params.id, actor, action, note);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
