import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { resetDemoData } from "@/lib/demo/demoService";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST() {
  try {
    await requireRole("ADMIN");
    const result = await resetDemoData();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
