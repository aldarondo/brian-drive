/**
 * Processor for plain-text files containing line-delimited lists.
 * Handles: grocery lists, supplement lists, to-do items.
 *
 * Quantity prefix patterns: "2x item", "2 item", "item x2"
 * Comment lines (# ...) and blank lines are skipped.
 */

const QTY_PREFIX_RE = /^(\d+(?:\.\d+)?)\s*[xX]?\s+(.+)$/;
const QTY_SUFFIX_RE = /^(.+?)\s+[xX](\d+(?:\.\d+)?)$/;

export function extractTextList(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let currentCategory = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      if (line.startsWith('#')) {
        currentCategory = line.replace(/^#+\s*/, '').trim() || null;
      }
      continue;
    }

    // Strip leading list markers: "- item", "* item", "1. item"
    const stripped = line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '');

    let name = stripped;
    let quantity = null;

    const prefixMatch = stripped.match(QTY_PREFIX_RE);
    const suffixMatch = stripped.match(QTY_SUFFIX_RE);

    if (prefixMatch) {
      quantity = parseFloat(prefixMatch[1]);
      name = prefixMatch[2].trim();
    } else if (suffixMatch) {
      name = suffixMatch[1].trim();
      quantity = parseFloat(suffixMatch[2]);
    }

    items.push({ name, quantity, category: currentCategory });
  }

  return items;
}

export function textListToMemoryRecords(items, filename, dateStr) {
  const listName = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  return items.map(item => ({
    type: 'list_item',
    source: filename,
    date: dateStr || new Date().toISOString().slice(0, 10),
    list_name: listName,
    item: item.name,
    quantity: item.quantity,
    category: item.category,
    content: item.quantity ? `${item.quantity}x ${item.name}` : item.name,
  }));
}
