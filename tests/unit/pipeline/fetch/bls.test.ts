import { describe, test, expect, mock, beforeEach } from 'bun:test';

function urlHostEndsWith(url: string, domain: string): boolean {
  try { const h = new URL(url).hostname; return h === domain || h.endsWith(`.${domain}`); }
  catch { return false; }
}

const writtenFiles: Record<string, any[]> = {};
let httpPostJsonCalls: { url: string; body: any }[] = [];
let httpPostJsonShouldFail = false;
let httpPostJsonResult: any = {};

mock.module('../../../../pipeline/lib/http', () => ({
  httpGetJson: async () => ({}),
  httpGetText: async () => '',
  httpGet: async () => new Response('', { status: 200 }),
  httpPost: async () => new Response('{}', { status: 200 }),
  httpPostJson: async (url: string, body: any, opts?: any) => {
    httpPostJsonCalls.push({ url, body });
    if (httpPostJsonShouldFail) return httpPostJsonResult;
    return {
      status: 'REQUEST_SUCCEEDED',
      Results: {
        series: [{
          seriesID: body?.seriesid?.[0] || 'test',
          data: [
            { year: '2024', period: 'M01', value: '3.5' },
            { year: '2024', period: 'M02', value: '3.6' },
            { year: '2024', period: 'M03', value: '3.4' },
            { year: '2024', period: 'M13', value: '3.5' },
            { year: '2024', period: 'M12', value: '3.3' },
          ],
        }],
      },
    };
  },
}));

mock.module('../../../../pipeline/lib/cache', () => ({
  loadCache: () => [],
  saveCache: (config: any, existing: any, newRows: any) => {
    writtenFiles[config.path] = newRows;
    return newRows;
  },
  getLatestDate: () => null,
  getIncrementalStart: () => null,
  log: () => {},
  warn: () => {},
}));

mock.module('../../../../pipeline/lib/dates', () => {
  const real = require('../../../../pipeline/lib/dates');
  return { ...real, sleep: async () => {} };
});

import { fetchBls } from '../../../../pipeline/fetch/bls';

describe('fetchBls', () => {
  beforeEach(() => {
    httpPostJsonCalls = [];
    httpPostJsonShouldFail = false;
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    process.env.BLS_API_KEY = 'test-bls-key';
  });

  test('BLS period M01-M12 parsing, skip M13', async () => {
    await fetchBls();

    const cacheKeys = Object.keys(writtenFiles);
    expect(cacheKeys.length).toBeGreaterThan(0);

    const firstCache = writtenFiles[cacheKeys[0]];
    const dataRows = firstCache.filter((r: any) => r.date && r.value !== undefined);
    expect(dataRows.length).toBe(4);

    const jan = dataRows.find((r: any) => r.date === '2024-01-01');
    expect(jan).toBeDefined();
    expect(jan.value).toBe(3.5);

    const dec = dataRows.find((r: any) => r.date === '2024-12-01');
    expect(dec).toBeDefined();
    expect(dec.value).toBe(3.3);

    const m13 = dataRows.find((r: any) => r.date?.includes('-13-'));
    expect(m13).toBeUndefined();
  });

  test('fetches all 4 counties', async () => {
    await fetchBls();

    const seriesIds = httpPostJsonCalls
      .filter(c => urlHostEndsWith(c.url, 'bls.gov'))
      .map(c => c.body?.seriesid?.[0]);
    expect(seriesIds).toContain('LAUCN484350000000003');
    expect(seriesIds).toContain('LAUCN484130000000003');
    expect(seriesIds).toContain('LAUCN481050000000003');
    expect(seriesIds).toContain('LAUCN482670000000003');
  });

  test('includes registrationkey when API key present', async () => {
    await fetchBls();

    expect(httpPostJsonCalls.length).toBeGreaterThan(0);
    expect(httpPostJsonCalls[0].body.registrationkey).toBe('test-bls-key');
  });

  test('handles API error gracefully', async () => {
    httpPostJsonShouldFail = true;
    httpPostJsonResult = {
      status: 'REQUEST_FAILED',
      message: ['Daily query limit exceeded'],
    };
    await fetchBls();
  });
});
