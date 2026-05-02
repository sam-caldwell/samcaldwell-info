import { describe, test, expect, mock, beforeEach } from 'bun:test';

const writtenFiles: Record<string, any[]> = {};
let httpCalls: { url: string; opts?: any }[] = [];

mock.module('../../../../pipeline/lib/http', () => ({
  httpGet: mock(async (url: string, opts?: any) => {
    httpCalls.push({ url, opts });
    return new Response(JSON.stringify({
      count: { relevant: 1500, total: 50000 },
    }), { status: 200 });
  }),
  httpGetJson: mock(async (url: string, opts?: any) => {
    httpCalls.push({ url, opts });
    return { count: { relevant: 1500, total: 50000 } };
  }),
  httpGetText: mock(async (url: string, opts?: any) => {
    httpCalls.push({ url, opts });
    return JSON.stringify({ count: { relevant: 1500, total: 50000 } });
  }),
  httpPost: mock(async (url: string, body: any, opts?: any) => {
    httpCalls.push({ url, opts });
    return new Response('{}', { status: 200 });
  }),
  httpPostJson: mock(async (url: string, body: any, opts?: any) => {
    httpCalls.push({ url, opts });
    return {};
  }),
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

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: mock(() => []),
  writeCsv: mock((path: string, rows: any[]) => { writtenFiles[path] = rows; }),
  round: (v: number | null, d: number) => v === null ? null : Math.round(v * 10 ** d) / 10 ** d,
  parseCsvText: mock(() => []),
}));

mock.module('../../../../pipeline/lib/dates', () => ({
  sleep: mock(async () => {}),
  today: () => new Date('2026-05-01T00:00:00Z'),
  formatDate: (d: Date) => d.toISOString().slice(0, 10),
  parseDate: (s: string) => new Date(s + 'T00:00:00Z'),
  addDays: (d: Date, n: number) => { const r = new Date(d); r.setUTCDate(r.getUTCDate() + n); return r; },
  addMonths: (d: Date, n: number) => { const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + n); return r; },
  utcDate: (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)),
  year: (d: Date) => d.getUTCFullYear(),
  month: (d: Date) => d.getUTCMonth() + 1,
  monthRange: (start: Date, end: Date) => {
    const result: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      result.push(new Date(cur));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return result;
  },
}));

import { fetchMediacloud } from '../../../../pipeline/fetch/mediacloud';

describe('fetchMediacloud', () => {
  beforeEach(() => {
    httpCalls = [];
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    process.env.MEDIA_CLOUD_API_KEY = 'mc-test-token';
  });

  test('Media Cloud auth header includes token', async () => {
    await fetchMediacloud();

    expect(httpCalls.length).toBeGreaterThan(0);
    const firstCall = httpCalls[0];
    // The httpGetJson is called with opts that include headers
    expect(firstCall.opts?.headers?.Authorization).toBe('Token mc-test-token');
  });

  test('monthly iteration produces correct date format', async () => {
    await fetchMediacloud();

    const cacheKeys = Object.keys(writtenFiles);
    expect(cacheKeys.length).toBeGreaterThan(0);

    const rows = writtenFiles[cacheKeys[0]];
    if (rows.length > 0) {
      expect(rows[0]).toHaveProperty('year');
      expect(rows[0]).toHaveProperty('month');
      expect(rows[0]).toHaveProperty('date');
      expect(rows[0]).toHaveProperty('relevant');
      expect(rows[0]).toHaveProperty('total');
      expect(rows[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test('skips without API key', async () => {
    delete process.env.MEDIA_CLOUD_API_KEY;
    await fetchMediacloud();
    expect(httpCalls).toHaveLength(0);
  });
});
