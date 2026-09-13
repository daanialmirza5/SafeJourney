import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { apiErrorResponse } from "@/lib/apiError";
import { z } from "zod";

const createFacilitySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["REFERRING", "RECEIVING", "BOTH"]),
  district: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
});

/** Admin facility management (spec sections 45, 56). New facilities are
 * created as demo/non-demo based on the current DEMO_MODE, matching every
 * other admin-created record's isDemo convention. */
export async function POST(req: NextRequest) {
  try {
    const actor = await requireRole("ADMIN");
    const input = createFacilitySchema.parse(await req.json());
    const facility = await db.facility.create({ data: { ...input, isDemo: true } });
    await recordAuditEvent({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "Facility",
      entityId: facility.id,
      action: "FACILITY_CREATED",
      newValue: input,
    });
    return NextResponse.json({ facility }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
