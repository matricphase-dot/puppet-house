import fs from "node:fs";

const base = process.env.GAME_URL || "http://127.0.0.1:3000";
let game;
let spectator;
let producerId;

async function call(action, payload = {}) {
  const response = await fetch(`${base}/api/game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, gameId: game?.id, producerId, ...payload }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${action}: ${data.error || response.status}`);
  game = data.game;
  if (data.producerId) producerId = data.producerId;
  return game;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

await call("create", {
  input: {
    name: "Test Maya",
    archetype: "strategist",
    tagline: "Testing the room.",
    secret: "This is a deterministic test secret.",
    objectiveId: "secret-keeper",
  },
});
assert(game.contestants.length === 4, "four contestants are created");
assert(game.contestants.filter((person) => !person.isPlayer).every((person) => person.objectiveId === "hidden"), "rival objectives are private");
assert(/^[A-Z0-9]{6}$/.test(game.roomCode), "shareable room code is created");

const spectatorResponse = await fetch(`${base}/api/game`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "spectatorJoin", code: game.roomCode, name: "TestViewer" }),
});
const spectatorData = await spectatorResponse.json();
assert(spectatorResponse.ok, "spectator joins by room code");
spectator = spectatorData.spectator;
assert(spectatorData.game.contestants.every((person) => person.objectiveId === "hidden"), "all objectives are hidden from spectators");
assert(spectatorData.game.messages.every((message) => message.channel !== "confessional"), "producer cam is hidden from spectators");
assert(fs.existsSync(`.data/games/${game.id}.json`), "game is persisted to disk");

await call("tick");
await call("tick");
assert(!game.messages.some((message) => message.channel === "alliance" && message.kind === "chat"), "rival-to-rival DMs stay private");
await call("tick");
await call("tick");
assert(game.messages.some((message) => message.channel === "alliance" && message.kind === "chat"), "a DM involving the player's contestant is visible");
await call("whisper", { text: "Build trust with Riya." });
assert(game.whispersLeft === 2, "whisper count is authoritative");

async function spectatorAction(action, payload = {}) {
  const response = await fetch(`${base}/api/game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, code: game.roomCode, spectatorId: spectator.id, ...payload }),
  });
  const data = await response.json();
  assert(response.ok, `${action} succeeds`);
  game = data.game;
  spectator = data.spectator;
}

await spectatorAction("spectatorChat", { text: "The audience has entered the chat." });
assert(game.messages.some((message) => message.senderName === "TestViewer"), "audience chat carries spectator identity");
await spectatorAction("spectatorTwist", { twist: "memory-leak" });
assert(spectator.lastTwistRound === 1, "spectator twist is recorded");
await spectatorAction("spectatorTwist", { twist: "immunity" });
assert(!game.twistsUsed.includes("immunity"), "spectator cannot use two twists in one round");
await call("twist", { twist: "double-agent" });
for (const twist of ["immunity", "confessional"]) await call("twist", { twist });
assert(game.twistsUsed.length === 4, "live twists execute");

let safety = 0;
let revoteTested = false;
while (game.phase !== "results" && safety < 100) {
  safety += 1;
  if (game.phase === "live") {
    await call("tick");
    continue;
  }
  const player = game.contestants.find((person) => person.isPlayer);
  const target = game.contestants.find((person) => !person.isPlayer && !person.eliminated && !(game.round < 3 && person.immunity));
  assert(target && player, "a legal vote target exists");
  await call("vote", { targetId: target.id });
  if (!revoteTested) {
    await call("twist", { twist: "revote" });
    assert(!game.playerVote, "revote clears the ballot");
    await call("vote", { targetId: target.id });
    revoteTested = true;
  }
  await call("reveal");
}

assert(game.phase === "results", `season reaches results in ${safety} actions`);
assert(game.winnerId, "a winner is selected");
assert(game.scores.length === 4, "all contestants receive scores");
assert(game.contestants.every((person) => person.objectiveId !== "hidden"), "objectives are revealed at results");
console.log(JSON.stringify({
  result: "PASS",
  actions: safety,
  rounds: game.round,
  winner: game.contestants.find((person) => person.id === game.winnerId)?.name,
  scores: game.scores.map((score) => ({ id: score.contestantId, total: score.total })),
  messages: game.messages.length,
  twists: game.twistsUsed,
}, null, 2));
