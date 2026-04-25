/**
 * Google Drive watcher — polls a folder for new files and downloads them.
 * Uses a Service Account (no user OAuth required).
 */

import { google } from 'googleapis';
import fs from 'fs';

function getAuth() {
  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const base64   = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;

  let credentials;
  if (jsonPath && fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf8').trim();
    if (!raw || raw === '{}') return null;
    credentials = JSON.parse(raw);
  } else if (base64) {
    credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  } else {
    return null;
  }

  if (!credentials.client_email) return null;

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
}

export function getDriveClient() {
  const auth = getAuth();
  if (!auth) return null;
  return google.drive({ version: 'v3', auth });
}

/**
 * List files in the watched folder modified after a given timestamp.
 * @param {object} drive - Drive client from getDriveClient()
 * @param {string} folderId
 * @param {string} [afterIso] - ISO timestamp; only return files newer than this
 * @returns {Promise<Array>}
 */
export async function listNewFiles(drive, folderId, afterIso) {
  const q = [`'${folderId}' in parents`, 'trashed = false'];
  if (afterIso) q.push(`modifiedTime > '${afterIso}'`);

  const { data } = await drive.files.list({
    q: q.join(' and '),
    fields: 'files(id,name,mimeType,modifiedTime,size)',
    orderBy: 'modifiedTime asc',
  });
  return data.files ?? [];
}

/**
 * Download a file's content as a Buffer.
 * @param {object} drive
 * @param {string} fileId
 * @returns {Promise<Buffer>}
 */
export async function downloadFile(drive, fileId) {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(response.data);
}
