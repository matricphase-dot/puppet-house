import { NextResponse } from "next/server";
import { storageHealth } from "@/game/store";
import { securityHeaders } from "@/game/security";

export async function GET() {
  try {
    const storage = await storageHealth();
    return securityHeaders(NextResponse.json({
      status: "ok", storage: storage.mode,
      nexconnConfigured: Boolean(process.env.NEXCONN_APP_KEY && process.env.NEXCONN_APP_SECRET && process.env.NEXT_PUBLIC_NEXCONN_APP_KEY),
      aiConfigured: Boolean(process.env.AI_API_KEY),
    }));
  } catch {
    return securityHeaders(NextResponse.json({ status: "unavailable", storage: process.env.DATABASE_URL ? "postgres" : "local" }, { status: 503 }));
  }
}
