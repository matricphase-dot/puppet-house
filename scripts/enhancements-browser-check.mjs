import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, stat } from "node:fs/promises";

const base = process.env.APP_URL || "http://localhost:3000";
const out = "/home/user/qa-puppet-house";
await mkdir(out, { recursive: true });
async function post(action, payload = {}) {
  const response = await fetch(`${base}/api/game`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
  const data = await response.json();
  assert(response.ok, `${action}: ${JSON.stringify(data)}`);
  return data;
}
const input = (name, objectiveId) => ({ name, archetype: "strategist", tagline: `${name} came to make television`, secret: `${name}'s private enhancement-test secret`, objectiveId });
const hostData = await post("createParty", { input: input("Ira", "secret-keeper") });
const gameId = hostData.game.id;
const hostId = hostData.producerId;
const roomCode = hostData.game.roomCode;
const guestData = await post("joinParty", { code: roomCode, input: input("Vihaan", "majority-puppet") });
const guestId = guestData.producerId;
const started = await post("startParty", { gameId, producerId: hostId });

const browser = await chromium.launch({ headless: true });
const host = await browser.newPage({ viewport: { width: 1440, height: 1050 }, acceptDownloads: true });
const guest = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const spectator = await browser.newPage({ viewport: { width: 1280, height: 950 } });
const errors = [];
for (const page of [host, guest, spectator]) page.on("pageerror", (error) => errors.push(error.message));
await host.addInitScript(({ id, producer }) => {
  localStorage.setItem("puppet-house-game", id);
  localStorage.setItem("puppet-house-producer", producer);
}, { id: gameId, producer: hostId });
await guest.addInitScript(({ id, producer }) => {
  localStorage.setItem("puppet-house-game", id);
  localStorage.setItem("puppet-house-producer", producer);
}, { id: gameId, producer: guestId });

try {
  await host.goto(base);
  await guest.goto(base);
  await host.waitForSelector(".game-page");
  await guest.waitForSelector(".game-page");
  await host.getByTitle("Pause season").click();
  await host.getByTitle("How to play").click();
  await host.getByRole("dialog", { name: "How to play" }).waitFor();
  await host.getByRole("button", { name: "I know the risks" }).click();

  await spectator.goto(`${base}/spectate/${roomCode}`);
  await spectator.getByPlaceholder("e.g. DramaWatcher").fill("OracleQA");
  await spectator.getByRole("button", { name: "Enter the audience" }).click();
  await spectator.getByText("AUDIENCE CONTROL", { exact: true }).waitFor();

  let current = started.game;
  let predictionDone = false;
  for (let safety = 0; safety < 12 && current.phase !== "results"; safety++) {
    while (current.phase === "live") current = (await post("tick", { gameId, producerId: hostId })).game;
    if (current.phase !== "vote") break;
    if (!predictionDone) {
      await spectator.waitForSelector(".house-pulse");
      await spectator.locator(".pulse-options button").first().click();
      await spectator.waitForSelector(".pulse-options button.selected");
      assert((await spectator.locator(".house-pulse").innerText()).includes("1 prediction locked"));
      await spectator.screenshot({ path: `${out}/house-pulse.png`, fullPage: true });
      predictionDone = true;
    }
    for (const producerId of [hostId, guestId]) {
      const ownViewResponse = await fetch(`${base}/api/game?id=${gameId}&producerId=${producerId}`);
      const ownView = (await ownViewResponse.json()).game;
      const player = ownView.contestants.find((person) => person.isPlayer);
      if (player.eliminated) continue;
      const target = ownView.contestants.find((person) => !person.eliminated && person.id !== player.id && !(ownView.round < 3 && person.immunity));
      assert(target, "legal enhancement-test ballot target");
      await post("vote", { gameId, producerId, targetId: target.id });
      current = ownView;
    }
    current = (await post("reveal", { gameId, producerId: hostId })).game;
  }
  assert.equal(current.phase, "results");
  await host.waitForSelector(".storyline-section", { timeout: 15_000 });
  await guest.waitForSelector(".storyline-section", { timeout: 15_000 });
  assert((await host.locator(".storyline-grid article").count()) >= 2);
  await spectator.waitForSelector(".oracle-result", { timeout: 15_000 });
  assert((await spectator.locator(".oracle-result").innerText()).includes("Oracle points"));
  await host.screenshot({ path: `${out}/enhanced-results-host.png`, fullPage: true });
  await guest.screenshot({ path: `${out}/enhanced-results-guest.png`, fullPage: true });
  await guest.setViewportSize({ width: 390, height: 844 });
  await guest.screenshot({ path: `${out}/enhanced-results-mobile.png`, fullPage: true });
  const mobileWidth = await guest.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert(mobileWidth.scroll <= mobileWidth.viewport, "mobile results must not overflow horizontally");

  const downloadPromise = host.waitForEvent("download");
  await host.getByRole("button", { name: "Download finale card" }).click();
  const download = await downloadPromise;
  const cardPath = `${out}/finale-card.png`;
  await download.saveAs(cardPath);
  assert((await stat(cardPath)).size > 10_000, "finale card is a real non-empty PNG");

  await host.getByRole("button", { name: "Run it back — same party" }).click();
  await host.waitForSelector(".party-lobby");
  await guest.waitForSelector(".party-lobby", { timeout: 15_000 });
  const newHostId = await host.evaluate(() => localStorage.getItem("puppet-house-game"));
  const newGuestId = await guest.evaluate(() => localStorage.getItem("puppet-house-game"));
  assert.equal(newHostId, newGuestId);
  assert.notEqual(newHostId, gameId);
  assert.equal(await host.locator(".party-slot.filled").count(), 2);
  assert.equal(await guest.locator(".party-slot.filled").count(), 2);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(JSON.stringify({ result: "PASS", predictions: true, storylines: true, finalePng: cardPath, rematchMigration: true, consoleErrors: errors }, null, 2));
} finally {
  await browser.close();
}
