import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/apiError";

/** Marks the first-time onboarding wizard (spec section 58) complete for
 * the current user so it is never shown again. */
export async function POST() {
  try {
    const user = await requireUser();
    await db.user.update({ where: { id: user.id }, data: { onboardedAt: new Date() } });
    await recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      entityType: "User",
      entityId: user.id,
      action: "ONBOARDING_COMPLETED",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
