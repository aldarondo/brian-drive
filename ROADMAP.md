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

### Enhancements
- [x] `[Code]` 2026-04-19 — Add processor for `.heic`/`.jpg`/`.png` image files — Claude Vision OCR via `@anthropic-ai/sdk`; requires `ANTHROPIC_API_KEY` env var; skips gracefully if not set
- [x] `[Code]` 2026-04-19 — Add processor for plain-text grocery or supplement lists (`src/processors/text-lists.js`)
- [x] `[Code]` 2026-04-19 — Persist `lastCheckedAt` to disk — survive container restarts without reprocessing old files (`data/state.json`)
- [x] `[Code]` 2026-04-19 — Webhook mode (`src/webhook.js`): Google Drive Push Notifications → immediate processing; auto-renews watch every 23h; `/health` endpoint; `npm run webhook` to start; requires `WEBHOOK_URL` (Cloudflare Tunnel recommended) and `WEBHOOK_PORT` env vars

## ✅ Completed
- [x] 2026-04-19 — Scaffolded: Drive watcher (Service Account auth, file polling, download), lab-results PDF processor, memory record conversion, unit tests

## 🚫 Blocked
<!-- log blockers here -->
