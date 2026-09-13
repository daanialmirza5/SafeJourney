import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { getAckTimeoutMinutes, getMaternalFollowUpDueDays, isDemoMode } from "@/lib/config";
import { apiErrorResponse } from "@/lib/apiError";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const [ackTimeoutMinutes, maternalFollowUpDueDays] = await Promise.all([getAckTimeoutMinutes(), getMaternalFollowUpDueDays()]);
    return NextResponse.json({ ackTimeoutMinutes, maternalFollowUpDueDays, demoMode: isDemoMode() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

const updateSchema = z.object({
  ackTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  maternalFollowUpDueDays: z.number().int().min(1).max(90).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireRole("ADMIN");
    const { ackTimeoutMinutes, maternalFollowUpDueDays } = updateSchema.parse(await req.json());

    if (ackTimeoutMinutes !== undefined) {
      await db.systemSetting.upsert({
        where: { key: "REFERRAL_ACK_TIMEOUT_MINUTES" },
        create: { key: "REFERRAL_ACK_TIMEOUT_MINUTES", value: String(ackTimeoutMinutes) },
        update: { value: String(ackTimeoutMinutes) },
      });
      await recordAuditEvent({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "SystemSetting",
        entityId: "REFERRAL_ACK_TIMEOUT_MINUTES",
        action: "SETTING_UPDATED",
        newValue: { ackTimeoutMinutes },
      });
    }

    if (maternalFollowUpDueDays !== undefined) {
      await db.systemSetting.upsert({
        where: { key: "MATERNAL_FOLLOWUP_DUE_DAYS" },
        create: { key: "MATERNAL_FOLLOWUP_DUE_DAYS", value: String(maternalFollowUpDueDays) },
        update: { value: String(maternalFollowUpDueDays) },
      });
      await recordAuditEvent({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "SystemSetting",
        entityId: "MATERNAL_FOLLOWUP_DUE_DAYS",
        action: "SETTING_UPDATED",
        newValue: { maternalFollowUpDueDays },
      });
    }

    return NextResponse.json({ ackTimeoutMinutes, maternalFollowUpDueDays });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
