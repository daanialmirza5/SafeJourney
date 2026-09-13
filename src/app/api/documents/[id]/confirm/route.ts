import { NextRequest, NextResponse } from "next/server";
import { requireRole, ForbiddenError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReferralOrThrow } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { confirmDocument } from "@/lib/documents/documentService";
import { documentConfirmSchema } from "@/lib/validation";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";
import type { DocumentTypeKey } from "@/lib/ocr/ocrService";

/** Confirming a document is an administrative-completeness decision, not a
 * clinical one -- but it has a real downstream effect (the confirmed-document
 * list is what `generateAndSendBackReferral` attaches to the outgoing
 * back-referral, and it feeds the passport/analytics document-completeness
 * figures), so it's restricted to the staff managing the case, matching
 * every other action of this shape (discharge, back-referral, closure).
 * See docs/stage-11-document-permission-decision.md. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireRole("DOCTOR", "COORDINATOR", "ADMIN");
    const document = await db.document.findUnique({ where: { id: params.id } });
    if (!document) throw new NotFoundError("Document not found.");
    const referral = await getReferralOrThrow(document.referralId);
    if (!(await canAccessReferral(user, referral))) throw new ForbiddenError();
    const input = documentConfirmSchema.parse(await req.json().catch(() => ({})));
    const confirmed = await confirmDocument(params.id, user, {
      confirmedFields: input.confirmedFields,
      documentType: input.documentType as DocumentTypeKey | undefined,
    });
    return NextResponse.json({ document: confirmed });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
