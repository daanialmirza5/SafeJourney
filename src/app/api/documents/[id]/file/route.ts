import { requireUser, ForbiddenError } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReferralOrThrow } from "@/lib/referral/referralService";
import { canAccessReferral } from "@/lib/referral/access";
import { storageService } from "@/lib/storage/storageService";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const document = await db.document.findUnique({ where: { id: params.id } });
    if (!document) throw new NotFoundError("Document not found.");
    const referral = await getReferralOrThrow(document.referralId);
    if (!(await canAccessReferral(user, referral))) throw new ForbiddenError();

    const buffer = await storageService.read(document.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.originalName)}"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
