# brian-drive

## Project Purpose
Synology Container service (not an MCP server). Polls a dedicated Google Drive folder, detects new files, processes them by type, and stores structured results in brian-mem. First use case: parse blood lab work PDFs → store results so Brian family skills can query them.

## Architecture
```
Google Drive (watch folder)
  → poll every 60s via Service Account
  → detect new files
  → route by MIME type to processor (PDF → lab-results, ...)
  → store parsed records in brian-mem via HTTP POST /memory
```

## Key Commands
```bash
npm install          # install dependencies
npm start            # run watcher (long-running process)
npm test             # run unit tests
docker compose up -d
docker compose logs -f
```

## Setup
1. Create a Google Service Account in the Brian Google project (IAM)
2. Download the JSON key file → mount at /run/secrets/google-sa.json in Docker
3. Share the watched Drive folder with the service account email address
4. Set WATCH_FOLDER_ID in .env (from the folder URL)

## Testing Requirements
- Unit tests for all processors in `tests/unit/`
- Jest with unstable_mockModule — no real Drive calls or PDF I/O in tests
- Run: `npm test`

## After Every Completed Task
- Move task to ✅ Completed in ROADMAP.md with today's date

## Git Rules
- Never create pull requests. Push directly to main.
- solo/auto-push OK

@~/Documents/GitHub/CLAUDE.md
