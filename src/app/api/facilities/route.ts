import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const facilities = await db.facility.findMany({ where: { deactivatedAt: null }, orderBy: { name: "asc" } });
    return NextResponse.json({ facilities });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
