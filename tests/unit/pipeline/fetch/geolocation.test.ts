import { describe, test, expect, mock, beforeEach } from 'bun:test';

const writtenFiles: Record<string, any[]> = {};
const fixtureData: Record<string, any[]> = {};
let httpCalls: { url: string; body: any }[] = [];

mock.module('../../../../pipeline/lib/http', () => ({
  httpGet: mock(async (url: string, opts?: any) => {
    return new Response('{}', { status: 200 });
  }),
  httpGetJson: mock(async (url: string, opts?: any) => ({})),
  httpGetText: mock(async (url: string, opts?: any) => '{}'),
  httpPost: mock(async (url: string, body: any, opts?: any) => {
    httpCalls.push({ url, body });
    const ips = body || [];
    const results = ips.map((ip: string) => ({
      status: 'success',
      query: ip,
      country: 'United States',
      countryCode: 'US',
      region: 'CA',
      regionName: 'California',
      city: 'Los Angeles',
      lat: 34.0,
      lon: -118.2,
      as: 'AS12345 Test ISP',
    }));
    return new Response(JSON.stringify(results), { status: 200 });
  }),
  httpPostJson: mock(async (url: string, body: any, opts?: any) => {
    httpCalls.push({ url, body });
    return {};
  }),
}));

mock.module('../../../../pipeline/lib/cache', () => ({
  log: mock(() => {}),
  warn: mock(() => {}),
}));

mock.module('../../../../pipeline/lib/dates', () => ({
  sleep: mock(async () => {}),
  today: () => new Date('2026-05-01T00:00:00Z'),
  formatDate: (d: Date) => d.toISOString().slice(0, 10),
}));

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: (path: string) => {
    for (const [key, val] of Object.entries(fixtureData)) {
      if (path.endsWith(key)) return val;
    }
    return [];
  },
  writeCsv: (path: string, rows: any[], cols?: string[]) => { writtenFiles[path] = rows; },
  round: (v: number | null | undefined, d: number) => {
    if (v === null || v === undefined || !isFinite(v)) return null;
    const f = Math.pow(10, d);
    return Math.round(v * f) / f;
  },
  parseCsvText: () => [],
}));

mock.module('fs', () => ({
  existsSync: (path: string) => {
    if (path.endsWith('ip_geolocation.csv')) return 'ip_geolocation.csv' in fixtureData;
    return false;
  },
  mkdirSync: () => {},
}));

import { geolocateIps } from '../../../../pipeline/fetch/geolocation';

describe('geolocateIps', () => {
  beforeEach(() => {
    httpCalls = [];
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
  });

  test('batch splitting: 100 IPs per batch', async () => {
    const ips = Array.from({ length: 250 }, (_, i) => `10.0.${Math.floor(i / 256)}.${i % 256}`);

    await geolocateIps(ips);

    // httpPost is called for each batch. The geolocation code tries HTTPS first,
    // and since our mock succeeds, we get one call per batch.
    // However it may try HTTPS then HTTP fallback. Let's just check batch sizes.
    expect(httpCalls.length).toBeGreaterThanOrEqual(3);
    // Find the calls that have body arrays of IPs
    const batchCalls = httpCalls.filter(c => Array.isArray(c.body));
    expect(batchCalls.length).toBeGreaterThanOrEqual(3);
    expect(batchCalls[0].body).toHaveLength(100);
    expect(batchCalls[1].body).toHaveLength(100);
    expect(batchCalls[2].body).toHaveLength(50);
  });

  test('cache dedup: does not look up already-cached IPs', async () => {
    fixtureData['ip_geolocation.csv'] = [
      { ip: '1.2.3.4', country: 'US', country_code: 'US', region_code: 'CA', region_name: 'California', city: 'LA', lat: 34.0, lon: -118.2, as_name: 'ISP', first_seen: '2024-06-01' },
      { ip: '5.6.7.8', country: 'US', country_code: 'US', region_code: 'NY', region_name: 'New York', city: 'NYC', lat: 40.7, lon: -74.0, as_name: 'ISP2', first_seen: '2024-06-01' },
    ];

    await geolocateIps(['1.2.3.4', '5.6.7.8', '9.10.11.12']);

    // Only 1 new IP should be looked up
    const batchCalls = httpCalls.filter(c => Array.isArray(c.body));
    expect(batchCalls.length).toBeGreaterThanOrEqual(1);
    // The first batch should contain only the new IP
    expect(batchCalls[0].body).toHaveLength(1);
    expect(batchCalls[0].body[0]).toBe('9.10.11.12');
  });

  test('deduplicates input IPs', async () => {
    await geolocateIps(['1.2.3.4', '1.2.3.4', '1.2.3.4', '5.6.7.8']);

    const batchCalls = httpCalls.filter(c => Array.isArray(c.body));
    expect(batchCalls.length).toBeGreaterThanOrEqual(1);
    expect(batchCalls[0].body).toHaveLength(2);
  });

  test('skips empty and blank IPs', async () => {
    await geolocateIps(['', '  ', '1.2.3.4']);
    const batchCalls = httpCalls.filter(c => Array.isArray(c.body));
    expect(batchCalls.length).toBeGreaterThanOrEqual(1);
    expect(batchCalls[0].body).toHaveLength(1);
  });
});
