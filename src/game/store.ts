import fs from "node:fs";
import path from "node:path";
import { AsyncLocalStorage } from "node:async_hooks";
import type { PoolClient } from "pg";
import { Game } from "./types";

const globalStore = globalThis as unknown as {
  puppetHouseGames?: Map<string, Game>;
  puppetHouseLocks?: Map<string, Promise<unknown>>;
  puppetHousePool?: import("pg").Pool;
  puppetHouseSchema?: Promise<void>;
};
const transactions = new AsyncLocalStorage<PoolClient>();
const games = globalStore.puppetHouseGames || new Map<string, Game>();
const locks = globalStore.puppetHouseLocks || new Map<string, Promise<unknown>>();
globalStore.puppetHouseGames = games;
globalStore.puppetHouseLocks = locks;
const dataDirectory = path.join(process.cwd(), ".data", "games");
const databaseEnabled = Boolean(process.env.DATABASE_URL);

function ensureDirectory() { fs.mkdirSync(dataDirectory, { recursive: true }); }
function gamePath(id: string) { return path.join(dataDirectory, `${id.replace(/[^a-zA-Z0-9_-]/g, "")}.json`); }

function normalize(game: Game): Game {
  const player = game.contestants.find((person) => person.isPlayer) || game.contestants[0];
  const legacy = game as Game & { whispersLeft?: number; playerVote?: string };
  if (!game.mode || !game.producers || !game.whisperCounts || !game.ballots) {
    game.mode = game.mode || "solo";
    game.hostId = game.hostId || `producer-${game.id}`;
    game.producers = game.producers || { [game.hostId]: { id: game.hostId, name: player.name, contestantId: player.id, isHost: true, joinedAt: game.createdAt } };
    player.producerId = game.hostId;
    game.whisperCounts = game.whisperCounts || { [game.hostId]: legacy.whispersLeft ?? 3 };
    game.ballots = game.ballots || (legacy.playerVote ? { [player.id]: legacy.playerVote } : {});
  }
  game.spectators = game.spectators || {};
  Object.values(game.spectators).forEach((spectator) => {
    spectator.predictions = spectator.predictions || {};
    spectator.fanPoints = spectator.fanPoints || 0;
  });
  game.predictionTally = game.predictionTally || {};
  game.predictionTotal = game.predictionTotal || 0;
  game.votes = game.votes || {};
  game.scores = game.scores || [];
  game.twistsUsed = game.twistsUsed || [];
  return game;
}

function readLocal(id: string): Game | undefined {
  try {
    const game = normalize(JSON.parse(fs.readFileSync(gamePath(id), "utf8")) as Game);
    games.set(game.id, game);
    return game;
  } catch { return undefined; }
}

async function pool() {
  if (!globalStore.puppetHousePool) {
    const { Pool } = await import("pg");
    globalStore.puppetHousePool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 8_000,
      query_timeout: 20_000,
      statement_timeout: 20_000,
      idle_in_transaction_session_timeout: 20_000,
      ssl: process.env.DATABASE_SSL === "disable" ? undefined : { rejectUnauthorized: false },
    });
  }
  return globalStore.puppetHousePool;
}

// Nested storage calls inside a room mutation must reuse its connection. Otherwise
// four concurrent callers can fill the pool while the lock owner waits for a fifth.
async function databaseClient() {
  return transactions.getStore() || await pool();
}

async function ensureSchema() {
  if (!globalStore.puppetHouseSchema) {
    globalStore.puppetHouseSchema = pool().then((client) => client.query(`
      CREATE TABLE IF NOT EXISTS puppet_house_games (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL UNIQUE,
        data JSONB NOT NULL,
        updated_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS puppet_house_updated_idx ON puppet_house_games(updated_at);
    `).then(() => undefined)).catch((error) => {
      globalStore.puppetHouseSchema = undefined;
      throw error;
    });
  }
  return globalStore.puppetHouseSchema;
}

function saveLocal(game: Game) {
  games.set(game.id, game);
  ensureDirectory();
  const temporary = `${gamePath(game.id)}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(game), "utf8");
  fs.renameSync(temporary, gamePath(game.id));
}

export async function saveGame(game: Game) {
  game.updatedAt = Date.now();
  if (databaseEnabled) {
    await ensureSchema();
    const client = await databaseClient();
    await client.query(`INSERT INTO puppet_house_games(id, room_code, data, updated_at, created_at)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, updated_at=EXCLUDED.updated_at`,
    [game.id, game.roomCode, JSON.stringify(game), game.updatedAt, game.createdAt]);
  } else {
    try { saveLocal(game); } catch (error) {
      games.set(game.id, game);
      console.warn("Could not persist game to disk; memory copy retained.", error);
    }
  }
  if (games.size > 100) {
    const oldest = [...games.values()].sort((a, b) => a.updatedAt - b.updatedAt)[0];
    if (oldest) games.delete(oldest.id);
  }
  if (Math.random() < 0.02) await cleanupGames();
  return game;
}

export async function getGame(id: string): Promise<Game | undefined> {
  if (!id) return undefined;
  if (databaseEnabled) {
    await ensureSchema();
    const result = await (await databaseClient()).query("SELECT data FROM puppet_house_games WHERE id=$1", [id]);
    return result.rows[0] ? normalize(result.rows[0].data as Game) : undefined;
  }
  return games.get(id) || readLocal(id);
}

export async function getGameByCode(code: string): Promise<Game | undefined> {
  const clean = code.trim().toUpperCase();
  if (!clean) return undefined;
  if (databaseEnabled) {
    await ensureSchema();
    const result = await (await databaseClient()).query("SELECT data FROM puppet_house_games WHERE room_code=$1", [clean]);
    return result.rows[0] ? normalize(result.rows[0].data as Game) : undefined;
  }
  const cached = [...games.values()].find((game) => game.roomCode === clean);
  if (cached) return cached;
  try {
    ensureDirectory();
    for (const file of fs.readdirSync(dataDirectory)) {
      if (!file.endsWith(".json")) continue;
      const game = games.get(file.slice(0, -5)) || readLocal(file.slice(0, -5));
      if (game?.roomCode === clean) return game;
    }
  } catch { return undefined; }
  return undefined;
}

export async function updateGame<T>(selector: { id?: string; code?: string }, mutation: (game: Game) => Promise<T> | T): Promise<{ game: Game; result: T } | undefined> {
  if (databaseEnabled) {
    await ensureSchema();
    const client = await (await pool()).connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT data FROM puppet_house_games WHERE ${selector.id ? "id=$1" : "room_code=$1"} FOR UPDATE`,
        [selector.id || selector.code?.toUpperCase()],
      );
      if (!result.rows[0]) { await client.query("ROLLBACK"); return undefined; }
      const game = normalize(result.rows[0].data as Game);
      const value = await transactions.run(client, () => mutation(game));
      game.updatedAt = Date.now();
      await client.query("UPDATE puppet_house_games SET data=$2, updated_at=$3 WHERE id=$1", [game.id, JSON.stringify(game), game.updatedAt]);
      await client.query("COMMIT");
      return { game, result: value };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  const key = selector.id || selector.code?.toUpperCase() || "unknown";
  const previous = locks.get(key) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.then(() => current);
  locks.set(key, tail);
  await previous;
  try {
    const game = selector.id ? await getGame(selector.id) : await getGameByCode(selector.code || "");
    if (!game) return undefined;
    const fresh = readLocal(game.id) || game;
    const result = await mutation(fresh);
    await saveGame(fresh);
    return { game: fresh, result };
  } finally {
    release();
    if (locks.get(key) === tail) locks.delete(key);
  }
}

const memoryLimits = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  if (!databaseEnabled) {
    const current = memoryLimits.get(key);
    if (!current || current.resetAt <= now) {
      memoryLimits.set(key, { count: 1, resetAt: now + windowMs });
      if (memoryLimits.size > 5000) for (const [id, value] of memoryLimits) if (value.resetAt <= now) memoryLimits.delete(id);
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  }
  await ensureSchema();
  const client = await databaseClient();
  await client.query(`CREATE TABLE IF NOT EXISTS puppet_house_rate_limits (
    key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at BIGINT NOT NULL
  )`);
  const bucket = Math.floor(now / windowMs);
  const scopedKey = `${key}:${bucket}`;
  const result = await client.query(`INSERT INTO puppet_house_rate_limits(key,count,reset_at) VALUES($1,1,$2)
    ON CONFLICT(key) DO UPDATE SET count=puppet_house_rate_limits.count+1 RETURNING count`,
  [scopedKey, now + windowMs]);
  if (Math.random() < 0.01) await client.query("DELETE FROM puppet_house_rate_limits WHERE reset_at<$1", [now]);
  return Number(result.rows[0].count) <= limit;
}

export async function storageHealth() {
  if (!databaseEnabled) return { mode: "local" as const, ok: true };
  await ensureSchema();
  await (await databaseClient()).query("SELECT 1");
  return { mode: "postgres" as const, ok: true };
}

export async function cleanupGames() {
  const now = Date.now();
  const finishedCutoff = now - 7 * 24 * 60 * 60 * 1000;
  const abandonedCutoff = now - 30 * 24 * 60 * 60 * 1000;
  if (databaseEnabled) {
    await ensureSchema();
    await (await databaseClient()).query(`DELETE FROM puppet_house_games WHERE updated_at < $1
      OR ((data->>'phase' = 'results' OR data->>'phase' = 'lobby') AND updated_at < $2)`,
    [abandonedCutoff, finishedCutoff]);
    return;
  }
  try {
    ensureDirectory();
    for (const file of fs.readdirSync(dataDirectory)) {
      if (!file.endsWith(".json")) continue;
      const game = readLocal(file.slice(0, -5));
      if (game && (game.updatedAt < abandonedCutoff || (["results", "lobby"].includes(game.phase) && game.updatedAt < finishedCutoff))) {
        fs.unlinkSync(gamePath(game.id));
        games.delete(game.id);
      }
    }
  } catch { /* cleanup is opportunistic */ }
}
