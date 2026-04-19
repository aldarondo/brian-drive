/**
 * Image file processor.
 * Extracts text from HEIC/JPG/PNG files using Claude Vision.
 * Falls back gracefully if ANTHROPIC_API_KEY is not set.
 *
 * Supported MIME types: image/heic, image/heif, image/jpeg, image/png
 */

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

const EXTRACT_PROMPT =
  'Extract all readable text from this image. If this appears to be a list (shopping list, ' +
  'medication list, grocery list, etc.), return each item on its own line. ' +
  'If it is a document or note, return the full text verbatim. ' +
  'Return only the extracted text — no commentary.';

/**
 * Extract text from an image buffer using Claude Vision.
 * @param {Buffer} buffer - raw image bytes
 * @param {string} mimeType - e.g. "image/jpeg"
 * @returns {Promise<string>} extracted text
 */
export async function extractImageText(buffer, mimeType) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set — cannot process image files');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const mediaType = mimeType === 'image/heif' ? 'image/heic' : mimeType;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: buffer.toString('base64'),
          },
        },
        { type: 'text', text: EXTRACT_PROMPT },
      ],
    }],
  });

  return response.content[0]?.text?.trim() ?? '';
}

/**
 * Convert extracted image text into brian-mem memory records.
 * Treats each non-empty line as a separate record.
 * @param {string} text - raw extracted text
 * @param {string} filename - original filename (used as source tag)
 * @param {string} [dateStr] - ISO date of the file
 * @returns {Array<{key, value, tags}>}
 */
export function imageTextToMemoryRecords(text, filename, dateStr) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const date = dateStr ?? new Date().toISOString().slice(0, 10);

  return lines.map((line, i) => ({
    key: `image_text:${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${i}`,
    value: `${line} — from ${filename} (${date})`,
    tags: ['image', 'ocr', filename],
  }));
}
