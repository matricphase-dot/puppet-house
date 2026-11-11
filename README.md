# Puppet House

**AI contestants. Human puppeteers. Hidden agendas.**

A real-time, chat-driven reality-show strategy game for the **Nexconn Build Challenge 2026**. Create an autonomous contestant, give it a secret and mission, then try to steer the social chaos with only three private whispers while other producers and the audience interfere.

## What is playable

- **Solo seasons:** one producer and three autonomous contestants.
- **Party rooms:** two to four producers, six-character invites, private producer identities, host-controlled pacing, and AI-filled empty seats.
- **Three-round social strategy:** autonomous public chat, contestant-to-contestant private DMs, trust, popularity, alliances, conflict, ballots, eliminations and a final crown.
- **Asymmetric information:** each contestant has a private secret and one of eight objectives; every producer gets exactly three private whispers.
- **Audience participation:** shareable `/spectate/<ROOM-CODE>` rooms, display names, audience chat, and one bounded twist per spectator per round.
- **Five twists:** Memory Leak, Double Agent, Immunity, Confessional and Revote.
- **Results and receipts:** objective progress, score breakdowns, winners and season replay.
- **Responsive UI:** desktop and mobile layouts, local reconnect/resume, and saved authoritative rooms.
- **Director Mode:** deterministic, fully playable dialogue without AI or Nexconn credentials.

## Quick start

Requires Node.js 20.9+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. No credentials are required for Director Mode.

For an optimized run:

```bash
npm run build
npm start
```

### Party and spectator invites

1. Choose **Create party room**, create a contestant, and copy the lobby invite.
2. Friends open `/?party=<CODE>`, create their own contestants, and wait for the host.
3. The host starts the season. Any unfilled seats become autonomous contestants.
4. During the season, the **ROOM** button copies the separate `/spectate/<CODE>` audience invite.

Producer identity credentials are stored on each device. Do not share a producer's saved browser session. Only the host can start, advance, pause, or reveal votes. Every living producer's contestant has an independent ballot; eliminated producers can continue watching.

## Production setup

### Shared PostgreSQL storage

Set `DATABASE_URL` to a PostgreSQL connection string. The app creates the idempotent schema on startup; `schema.sql` is also supplied for manual review or migration tooling.

```bash
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=require
CRON_SECRET=generate_a_long_random_secret
```

With a database configured, room mutations use `SELECT … FOR UPDATE` transactions, preventing concurrent whispers or ballots from overwriting one another. Rate-limit counters are also shared through PostgreSQL. Without `DATABASE_URL`, the app uses a serialized local store with atomic JSON files under `.data/games`; local mode is for a single process, not multi-instance hosting.

Finished and abandoned lobby rooms expire after seven days; all untouched rooms expire after thirty days. Cleanup happens opportunistically and through `GET /api/cron/cleanup` with `Authorization: Bearer <CRON_SECRET>`. `vercel.json` schedules this daily on Vercel.

Health check: `GET /api/health` reports storage and integration configuration without exposing credentials.

### Nexconn Chat

The project installs and uses `@nexconn/engine` and `@nexconn/chat`.

```bash
NEXCONN_APP_KEY=your_app_key
NEXCONN_APP_SECRET=your_app_secret
NEXCONN_API_BASE_URL=https://api.sg-light-api.com
NEXT_PUBLIC_NEXCONN_APP_KEY=your_app_key
```

Use the API base URL for your Nexconn data center. With valid credentials:

1. `/api/nexconn/token` verifies the producer's room membership and issues a server-signed user token.
2. The browser initializes `NCEngine` and connects with that token.
3. The host creates the house `GroupChannel`; guests join it.
4. New public house messages are published through `GroupChannel.sendMessage`.
5. Producer whispers use a `DirectChannel` to the registered house agent.
6. `MessageHandler.onMessageReceived` triggers an immediate authoritative refresh; polling remains as a fallback.

The header shows **NEXCONN LIVE** only after a successful connection. Otherwise it remains in **DIRECTOR MODE**. Nexconn transports public events and private whispers, but never decides game state. The App Secret never reaches the browser.

Docs: https://docs.nexconn.ai/chatsdk-web

> Live Nexconn delivery requires credential-based end-to-end verification. Do not describe it as verified merely because the SDK integration compiles.

### Optional unscripted AI dialogue

```bash
AI_API_KEY=your_model_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
```

`src/game/ai.ts` provides only the speaker's own personality, secret, mission, producer whisper, private DMs and public history. Rival secrets, missions and whispers never enter its prompt. The model improvises dialogue only; deterministic server rules control every game outcome. Model failure or timeout falls back to Director dialogue.

## Architecture

```text
src/
  app/
    page.tsx                  Solo/party flow, autoplay, reconnect, transport
    spectate/[code]/          Privacy-safe audience room
    api/game/route.ts         Authorized actions, validation, moderation
    api/nexconn/token/        Room-authorized signed token issuance
    api/health/               Deployment and storage health
    api/cron/cleanup/         Authenticated room expiry
  components/                 Landing, casting, lobby, live room, results
  game/
    types.ts                  Game and identity contracts
    data.ts                   Cast, missions, twists, Director dialogue
    engine.ts                 Authoritative rules, scoring and redaction
    store.ts                  Local store or transactional PostgreSQL
    security.ts               Rate limits, text cleaning, moderation
    ai.ts                     Knowledge-bounded optional dialogue
  lib/nexconn-client.ts       Lazy SDK transport and receive handlers
scripts/
  playthrough.mjs             Solo + spectator API season and persistence
  party-playthrough.mjs       Four-producer permissions/privacy/full season
  browser-check.mjs           Producer/spectator desktop/mobile QA
  party-browser-check.mjs     Two-browser party and reconnect QA
schema.sql                    Reviewable PostgreSQL schema
submission/                   Draft write-up, demo plan and handoff checklist
```

### Privacy and security

- Server-authoritative identities, private knowledge, whisper limits, pacing, legal ballots, twists, elimination, scoring and winners.
- Producer-specific API projections hide rival missions, secrets, whispers, ballots and private DMs.
- Spectators never receive producer consoles or ordinary private DMs. Double Agent and Memory Leak reveal only their intended public receipts.
- Request-size limits, text limits, control-character cleaning, basic slur moderation, per-IP rate limits, and security response headers.
- Host-only pacing and reveal permissions; eliminated producers cannot vote or whisper.
- Public room codes are invite locators, not producer credentials.

## Verification

With the app running on port 3000:

```bash
npm run lint
npm run build
npm run test:game
node scripts/party-playthrough.mjs
```

Browser QA:

```bash
npx playwright install chromium
npx playwright install-deps chromium
npm run test:browser
node scripts/party-browser-check.mjs
# With Nexconn credentials configured; otherwise this explicitly reports SKIP:
npm run test:nexconn
```

Scripts use `APP_URL` or `GAME_URL` when testing another address. Screenshots are written to `/home/user/qa-puppet-house` in the build workspace.

The automated party test covers 55 actions, four independent producers, unauthorized access, host permissions, private whispers and DMs, ballot readiness, three rounds, finale scoring, reconnect reads and AI-filled seats. Browser tests cover two separate party sessions and solo/spectator desktop/mobile flows.

## Deployment and submission boundary

The code supports a public Next.js deployment with managed PostgreSQL. Public hosting, a GitHub account, Nexconn credentials, optional AI credentials, and final submission accounts belong to the user. The submission write-up remains a **draft** until its App Key, public app URL, repository URL and video URL are filled in and live integrations are tested. See `submission/HANDOFF.md`.
