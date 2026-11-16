import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.APP_URL || process.env.GAME_URL || "http://localhost:3000";
const health = await (await fetch(`${base}/api/health`)).json();
if (!health.nexconnConfigured) {
  console.log(JSON.stringify({ result: "SKIP", reason: "Nexconn is not configured; this is not a live verification." }, null, 2));
  process.exit(0);
}
if (process.env.REQUIRE_POSTGRES === "1") assert.equal(health.storage, "postgres", "Production QA requires shared PostgreSQL");

const browser = await chromium.launch({ headless: true });
const host = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const guest = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
for (const page of [host, guest]) page.on("pageerror", (error) => errors.push(error.message));

try {
  await host.goto(base);
  await host.getByRole("button", { name: "Create party room" }).click();
  await host.locator("input").first().fill("NexHost");
  await host.getByRole("button", { name: "Create party room", exact: true }).click();
  await host.waitForSelector(".party-code-card");
  const code = (await host.locator(".party-code-card strong").innerText()).trim();
  await guest.goto(`${base}/?party=${code}`);
  await guest.locator("input").first().fill("NexGuest");
  await guest.getByRole("button", { name: "Join the party", exact: true }).click();
  await guest.waitForSelector(".waiting-host");
  await host.getByRole("button", { name: "Start the party season" }).click();
  await host.getByText("NEXCONN LIVE", { exact: true }).waitFor({ timeout: 30_000 });
  await guest.getByText("NEXCONN LIVE", { exact: true }).waitFor({ timeout: 30_000 });
  await host.getByTitle("Pause season").click();
  await host.waitForTimeout(300);

  const received = guest.evaluate(() => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 45_000);
    window.addEventListener("puppet-house:nexconn-received", (event) => {
      clearTimeout(timer);
      resolve(event.detail.count > 0);
    }, { once: true });
  }));
  await host.getByRole("button", { name: "Next moment" }).click();
  assert.equal(await received, true, "Guest must receive an SDK group event, not only polling");

  const delivered = host.evaluate(() => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 45_000);
    window.addEventListener("puppet-house:nexconn-delivery", (event) => {
      if (event.detail.type === "whisper") {
        clearTimeout(timer);
        resolve(true);
      }
    });
  }));
  await host.locator(".whisper-section textarea").fill("Live credential whisper verification");
  await host.getByRole("button", { name: "Send whisper" }).click();
  assert.equal(await delivered, true, "DirectChannel whisper send must succeed");

  const unauthorized = await guest.evaluate(async ({ gameId }) => {
    const response = await fetch("/api/nexconn/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, producerId: "not-a-producer" }),
    });
    return response.status;
  }, { gameId: await host.evaluate(() => localStorage.getItem("puppet-house-game")) });
  assert.equal(unauthorized, 403);
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(JSON.stringify({ result: "PASS", roomCode: code, groupReceive: true, directWhisper: true, tokenAuthorization: true, consoleErrors: errors }, null, 2));
} finally {
  await browser.close();
}
