import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getGame } from "@/game/store";
import { cleanText, rateLimit, securityHeaders } from "@/game/security";

function headers(appKey: string, appSecret: string) {
  const nonce = randomBytes(8).toString("hex").slice(0, 18);
  const timestamp = Date.now().toString();
  const signature = createHash("sha1").update(appSecret + nonce + timestamp).digest("hex");
  return {
    "Content-Type": "application/json", "App-Key": appKey, Nonce: nonce,
    Timestamp: timestamp, Signature: signature, "X-Request-ID": randomBytes(16).toString("hex"),
  };
}
function respond(data: unknown, status = 200) { return securityHeaders(NextResponse.json(data, { status })); }

export async function GET() {
  return respond({ configured: Boolean(process.env.NEXCONN_APP_KEY && process.env.NEXCONN_APP_SECRET && process.env.NEXT_PUBLIC_NEXCONN_APP_KEY) });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, "nexconn-token", 30, 60 * 60 * 1000);
  if (limited) return limited;
  const appKey = process.env.NEXCONN_APP_KEY;
  const appSecret = process.env.NEXCONN_APP_SECRET;
  const baseUrl = process.env.NEXCONN_API_BASE_URL || "https://api.sg-light-api.com";
  if (!appKey || !appSecret || !process.env.NEXT_PUBLIC_NEXCONN_APP_KEY) return respond({ error: "Nexconn is not configured." }, 503);

  const { producerId, gameId } = await request.json();
  const cleanProducer = cleanText(producerId, 100);
  const cleanGame = cleanText(gameId, 80).replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanProducer || !cleanGame) return respond({ error: "producerId and gameId are required." }, 400);
  const game = await getGame(cleanGame);
  const producer = game?.producers[cleanProducer];
  if (!game || !producer) return respond({ error: "A valid producer identity is required." }, 403);
  const contestant = game.contestants.find((person) => person.id === producer.contestantId);

  const issue = async (id: string, name: string) => {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v4/auth/access-token/issue`, {
      method: "POST", headers: headers(appKey, appSecret),
      body: JSON.stringify({ userId: id.slice(0, 64), name: name.slice(0, 64) }), cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json();
    if (!response.ok || data.code !== 0) throw new Error(data.message || "Nexconn token issuance failed.");
    return data.result;
  };

  try {
    const [user] = await Promise.all([
      issue(cleanProducer, contestant?.name || "Puppet House Producer"),
      issue(`agent-${cleanGame}`, "Puppet House Director"),
    ]);
    return respond({ token: user.accessToken, userId: user.userId, gameId: cleanGame, agentId: `agent-${cleanGame}` });
  } catch (error) {
    console.error("Nexconn token error", error);
    return respond({ error: "Could not connect to Nexconn." }, 502);
  }
}
