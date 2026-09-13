import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { updateMilestoneTemplateSchema } from "@/lib/validation";
import { validateMilestoneTemplateInput } from "@/lib/referral/newbornContinuity";
import { apiErrorResponse, badRequest, NotFoundError } from "@/lib/apiError";

/** Edits (or activates/deactivates) one milestone template. Deactivating
 * rather than deleting keeps a full record of what schedule existed at any
 * point -- reversible, same convention as User/Facility soft-delete. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const input = updateMilestoneTemplateSchema.parse(await req.json());
    const before = await db.newbornMilestoneTemplate.findUnique({ where: { id: params.id } });
    if (!before) throw new NotFoundError("Milestone template not found.");

    const merged = {
      category: input.category ?? before.category,
      title: input.title ?? before.title,
      description: input.description ?? before.description,
      offsetDays: input.offsetDays ?? before.offsetDays,
    };
    const validation = validateMilestoneTemplateInput(merged);
    if (!validation.valid) return badRequest(validation.errors.join(" "));

    const template = await db.newbornMilestoneTemplate.update({
      where: { id: params.id },
      data: { ...merged, active: input.active ?? before.active },
    });
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "NewbornMilestoneTemplate",
      entityId: template.id,
      action: "MILESTONE_TEMPLATE_UPDATED",
      oldValue: before,
      newValue: template,
    });
    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
