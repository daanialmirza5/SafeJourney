import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { declineReferral } from "@/lib/referral/referralService";
import { declineSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("COORDINATOR", "ADMIN");
    const { reason } = declineSchema.parse(await req.json());
    const referral = await declineReferral(params.id, actor, reason);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
