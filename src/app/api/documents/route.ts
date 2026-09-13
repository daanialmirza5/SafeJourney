import { NextRequest, NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth";
import { getReferralOrThrow } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { uploadDocument } from "@/lib/documents/documentService";
import { InvalidUploadError } from "@/lib/storage/storageService";
import { apiErrorResponse, badRequest } from "@/lib/apiError";
import { checkRateLimit } from "@/lib/rateLimit";
import type { DocumentTypeKey } from "@/lib/ocr/ocrService";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    // 30 uploads / 5 minutes per account -- bounds storage abuse without
    // getting in the way of a real multi-document referral upload.
    checkRateLimit(`upload:${user.id}`, 30, 5 * 60_000);
    const form = await req.formData();
    const referralId = form.get("referralId");
    const file = form.get("file");
    const typeHint = form.get("typeHint");
    if (typeof referralId !== "string" || !(file instanceof File)) {
      return badRequest("A referralId and file are required.");
    }
    const referral = await getReferralOrThrow(referralId);
    if (!(await canAccessReferral(user, referral))) throw new ForbiddenError();

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const document = await uploadDocument(
        referralId,
        user,
        { buffer, originalName: file.name, mimeType: file.type },
        typeof typeHint === "string" && typeHint ? (typeHint as DocumentTypeKey) : undefined
      );
      return NextResponse.json({ document }, { status: 201 });
    } catch (err) {
      if (err instanceof InvalidUploadError) return badRequest(err.message);
      throw err;
    }
  } catch (error) {
    return apiErrorResponse(error);
  }
}
