import { describe, test, expect, jest } from '@jest/globals';

// Mock pdf-parse so tests don't need real PDF files
jest.unstable_mockModule('pdf-parse', async () => ({
  default: jest.fn(),
}));

const pdfParse = (await import('pdf-parse')).default;
const { extractLabResults, toMemoryRecords } = await import('../../src/processors/lab-results.js');

describe('extractLabResults', () => {
  test('parses standard lab result lines', async () => {
    pdfParse.mockResolvedValue({
      text: [
        'PATIENT: Charles Aldarondo',
        '',
        'Glucose  95  mg/dL  65-99',
        'Hemoglobin  14.5  g/dL  13.5-17.5',
        'TSH  2.1  mIU/L  0.4-4.5',
        '',
        'Physician: Dr. Smith',
      ].join('\n'),
    });

    const results = await extractLabResults(Buffer.from('fake pdf'));

    expect(results.length).toBeGreaterThanOrEqual(3);
    const glucose = results.find(r => r.test === 'Glucose');
    expect(glucose).toBeDefined();
    expect(glucose.value).toBe('95');
    expect(glucose.unit).toBe('mg/dL');
    expect(glucose.range).toBe('65-99');
  });

  test('returns empty array for PDF with no matching lines', async () => {
    pdfParse.mockResolvedValue({ text: 'No results here.\nJust some text.' });
    const results = await extractLabResults(Buffer.from('x'));
    expect(results).toEqual([]);
  });
});

describe('toMemoryRecords', () => {
  const results = [
    { test: 'Glucose', value: '95', unit: 'mg/dL', range: '65-99' },
    { test: 'Hemoglobin A1C', value: '5.4', unit: '%', range: '< 5.7' },
  ];

  test('creates one memory record per result', () => {
    const records = toMemoryRecords(results, 'labs-2026-04-01.pdf', '2026-04-01');
    expect(records).toHaveLength(2);
  });

  test('uses snake_case key with lab: prefix', () => {
    const records = toMemoryRecords(results, 'labs.pdf', '2026-04-01');
    expect(records[0].key).toBe('lab:glucose');
    expect(records[1].key).toBe('lab:hemoglobin_a1c');
  });

  test('includes filename and date in value and tags', () => {
    const records = toMemoryRecords(results, 'labs.pdf', '2026-04-01');
    expect(records[0].value).toContain('2026-04-01');
    expect(records[0].tags).toContain('labs.pdf');
    expect(records[0].tags).toContain('lab');
    expect(records[0].tags).toContain('charles');
  });

  test('handles null range gracefully', () => {
    const withNull = [{ test: 'Vitamin D', value: '42', unit: 'ng/mL', range: null }];
    const records = toMemoryRecords(withNull, 'x.pdf', '2026-01-01');
    expect(records[0].value).toContain('N/A');
  });
});
