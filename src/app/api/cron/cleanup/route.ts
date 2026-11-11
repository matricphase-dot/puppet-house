import { NextRequest, NextResponse } from "next/server";
import { cleanupGames } from "@/game/store";
import { securityHeaders } from "@/game/security";

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return securityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  await cleanupGames();
  return securityHeaders(NextResponse.json({ ok: true, cleanedAt: new Date().toISOString() }));
}
