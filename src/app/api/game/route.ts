import { NextRequest, NextResponse } from "next/server";
import { generateLine } from "@/game/ai";
import {
  aliveContestants, castVote, createGame, createParty, createRematch, joinParty, publicGame,
  revealVotes, joinSpectator, spectatorChat, spectatorPredict, startParty, tick, triggerTwist, whisper,
} from "@/game/engine";
import { getGame, getGameByCode, saveGame, updateGame } from "@/game/store";
import { cleanText, moderationError, rateLimit, securityHeaders } from "@/game/security";
import { CastingInput, TwistId } from "@/game/types";

class ActionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function respond(data: unknown, status = 200) { return securityHeaders(NextResponse.json(data, { status })); }
function validCasting(input: CastingInput | undefined) {
  return Boolean(input?.name?.trim() && input?.secret?.trim() && input?.tagline?.trim()
    && ["charmer", "strategist", "chaos", "innocent"].includes(input.archetype)
    && ["fan-favorite", "secret-keeper", "majority-puppet", "chaos-survivor", "bridge-builder", "betrayer", "giant-slayer", "ghost"].includes(input.objectiveId));
}
function cleanCasting(input: CastingInput): CastingInput {
  const clean = {
    ...input,
    name: cleanText(input.name, 18), tagline: cleanText(input.tagline, 90), secret: cleanText(input.secret, 180),
  };
  const moderated = moderationError(`${clean.name} ${clean.tagline} ${clean.secret}`);
  if (moderated) throw new ActionError(moderated);
  return clean;
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "game-read", 180);
  if (limited) return limited;
  const id = request.nextUrl.searchParams.get("id") || "";
  const code = request.nextUrl.searchParams.get("code") || "";
  const producerId = request.nextUrl.searchParams.get("producerId") || undefined;
  const spectatorView = request.nextUrl.searchParams.get("spectator") === "1";
  const game = code ? await getGameByCode(code) : await getGame(id);
  if (!game) return respond({ error: "Game not found" }, 404);
  if (!spectatorView && !game.producers[producerId || ""]) return respond({ error: "A valid producer identity is required." }, 403);
  const spectatorId = request.nextUrl.searchParams.get("spectatorId") || "";
  return respond({ game: publicGame(game, spectatorView, producerId), spectator: spectatorView ? game.spectators[spectatorId] : undefined });
}

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 24_000) throw new ActionError("Request is too large.", 413);
    const limited = await rateLimit(request, "game-write", 120);
    if (limited) return limited;
    const body = await request.json();
    const input = body.input as CastingInput | undefined;

    if (["create", "createParty"].includes(body.action)) {
      const creationLimit = await rateLimit(request, "season-create", 12, 60 * 60 * 1000);
      if (creationLimit) return creationLimit;
      if (!validCasting(input)) throw new ActionError("Complete every casting field before continuing.");
      const clean = cleanCasting(input!);
      if (body.action === "createParty") {
        const { game, producer } = createParty(clean);
        await saveGame(game);
        return respond({ game: publicGame(game, false, producer.id), producerId: producer.id });
      }
      const game = await saveGame(createGame(clean));
      return respond({ game: publicGame(game, false, game.hostId), producerId: game.hostId });
    }

    if (body.action === "joinParty") {
      if (!validCasting(input)) throw new ActionError("Complete every casting field before continuing.");
      const clean = cleanCasting(input!);
      const updated = await updateGame({ code: cleanText(body.code, 6) }, (game) => {
        const producer = joinParty(game, clean);
        if (!producer) throw new ActionError("This party is full or the season has already started.", 409);
        return producer;
      });
      if (!updated) throw new ActionError("That party code does not exist.", 404);
      return respond({ game: publicGame(updated.game, false, updated.result.id), producerId: updated.result.id });
    }

    if (body.action === "spectatorJoin") {
      const name = cleanText(body.name, 18) || "Anonymous";
      const moderated = moderationError(name);
      if (moderated) throw new ActionError(moderated);
      const updated = await updateGame({ code: cleanText(body.code, 6) }, (game) => joinSpectator(game, name, body.spectatorId ? cleanText(body.spectatorId, 80) : undefined));
      if (!updated) throw new ActionError("That room code does not exist.", 404);
      return respond({ game: publicGame(updated.game, true), spectator: updated.result });
    }

    if (["spectatorTwist", "spectatorChat", "spectatorPredict"].includes(body.action)) {
      if (body.action === "spectatorChat") {
        const chatLimit = await rateLimit(request, "audience-chat", 20);
        if (chatLimit) return chatLimit;
      }
      const updated = await updateGame({ code: cleanText(body.code, 6) }, (game) => {
        const spectatorId = cleanText(body.spectatorId, 80);
        const spectator = game.spectators[spectatorId];
        if (!spectator) throw new ActionError("Join the audience first.", 403);
        if (body.action === "spectatorChat") {
          const text = cleanText(body.text, 240);
          const moderated = moderationError(text);
          if (moderated) throw new ActionError(moderated);
          if (text) spectatorChat(game, spectatorId, text);
        }
        if (body.action === "spectatorPredict") spectatorPredict(game, spectatorId, cleanText(body.targetId, 100));
        if (body.action === "spectatorTwist" && spectator.lastTwistRound !== game.round) {
          const before = game.twistsUsed.length;
          triggerTwist(game, body.twist as TwistId);
          if (game.twistsUsed.length > before) spectator.lastTwistRound = game.round;
        }
        return spectator;
      });
      if (!updated) throw new ActionError("That room no longer exists.", 404);
      return respond({ game: publicGame(updated.game, true), spectator: updated.game.spectators[updated.result.id] });
    }

    if (body.action === "rematch") {
      const rematched = await updateGame({ id: cleanText(body.gameId, 80) }, async (oldGame) => {
        const producerId = cleanText(body.producerId, 100);
        if (!oldGame.producers[producerId] || oldGame.hostId !== producerId) throw new ActionError("Only the host can start a rematch.", 403);
        if (oldGame.mode !== "party" || oldGame.phase !== "results") throw new ActionError("Rematches are available after a party season.", 409);
        if (oldGame.nextGameId) {
          const existing = await getGame(oldGame.nextGameId);
          if (existing) return { game: existing, producerId };
        }
        const nextGame = createRematch(oldGame);
        await saveGame(nextGame);
        return { game: nextGame, producerId };
      });
      if (!rematched) throw new ActionError("Game not found. Start a new season.", 404);
      return respond({ game: publicGame(rematched.result.game, false, rematched.result.producerId), producerId: rematched.result.producerId });
    }

    const updated = await updateGame({ id: cleanText(body.gameId, 80) }, async (game) => {
      const producerId = cleanText(body.producerId, 100);
      const producer = game.producers[producerId];
      if (!producer) throw new ActionError("You are not a producer in this room.", 403);
      const isHost = producer.id === game.hostId;

      if (body.action === "startParty") {
        if (!isHost) throw new ActionError("Only the host can start the season.", 403);
        startParty(game);
      } else if (body.action === "tick") {
        if (!isHost) throw new ActionError("Only the host controls season pacing.", 403);
        if (game.phase === "live") {
          const alive = aliveContestants(game);
          const speaker = alive[(game.turn + game.round - 1) % alive.length];
          const line = await generateLine(game, speaker);
          tick(game, line);
          if (speaker.lastWhisper && line) speaker.lastWhisper = undefined;
        }
      } else if (body.action === "whisper") {
        const whisperLimit = await rateLimit(request, "producer-whisper", 20);
        if (whisperLimit) throw new ActionError("Too many whispers. Try again shortly.", 429);
        const text = cleanText(body.text, 180);
        const moderated = moderationError(text);
        if (moderated) throw new ActionError(moderated);
        whisper(game, text, producerId);
      } else if (body.action === "twist") {
        triggerTwist(game, body.twist as TwistId, producerId);
      } else if (body.action === "vote") {
        castVote(game, cleanText(body.targetId, 100), producerId);
      } else if (body.action === "reveal") {
        if (!isHost) throw new ActionError("Only the host can reveal the ballots.", 403);
        revealVotes(game);
      } else {
        throw new ActionError("Unknown game action.");
      }
      return producerId;
    });
    if (!updated) throw new ActionError("Game not found. Start a new season.", 404);
    return respond({ game: publicGame(updated.game, false, updated.result) });
  } catch (error) {
    if (error instanceof ActionError) return respond({ error: error.message }, error.status);
    console.error("Game action failed", error);
    return respond({ error: "The control room glitched. Try that action again." }, 500);
  }
}
