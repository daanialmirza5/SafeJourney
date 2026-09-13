import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { requestClarification } from "@/lib/referral/referralService";
import { clarificationSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("COORDINATOR", "ADMIN");
    const { note } = clarificationSchema.parse(await req.json());
    const referral = await requestClarification(params.id, actor, note);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
