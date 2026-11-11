import { chromium } from "@playwright/test";
import fs from "node:fs";

const out = "/home/user/qa-puppet-house";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));

await page.goto(process.env.GAME_URL || "http://127.0.0.1:3000", { waitUntil: "networkidle" });
await page.screenshot({ path: `${out}/01-landing.png`, fullPage: true });
await page.getByRole("button", { name: "Play solo" }).click();
await page.getByRole("heading", { name: /Create a/ }).waitFor();
await page.screenshot({ path: `${out}/02-casting.png`, fullPage: true });
await page.getByRole("button", { name: "Start the season" }).click();
await page.getByText("PRODUCER CONSOLE", { exact: true }).waitFor();
await page.getByTitle("Pause season").click();
await page.screenshot({ path: `${out}/03-game-room.png`, fullPage: true });
await page.getByPlaceholder(/Get close to Riya/).fill("Build trust with Riya, then challenge Arjun.");
await page.getByRole("button", { name: "Send whisper" }).click();
await page.getByRole("button", { name: /Memory leak/ }).click();
await page.getByText(/MEMORY LEAK/).last().waitFor();
await page.screenshot({ path: `${out}/04-twist.png`, fullPage: true });

const gameId = await page.evaluate(() => localStorage.getItem("puppet-house-game"));
const roomCode = await page.evaluate(async (id) => {
  const producerId = localStorage.getItem("puppet-house-producer");
  const response = await fetch(`/api/game?id=${id}&producerId=${encodeURIComponent(producerId)}`);
  return (await response.json()).game.roomCode;
}, gameId);
const audience = await browser.newPage({ viewport: { width: 1280, height: 850 }, deviceScaleFactor: 1 });
audience.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
audience.on("pageerror", (error) => errors.push(error.message));
await audience.goto(`${process.env.GAME_URL || "http://127.0.0.1:3000"}/spectate/${roomCode}`, { waitUntil: "networkidle" });
await audience.getByPlaceholder("e.g. DramaWatcher").fill("QA Viewer");
await audience.getByRole("button", { name: "Enter the audience" }).click();
await audience.getByText("AUDIENCE CONTROL", { exact: true }).waitFor();
const initialSpectatorText = await audience.locator("body").innerText();
if (initialSpectatorText.includes("I have been pretending to know everyone") && !initialSpectatorText.includes("MEMORY LEAK")) throw new Error("Producer secret leaked outside a Memory Leak event");
await audience.screenshot({ path: `${out}/07-spectator-room.png`, fullPage: true });
await audience.getByPlaceholder("React to the chaos…").fill("The QA audience has entered the chat.");
await audience.locator(".spectator-chat-input button").click();
await audience.getByRole("button", { name: /Double agent/ }).click();
await audience.waitForTimeout(450);
await audience.screenshot({ path: `${out}/08-spectator-twist.png`, fullPage: true });
const spectatorText = await audience.locator("body").innerText();
if (spectatorText.includes("I have been pretending to know everyone") && !spectatorText.includes("MEMORY LEAK")) throw new Error("Producer secret leaked outside a Memory Leak event");

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await mobile.goto(process.env.GAME_URL || "http://127.0.0.1:3000", { waitUntil: "networkidle" });
await mobile.screenshot({ path: `${out}/05-mobile-landing.png`, fullPage: true });
await mobile.getByRole("button", { name: "Play solo" }).click();
await mobile.getByRole("button", { name: "Start the season" }).click();
await mobile.getByText("PRODUCER CONSOLE", { exact: true }).waitFor();
await mobile.getByTitle("Pause season").click();
await mobile.screenshot({ path: `${out}/06-mobile-game.png`, fullPage: true });

console.log(JSON.stringify({ result: errors.length ? "FAIL" : "PASS", consoleErrors: errors, screenshots: out }, null, 2));
await browser.close();
