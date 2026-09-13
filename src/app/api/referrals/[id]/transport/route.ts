import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { requestTransport } from "@/lib/referral/referralService";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("DOCTOR", "COORDINATOR", "ADMIN");
    const referral = await requestTransport(params.id, actor);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
