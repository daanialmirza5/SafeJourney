import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminOverrideStatus } from "@/lib/referral/referralService";
import { adminOverrideSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";

/** Auditable human override (spec section 52). ADMIN-only; every override
 * requires a non-empty reason and is fully logged. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const { toStatus, reason, confirmOutstanding } = adminOverrideSchema.parse(await req.json());
    const referral = await adminOverrideStatus(params.id, actor, toStatus, reason, confirmOutstanding);
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
