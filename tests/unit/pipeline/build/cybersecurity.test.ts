import { describe, test, expect, mock, beforeEach } from 'bun:test';

const fixtureData: Record<string, any[]> = {};
const writtenFiles: Record<string, any[]> = {};
const fileContents: Record<string, string> = {};
let dirListing: string[] = [];

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
    // Check if any fileContents match
    for (const key of Object.keys(fileContents)) {
      if (path.endsWith(key)) return true;
    }
    return true;
  },
  readFileSync: (path: string) => {
    for (const [key, content] of Object.entries(fileContents)) {
      if (path.endsWith(key)) return content;
    }
    return '[]';
  },
  readdirSync: () => dirListing,
  mkdirSync: () => {},
}));

import { buildCybersecurity } from '../../../../pipeline/build/cybersecurity';

describe('buildCybersecurity', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
    for (const k of Object.keys(fileContents)) delete fileContents[k];
    dirListing = [];
  });

  test('FeodoTracker JSON snapshot parsing', async () => {
    dirListing = ['feodo_2024-06-15.json'];
    fileContents['feodo_2024-06-15.json'] = JSON.stringify([
      { ip_address: '1.2.3.4', port: 443, status: 'online', as_number: 12345, as_name: 'TestASN', country: 'US', malware: 'Dridex', first_seen: '2024-01-01', last_online: '2024-06-15' },
      { ip_address: '5.6.7.8', port: 8080, status: 'offline', as_number: 67890, as_name: 'OtherASN', country: 'RU', malware: 'Emotet', first_seen: '2024-03-01', last_online: '2024-06-14' },
    ]);

    await buildCybersecurity();

    const threatsKey = Object.keys(writtenFiles).find(k => k.endsWith('current_threats.csv'));
    expect(threatsKey).toBeDefined();
    const threats = writtenFiles[threatsKey!];
    expect(threats.length).toBe(2);

    const ip1 = threats.find((r: any) => r.ip === '1.2.3.4');
    expect(ip1).toBeDefined();
    expect(ip1.source).toBe('FeodoTracker');
    expect(ip1.malware_family).toBe('Dridex');
    expect(ip1.port).toBe(443);
  });

  test('province daily aggregation with distinct IP counts', async () => {
    dirListing = ['feodo_2024-06-15.json'];
    fileContents['feodo_2024-06-15.json'] = JSON.stringify([
      { ip_address: '1.2.3.4', port: 443, country: 'US', malware: 'Dridex' },
      { ip_address: '1.2.3.5', port: 443, country: 'US', malware: 'Dridex' },
      { ip_address: '5.6.7.8', port: 8080, country: 'RU', malware: 'Emotet' },
    ]);

    // Geo data for enrichment with region_name
    fixtureData['ip_geolocation.csv'] = [
      { ip: '1.2.3.4', country: 'US', region_name: 'California', city: 'LA', lat: 34.0, lon: -118.2, as_name: 'ISP1' },
      { ip: '1.2.3.5', country: 'US', region_name: 'California', city: 'SF', lat: 37.8, lon: -122.4, as_name: 'ISP2' },
      { ip: '5.6.7.8', country: 'RU', region_name: 'Moscow', city: 'Moscow', lat: 55.8, lon: 37.6, as_name: 'RU-ISP' },
    ];

    await buildCybersecurity();

    const provKey = Object.keys(writtenFiles).find(k => k.endsWith('province_daily.csv'));
    expect(provKey).toBeDefined();
    const prov = writtenFiles[provKey!];

    // California should have 2 distinct IPs
    const cal = prov.find((r: any) => r.region_name === 'California');
    expect(cal).toBeDefined();
    expect(cal.n).toBe(2);

    // Moscow should have 1
    const mos = prov.find((r: any) => r.region_name === 'Moscow');
    expect(mos).toBeDefined();
    expect(mos.n).toBe(1);
  });

  test('empty cache produces empty outputs', async () => {
    dirListing = [];
    await buildCybersecurity();

    const threatsKey = Object.keys(writtenFiles).find(k => k.endsWith('current_threats.csv'));
    expect(threatsKey).toBeDefined();
    expect(writtenFiles[threatsKey!]).toHaveLength(0);
  });
});
