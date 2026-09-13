import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { launchRescueScenario } from "@/lib/demo/demoService";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST() {
  try {
    await requireUser();
    const referral = await launchRescueScenario();
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
