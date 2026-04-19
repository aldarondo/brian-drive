# brian-drive

Synology container service that watches a dedicated Google Drive folder and processes dropped files by type. First use case: blood lab PDFs → parsed results stored in brian-mem.

## Features
- Polls Google Drive every 60s via Service Account (no user OAuth needed)
- Routes files by MIME type to per-type processors (PDF, image, text list)
- Image OCR via Claude Vision (HEIC, JPG, PNG)
- Webhook mode for immediate processing via Google Drive Push Notifications
- Persists last-checked state across container restarts

## Tech Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Drive API | googleapis (Service Account) |
| PDF parsing | pdf-parse |
| Image OCR | @anthropic-ai/sdk (Claude Vision) |
| Container | Docker Compose |
| Memory store | brian-mem (HTTP POST /memory) |

## Getting Started

```bash
npm install

# Copy and fill env vars
cp .env.example .env

# Run locally (polling mode)
npm start

# Run in webhook mode
npm run webhook

# Run tests
npm test

# Deploy on NAS
docker compose up -d
docker compose logs -f
```

## Setup

1. Create a Google Service Account in the Brian Google project (IAM)
2. Download the JSON key → mount at `/run/secrets/google-sa.json` in Docker
3. Share the watched Drive folder with the service account email address
4. Set `WATCH_FOLDER_ID` in `.env` (copy from the folder URL)
5. Optionally set `ANTHROPIC_API_KEY` to enable image OCR
6. Optionally set `WEBHOOK_URL` + `WEBHOOK_PORT` to enable webhook mode

## Project Status
Active development. See [ROADMAP.md](ROADMAP.md) for what's planned.

---
**Publisher:** Xity Software, LLC
