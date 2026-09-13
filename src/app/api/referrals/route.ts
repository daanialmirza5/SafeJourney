import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createReferral } from "@/lib/referral/referralService";
import { createReferralSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest) {
  try {
    const doctor = await requireRole("DOCTOR");
    const body = createReferralSchema.parse(await req.json());
    const referral = await createReferral({ doctor, ...body });
    return NextResponse.json({ referral }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
