import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { aiService } from "@/lib/ai/aiService";
import { aiQuestionSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";
import { checkRateLimit } from "@/lib/rateLimit";

/** Assistive AI copilot (spec sections 28, 42). Administrative/coordination
 * questions only -- clinical questions are refused by the safety layer
 * inside aiService.answerAdminQuestion before any answer is generated. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    // 20 questions / minute per account -- generous for a real conversation,
    // tight enough to bound cost once a paid provider is wired up.
    checkRateLimit(`ai:${user.id}`, 20, 60_000);
    const { question } = aiQuestionSchema.parse(await req.json());
    const answer = await aiService.answerAdminQuestion(question);
    return NextResponse.json({ ...answer, demoMode: aiService.isDemoMode() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
