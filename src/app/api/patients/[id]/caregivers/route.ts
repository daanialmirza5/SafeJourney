import { NextRequest, NextResponse } from "next/server";
import { requireUser, ForbiddenError, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { notifyFromTemplate } from "@/lib/notifications/notificationService";
import { addCaregiverSchema } from "@/lib/validation";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";
import { DEMO_PASSWORD } from "@/lib/config";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const patient = await db.patient.findUnique({ where: { id: params.id } });
    if (!patient) throw new NotFoundError("Patient not found.");
    if (!["DOCTOR", "COORDINATOR", "ADMIN"].includes(user.role) && patient.userId !== user.id) {
      throw new ForbiddenError();
    }
    const access = await db.caregiverAccess.findMany({
      where: { patientId: params.id, revokedAt: null },
      include: { user: true },
    });
    return NextResponse.json({ caregivers: access });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Adds a caregiver to a patient's case with a scoped permission level
 * (spec sections 26, 31). In demo mode, a caregiver account is created on
 * the fly if one doesn't already exist for the given email. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const patient = await db.patient.findUnique({ where: { id: params.id } });
    if (!patient) throw new NotFoundError("Patient not found.");
    if (!["DOCTOR", "ADMIN"].includes(user.role) && patient.userId !== user.id) {
      throw new ForbiddenError();
    }

    const input = addCaregiverSchema.parse(await req.json());
    let caregiverUser = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!caregiverUser) {
      caregiverUser = await db.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          role: "CAREGIVER",
          passwordHash: await hashPassword(DEMO_PASSWORD),
          isDemo: true,
        },
      });
    }

    const access = await db.caregiverAccess.create({
      data: { patientId: patient.id, userId: caregiverUser.id, permission: input.permission },
    });

    await recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      entityType: "CaregiverAccess",
      entityId: access.id,
      action: "CAREGIVER_ADDED",
      newValue: { patientId: patient.id, caregiverEmail: caregiverUser.email, permission: input.permission },
    });

    await notifyFromTemplate({
      userId: caregiverUser.id,
      templateKey: "CAREGIVER_ADDED",
      vars: { permission: input.permission.replace(/_/g, " ").toLowerCase() },
    });

    return NextResponse.json({ access }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
