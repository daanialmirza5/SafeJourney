import { NextResponse } from "next/navigation";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "SafeJourney",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
