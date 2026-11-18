# Puppet House — release QA and demo handoff

## Release decision

**Core gameplay passes. Full integration sign-off is still pending.**

Public application: https://puppet-house-oregon.onrender.com  
Repository: https://github.com/matricphase-dot/puppet-house  
Public revision tested: `54ee4b5`. The fixes described below have been implemented and tested locally, but have **not been pushed or redeployed** in this session. No GitHub or Render credentials are stored for a deployment.

## Verification matrix

| Area | Environment | Outcome |
|---|---|---|
| Homepage and PostgreSQL readiness | Public Render | PASS — health HTTP 200, `storage: postgres` |
| Solo API playthrough | Public Render | PASS — four contestants, privacy projections, all five twists, voting, finale, scores and Oracle settlement |
| Four-producer party API playthrough | Public Render | PASS — 58 actions, independent identities, authorization, private budgets, ballots, AI-filled seats and rematches |
| Solo/spectator desktop and mobile browser flow | Public Render | PASS after cold-start retry; zero console errors |
| Two-browser party, private DOM checks and reconnect | Public Render | PASS; zero console errors |
| House Pulse, storylines, actual PNG download, mobile results and guest rematch migration | Public Render | PASS; zero page errors |
| Nexconn token issuance and SDK connections | Public Render | Both host and guest connected |
| Nexconn group send | Public Render diagnostic | SDK returned success, but guest was not an active group member |
| Nexconn group reception | Public Render | **FAIL — required live release gate** |
| Nexconn direct send | Public Render diagnostic | SDK returned `isOk: true`, `code: 0`; a producer-to-producer diagnostic also triggered a raw receive callback. This does not prove an autonomous Director receives/processes whispers. |
| Optional Groq dialogue | Public Render | Configuration detected, but sampled dialogue was Director fallback; genuine model-generated output not verified |
| Production build / TypeScript / lint | Locally patched source | PASS |
| Solo API including no-verbatim-coaching assertion | Locally patched source | PASS |
| 58-action party API regression | Locally patched source | PASS |
| Solo, party and enhancement browser suites | Locally patched source | PASS; zero browser errors |
| Nexconn membership and Groq request contract tests | Locally patched source, mocks | PASS — 4 membership scenarios, provider request shape and safe fallbacks. **Not a credential test.** |
| Dependency audit | Locked dependencies | Zero production advisories; npm reported 8 moderate development-dependency advisories |

## Defects and changes prepared

### 1. Nexconn pending membership was reported as live

Nexconn defaults to owner-approved group joining. The diagnostic returned `isOk: true` with `processCode: 25424` for a guest's request, while querying actual members showed only the host. The UI had treated request acceptance as active membership.

Prepared fix in `src/lib/nexconn-client.ts`:
- Explicitly use `GroupJoinPermission.FREE` for the public house-dialogue group.
- Repair the permission on host reconnect to an existing group.
- Verify that the authenticated user appears in `getMembers()` before reporting a live group session.
- Private whispers continue to use direct channels; private producer state is not published into the public group.

Acceptance after deploy: `APP_URL=https://puppet-house-oregon.onrender.com REQUIRE_POSTGRES=1 npm run test:nexconn` must pass group receive, direct whisper and authorization checks. A successful connect badge or send alone is insufficient.

### 2. Optional AI silently fell back

Configured credentials do not establish provider success. Public dialogue samples matched the built-in Director templates. We do not know whether the deployed cause is credentials, model permission, quota, empty output, or another provider error because the deployed code suppresses details.

Prepared mitigation in `src/game/ai.ts`:
- Increase GPT-OSS token budget from 90 to 1024, allowing room for reasoning as well as visible output.
- For Groq GPT-OSS only, request low reasoning effort and hide reasoning from dialogue output.
- Add safe status / timeout / empty-content logging, without printing API keys, prompts or secrets.
- Expose process-local `aiDialogue` health metadata (`unverified`, `active`, or `fallback` with a sanitized reason), and make health responses request-time and non-cacheable. This distinguishes provider success from merely configured keys.
- Preserve deterministic fallback if the provider is unavailable.

Acceptance after deploy: run a new season, inspect Render logs for `AI dialogue fallback`, and confirm actual provider output. If the status is 401/403, correct the key or model permissions; if 429, resolve quota. No live Groq success is claimed for the prepared mitigation.

### 3. Director fallback could quote a private whisper

The fallback previously inserted raw producer coaching into a public message. Prepared fix in `src/game/engine.ts` interprets a small set of coaching intents into a separate contestant line without copying the private instruction. A new solo regression checks that the submitted coaching is absent from public dialogue.

### 4. QA harness corrections

- The solo script previously assumed every target writes a local file; it now verifies API persistence for remote/shared-storage targets.
- The Nexconn event wait was increased to allow the AI action time budget. The live reception test still failed after the longer wait, so timing was not used to excuse the membership defect.
- Added isolated membership/provider contract tests.

## Demo deliverable

`Puppet_House_Demo.mp4`: approximately 3 minutes 15 seconds; 1920×1080; H.264 video with AAC narration; burned-in captions; about 7.6 MB.

This is actual browser footage of a complete **local Director Mode** session using the locally patched source, clearly labelled throughout and stated in narration. It is not presented as live Groq output or a passed Nexconn group-delivery demo. Delays are slowed/held for narration and rounds are condensed; real session results, prediction, card download and guest rematch migration were recorded. No fake chat or scoreboard was composited into the UI. Narration is AI-generated with the voice selected by the user.

Chapters: landing → casting → shared party → scarce whispers → spectator twist → House Pulse and ballot screen → finale/storylines/download → rematch. The live public URL and repository are shown at the end.

Accompanying files: `Puppet_House_Demo.srt`, `Demo_Transcript.md`, `Puppet_House_Finale_Card.png`.

## Operational observations

- The first browser run hit Render's wake-up page. Warm retry passed. Free-tier cold starts remain a judge-experience risk; warm the site before a demo or consider a paid instance if desired.
- Repeated testing reached the legitimate per-IP room-creation limit (HTTP 429). This protection was not bypassed on the public app. The video was recorded locally after the public test suites had passed.
- Do not run all suites and the recording concurrently against one instance: they share rate-limit budgets.
- Full multi-region load testing, resilience under outages, and third-party security review were not performed.

## Before final submission

1. Apply/push the release fixes and redeploy the Oregon service.
2. Verify `/api/health` returns HTTP 200 with PostgreSQL.
3. Pass the live Nexconn reception/direct-send/authorization smoke test.
4. Verify real Groq dialogue (or clearly disclose Director-only dialogue; Nexconn still needs verification).
5. Confirm the final write-up contains the App Key, correct live/repository links, and uploaded demo-video URL. Do not put the App Secret or API keys in the write-up.
6. Upload the video to the platform accepted by the challenge and test viewing permissions while signed out. The MP4 has been created here; no external upload/submission was performed.

**Do not describe this report as an unconditional production or competition-submission sign-off.**
