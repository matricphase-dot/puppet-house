import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
const hostContext = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const guestContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const host = await hostContext.newPage();
const guest = await guestContext.newPage();
const errors = [];
for (const page of [host, guest]) page.on("pageerror", (error) => errors.push(error.message));
const output = "/home/user/qa-puppet-house";
await mkdir(output, { recursive: true });
const base = process.env.APP_URL || "http://localhost:3000";

try {
  await host.goto(base);
  await host.getByRole("button", { name: "Create party room" }).click();
  await host.locator('input').first().fill("Aanya");
  await host.locator(".secret-field textarea").fill("HOST_ONLY_SECRET_741");
  await host.getByRole("button", { name: "Create party room", exact: true }).click();
  await host.waitForSelector(".party-code-card");
  const code = (await host.locator(".party-code-card strong").innerText()).trim();
  assert.match(code, /^[A-Z0-9]{6}$/);
  await host.screenshot({ path: `${output}/party-lobby-host.png`, fullPage: true });

  await guest.goto(`${base}/?party=${code}`);
  await guest.locator("input").first().fill("Dev");
  await guest.locator(".secret-field textarea").fill("GUEST_ONLY_SECRET_852");
  await guest.getByRole("button", { name: "Join the party", exact: true }).click();
  await guest.waitForSelector(".waiting-host");
  await host.waitForFunction(() => document.querySelectorAll(".party-slot.filled").length === 2);
  assert.equal(await host.locator(".party-slot.filled").count(), 2);
  await guest.screenshot({ path: `${output}/party-lobby-guest.png`, fullPage: true });
  await host.getByRole("button", { name: "Start the party season" }).click();
  await host.waitForSelector(".game-page");
  await guest.waitForSelector(".game-page");
  assert.equal(await host.locator(".contestant-card").count(), 4);
  assert.equal(await guest.locator(".contestant-card").count(), 4);
  await host.getByRole("button", { name: "Pause season" }).click();
  await host.waitForTimeout(300);

  await host.locator(".whisper-section textarea").fill("HOST_WHISPER_PRIVATE_963");
  await host.getByRole("button", { name: "Send whisper" }).click();
  await guest.locator(".whisper-section textarea").fill("GUEST_WHISPER_PRIVATE_357");
  await guest.getByRole("button", { name: "Send whisper" }).click();
  await guest.waitForTimeout(500);
  await host.getByRole("button", { name: "Producer cam" }).click();
  await guest.getByRole("button", { name: "Producer cam" }).click();
  const hostText = await host.locator("body").innerText();
  const guestText = await guest.locator("body").innerText();
  assert(hostText.includes("HOST_WHISPER_PRIVATE_963"));
  assert(!hostText.includes("GUEST_WHISPER_PRIVATE_357"));
  assert(!hostText.includes("GUEST_ONLY_SECRET_852"));
  assert(guestText.includes("GUEST_WHISPER_PRIVATE_357"));
  assert(!guestText.includes("HOST_WHISPER_PRIVATE_963"));
  assert(!guestText.includes("HOST_ONLY_SECRET_741"));
  assert.equal(await guest.getByRole("button", { name: "Pause season" }).count(), 0);
  await host.screenshot({ path: `${output}/party-live-host.png`, fullPage: true });
  await guest.screenshot({ path: `${output}/party-live-guest.png`, fullPage: true });

  await host.reload();
  await host.waitForSelector(".game-page");
  await host.getByRole("button", { name: "Producer cam" }).click();
  assert((await host.locator("body").innerText()).includes("HOST_WHISPER_PRIVATE_963"));
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(JSON.stringify({ result: "PASS", roomCode: code, consoleErrors: errors, screenshots: output }, null, 2));
} finally {
  await browser.close();
}
