import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { NOTIFICATION_TEMPLATE_DEFAULTS } from "@/lib/notifications/templates";
import { apiErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

/** Lists every notification template key with its current effective
 * title/body -- an admin override row if one exists, otherwise the
 * compiled-in default (spec section 56: "Notification Templates"). */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const overrides = await db.notificationTemplate.findMany();
    const overridesByKey = new Map(overrides.map((o) => [o.key, o]));
    const templates = NOTIFICATION_TEMPLATE_DEFAULTS.map((def) => {
      const override = overridesByKey.get(def.key);
      return {
        id: override?.id ?? null,
        key: def.key,
        category: def.category,
        title: override?.title ?? def.title,
        body: override?.body ?? def.body,
        placeholders: def.placeholders,
        isCustomized: Boolean(override),
        updatedAt: override?.updatedAt ?? null,
      };
    });
    return NextResponse.json({ templates });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
