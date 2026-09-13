import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorResponse, NotFoundError, ConflictError } from "@/lib/apiError";

/** Soft-deletes a user account (spec section 45): blocks login and hides
 * them from active-user pickers without deleting any historical record
 * they're attached to (referrals, audit entries, notifications). Always
 * reversible via the matching /reactivate route. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    if (params.id === actor.id) throw new ConflictError("You cannot deactivate your own account.");
    const target = await db.user.findUnique({ where: { id: params.id } });
    if (!target) throw new NotFoundError("User not found.");

    const user = await db.user.update({ where: { id: params.id }, data: { deactivatedAt: new Date() } });
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "User",
      entityId: user.id,
      action: "USER_DEACTIVATED",
      oldValue: { deactivatedAt: null },
      newValue: { deactivatedAt: user.deactivatedAt },
    });
    return NextResponse.json({ user: { id: user.id, deactivatedAt: user.deactivatedAt } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
