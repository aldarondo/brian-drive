/**
 * Lab results processor.
 * Extracts structured data from blood lab PDF files and returns
 * memory-ready records for brian-mem storage.
 *
 * Supported formats: standard Quest/LabCorp PDF layout
 */

import pdfParse from 'pdf-parse';

// Matches lines like: "Glucose  95  mg/dL  65-99"
const RESULT_LINE_RE = /^(.+?)\s{2,}([\d.,<>]+)\s{2,}(\S+)\s{2,}([\d.,\-<>]+\s*\S*)?/;

/**
 * Extract lab result rows from a PDF buffer.
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Array<{test, value, unit, range}>>}
 */
export async function extractLabResults(pdfBuffer) {
  const { text } = await pdfParse(pdfBuffer);
  const results = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    const match = trimmed.match(RESULT_LINE_RE);
    if (!match) continue;
    const [, test, value, unit, range] = match;
    results.push({
      test: test.trim(),
      value: value.trim(),
      unit: unit.trim(),
      range: range?.trim() ?? null,
    });
  }
  return results;
}

/**
 * Convert extracted lab results into brian-mem memory records.
 * @param {Array} results - from extractLabResults()
 * @param {string} filename - original PDF filename (used as source tag)
 * @param {string} [dateStr] - ISO date string of the lab draw
 * @returns {Array<{key, value, tags}>}
 */
export function toMemoryRecords(results, filename, dateStr) {
  return results.map(r => ({
    key: `lab:${r.test.toLowerCase().replace(/\s+/g, '_')}`,
    value: `${r.value} ${r.unit} (range: ${r.range ?? 'N/A'}) — ${dateStr ?? 'unknown date'}`,
    tags: ['lab', 'health', 'charles', filename],
  }));
}
