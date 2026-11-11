# Submission handoff — Puppet House

**Deadline:** 22 Nov 2026, 23:59 AoE / 23 Nov 2026, 5:29 PM IST.

## Already implemented and locally verified

- Solo Director Mode and two-to-four-producer party rooms with AI-filled seats.
- Server-authoritative private knowledge, three-whisper budgets, pacing, twists, ballots, elimination and scoring.
- Privacy-safe spectators, audience chat and bounded audience powers.
- Private contestant DMs with deliberate Double Agent exposure.
- Local atomic persistence, optional PostgreSQL transactions, shared rate limits and cleanup.
- Nexconn token issuance, group/direct transport, receive handlers and polling fallback.
- Optional knowledge-bounded AI dialogue with deterministic fallback.
- Production build, lint, solo/spectator API and browser tests, four-producer API test and two-browser party test.

## Required from the owner

- [ ] Nexconn App Key for the write-up and public client configuration.
- [ ] Nexconn App Secret configured only in deployment/server environment variables.
- [ ] Managed PostgreSQL connection string for the public deployment.
- [ ] Public hosting account and final app URL.
- [ ] GitHub account/repository destination and public repository URL.
- [ ] Optional AI API key if unscripted dialogue will be shown in the demo.
- [ ] Final recorded demo video and its public URL.
- [ ] Challenge submission account and final form submission.

## Credential-based release gate

Do not submit until all applicable boxes are checked:

- [ ] `GET /api/health` returns `status: ok`, `storage: postgres` and `nexconnConfigured: true`.
- [ ] Host creates a room and the header shows **NEXCONN LIVE**.
- [ ] A second browser joins and receives a new public house message without waiting for fallback polling.
- [ ] A producer whisper reaches the DirectChannel while rival browsers cannot read it.
- [ ] Two producers act simultaneously; both private actions persist with no lost update.
- [ ] Server restart/redeploy preserves an active room.
- [ ] Spectator responses contain no producer-only state outside intended public twists.
- [ ] Rate-limit and moderation responses are verified on the public deployment.
- [ ] Full solo, party and spectator tests run against the public URL.
- [ ] The recorded demo shows real gameplay rather than a static mock-up.
- [ ] Write-up placeholders are replaced and the final PDF is reviewed.
- [ ] Repository contains no `.env`, App Secret, AI key, database credential or local game data.

## Final links

- Public app: **PENDING**
- Public GitHub repository: **PENDING**
- Demo video: **PENDING**
- Final write-up PDF: **PENDING — draft generated**
- Nexconn App Key: **PENDING — required in write-up**
