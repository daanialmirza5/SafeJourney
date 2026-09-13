import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";
import { serializeUser } from "@/lib/serialize";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import type { RoleName } from "@/lib/types/enums";

export async function POST(req: NextRequest) {
  try {
    // 10 attempts / minute per IP -- generous enough for real typos, tight
    // enough to blunt a brute-force credential-stuffing attempt.
    checkRateLimit(`login:${clientKeyFromRequest(req)}`, 10, 60_000);
    const body = loginSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid email or password." } }, { status: 401 });
    }
    if (user.deactivatedAt) {
      return NextResponse.json(
        { error: { code: "ACCOUNT_DEACTIVATED", message: "This account has been deactivated. Contact an administrator." } },
        { status: 403 }
      );
    }
    await setSessionCookie(user.id, user.role as RoleName);
    return NextResponse.json({ user: serializeUser(user) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
