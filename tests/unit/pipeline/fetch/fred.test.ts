import { describe, test, expect, mock, beforeEach } from 'bun:test';

const writtenFiles: Record<string, any[]> = {};
let httpGetJsonCalls: { url: string }[] = [];
let httpGetJsonShouldFail = false;

mock.module('../../../../pipeline/lib/http', () => ({
  httpGetJson: async (url: string, opts?: any) => {
    httpGetJsonCalls.push({ url });
    if (httpGetJsonShouldFail) throw new Error('HTTP 404');
    return {
      observations: [
        { date: '2024-06-01', value: '5.5' },
        { date: '2024-06-02', value: '5.6' },
        { date: '2024-06-03', value: '.' },
      ],
    };
  },
  httpGetText: async () => '',
  httpGet: async () => new Response('', { status: 200 }),
  httpPost: async () => new Response('{}', { status: 200 }),
  httpPostJson: async () => ({}),
}));

mock.module('../../../../pipeline/lib/cache', () => ({
  loadCache: () => [],
  saveCache: (config: any, existing: any, newRows: any) => {
    writtenFiles[config.path] = newRows;
    return newRows;
  },
  getIncrementalStart: () => null,
  log: () => {},
  warn: () => {},
}));

mock.module('../../../../pipeline/lib/dates', () => {
  const real = require('../../../../pipeline/lib/dates');
  return { ...real, sleep: async () => {} };
});

import { fetchFred } from '../../../../pipeline/fetch/fred';

describe('fetchFred', () => {
  beforeEach(() => {
    httpGetJsonCalls = [];
    httpGetJsonShouldFail = false;
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    process.env.FRED_API_KEY = 'test-key-123';
  });

  test('correct FRED API URL construction', async () => {
    await fetchFred();

    expect(httpGetJsonCalls.length).toBeGreaterThan(0);
    const firstCall = httpGetJsonCalls[0].url;
    expect(firstCall).toContain('https://api.stlouisfed.org/fred/series/observations');
    expect(firstCall).toContain('api_key=test-key-123');
    expect(firstCall).toContain('file_type=json');
  });

  test('filters out value="." entries', async () => {
    await fetchFred();

    const cacheKeys = Object.keys(writtenFiles);
    expect(cacheKeys.length).toBeGreaterThan(0);

    for (const key of cacheKeys) {
      const rows = writtenFiles[key];
      for (const row of rows) {
        if (row.value !== undefined) {
          expect(typeof row.value).toBe('number');
        }
      }
    }
  });

  test('skips without API key', async () => {
    delete process.env.FRED_API_KEY;
    await fetchFred();
    expect(httpGetJsonCalls).toHaveLength(0);
  });

  test('handles API failure gracefully', async () => {
    httpGetJsonShouldFail = true;
    await fetchFred();
    // Should not throw
  });
});
