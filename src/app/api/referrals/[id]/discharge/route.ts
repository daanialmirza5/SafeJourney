import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dischargeCase } from "@/lib/referral/referralService";
import { dischargeSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("COORDINATOR", "ADMIN");
    const input = dischargeSchema.parse(await req.json().catch(() => ({})));
    const referral = await dischargeCase(params.id, actor, input);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
