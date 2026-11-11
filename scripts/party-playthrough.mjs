import assert from "node:assert/strict";
const base = process.env.APP_URL || "http://localhost:3000";
let actions = 0;
async function post(action, payload = {}, expected = 200) {
  actions++;
  const response = await fetch(`${base}/api/game`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${action} (${response.status}): ${JSON.stringify(data)}`);
  return data;
}
async function get(id, producerId, spectator = false) {
  const response = await fetch(`${base}/api/game?id=${id}&producerId=${producerId || ""}${spectator ? "&spectator=1" : ""}`);
  assert.equal(response.status, 200);
  return (await response.json()).game;
}
const input = (name, objectiveId = "majority-puppet") => ({
  name, archetype: "strategist", avatar: 1, tagline: `${name} plays to win`, secret: `${name} has a private strategy`, objectiveId,
});

const hostData = await post("createParty", { input: input("Mira") });
const gameId = hostData.game.id;
const hostId = hostData.producerId;
const roomCode = hostData.game.roomCode;
assert.equal(hostData.game.phase, "lobby");
assert.equal(hostData.game.mode, "party");
assert.equal(hostData.game.contestants.length, 1);
assert.equal(hostData.game.isHost, true);
await post("startParty", { gameId, producerId: "not-a-producer" }, 403);
const second = await post("joinParty", { code: roomCode, input: input("Kabir", "chaos-survivor") });
const third = await post("joinParty", { code: roomCode, input: input("Nia", "secret-keeper") });
const fourth = await post("joinParty", { code: roomCode, input: input("Ravi", "betrayer") });
await post("joinParty", { code: roomCode, input: input("Extra") }, 409);
assert.equal(fourth.game.isHost, false);

const outsider = (await post("create", { input: { name: "Outsider", archetype: "chaos", avatar: 4, tagline: "Outside the party", secret: "No access", objectiveId: "giant-slayer" } })).producerId;
await post("whisper", { gameId, producerId: outsider, text: "Unauthorized" }, 403);
await post("tick", { gameId, producerId: third.producerId }, 403);
await post("reveal", { gameId, producerId: second.producerId }, 403);
const outsiderFetch = await fetch(`${base}/api/game?id=${gameId}&producerId=${outsider}`);
assert.equal(outsiderFetch.status, 403);

const ids = [hostId, second.producerId, third.producerId, fourth.producerId];
const views = await Promise.all(ids.map((id) => get(gameId, id)));
for (let i = 0; i < views.length; i++) {
  assert.equal(views[i].contestants.filter((person) => person.objectiveId && person.objectiveId !== "hidden").length, 1);
  assert.equal(views[i].contestants.find((person) => person.isPlayer).id, views[i].playerId);
  assert.equal(views[i].contestants[i].secret, input(["Mira", "Kabir", "Nia", "Ravi"][i]).secret);
  assert(views[i].contestants.filter((person) => !person.isPlayer).every((person) => person.secret === "Hidden until the season ends."));
}
await post("startParty", { gameId, producerId: hostId });
assert.equal((await get(gameId, hostId)).contestants.length, 4);
await post("startParty", { gameId, producerId: hostId });
await Promise.all([
  post("whisper", { gameId, producerId: hostId, text: "Build trust with Kabir before the first ballot." }),
  post("whisper", { gameId, producerId: second.producerId, text: "Disagree with Mira, but privately offer Nia an alliance." }),
  post("whisper", { gameId, producerId: third.producerId, text: "Protect Kabir and expose a secret." }),
]);
await Promise.all(Array.from({ length: 4 }, (_, i) => post("whisper", { gameId, producerId: fourth.producerId, text: `Instruction ${i}` })));
assert.equal((await get(gameId, hostId)).whispersLeft, 2);
assert.equal((await get(gameId, fourth.producerId)).whispersLeft, 0);
const hostView = await get(gameId, hostId);
assert(hostView.messages.filter((message) => message.channel === "confessional").length >= 2);
assert(!JSON.stringify(hostView.messages).includes("Disagree with Mira"));
assert(!JSON.stringify(hostView.messages).includes("Protect Kabir and expose"));
assert(hostView.messages.filter((message) => message.channel === "confessional").every((message) => message.senderId === "producer" || message.senderId === hostView.playerId || message.senderId === "host"));
const spectatorView = await get(gameId, "", true);
assert(!JSON.stringify(spectatorView).includes("Build trust"));
assert.equal(spectatorView.contestants.filter((person) => person.objectiveId && person.objectiveId !== "hidden").length, 0);

for (let i = 0; i < 6; i++) await post("tick", { gameId, producerId: hostId });
let vote = await get(gameId, hostId);
assert.equal(vote.phase, "vote");
assert.equal(vote.ballotsRequired, 4);
assert(vote.messages.filter((message) => message.channel === "alliance" && message.kind === "chat").every((message) => message.senderId === vote.playerId || message.text.startsWith("Private to Mira:")));
const voteSpectator = await get(gameId, "", true);
assert.equal(voteSpectator.messages.filter((message) => message.channel === "alliance" && message.kind === "chat").length, 0);
await post("reveal", { gameId, producerId: hostId });
vote = await get(gameId, hostId);
assert.equal(vote.phase, "vote");
for (let i = 1; i < 4; i++) {
  const current = await get(gameId, ids[i]);
  const player = current.contestants.find((person) => person.isPlayer);
  const target = current.contestants.find((person) => person.id !== player.id && !person.eliminated);
  const result = await post("vote", { gameId, producerId: ids[i], targetId: target.id });
  assert.equal(result.game.playerVote, target.id);
  assert.equal(Object.keys(result.game.votes).length, 0);
}
vote = await get(gameId, hostId);
assert.equal(vote.ballotsSubmitted, 3);
const finalTarget = vote.contestants.find((person) => person.id !== vote.playerId && !person.eliminated);
await post("vote", { gameId, producerId: hostId, targetId: finalTarget.id });
vote = await get(gameId, hostId);
assert.equal(vote.ballotsReady, true);
await post("reveal", { gameId, producerId: hostId });
assert.equal((await get(gameId, hostId)).phase, "live");

for (let i = 0; i < 6; i++) await post("tick", { gameId, producerId: hostId });
const livingIds = [];
for (const id of ids) {
  const view = await get(gameId, id);
  if (!view.contestants.find((person) => person.isPlayer).eliminated) livingIds.push(id);
}
assert(livingIds.length >= 2);
await post("reveal", { gameId, producerId: hostId });
for (const id of livingIds) {
  const current = await get(gameId, id);
  const player = current.contestants.find((person) => person.isPlayer);
  const target = current.contestants.find((person) => person.id !== player.id && !person.eliminated && !person.immunity);
  await post("vote", { gameId, producerId: id, targetId: target.id });
}
await post("reveal", { gameId, producerId: hostId });
for (let i = 0; i < 6; i++) await post("tick", { gameId, producerId: hostId });
const finalists = await get(gameId, hostId);
assert.equal(finalists.round, 3);
assert.equal(finalists.phase, "vote");
for (const id of ids) {
  const current = await get(gameId, id);
  const player = current.contestants.find((person) => person.isPlayer);
  if (player.eliminated) continue;
  const target = current.contestants.find((person) => person.id !== player.id && !person.eliminated);
  await post("vote", { gameId, producerId: id, targetId: target.id });
}
await post("reveal", { gameId, producerId: hostId });
const results = await get(gameId, hostId);
assert.equal(results.phase, "results");
assert.equal(results.scores.length, 4);
const rematch = await post("rematch", { gameId, producerId: hostId });
assert.equal(rematch.game.phase, "lobby");
assert.equal(rematch.game.contestants.length, 4);
assert.notEqual(rematch.game.id, gameId);
assert.notEqual(rematch.game.roomCode, roomCode);
assert(rematch.game.contestants.every((person) => person.name !== ""));
assert.equal(rematch.game.whispersLeft, 3);
const rematchGuest = await get(rematch.game.id, second.producerId);
assert.equal(rematchGuest.contestants.find((person) => person.isPlayer).name, "Kabir");
assert.equal(rematchGuest.contestants.find((person) => person.isPlayer).objectiveId, "chaos-survivor");
assert.equal(rematchGuest.isHost, false);
const oldGuest = await get(gameId, second.producerId);
assert.equal(oldGuest.nextGameId, rematch.game.id);
await post("rematch", { gameId, producerId: second.producerId }, 403);
const idempotent = await post("rematch", { gameId, producerId: hostId });
assert.equal(idempotent.game.id, rematch.game.id);
const aiHost = await post("createParty", { input: input("AIHost") });
const aiGuest = await post("joinParty", { code: aiHost.game.roomCode, input: input("AIGuest") });
await post("startParty", { gameId: aiHost.game.id, producerId: aiHost.producerId });
const filled = await get(aiHost.game.id, aiHost.producerId);
assert.equal(filled.contestants.length, 4);
assert.equal(filled.contestants.filter((person) => person.isPlayer).length, 1);
const aiGuestView = await get(aiHost.game.id, aiGuest.producerId);
assert.equal(aiGuestView.contestants.filter((person) => person.isPlayer).length, 1);
await post("joinParty", { code: aiHost.game.roomCode, input: input("TooLate") }, 409);
console.log(`✓ Party playthrough passed: ${actions} actions, 4 producers, private whispers, permissions, three ballots, finale, AI-filled seats.`);
