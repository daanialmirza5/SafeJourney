import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { launchJudgeDemoScenario } from "@/lib/demo/demoService";
import { apiErrorResponse } from "@/lib/apiError";

export async function POST() {
  try {
    await requireUser();
    const referral = await launchJudgeDemoScenario();
    return NextResponse.json({ referral });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
