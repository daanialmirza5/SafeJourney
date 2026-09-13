import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { createMilestoneTemplateSchema } from "@/lib/validation";
import { validateMilestoneTemplateInput } from "@/lib/referral/newbornContinuity";
import { apiErrorResponse, badRequest } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/** Admin configuration for the newborn continuity milestone schedule
 * (spec section 30). Unlike NotificationTemplate, this table has no
 * hard-coded fallback -- it IS the schedule every future back-referral
 * reads (see referralService.ts::generateAndSendBackReferral). */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const templates = await db.newbornMilestoneTemplate.findMany({ orderBy: { offsetDays: "asc" } });
    return NextResponse.json({ templates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole("ADMIN");
    const input = createMilestoneTemplateSchema.parse(await req.json());

    const validation = validateMilestoneTemplateInput(input);
    if (!validation.valid) return badRequest(validation.errors.join(" "));

    const maxSortOrder = await db.newbornMilestoneTemplate.aggregate({ _max: { sortOrder: true } });
    const template = await db.newbornMilestoneTemplate.create({
      data: { ...input, sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1 },
    });
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "NewbornMilestoneTemplate",
      entityId: template.id,
      action: "MILESTONE_TEMPLATE_CREATED",
      newValue: template,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
