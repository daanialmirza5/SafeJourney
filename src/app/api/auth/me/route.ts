import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { serializeUser } from "@/lib/serialize";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const facility = user.facilityId ? await db.facility.findUnique({ where: { id: user.facilityId } }) : null;
  return NextResponse.json({ user: serializeUser(user), facility });
}
