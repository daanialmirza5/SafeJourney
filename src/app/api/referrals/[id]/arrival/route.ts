import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { confirmArrival } from "@/lib/referral/referralService";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("COORDINATOR", "ADMIN");
    const referral = await confirmArrival(params.id, actor);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
