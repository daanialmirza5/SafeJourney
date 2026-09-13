import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { NOTIFICATION_TEMPLATE_DEFAULTS } from "@/lib/notifications/templates";
import { apiErrorResponse, NotFoundError, badRequest } from "@/lib/apiError";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
});

/** Upserts an admin override for one notification template key (spec
 * section 56). Reverting to the compiled-in default is a DELETE, not a
 * PATCH to the original text, so it's always obvious a template has never
 * been customized vs. customized back to matching text. */
export async function PATCH(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const def = NOTIFICATION_TEMPLATE_DEFAULTS.find((d) => d.key === params.key);
    if (!def) throw new NotFoundError(`Unknown notification template key: ${params.key}`);

    const input = updateSchema.parse(await req.json());
    for (const placeholder of def.placeholders) {
      if (!input.body.includes(`{{${placeholder}}}`)) {
        return badRequest(`This template's body must include {{${placeholder}}}.`);
      }
    }

    const before = await db.notificationTemplate.findUnique({ where: { key: params.key } });
    const template = await db.notificationTemplate.upsert({
      where: { key: params.key },
      create: { key: params.key, category: def.category, title: input.title, body: input.body },
      update: { title: input.title, body: input.body },
    });

    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "NotificationTemplate",
      entityId: template.id,
      action: "NOTIFICATION_TEMPLATE_UPDATED",
      oldValue: before ?? { title: def.title, body: def.body },
      newValue: { title: input.title, body: input.body },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/** Reverts a template override back to its compiled-in default. */
export async function DELETE(_req: Request, { params }: { params: { key: string } }) {
  try {
    const actor = await requireRole("ADMIN");
    const existing = await db.notificationTemplate.findUnique({ where: { key: params.key } });
    if (existing) {
      await db.notificationTemplate.delete({ where: { key: params.key } });
      await recordAuditEvent({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "NotificationTemplate",
        entityId: existing.id,
        action: "NOTIFICATION_TEMPLATE_RESET",
        oldValue: existing,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
