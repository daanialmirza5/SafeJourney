import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { completeFollowUpTask } from "@/lib/referral/referralService";
import { completeFollowUpSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("FOLLOWUP", "COORDINATOR", "ADMIN");
    const { note } = completeFollowUpSchema.parse(await req.json().catch(() => ({})));
    const referral = await completeFollowUpTask(params.id, actor, note);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
