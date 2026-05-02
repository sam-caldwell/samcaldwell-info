import { describe, test, expect, mock, beforeEach } from 'bun:test';

const writtenFiles: Record<string, any[]> = {};
let httpGetTextCalls: { url: string }[] = [];
let httpGetTextResult: string = '';

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: () => [],
  writeCsv: (path: string, rows: any[], cols?: string[]) => { writtenFiles[path] = rows; },
  round: (v: number | null | undefined, d: number) => {
    if (v === null || v === undefined || !isFinite(v)) return null;
    const f = Math.pow(10, d);
    return Math.round(v * f) / f;
  },
  parseCsvText: () => [],
}));

mock.module('../../../../pipeline/lib/http', () => ({
  httpGetJson: async () => ({}),
  httpGetText: async (url: string, opts?: any) => {
    httpGetTextCalls.push({ url });
    return httpGetTextResult;
  },
  httpGet: async () => new Response('', { status: 200 }),
  httpPost: async () => new Response('{}', { status: 200 }),
  httpPostJson: async () => ({}),
}));

mock.module('../../../../pipeline/lib/cache', () => ({
  loadCache: mock(() => []),
  saveCache: mock((config: any, existing: any, newRows: any) => {
    writtenFiles[config.path] = newRows;
    return newRows;
  }),
  getLatestDate: mock(() => null),
  getIncrementalStart: mock(() => null),
  log: mock(() => {}),
  warn: mock(() => {}),
}));

mock.module('../../../../pipeline/lib/dates', () => ({
  sleep: mock(async () => {}),
  today: () => new Date('2026-05-01T00:00:00Z'),
  formatDate: (d: Date) => d.toISOString().slice(0, 10),
  parseDate: (s: string) => new Date(s + 'T00:00:00Z'),
  addDays: (d: Date, n: number) => { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; },
  addMonths: (d: Date, n: number) => { const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + n); return r; },
}));

mock.module('fs', () => ({
  existsSync: () => false,
  mkdirSync: () => {},
}));

import { fetchGdelt } from '../../../../pipeline/fetch/gdelt';

describe('fetchGdelt', () => {
  beforeEach(() => {
    httpGetTextCalls = [];
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];

    httpGetTextResult = JSON.stringify({
      timeline: [{
        data: [
          { date: '20240615T000000Z', value: -2.5, norm: 12500 },
          { date: '20240616T000000Z', value: -1.8, norm: 13000 },
        ],
      }],
    });
  });

  test('GDELT URL includes timelinetone mode and date params', async () => {
    await fetchGdelt();

    expect(httpGetTextCalls.length).toBeGreaterThanOrEqual(1);
    const firstCall = httpGetTextCalls[0].url;
    expect(firstCall).toContain('api.gdeltproject.org');
    expect(firstCall).toContain('timelinetone');
    expect(firstCall).toContain('startdatetime');
    expect(firstCall).toContain('enddatetime');
  });

  test('tone/volume parsing from GDELT response', async () => {
    await fetchGdelt();

    const cacheKeys = Object.keys(writtenFiles);
    expect(cacheKeys.length).toBeGreaterThan(0);

    const rows = writtenFiles[cacheKeys[0]];
    expect(rows.length).toBeGreaterThan(0);

    // Dates converted from YYYYMMDD to YYYY-MM-DD
    expect(rows[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rows[0].date).toBe('2024-06-15');
    expect(rows[0].tone).toBe(-2.5);
    expect(rows[0].volume).toBe(12500);
  });

  test('handles non-JSON response gracefully', async () => {
    httpGetTextResult = 'Rate limit exceeded - please try again later';
    await fetchGdelt();
    // Should not throw; just logs a warning and returns empty
  });
});
