import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Isolated SDK/provider contracts; these do NOT replace live credential tests.
async function load(path, transform = (s) => s) {
  const src = transform(await readFile(path, 'utf8'));
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js + `\n// ${Math.random()}`).toString('base64'));
}
const savedFetch = globalThis.fetch;
const savedWindow = globalThis.window;
const savedWarn = console.warn;
const env = { ...process.env };
try {
  process.env.NEXT_PUBLIC_NEXCONN_APP_KEY = 'contract-only-not-a-key';
  globalThis.window = new EventTarget();
  console.warn = () => {};
  for (const scenario of ['new-host', 'existing-host', 'pending-guest', 'active-guest']) {
    let free = false; let updated = false;
    class Group {
      static async createGroup(options) { free = options.joinPermission === 1; return { isOk: scenario !== 'existing-host' }; }
      async updateInfo(options) { updated = options.joinPermission === 1; return { isOk: true }; }
      async join() { return { isOk: true, data: { processCode: scenario === 'pending-guest' ? 25424 : 0 } }; }
      async getMembers() { return { isOk: true, data: scenario === 'pending-guest' ? [] : [{ userId: 'producer' }] }; }
    }
    globalThis.__sdkFactory = async () => ({
      GroupChannel: Group, GroupJoinPermission: { FREE: 1 },
      DirectChannel: class {}, MessageHandler: class {},
      NCEngine: { initialize() {}, connect: async () => ({ isOk: true }), removeMessageHandler() {}, addMessageHandler() {} },
    });
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ token: 'test-only', userId: 'producer', agentId: 'agent' }) });
    const mod = await load('src/lib/nexconn-client.ts', s => s.replace('import("@nexconn/chat")', 'globalThis.__sdkFactory()'));
    const host = scenario.endsWith('host');
    assert.equal(await mod.connectNexconn('game', 'producer', host, () => {}), scenario !== 'pending-guest', scenario);
    if (host) assert(free, 'public group must explicitly allow completed joins');
    if (scenario === 'existing-host') assert(updated, 'existing groups must be repaired on reconnect');
  }
  process.env.AI_API_KEY = 'contract-only-not-a-key';
  process.env.AI_BASE_URL = 'https://api.groq.com/openai/v1';
  process.env.AI_MODEL = 'openai/gpt-oss-20b';
  let sent;
  globalThis.fetch = async (url, options) => { sent = { url, body: JSON.parse(options.body) }; return { ok: true, json: async () => ({ choices: [{ message: { content: 'Riya, I want to hear your side before we vote.' } }] }) }; };
  const ai = await load('src/game/ai.ts', s => s.replace('import { OBJECTIVES } from "./data";', 'const OBJECTIVES = [];'));
  const fixture = { round: 1, messages: [], contestants: [] };
  const speaker = { id: 'one', name: 'Maya', archetype: 'strategist', tagline: 'Here to play', secret: 'Private', objectiveId: 'secret-keeper' };
  assert.equal(ai.dialogueHealth().state, 'unverified');
  assert(await ai.generateLine(fixture, speaker));
  assert.equal(ai.dialogueHealth().state, 'active');
  assert(ai.dialogueHealth().lastSuccessAt);
  assert(!JSON.stringify(ai.dialogueHealth()).includes('contract-only'));
  assert.equal(sent.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(sent.body.max_tokens, 1024); assert.equal(sent.body.reasoning_effort, 'low'); assert.equal(sent.body.include_reasoning, false);
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  assert.equal(await ai.generateLine(fixture, speaker), undefined);
  assert.equal(ai.dialogueHealth().failure, 'provider_http_401');
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '' } }] }) });
  assert.equal(await ai.generateLine(fixture, speaker), undefined);
  assert.equal(ai.dialogueHealth().failure, 'empty_content');
  console.log(JSON.stringify({ result: 'PASS', nexconnMembershipScenarios: 4, groqRequestShape: true, safeFallbacks: true, liveCredentialsTested: false }, null, 2));
} finally {
  globalThis.fetch = savedFetch; globalThis.window = savedWindow; console.warn = savedWarn;
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
  Object.assign(process.env, env); delete globalThis.__sdkFactory; delete globalThis.puppetHouseDialogueTelemetry;
}
