import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignTransport, updateTransportProgress } from "@/lib/referral/referralService";
import { assignTransportSchema, transportProgressSchema } from "@/lib/validation";
import { apiErrorResponse, NotFoundError, badRequest } from "@/lib/apiError";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireRole("DOCTOR", "COORDINATOR", "ADMIN");
    const transportRequest = await db.transportRequest.findUnique({ where: { id: params.id } });
    if (!transportRequest) throw new NotFoundError("Transport request not found.");

    const body = await req.json();
    if (body.action === "assign") {
      const input = assignTransportSchema.parse(body);
      const referral = await assignTransport(transportRequest.referralId, actor, input.vehiclePseudo, input.etaMinutes);
      return NextResponse.json({ referral });
    }
    if (body.action === "progress") {
      const input = transportProgressSchema.parse(body);
      const referral = await updateTransportProgress(transportRequest.referralId, actor, input.status);
      return NextResponse.json({ referral });
    }
    return badRequest("Unknown transport action. Expected 'assign' or 'progress'.");
  } catch (error) {
    return apiErrorResponse(error);
  }
}
