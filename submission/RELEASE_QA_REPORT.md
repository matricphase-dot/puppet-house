# Puppet House — verified public release

## Release decision

**Core gameplay and required live Nexconn integration passed on the public deployment.**

- Public app: https://puppet-house-oregon.onrender.com
- Public repository: https://github.com/matricphase-dot/puppet-house
- Runtime fix revision verified: `5be61fa` (includes `462ebc2` and `554cd5d`).
- Latest verification health: HTTP 200, PostgreSQL healthy, Nexconn configured, AI dialogue state `active` with a recorded provider success.

This is a scoped functional verification, not a guarantee of uninterrupted service or a security certification. Automated QA sessions are not real-user traction.

## Live verification results

| Check | Result |
|---|---|
| Public landing page and PostgreSQL health | PASS |
| Solo API season, private-state projections, all five twists, legal voting, results and Oracle points | PASS |
| Four-producer party regression | PASS — 58 actions, concurrent private whispers, permissions, independent ballots, finale, preserved rematch identities and AI-filled seats |
| Desktop/mobile solo and spectator browser flow | PASS — zero console errors |
| Predictions, Oracle settlement, storylines and actual finale PNG download | PASS |
| Mobile results without horizontal overflow | PASS |
| Host rematch and automatic guest migration | PASS |
| Nexconn guest SDK group-message receipt, independently of polling | PASS |
| Nexconn DirectChannel whisper send | PASS |
| Unauthorized Nexconn token request rejection | PASS |
| Groq dialogue | PASS — runtime provider success recorded and non-Director-template dialogue observed during the live recording |
| Actual-browser public demo session | PASS — zero page errors; party creation/join, coaching, audience twist, prediction, ballots, results, download and rematch |

The final post-fix Nexconn smoke test passed in room `6ISS66`. The public recording used room `RYWTH2`. The four-producer API test and enhancement suite were run on the deployed app after the connection-pool fix.

Earlier two-browser party privacy/reconnect tests also passed. The final replacement demo additionally required both producer browsers to show Nexconn live, asserted guest rematch migration, and saved public provider evidence.

## Local and contract verification

- Production build, TypeScript and ESLint passed.
- Isolated Nexconn membership and Groq request/fallback contracts passed. These mocks were supplementary; real credentials were verified separately on Render.
- Four-producer and solo regressions passed against an isolated real PostgreSQL 17 instance, including concurrent requests.
- The production dependency audit reported zero advisories; the full dependency installation reported eight moderate development-dependency advisories.

## Issues found and resolved

### Pending group membership

The original Nexconn group default required owner approval. A guest's successful join request did not mean active membership. The client now explicitly configures free joining for the **public house-dialogue group**, repairs existing group permissions on host reconnect, and verifies actual membership before reporting a live session. Producer-private state and coaching are not published in that group.

**Result:** public Nexconn group receive, direct send and token authorization checks pass.

### Silent model fallback

The previous 90-token output budget could leave no visible GPT-OSS dialogue. GPT-OSS now has a 1024-token budget; Groq uses low reasoning effort with reasoning output hidden. Provider failures have sanitized diagnostics. Health exposes only process-local state/timestamps/error categories, never prompts, keys or private content. Readiness responses are uncached and evaluated at request time.

**Result:** actual Groq provider success and non-template dialogue observed on the public app.

### Private coaching quoted into fallback dialogue

Director fallback previously copied the producer's instruction into a public line. It now interprets coaching intent into a separate contestant message. The solo regression asserts that the submitted private instruction is not quoted publicly.

**Result:** the updated public solo regression passes.

### PostgreSQL pool starvation

A four-producer stress sequence exposed connection exhaustion: room mutations held pooled connections while nested operations tried to acquire more. Changes reuse the active transaction's connection through AsyncLocalStorage, check whisper rate limits before taking room locks, add bounded database connection/query/idle-transaction timeouts, and allow schema initialization to recover after failure.

**Result:** the 58-action concurrency/rematch regression passes on both real local PostgreSQL and the public Render deployment. A previously hung instance recovered through the fixed-code rollout.

## Updated demo and write-up

- `Puppet_House_Demo.mp4` in the live-demo deliverables folder: approximately 3:17, 1920×1080 H.264/AAC, narrated with burned-in captions, approximately 7.7 MB.
- It is actual footage of the **deployed public app**, with real Nexconn connections and Groq dialogue. Rounds and waiting periods are condensed. No fake chat or scoreboard is composited into the UI.
- Accompanying SRT captions, transcript, finale PNG and sanitized session evidence are available. Narration is AI-generated with the user-selected voice.
- `submission/Puppet_House_Writeup.pdf`: five-page final write-up with public app/repository links and the App Key used by the deployed browser client. The App Key was read from the public application bundle; no App Secret is included.
- The earlier local Director Mode video remains an older alternative, not the recommended submission demo.

## Remaining owner actions and operational risks

1. Upload the **live-demo MP4** to YouTube, Loom, Vimeo or Google Drive with public/link viewing permissions, then paste that viewing URL into the challenge form. No external video upload or form submission has been performed by the assistant.
2. Review the final PDF and submit it with the same App Key. Never include the App Secret, Groq key, database credentials or GitHub token in the submission.
3. Consider an always-on Render web instance for the judging period. Free-tier cold starts were observed and can delay first access by tens of seconds; this remains a hosting-plan limitation.
4. Verify the database's free-plan expiry and service status in the owner's Render dashboard for the full judging period. Expiry/billing were not verified through a connected hosting account.
5. Retain provider credits/quota and model permissions. The app intentionally falls back to Director dialogue if the model is unavailable.
6. Revoke the GitHub PAT used for pushing after all required changes are published; its temporary workspace file was removed.
7. Do not claim real-user traction from these automated tests. Invite genuine testers and collect honest feedback if adding traction evidence.

Not performed: independent security review, production load certification, extended outage/recovery testing, payment/billing verification, or real-user usability research. No prize outcome is guaranteed.
