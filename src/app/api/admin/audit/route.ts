import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const entityType = req.nextUrl.searchParams.get("entityType") ?? undefined;
    const logs = await db.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { actor: true },
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
