import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const target = await db.user.findUnique({ where: { id: params.id } });
    if (!target) throw new NotFoundError("User not found.");

    const user = await db.user.update({ where: { id: params.id }, data: { deactivatedAt: null } });
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "User",
      entityId: user.id,
      action: "USER_REACTIVATED",
      oldValue: { deactivatedAt: target.deactivatedAt },
      newValue: { deactivatedAt: null },
    });
    return NextResponse.json({ user: { id: user.id, deactivatedAt: user.deactivatedAt } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
