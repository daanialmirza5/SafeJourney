import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const rules = await db.benefitRule.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ rules });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
