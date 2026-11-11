import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "./store";

export function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "local";
}

export async function rateLimit(request: NextRequest, bucket: string, limit = 120, windowMs = 60_000) {
  const allowed = await checkRateLimit(`${bucket}:${clientIp(request)}`, limit, windowMs);
  if (!allowed) return NextResponse.json({ error: "Too many requests. Take a breath and try again shortly." }, { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } });
  return undefined;
}

export function cleanText(value: unknown, maxLength: number) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

const blocked = /(?:\bn[i1]gg[aer]s?\b|\bf[a4]gg[o0]ts?\b|\bk[i1]k[e3]s?\b|\bch[i1]nks?\b)/i;

export function moderationError(value: string) {
  if (blocked.test(value)) return "That message violates the house rules. Keep the conflict in the game, not at real people.";
  return undefined;
}

export function securityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}
