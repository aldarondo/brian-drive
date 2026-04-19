import { jest } from '@jest/globals';
import { imageTextToMemoryRecords } from '../../src/processors/images.js';

// extractImageText calls the Anthropic SDK — test that separately via integration tests
// Here we test the pure transform functions

describe('imageTextToMemoryRecords', () => {
  test('converts lines to memory records', () => {
    const records = imageTextToMemoryRecords('milk\nbread\neggs', 'list.jpg', '2026-04-19');
    expect(records).toHaveLength(3);
    expect(records[0].key).toContain('list_jpg');
    expect(records[0].value).toContain('milk');
    expect(records[0].tags).toContain('image');
    expect(records[0].tags).toContain('ocr');
  });

  test('filters blank lines', () => {
    const records = imageTextToMemoryRecords('milk\n\n  \nbread', 'notes.heic', '2026-04-19');
    expect(records).toHaveLength(2);
  });

  test('returns empty array for empty text', () => {
    expect(imageTextToMemoryRecords('', 'empty.jpg', '2026-04-19')).toEqual([]);
    expect(imageTextToMemoryRecords('   \n  \n', 'empty.jpg', '2026-04-19')).toEqual([]);
  });

  test('includes filename and date in value', () => {
    const records = imageTextToMemoryRecords('aspirin 81mg', 'meds.jpg', '2026-04-19');
    expect(records[0].value).toContain('meds.jpg');
    expect(records[0].value).toContain('2026-04-19');
  });

  test('includes filename in tags', () => {
    const records = imageTextToMemoryRecords('item', 'grocery.jpg', '2026-04-19');
    expect(records[0].tags).toContain('grocery.jpg');
  });

  test('uses today as fallback date when dateStr is missing', () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = imageTextToMemoryRecords('item', 'file.jpg');
    expect(records[0].value).toContain(today);
  });
});

describe('extractImageText — API key missing', () => {
  test('throws when ANTHROPIC_API_KEY is not set', async () => {
    const { extractImageText } = await import('../../src/processors/images.js');
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(extractImageText(Buffer.from('data'), 'image/jpeg')).rejects.toThrow('ANTHROPIC_API_KEY not set');
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  });
});
