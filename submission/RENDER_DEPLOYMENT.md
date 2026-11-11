# Render deployment — Puppet House

`render.yaml` provisions one Next.js web service and one PostgreSQL database in Singapore. Review Render's current free-plan limits and spin-down behavior before the demo; a paid always-on web service is safer for judging if available.

## 1. Push the public repository

Create an empty **public** GitHub repository. Do not initialize it with a README, license or `.gitignore`, because this workspace already contains them.

```bash
cd /home/user/puppet-house
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Confirm that `.env.local`, `.data`, `node_modules` and `.next` do not appear on GitHub. The App Secret must never be committed.

## 2. Create the Render Blueprint

1. In Render, choose **New → Blueprint** and connect the public repository.
2. Select `render.yaml`. Render should show `puppet-house` and `puppet-house-db`.
3. When prompted, enter the same App Key for both `NEXCONN_APP_KEY` and `NEXT_PUBLIC_NEXCONN_APP_KEY`.
4. Enter `NEXCONN_APP_SECRET`. Leave `AI_API_KEY` blank unless unscripted AI dialogue has been configured and tested.
5. Apply the Blueprint and wait for the first build and health check.

The database uses Render's private connection string. `DATABASE_SSL=disable` is intentional only for that private Render connection; do not copy this setting to an external TLS-required database.

## 3. Verify the public release

Replace `APP_URL` with the public Render URL:

```bash
curl https://YOUR_APP.onrender.com/api/health
APP_URL=https://YOUR_APP.onrender.com npm run test:game
APP_URL=https://YOUR_APP.onrender.com npm run test:party
GAME_URL=https://YOUR_APP.onrender.com npm run test:browser
APP_URL=https://YOUR_APP.onrender.com npm run test:party-browser
APP_URL=https://YOUR_APP.onrender.com npm run test:nexconn
```

Expected health fields for a credential-complete release:

```json
{ "status": "ok", "storage": "postgres", "nexconnConfigured": true }
```

Then manually verify two separate devices/browsers:

- Both producer headers show **NEXCONN LIVE**.
- A new public moment appears promptly in the guest browser.
- Each producer sees only their own mission, whispers, DMs and ballot.
- A spectator sees only public channels and intentional twist receipts.
- Reload both producers and confirm the room resumes from PostgreSQL.

## 4. Operations

- Render health checks use `/api/health`.
- Room cleanup runs opportunistically. For scheduled cleanup, configure a daily HTTPS job calling `/api/cron/cleanup` with `Authorization: Bearer <CRON_SECRET>`.
- If the free web service spins down, open the app and wait for a cold start before recording or judging.
- Do not run multiple local-mode instances. Production correctness relies on the configured shared PostgreSQL database.

## 5. Final submission updates

Add the public app, repository and video URLs plus the Nexconn **App Key** (not App Secret) to `submission/SUBMISSION_DRAFT.md`, remove draft warnings, regenerate the PDF with `python submission/generate_writeup.py`, and review it before submitting.
