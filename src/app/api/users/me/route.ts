import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeUser } from "@/lib/serialize";
import { apiErrorResponse } from "@/lib/apiError";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  language: z.enum(["en", "hi", "mr"]).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = updateSchema.parse(await req.json());
    const updated = await db.user.update({ where: { id: user.id }, data: input });
    return NextResponse.json({ user: serializeUser(updated) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
