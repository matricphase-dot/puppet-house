# Puppet House

## AI contestants. Human puppeteers. Hidden agendas.

**Track:** Gaming & Live Streams  
**Event:** Nexconn Build Challenge 2026  
**Public app:** PENDING  
**Repository:** PENDING  
**Demo video:** PENDING  
**Nexconn App Key:** PENDING — REQUIRED BEFORE SUBMISSION

> DRAFT: This document must not be submitted until the links, App Key and live credential checks are complete.

## The one-line pitch

Create an AI contestant, give it a secret agenda, and try to control the chaos using only three private whispers—while other producers and the audience leak secrets and change the game.

## The problem

Most social games ask players to directly control every action. Most AI companions are solitary conversations. Most stream audiences can react, but cannot meaningfully change the story. Puppet House combines autonomous social characters, scarce human influence and bounded audience power in a short competitive format.

A season is easy to understand, watchable in public and different in private. Producers see their own secret mission and private console; spectators see the public drama and deliberate exposures. That asymmetry creates strategy, comedy and streamable reactions without requiring a long tutorial.

## How a season works

1. **Cast:** One to four producers each author a contestant with a personality, public persona, private secret and secret mission. Empty seats become autonomous contestants.
2. **Coexist:** Four contestants converse autonomously, build or lose trust, send private DMs and gain or lose popularity over three rounds.
3. **Coach:** Each producer has exactly three private whispers for the entire season. Advice influences the next public moment but does not directly dictate it.
4. **Interfere:** Named spectators chat and trigger one bounded twist per round: Memory Leak, Double Agent, Immunity, Confessional or Revote.
5. **Vote:** Eligible producers submit independent private ballots. Only the host controls pacing and reveals votes after all required ballots arrive.
6. **Win:** Eliminations lead to a final crown ballot. Scores combine popularity, secret objectives, survival, strategy and final votes. Results include readable season receipts.

## Why Nexconn is structural

Nexconn is the live social transport, not a decorative chat box.

- Server-issued, room-authorized user tokens connect producer identities.
- A house GroupChannel distributes public social events to party producers.
- A DirectChannel carries private producer whispers to the house agent.
- MessageHandler events trigger immediate authoritative synchronization.
- Group and direct communication map naturally to public drama and secret influence.

The game server remains authoritative. Incoming Nexconn events never grant permission to change private knowledge, whisper limits, ballots, elimination or scoring. Polling remains a resilience fallback and Director Mode remains playable without credentials.

## Innovation and scenario value

Puppet House is not presented as the first AI social simulator. Its differentiation is the combined playable loop:

- **Autonomy plus scarce coaching:** players author behaviour and intervene only three times rather than typing every line.
- **Asymmetric private objectives:** different producers pursue incompatible definitions of success in the same public conversation.
- **Audience information control:** viewers can expose selected information and disrupt votes through bounded powers.
- **Two-layer spectating:** the public feed is watchable while producer-only information remains meaningful.
- **Short, replayable seasons:** casting, three rounds and receipts create a complete social story in minutes.

The same engine supports friend-group party games, campus events, creator-led tournaments and branded interactive reality formats.

## Completeness and user experience

The responsive experience includes an editorial landing page, contestant casting, four-seat party lobby, live producer console, private DM and confessional channels, audience controls, ballot readiness, results and replay. Solo players can start immediately; party users have a six-character invite flow; spectators join with only a display name.

Reconnecting restores the saved producer identity and authoritative room. Empty seats use autonomous contestants so small groups are not blocked. Eliminated producers remain as viewers. Text limits, moderation, rate limits and explicit permissions protect the live room.

## Business and growth potential

**Initial audience:** college clubs, friend groups, Discord communities and small streamers who need a low-setup social activity.

**Distribution loops:** party invites recruit producers; spectator links recruit viewers; public secrets and eliminations create shareable moments; themed seasons create reasons to return.

**Expansion paths:**

- Themed seasons and character/objective packs.
- Private streamer or campus tournaments.
- Custom house rules and audience-vote packages for creators.
- Branded interactive shows and sponsor-safe themed casts.
- Post-season recap cards and clips as organic acquisition.

A sensible first validation is a campus/club test measuring completed seasons, party invite acceptance, spectator-to-producer conversion and immediate rematches. Pricing should follow retention evidence rather than assumption.

## Technical design

- Next.js App Router, React and TypeScript.
- Server-authoritative deterministic game engine.
- Optional OpenAI-compatible dialogue bounded to each contestant's knowledge.
- Nexconn Chat SDK group/direct transport and server-signed token route.
- Local atomic JSON storage for single-process Director Mode.
- PostgreSQL JSONB persistence, row-level mutation locks and shared rate-limit counters for deployment.
- Producer-specific response redaction and spectator-safe projections.
- Request limits, moderation, host permissions, room expiry and health checks.

## Verification summary

- Production TypeScript build and ESLint.
- Solo/spectator API season, twists, privacy and persistence.
- 55-action four-producer test covering authorization, concurrent whispers, private DMs, ballots, three rounds, finale and AI-filled seats.
- Desktop/mobile producer and spectator browser QA.
- Two-browser host/guest party QA, private DOM checks and reconnect.

Live Nexconn, managed PostgreSQL and optional model dialogue still require credential-based verification on the public deployment. Those checks are release gates, not assumed results.

## Closing

Puppet House turns a group chat into a social strategy show. The contestants create the drama, producers compete through limited influence, and the audience can change what everyone knows. It is designed to be played, watched, shared and replayed.
