import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign-in required." } }, { status: 401 });
    }

    if (!["DOCTOR", "COORDINATOR", "ADMIN", "FOLLOWUP"].includes(user.role)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Unauthorized to browse patients." } }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const whereClause: Record<string, unknown> = {};
    if (q) {
      whereClause.OR = [
        { name: { contains: q } },
        { pseudonym: { contains: q } },
        { user: { email: { contains: q } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const patients = await db.patient.findMany({
      where: whereClause,
      include: {
        facility: { select: { id: true, name: true, district: true } },
        user: { select: { id: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ patients });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
