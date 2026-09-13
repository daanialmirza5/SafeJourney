import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/apiError";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  sourceUrl: z.string().url().optional(),
  lastVerified: z.string().optional(),
});

/** Admins can enable/disable a benefit rule and update its source/verification
 * metadata (spec section 56). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const input = updateSchema.parse(await req.json());
    const before = await db.benefitRule.findUnique({ where: { id: params.id } });
    const rule = await db.benefitRule.update({
      where: { id: params.id },
      data: {
        status: input.status,
        sourceUrl: input.sourceUrl,
        lastVerified: input.lastVerified ? new Date(input.lastVerified) : undefined,
      },
    });
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "BenefitRule",
      entityId: rule.id,
      action: "BENEFIT_RULE_UPDATED",
      oldValue: before,
      newValue: rule,
    });
    return NextResponse.json({ rule });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
