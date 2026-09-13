import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReferralOrThrow } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { rejectDocument } from "@/lib/documents/documentService";
import { documentRejectSchema } from "@/lib/validation";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";

/** Same authorization boundary as confirm -- see that route and
 * docs/stage-11-document-permission-decision.md. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("DOCTOR", "COORDINATOR", "ADMIN");
    const document = await db.document.findUnique({ where: { id: params.id } });
    if (!document) throw new NotFoundError("Document not found.");
    const referral = await getReferralOrThrow(document.referralId);
    if (!(await canAccessReferral(user, referral))) throw new ForbiddenError();
    const { reason } = documentRejectSchema.parse(await req.json());
    const rejected = await rejectDocument(params.id, user, reason);
    return NextResponse.json({ document: rejected });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
