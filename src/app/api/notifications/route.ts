import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await db.notification.count({ where: { userId: user.id, isRead: false } });
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
