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
- [ ] `[Code]` Add GHCR build-push workflow — migrate container from `node:20-alpine` to a versioned GHCR image (`ghcr.io/aldarondo/...`) with GitHub Actions auto-deploy
- [ ] `[Code]` Add weekly scheduled rebuild — GitHub Actions `schedule: cron` to repull and push a fresh image every week, picking up base-image security patches

### Enhancements
- [x] `[Code]` 2026-04-19 — Add processor for `.heic`/`.jpg`/`.png` image files — Claude Vision OCR via `@anthropic-ai/sdk`; requires `ANTHROPIC_API_KEY` env var; skips gracefully if not set
- [x] `[Code]` 2026-04-19 — Add processor for plain-text grocery or supplement lists (`src/processors/text-lists.js`)
- [x] `[Code]` 2026-04-19 — Persist `lastCheckedAt` to disk — survive container restarts without reprocessing old files (`data/state.json`)
- [x] `[Code]` 2026-04-19 — Webhook mode (`src/webhook.js`): Google Drive Push Notifications → immediate processing; auto-renews watch every 23h; `/health` endpoint; `npm run webhook` to start; requires `WEBHOOK_URL` (Cloudflare Tunnel recommended) and `WEBHOOK_PORT` env vars

## ✅ Completed
- [x] 2026-04-19 — Scaffolded: Drive watcher (Service Account auth, file polling, download), lab-results PDF processor, memory record conversion, unit tests

## 🚫 Blocked
- ❌ [docker-monitor:deploy-failed] GitHub Actions deploy failed (run #24853736483) — https://github.com/aldarondo/brian-drive/actions/runs/24853736483 — 2026-04-23 21:29 UTC
- ❌ [docker-monitor:container-stopped] Container `brian-drive` is not running on the NAS — check `docker logs brian-drive` and restart — 2026-04-23 08:42 UTC
- ❌ [docker-monitor:no-ghcr-image] Container `brian-drive` uses `node:20-alpine` — migrate to `ghcr.io/aldarondo/...` with a GitHub Actions build-push workflow — 2026-04-20 16:57 UTC
<!-- log blockers here -->
