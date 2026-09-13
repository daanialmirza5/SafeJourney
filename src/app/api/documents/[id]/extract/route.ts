import { NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReferralOrThrow } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { extractDocument } from "@/lib/documents/documentService";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const document = await db.document.findUnique({ where: { id: params.id } });
    if (!document) throw new NotFoundError("Document not found.");
    const referral = await getReferralOrThrow(document.referralId);
    if (!(await canAccessReferral(user, referral))) throw new ForbiddenError();
    const extraction = await extractDocument(params.id, user);
    return NextResponse.json({ extraction });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
