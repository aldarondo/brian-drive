/**
 * brian-drive webhook mode.
 * Receives Google Drive Push Notifications and processes new files immediately,
 * rather than polling every N seconds.
 *
 * Setup:
 *   1. Set WEBHOOK_URL=https://your-public-url.example.com/webhook in .env
 *      (Cloudflare Tunnel is the recommended option for Synology NAS)
 *   2. Run this file: node src/webhook.js
 *   3. It registers a Drive watch on startup and auto-renews every 23 hours.
 *
 * Required env vars (same as polling mode) plus:
 *   WEBHOOK_URL   — Public HTTPS URL that Google can reach (your Tunnel URL)
 *   WEBHOOK_PORT  — Local HTTP port (default: 8776)
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getDriveClient, listNewFiles, downloadFile } from './drive.js';
import { extractLabResults, toMemoryRecords } from './processors/lab-results.js';
import { extractTextList, textListToMemoryRecords } from './processors/text-lists.js';
import { extractImageText, imageTextToMemoryRecords } from './processors/images.js';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '..', 'data', 'webhook-state.json');
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);

const FOLDER_ID    = process.env.WATCH_FOLDER_ID;
const WEBHOOK_URL  = process.env.WEBHOOK_URL;
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '8776', 10);
const BRIAN_MEM_URL = process.env.BRIAN_MEM_URL || 'http://localhost:3001';

if (!FOLDER_ID) throw new Error('WATCH_FOLDER_ID is required');
if (!WEBHOOK_URL) throw new Error('WEBHOOK_URL is required (e.g. https://yourtunnel.example.com/webhook)');

// ── State persistence ─────────────────────────────────────────────────────────

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); }
  catch { return { lastCheckedAt: new Date(0).toISOString(), channelId: null, resourceId: null, expiration: 0 }; }
}

function saveState(state) {
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = loadState();

// ── Drive watch management ────────────────────────────────────────────────────

async function registerWatch() {
  const drive = getDriveClient();
  const channelId = randomUUID();
  const expirationMs = Date.now() + 23 * 60 * 60 * 1000; // 23 hours from now

  try {
    const { data } = await drive.files.watch({
      fileId: FOLDER_ID,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: WEBHOOK_URL,
        expiration: expirationMs,
      },
    });

    state.channelId  = data.id;
    state.resourceId = data.resourceId;
    state.expiration = parseInt(data.expiration || expirationMs, 10);
    saveState(state);

    console.log(`[webhook] Watch registered — channel: ${data.id}, expires: ${new Date(state.expiration).toISOString()}`);
  } catch (err) {
    console.error(`[webhook] Watch registration failed: ${err.message}`);
    console.error('[webhook] Ensure the service account has Drive read access and WEBHOOK_URL is publicly reachable.');
  }
}

async function stopWatch() {
  if (!state.channelId || !state.resourceId) return;
  try {
    const drive = getDriveClient();
    await drive.channels.stop({
      requestBody: { id: state.channelId, resourceId: state.resourceId },
    });
    console.log('[webhook] Watch stopped.');
  } catch {
    // Best-effort stop
  }
}

// Auto-renew 1 hour before expiry
setInterval(async () => {
  const renewAt = state.expiration - 60 * 60 * 1000;
  if (Date.now() >= renewAt) {
    console.log('[webhook] Renewing Drive watch...');
    await registerWatch();
  }
}, 15 * 60 * 1000); // check every 15 min

// ── Memory storage ────────────────────────────────────────────────────────────

async function storeMemory(record) {
  return new Promise((resolve) => {
    const body = JSON.stringify(record);
    const url  = new URL('/memory', BRIAN_MEM_URL);
    const req  = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', () => resolve(null));
    req.write(body);
    req.end();
  });
}

// ── File processor ────────────────────────────────────────────────────────────

async function processFile(drive, file) {
  console.log(`[webhook] Processing: ${file.name} (${file.mimeType})`);

  if (file.mimeType === 'application/pdf') {
    const buffer = await downloadFile(drive, file.id);
    const results = await extractLabResults(buffer);
    if (!results.length) return;
    const records = toMemoryRecords(results, file.name, file.modifiedTime?.slice(0, 10));
    for (const rec of records) await storeMemory(rec);
    console.log(`[webhook] Stored ${records.length} lab results from ${file.name}`);

  } else if (file.mimeType === 'text/plain') {
    const buffer = await downloadFile(drive, file.id);
    const items = extractTextList(buffer.toString('utf8'));
    if (!items.length) return;
    const records = textListToMemoryRecords(items, file.name, file.modifiedTime?.slice(0, 10));
    for (const rec of records) await storeMemory(rec);
    console.log(`[webhook] Stored ${records.length} list items from ${file.name}`);

  } else if (IMAGE_TYPES.has(file.mimeType)) {
    const buffer = await downloadFile(drive, file.id);
    let text;
    try { text = await extractImageText(buffer, file.mimeType); }
    catch (err) { console.log(`[webhook] Image OCR skipped for ${file.name}: ${err.message}`); return; }
    if (!text) return;
    const records = imageTextToMemoryRecords(text, file.name, file.modifiedTime?.slice(0, 10));
    for (const rec of records) await storeMemory(rec);
    console.log(`[webhook] Stored ${records.length} image text records from ${file.name}`);

  } else {
    console.log(`[webhook] Unhandled file type: ${file.mimeType} — ${file.name}`);
  }
}

// ── Webhook handler ───────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
  // Validate Google-Drive-specific headers
  const resourceState = req.headers['x-goog-resource-state'];
  const channelId     = req.headers['x-goog-channel-id'];

  if (channelId !== state.channelId) {
    // Stale channel — ignore silently
    return res.sendStatus(200);
  }

  // Acknowledge immediately (Drive requires a quick 200)
  res.sendStatus(200);

  if (resourceState === 'sync') return; // initial sync ping, no action needed
  if (resourceState !== 'change' && resourceState !== 'update') return;

  // Scan folder for new files since last check
  try {
    const drive = getDriveClient();
    const files = await listNewFiles(drive, FOLDER_ID, state.lastCheckedAt);
    state.lastCheckedAt = new Date().toISOString();
    saveState(state);

    for (const file of files) {
      await processFile(drive, file).catch(err =>
        console.error(`[webhook] Error processing ${file.name}:`, err.message)
      );
    }
    if (files.length > 0) console.log(`[webhook] Processed ${files.length} new file(s)`);
  } catch (err) {
    console.error('[webhook] Scan error:', err.message);
  }
});

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  channel: state.channelId,
  expires: new Date(state.expiration).toISOString(),
  lastCheckedAt: state.lastCheckedAt,
}));

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(WEBHOOK_PORT, async () => {
  console.log(`[webhook] HTTP server listening on port ${WEBHOOK_PORT}`);
  console.log(`[webhook] Webhook URL: ${WEBHOOK_URL}`);
  await registerWatch();
});

process.on('SIGINT',  async () => { await stopWatch(); process.exit(0); });
process.on('SIGTERM', async () => { await stopWatch(); process.exit(0); });
