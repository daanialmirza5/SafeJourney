import { NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";

/** Revokes a caregiver's access (spec sections 26, 31, 32). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const access = await db.caregiverAccess.findUnique({ where: { id: params.id }, include: { patient: true } });
    if (!access) throw new NotFoundError("Caregiver access record not found.");
    if (!["DOCTOR", "ADMIN"].includes(user.role) && access.patient.userId !== user.id) {
      throw new ForbiddenError();
    }
    await db.caregiverAccess.update({ where: { id: params.id }, data: { revokedAt: new Date() } });
    await recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      entityType: "CaregiverAccess",
      entityId: access.id,
      action: "CAREGIVER_REMOVED",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
