import { describe, test, expect, mock, beforeEach } from 'bun:test';

const writtenFiles: Record<string, any[]> = {};
let httpGetJsonCalls: { url: string }[] = [];

mock.module('../../../../pipeline/lib/http', () => ({
  httpGetJson: async (url: string, opts?: any) => {
    httpGetJsonCalls.push({ url });
    return {
      BEAAPI: {
        Results: {
          Data: [
            { GeoFips: '48435', GeoName: 'Sutton, TX', TimePeriod: '2022', DataValue: '45,000' },
            { GeoFips: '48413', GeoName: 'Schleicher, TX', TimePeriod: '2022', DataValue: '38,500' },
            { GeoFips: '48105', GeoName: 'Crockett, TX', TimePeriod: '2022', DataValue: '42,000' },
            { GeoFips: '48267', GeoName: 'Kimble, TX', TimePeriod: '2022', DataValue: '35,000' },
            { GeoFips: '48000', GeoName: 'Texas', TimePeriod: '2022', DataValue: '62,000' },
            { GeoFips: '00000', GeoName: 'United States', TimePeriod: '2022', DataValue: '65,000' },
            { GeoFips: '48435', GeoName: 'Sutton, TX', TimePeriod: '2023', DataValue: '(NA)' },
            { GeoFips: '99999', GeoName: 'Unknown', TimePeriod: '2022', DataValue: '50,000' },
          ],
        },
      },
    };
  },
  httpGetText: async () => '',
  httpGet: async () => new Response('', { status: 200 }),
  httpPost: async () => new Response('{}', { status: 200 }),
  httpPostJson: async () => ({}),
}));

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

mock.module('../../../../pipeline/lib/dates', () => {
  const real = require('../../../../pipeline/lib/dates');
  return { ...real, sleep: async () => {} };
});

mock.module('../../../../pipeline/lib/cache', () => ({
  log: () => {},
  warn: () => {},
}));

mock.module('fs', () => ({
  existsSync: () => false,
  mkdirSync: () => {},
}));

import { fetchBea } from '../../../../pipeline/fetch/bea';

describe('fetchBea', () => {
  beforeEach(() => {
    httpGetJsonCalls = [];
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    process.env.BEA_API_KEY = 'test-bea-key';
  });

  test('FIPS to key mapping', async () => {
    await fetchBea();

    const cacheKeys = Object.keys(writtenFiles);
    expect(cacheKeys.length).toBeGreaterThan(0);

    const rows = writtenFiles[cacheKeys[0]];
    const geos = rows.map((r: any) => r.geo);
    expect(geos).toContain('sutton');
    expect(geos).toContain('schleicher');
    expect(geos).toContain('crockett');
    expect(geos).toContain('kimble');
    expect(geos).toContain('TX');
    expect(geos).toContain('US');
    expect(geos).not.toContain('99999');
  });

  test('(NA) filtering removes non-numeric values', async () => {
    await fetchBea();

    const cacheKeys = Object.keys(writtenFiles);
    const rows = writtenFiles[cacheKeys[0]];

    const sutton2023 = rows.find((r: any) => r.geo === 'sutton' && r.year === 2023);
    expect(sutton2023).toBeUndefined();

    const sutton2022 = rows.find((r: any) => r.geo === 'sutton' && r.year === 2022);
    expect(sutton2022).toBeDefined();
  });

  test('comma-stripped numeric parsing', async () => {
    await fetchBea();

    const cacheKeys = Object.keys(writtenFiles);
    const rows = writtenFiles[cacheKeys[0]];

    const sutton = rows.find((r: any) => r.geo === 'sutton' && r.year === 2022);
    expect(sutton).toBeDefined();
    const valueCol = Object.keys(sutton).find(k => !['year', 'geo', 'geo_label'].includes(k))!;
    expect(sutton[valueCol]).toBe(45000);
  });

  test('skips without API key', async () => {
    delete process.env.BEA_API_KEY;
    await fetchBea();
    expect(httpGetJsonCalls).toHaveLength(0);
  });

  test('geo_label mapping', async () => {
    await fetchBea();

    const cacheKeys = Object.keys(writtenFiles);
    const rows = writtenFiles[cacheKeys[0]];

    const sutton = rows.find((r: any) => r.geo === 'sutton');
    expect(sutton?.geo_label).toBe('Sutton Co. (Sonora)');

    const us = rows.find((r: any) => r.geo === 'US');
    expect(us?.geo_label).toBe('United States');
  });
});
