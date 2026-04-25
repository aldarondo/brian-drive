/**
 * brian-drive — Google Drive watcher + file processor.
 * Polls a watched folder on a dedicted Google Drive, processes new files
 * by type, and writes structured results to brian-mem.
 *
 * Runs as a persistent process (not an MCP server — no stdio needed).
 */

import './logger.js';
import { getDriveClient, listNewFiles, downloadFile } from './drive.js';
import { extractLabResults, toMemoryRecords } from './processors/lab-results.js';
import { extractTextList, textListToMemoryRecords } from './processors/text-lists.js';
import { extractImageText, imageTextToMemoryRecords } from './processors/images.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/heic', 'image/heif']);
import https from 'https';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FOLDER_ID      = process.env.WATCH_FOLDER_ID;
const POLL_INTERVAL  = parseInt(process.env.POLL_INTERVAL_SECONDS || '60', 10) * 1000;
const BRIAN_MEM_URL  = process.env.BRIAN_MEM_URL || 'http://localhost:3001';
const STATE_FILE     = join(__dirname, '..', 'data', 'state.json');

if (!FOLDER_ID) {
  console.warn('[brian-drive] WATCH_FOLDER_ID is not set — set it in .env and restart. Polling will be skipped until configured.');
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastCheckedAt: new Date(Date.now() - POLL_INTERVAL).toISOString() };
  }
}

function saveState(state) {
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let lastCheckedAt = loadState().lastCheckedAt;

async function storeMemory(record) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(record);
    const url  = new URL('/memory', BRIAN_MEM_URL);
    const req  = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function processFile(drive, file) {
  console.log(`[brian-drive] Processing: ${file.name} (${file.mimeType})`);

  if (file.mimeType === 'application/pdf') {
    const buffer = await downloadFile(drive, file.id);
    const results = await extractLabResults(buffer);
    if (!results.length) {
      console.log(`[brian-drive] No lab results found in ${file.name}`);
      return;
    }
    const records = toMemoryRecords(results, file.name, file.modifiedTime?.slice(0, 10));
    for (const rec of records) {
      await storeMemory(rec);
    }
    console.log(`[brian-drive] Stored ${records.length} lab results from ${file.name}`);
  } else if (file.mimeType === 'text/plain') {
    const buffer = await downloadFile(drive, file.id);
    const items = extractTextList(buffer.toString('utf8'));
    if (!items.length) {
      console.log(`[brian-drive] No list items found in ${file.name}`);
      return;
    }
    const records = textListToMemoryRecords(items, file.name, file.modifiedTime?.slice(0, 10));
    for (const rec of records) {
      await storeMemory(rec);
    }
    console.log(`[brian-drive] Stored ${records.length} list items from ${file.name}`);
  } else if (IMAGE_TYPES.has(file.mimeType)) {
    const buffer = await downloadFile(drive, file.id);
    let text;
    try {
      text = await extractImageText(buffer, file.mimeType);
    } catch (err) {
      console.log(`[brian-drive] Image OCR skipped for ${file.name}: ${err.message}`);
      return;
    }
    if (!text) {
      console.log(`[brian-drive] No text found in image ${file.name}`);
      return;
    }
    const records = imageTextToMemoryRecords(text, file.name, file.modifiedTime?.slice(0, 10));
    for (const rec of records) {
      await storeMemory(rec);
    }
    console.log(`[brian-drive] Stored ${records.length} text records from image ${file.name}`);
  } else {
    console.log(`[brian-drive] Unhandled file type: ${file.mimeType} — ${file.name}`);
  }
}

async function poll() {
  try {
    if (!FOLDER_ID) {
      console.warn('[brian-drive] WATCH_FOLDER_ID not set — skipping poll.');
      return;
    }
    const drive = getDriveClient();
    if (!drive) {
      console.warn('[brian-drive] No valid service account credentials — set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_BASE64. Skipping poll.');
      return;
    }
    const files = await listNewFiles(drive, FOLDER_ID, lastCheckedAt);
    lastCheckedAt = new Date().toISOString();
    saveState({ lastCheckedAt });

    for (const file of files) {
      await processFile(drive, file).catch(err =>
        console.error(`[brian-drive] Error processing ${file.name}:`, err.message)
      );
    }
    if (files.length > 0) {
      console.log(`[brian-drive] Processed ${files.length} new file(s)`);
    }
  } catch (err) {
    console.error('[brian-drive] Poll error:', err.message);
  }
}

console.log(`[brian-drive] Watching folder ${FOLDER_ID}, poll interval ${POLL_INTERVAL / 1000}s`);
poll();
setInterval(poll, POLL_INTERVAL);
