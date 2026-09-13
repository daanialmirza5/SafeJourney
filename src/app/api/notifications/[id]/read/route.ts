import { NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiErrorResponse, NotFoundError } from "@/lib/apiError";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const notification = await db.notification.findUnique({ where: { id: params.id } });
    if (!notification) throw new NotFoundError("Notification not found.");
    if (notification.userId !== user.id) throw new ForbiddenError();
    const updated = await db.notification.update({ where: { id: params.id }, data: { isRead: true } });
    return NextResponse.json({ notification: updated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
