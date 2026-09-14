import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { apiErrorResponse } from "@/lib/apiError";
import { serializeUser } from "@/lib/serialize";
import { checkRateLimit, clientKeyFromRequest } from "@/lib/rateLimit";
import type { RoleName } from "@/lib/types/enums";

export async function POST(req: NextRequest) {
  try {
    checkRateLimit(`register:${clientKeyFromRequest(req)}`, 10, 60_000);
    const body = registerSchema.parse(await req.json());
    const email = body.email.toLowerCase().trim();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "An account with this email already exists." } },
        { status: 409 }
      );
    }

    let facilityId = body.facilityId;
    if (!facilityId && body.role !== "ADMIN") {
      const defaultFacility = await db.facility.findFirst({
        where: { deactivatedAt: null },
        orderBy: { createdAt: "asc" },
      });
      facilityId = defaultFacility?.id;
    }

    const passwordHash = await hashPassword(body.password);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: body.name.trim(),
          role: body.role,
          language: body.language || "en",
          phone: body.phone?.trim() || null,
          facilityId: facilityId || null,
          isDemo: false,
          onboardedAt: new Date(),
        },
      });

      if (body.role === "PATIENT") {
        const pseudonymSeq = Math.floor(1000 + Math.random() * 8999);
        const resolvedFacilityId = facilityId || (await tx.facility.findFirst())?.id || "fac-default";

        await tx.patient.create({
          data: {
            userId: newUser.id,
            pseudonym: `Patient-${pseudonymSeq}`,
            name: newUser.name,
            sex: "Female",
            facilityId: resolvedFacilityId,
            createdById: newUser.id,
          },
        });
      }

      return newUser;
    });

    await setSessionCookie(user.id, user.role as RoleName);
    return NextResponse.json({ user: serializeUser(user) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
