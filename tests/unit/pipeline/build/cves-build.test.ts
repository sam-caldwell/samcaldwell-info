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
    if (path.endsWith('epss_history.csv')) return 'epss_history.csv' in fixtureData;
    if (path.endsWith('nvd_cvss.csv')) return 'nvd_cvss.csv' in fixtureData;
    return true;
  },
  readFileSync: (path: string) => {
    for (const [key, content] of Object.entries(fileContents)) {
      if (path.endsWith(key)) return content;
    }
    return '{}';
  },
  readdirSync: () => dirListing,
  mkdirSync: () => {},
}));

import { buildCves } from '../../../../pipeline/build/cves';

describe('buildCves', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
    for (const k of Object.keys(fileContents)) delete fileContents[k];
    dirListing = [];
  });

  test('KEV+EPSS join produces combined rows', async () => {
    dirListing = ['kev_2024-06-15.json'];
    fileContents['kev_2024-06-15.json'] = JSON.stringify({
      vulnerabilities: [
        { cveID: 'CVE-2024-1234', vendorProject: 'Microsoft', product: 'Windows', vulnerabilityName: 'RCE Bug', shortDescription: 'Remote code execution', dateAdded: '2024-06-10', requiredAction: 'Patch', dueDate: '2024-07-01' },
        { cveID: 'CVE-2024-5678', vendorProject: 'Apache', product: 'Tomcat', vulnerabilityName: 'Auth Bypass', shortDescription: 'Auth bypass', dateAdded: '2024-06-12', requiredAction: 'Patch', dueDate: '2024-07-03' },
      ],
    });

    fixtureData['epss_history.csv'] = [
      { cve: 'CVE-2024-1234', initial_epss: 0.01, initial_percentile: 0.5, initial_date: '2024-06-01', current_epss: 0.85, current_percentile: 0.99, current_date: '2024-06-15' },
    ];
    fixtureData['nvd_cvss.csv'] = [
      { cve: 'CVE-2024-1234', cvss_v3_base: 9.8, cvss_v3_severity: 'CRITICAL', cvss_v2_base: 10.0 },
    ];

    await buildCves();

    const kevKey = Object.keys(writtenFiles).find(k => k.endsWith('cves_kev.csv'));
    expect(kevKey).toBeDefined();
    const kev = writtenFiles[kevKey!];
    expect(kev).toHaveLength(2);

    // CVE-2024-1234 should have EPSS and CVSS data
    const cve1 = kev.find((r: any) => r.cve === 'CVE-2024-1234');
    expect(cve1).toBeDefined();
    expect(cve1.current_epss).toBe(0.85);
    expect(cve1.cvss_v3_base).toBe(9.8);
    expect(cve1.epss_delta).toBe(0.84);

    // CVE-2024-5678 should have null EPSS and CVSS
    const cve2 = kev.find((r: any) => r.cve === 'CVE-2024-5678');
    expect(cve2).toBeDefined();
    expect(cve2.current_epss).toBeNull();
    expect(cve2.cvss_v3_base).toBeNull();
  });

  test('cves_summary median calculation', async () => {
    dirListing = ['kev_2024-06-15.json'];
    fileContents['kev_2024-06-15.json'] = JSON.stringify({
      vulnerabilities: [
        { cveID: 'CVE-2024-001', vendorProject: 'V', product: 'P', vulnerabilityName: 'N', shortDescription: 'D', dateAdded: '2024-06-01', requiredAction: 'P', dueDate: '2024-07-01' },
        { cveID: 'CVE-2024-002', vendorProject: 'V', product: 'P', vulnerabilityName: 'N', shortDescription: 'D', dateAdded: '2024-06-02', requiredAction: 'P', dueDate: '2024-07-01' },
        { cveID: 'CVE-2024-003', vendorProject: 'V', product: 'P', vulnerabilityName: 'N', shortDescription: 'D', dateAdded: '2024-06-03', requiredAction: 'P', dueDate: '2024-07-01' },
      ],
    });

    fixtureData['epss_history.csv'] = [
      { cve: 'CVE-2024-001', initial_epss: 0.1, initial_percentile: 0.5, initial_date: '2024-06-01', current_epss: 0.2, current_percentile: 0.6, current_date: '2024-06-15' },
      { cve: 'CVE-2024-002', initial_epss: 0.3, initial_percentile: 0.7, initial_date: '2024-06-02', current_epss: 0.5, current_percentile: 0.8, current_date: '2024-06-15' },
      { cve: 'CVE-2024-003', initial_epss: 0.6, initial_percentile: 0.9, initial_date: '2024-06-03', current_epss: 0.8, current_percentile: 0.95, current_date: '2024-06-15' },
    ];
    fixtureData['nvd_cvss.csv'] = [
      { cve: 'CVE-2024-001', cvss_v3_base: 5.0, cvss_v3_severity: 'MEDIUM', cvss_v2_base: null },
      { cve: 'CVE-2024-002', cvss_v3_base: 7.5, cvss_v3_severity: 'HIGH', cvss_v2_base: null },
      { cve: 'CVE-2024-003', cvss_v3_base: 9.8, cvss_v3_severity: 'CRITICAL', cvss_v2_base: null },
    ];

    await buildCves();

    const summaryKey = Object.keys(writtenFiles).find(k => k.endsWith('cves_summary.csv'));
    expect(summaryKey).toBeDefined();
    const summary = writtenFiles[summaryKey!];
    expect(summary).toHaveLength(1);

    // Median of 0.2, 0.5, 0.8 = 0.5
    expect(summary[0].median_epss).toBe(0.5);
    // Median of 5.0, 7.5, 9.8 = 7.5
    expect(summary[0].median_cvss_v3).toBe(7.5);
    expect(summary[0].kev_total).toBe(3);
  });

  test('no KEV snapshot skips build gracefully', async () => {
    dirListing = [];
    await buildCves();

    // No cves_kev.csv should be written
    const kevKey = Object.keys(writtenFiles).find(k => k.endsWith('cves_kev.csv'));
    expect(kevKey).toBeUndefined();
  });
});
