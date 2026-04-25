# brian-drive Roadmap
> Tag key: `[Code]` = Claude Code · `[Cowork]` = Claude Cowork · `[Human]` = Charles must act

## 🔄 In Progress
<!-- nothing active -->

## 🔲 Backlog

### Deployment
- [ ] `[Human]` Create Google Service Account in the Brian Google project; download JSON key
- [ ] `[Human]` Share the lab results Drive folder with the service account email
- [ ] `[Human]` Set WATCH_FOLDER_ID and mount service account JSON into Docker
- [x] `[Code]` 2026-04-19 — Files deployed to NAS at `/volume1/docker/brian-drive/`; blocked from starting until `google-sa.json` placed there by `[Human]`
- [ ] `[Code]` Verify end-to-end: drop a PDF in the Drive folder, confirm brian-mem receives the records

### Build & Infrastructure
- [x] `[Code]` 2026-04-24 — Fix Docker build: regenerate `package-lock.json` to include `@anthropic-ai/sdk` — lock file was out of sync, causing `npm ci` to fail in CI
- [x] `[Code]` 2026-04-23 — Add GHCR build-push workflow — migrate container from `node:20-alpine` to a versioned GHCR image (`ghcr.io/aldarondo/...`) with GitHub Actions auto-deploy
- [x] `[Code]` 2026-04-23 — Add weekly scheduled rebuild — GitHub Actions `schedule: cron` to repull and push a fresh image every week, picking up base-image security patches

### Enhancements
- [x] `[Code]` 2026-04-19 — Add processor for `.heic`/`.jpg`/`.png` image files — Claude Vision OCR via `@anthropic-ai/sdk`; requires `ANTHROPIC_API_KEY` env var; skips gracefully if not set
- [x] `[Code]` 2026-04-19 — Add processor for plain-text grocery or supplement lists (`src/processors/text-lists.js`)
- [x] `[Code]` 2026-04-19 — Persist `lastCheckedAt` to disk — survive container restarts without reprocessing old files (`data/state.json`)
- [x] `[Code]` 2026-04-19 — Webhook mode (`src/webhook.js`): Google Drive Push Notifications → immediate processing; auto-renews watch every 23h; `/health` endpoint; `npm run webhook` to start; requires `WEBHOOK_URL` (Cloudflare Tunnel recommended) and `WEBHOOK_PORT` env vars

## ✅ Completed
- [x] 2026-04-23 — GHCR build-push workflow and weekly scheduled rebuild added to `.github/workflows/build.yml`; Dockerfile updated to `node:22-alpine`
- [x] 2026-04-19 — Scaffolded: Drive watcher (Service Account auth, file polling, download), lab-results PDF processor, memory record conversion, unit tests

## 🚫 Blocked
- ❌ [docker-monitor:container-stopped] Container `brian-drive` is not running on the NAS — check `docker logs brian-drive` and restart — 2026-04-25 08:00 UTC
<!-- log blockers here -->
