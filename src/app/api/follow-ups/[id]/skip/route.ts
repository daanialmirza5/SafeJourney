import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { skipFollowUpTask } from "@/lib/referral/referralService";
import { skipFollowUpSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

/** Marks a follow-up task skipped rather than completed (spec section 30:
 * completed/upcoming/overdue/skipped states). Narrower than completion --
 * see canSkipFollowUpTask -- only a coordinator or admin may skip a task,
 * and a reason is required. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("COORDINATOR", "ADMIN");
    const { reason } = skipFollowUpSchema.parse(await req.json());
    const referral = await skipFollowUpTask(params.id, actor, reason);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
