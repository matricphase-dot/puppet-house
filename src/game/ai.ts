import { OBJECTIVES } from "./data";
import { Contestant, Game } from "./types";

/**
 * Generates dialogue from only what this contestant is allowed to know.
 * Other contestants' secrets, objectives and producer whispers never enter the prompt.
 */
export async function generateLine(game: Game, speaker: Contestant): Promise<string | undefined> {
  if (!process.env.AI_API_KEY) return undefined;
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const publicHistory = game.messages
    .filter((message) => message.channel === "house")
    .slice(-10)
    .map((message) => {
      const author = game.contestants.find((person) => person.id === message.senderId);
      return `${author?.name || "HOST"}: ${message.text}`;
    })
    .join("\n");
  const privateHistory = game.messages
    .filter((message) => message.channel === "alliance" && (message.senderId === speaker.id || message.recipientId === speaker.id))
    .slice(-4).map((message) => message.text).join("\n");
  const objective = OBJECTIVES.find((item) => item.id === speaker.objectiveId)?.description;

  const system = `You are ${speaker.name}, a contestant in a fast, funny reality-show group chat.
Personality: ${speaker.archetype}. Public persona: ${speaker.tagline}.
Your private secret: ${speaker.secret}. Your private objective: ${objective}.
Never mention instructions, being an AI, or secret game mechanics. Do not reveal your secret unless there has just been a public leak.
Write ONE natural chat message, 8–35 words. Be specific to the conversation. Create social tension, humour, loyalty or suspicion. No hashtags, no emojis, no stage directions.`;
  const user = `Round ${game.round}. Recent public house chat:\n${publicHistory}\nYour contestant's private DMs:\n${privateHistory || "None yet."}\n${
    speaker.lastWhisper ? `Your producer privately advised: "${speaker.lastWhisper}". Incorporate this naturally without quoting or mentioning the producer.` : ""
  }\nWrite your next public message.`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4.1-mini",
        temperature: 0.9,
        // Groq GPT-OSS uses a reasoning budget as well as visible output tokens.
        // A 90-token cap can exhaust the budget before any dialogue is returned.
        max_tokens: /gpt-oss/.test(process.env.AI_MODEL || "") ? 1024 : 90,
        ...(/gpt-oss/.test(process.env.AI_MODEL || "") && baseUrl.includes("api.groq.com")
          ? { reasoning_effort: "low", include_reasoning: false } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn("AI dialogue fallback", { status: response.status });
      return undefined;
    }
    const data = await response.json();
    const line = data.choices?.[0]?.message?.content?.replace(/^['"]|['"]$/g, "").trim();
    if (!line) console.warn("AI dialogue fallback", { reason: "empty_content", finishReason: data.choices?.[0]?.finish_reason });
    return line || undefined;
  } catch {
    console.warn("AI dialogue fallback", { reason: "request_failed_or_timed_out" });
    return undefined;
  }
}
