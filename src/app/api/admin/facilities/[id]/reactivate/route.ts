import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const target = await db.facility.findUnique({ where: { id: params.id } });
    if (!target) throw new NotFoundError("Facility not found.");

    const facility = await db.facility.update({ where: { id: params.id }, data: { deactivatedAt: null } });
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "Facility",
      entityId: facility.id,
      action: "FACILITY_REACTIVATED",
      oldValue: { deactivatedAt: target.deactivatedAt },
      newValue: { deactivatedAt: null },
    });
    return NextResponse.json({ facility: { id: facility.id, deactivatedAt: facility.deactivatedAt } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
