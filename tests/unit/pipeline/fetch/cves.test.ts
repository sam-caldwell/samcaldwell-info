import { describe, test, expect, mock, beforeEach } from 'bun:test';

const writtenFiles: Record<string, any[]> = {};
let writtenFileContents: Record<string, string | Buffer> = {};
const fixtureData: Record<string, any[]> = {};
let httpGetCalls: string[] = [];
let httpGetTextCalls: string[] = [];
let httpGetJsonCalls: string[] = [];

mock.module('../../../../pipeline/lib/http', () => ({
  httpGet: async (url: string, opts?: any) => {
    httpGetCalls.push(url);
    // EPSS endpoint - return gzipped content
    return new Response('', { status: 200 });
  },
  httpGetJson: async (url: string, opts?: any) => {
    httpGetJsonCalls.push(url);
    if (url.includes('nvd.nist.gov')) {
      return {
        vulnerabilities: [{
          cve: {
            metrics: {
              cvssMetricV31: [{ cvssData: { baseScore: 9.8, baseSeverity: 'CRITICAL' } }],
              cvssMetricV2: [{ cvssData: { baseScore: 10.0 } }],
            },
          },
        }],
      };
    }
    return {};
  },
  httpGetText: async (url: string, opts?: any) => {
    httpGetTextCalls.push(url);
    if (url.includes('cisa.gov')) {
      return JSON.stringify({
        vulnerabilities: [
          { cveID: 'CVE-2024-0001', vendorProject: 'Microsoft', product: 'Exchange', vulnerabilityName: 'RCE', shortDescription: 'test', dateAdded: '2024-06-01', requiredAction: 'Patch', dueDate: '2024-07-01' },
          { cveID: 'CVE-2024-0002', vendorProject: 'Apache', product: 'httpd', vulnerabilityName: 'SSRF', shortDescription: 'test', dateAdded: '2024-06-10', requiredAction: 'Patch', dueDate: '2024-07-10' },
        ],
      });
    }
    return '';
  },
  httpPost: async () => new Response('{}', { status: 200 }),
  httpPostJson: async () => ({}),
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

mock.module('../../../../pipeline/lib/dates', () => {
  const real = require('../../../../pipeline/lib/dates');
  return { ...real, sleep: async () => {} };
});

mock.module('fs', () => ({
  existsSync: (path: string) => {
    if (path.endsWith('epss_history.csv')) return 'epss_history.csv' in fixtureData;
    if (path.endsWith('nvd_cvss.csv')) return 'nvd_cvss.csv' in fixtureData;
    return false;
  },
  writeFileSync: (path: string, content: any) => {
    writtenFileContents[path] = typeof content === 'string' ? content : content.toString();
  },
  readFileSync: (path: string) => {
    for (const [key, content] of Object.entries(writtenFileContents)) {
      if (path === key || path.endsWith(key)) return content;
    }
    return Buffer.from('');
  },
  mkdirSync: () => {},
}));

import { fetchKev, fetchNvdCvss } from '../../../../pipeline/fetch/cves';

describe('CVE fetchers', () => {
  beforeEach(() => {
    httpGetCalls = [];
    httpGetTextCalls = [];
    httpGetJsonCalls = [];
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
    writtenFileContents = {};
  });

  test('KEV JSON parsing and snapshot save', async () => {
    const result = await fetchKev();

    const kevCalls = httpGetTextCalls.filter(u => u.includes('cisa.gov'));
    expect(kevCalls.length).toBe(1);
    expect(kevCalls[0]).toContain('known_exploited_vulnerabilities');

    const jsonKeys = Object.keys(writtenFileContents).filter(k => k.endsWith('.json'));
    expect(jsonKeys.length).toBe(1);
  });

  test('NVD CVSS extraction: v3.1 preferred, v2 fallback', async () => {
    await fetchNvdCvss(['CVE-2024-0001']);

    const nvdCalls = httpGetJsonCalls.filter(u => u.includes('nvd.nist.gov'));
    expect(nvdCalls.length).toBe(1);
    expect(nvdCalls[0]).toContain('cveId=CVE-2024-0001');

    const nvdKey = Object.keys(writtenFiles).find(k => k.endsWith('nvd_cvss.csv'));
    expect(nvdKey).toBeDefined();
    const rows = writtenFiles[nvdKey!];
    expect(rows.length).toBe(1);
    expect(rows[0].cve).toBe('CVE-2024-0001');
    expect(rows[0].cvss_v3_base).toBe(9.8);
    expect(rows[0].cvss_v3_severity).toBe('CRITICAL');
    expect(rows[0].cvss_v2_base).toBe(10.0);
  });

  test('NVD skips already-cached CVEs', async () => {
    fixtureData['nvd_cvss.csv'] = [
      { cve: 'CVE-2024-0001', cvss_v3_base: 9.8, cvss_v3_severity: 'CRITICAL', cvss_v2_base: 10.0 },
    ];

    await fetchNvdCvss(['CVE-2024-0001']);
    const nvdCalls = httpGetJsonCalls.filter(u => u.includes('nvd.nist.gov'));
    expect(nvdCalls).toHaveLength(0);
  });
});
