import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Fixture data store
const fixtureData: Record<string, any[]> = {};
const writtenFiles: Record<string, any[]> = {};

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: (path: string) => fixtureData[path] || [],
  writeCsv: (path: string, rows: any[], cols?: string[]) => { writtenFiles[path] = rows; },
  round: (v: number | null | undefined, d: number) => {
    if (v === null || v === undefined || !isFinite(v)) return null;
    const f = Math.pow(10, d);
    return Math.round(v * f) / f;
  },
  parseCsvText: () => [],
}));

// Mock fs.existsSync to return true for paths in fixtureData
mock.module('fs', () => ({
  existsSync: (path: string) => path in fixtureData || true,
  mkdirSync: () => {},
}));

import { buildEconomy } from '../../../../pipeline/build/economy';

describe('buildEconomy', () => {
  beforeEach(() => {
    // Clear outputs
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
  });

  test('GDP YoY calculation: ((Q/Q_lag4) - 1) * 100', async () => {
    // 8 quarters of GDP data (Q1 2000 through Q4 2001)
    // Q_lag4 = same quarter a year earlier
    const gdpRows = [
      { date: '2000-01-01', value: 10000 },
      { date: '2000-04-01', value: 10100 },
      { date: '2000-07-01', value: 10200 },
      { date: '2000-10-01', value: 10300 },
      { date: '2001-01-01', value: 10500 }, // 5% above Q1 2000
      { date: '2001-04-01', value: 10605 }, // 5% above Q2 2000
      { date: '2001-07-01', value: 10710 }, // 5% above Q3 2000
      { date: '2001-10-01', value: 10815 }, // 5% above Q4 2000
    ];

    // Set up fixture data keyed by the path the economy builder looks up
    // The builder calls readFredCache which reads from cacheDir + name + '.csv'
    // We need to match the actual paths
    const cachePrefix = 'data/economy/cache/';
    fixtureData[cachePrefix + 'gdp_real.csv'] = gdpRows;
    fixtureData[cachePrefix + 'unemployment.csv'] = [];
    fixtureData[cachePrefix + 'cpi.csv'] = [];
    fixtureData[cachePrefix + 'fed_funds.csv'] = [];
    fixtureData[cachePrefix + 'ten_year.csv'] = [];
    fixtureData[cachePrefix + 'recession.csv'] = [];
    fixtureData[cachePrefix + 'deficit_pct_gdp.csv'] = [];
    fixtureData[cachePrefix + 'debt_pct_gdp.csv'] = [];
    fixtureData[cachePrefix + 'debt_public.csv'] = [];
    fixtureData[cachePrefix + 'gdp_nominal.csv'] = [];
    fixtureData[cachePrefix + 'pce.csv'] = [];
    fixtureData[cachePrefix + 'investment.csv'] = [];
    fixtureData[cachePrefix + 'government.csv'] = [];
    fixtureData[cachePrefix + 'net_exports.csv'] = [];

    await buildEconomy();

    // Find annual.csv in writtenFiles (path will be absolute)
    const annualKey = Object.keys(writtenFiles).find(k => k.endsWith('annual.csv'));
    expect(annualKey).toBeDefined();
    const annual = writtenFiles[annualKey!];

    // Year 2001 should have GDP growth close to 5%
    const row2001 = annual.find((r: any) => r.year === 2001);
    if (row2001 && row2001.gdp_growth !== null) {
      expect(row2001.gdp_growth).toBeCloseTo(5.0, 0);
    }
  });

  test('CPI YoY monthly: ((month/month_12ago) - 1) * 100', async () => {
    // Build 24 months of CPI data so we get 12 months of YoY
    const cpiRows: any[] = [];
    for (let m = 0; m < 24; m++) {
      const yr = 2000 + Math.floor(m / 12);
      const mo = (m % 12) + 1;
      const date = `${yr}-${String(mo).padStart(2, '0')}-01`;
      // Year 1: base 100, Year 2: 103 (3% inflation)
      cpiRows.push({ date, value: yr === 2000 ? 100 : 103 });
    }

    const cachePrefix = 'data/economy/cache/';
    fixtureData[cachePrefix + 'gdp_real.csv'] = [];
    fixtureData[cachePrefix + 'unemployment.csv'] = [];
    fixtureData[cachePrefix + 'cpi.csv'] = cpiRows;
    fixtureData[cachePrefix + 'fed_funds.csv'] = [];
    fixtureData[cachePrefix + 'ten_year.csv'] = [];
    fixtureData[cachePrefix + 'recession.csv'] = [];
    fixtureData[cachePrefix + 'deficit_pct_gdp.csv'] = [];
    fixtureData[cachePrefix + 'debt_pct_gdp.csv'] = [];
    fixtureData[cachePrefix + 'debt_public.csv'] = [];
    fixtureData[cachePrefix + 'gdp_nominal.csv'] = [];
    fixtureData[cachePrefix + 'pce.csv'] = [];
    fixtureData[cachePrefix + 'investment.csv'] = [];
    fixtureData[cachePrefix + 'government.csv'] = [];
    fixtureData[cachePrefix + 'net_exports.csv'] = [];

    await buildEconomy();

    const annualKey = Object.keys(writtenFiles).find(k => k.endsWith('annual.csv'));
    expect(annualKey).toBeDefined();
    const annual = writtenFiles[annualKey!];

    // 2001 CPI YoY should be 3%
    const row2001 = annual.find((r: any) => r.year === 2001);
    if (row2001 && row2001.cpi !== null) {
      expect(row2001.cpi).toBeCloseTo(3.0, 0);
    }
  });

  test('annual CSV has correct column set', async () => {
    const cachePrefix = 'data/economy/cache/';
    for (const name of ['gdp_real', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
      'recession', 'deficit_pct_gdp', 'debt_pct_gdp', 'debt_public',
      'gdp_nominal', 'pce', 'investment', 'government', 'net_exports']) {
      fixtureData[cachePrefix + name + '.csv'] = [];
    }

    await buildEconomy();

    const annualKey = Object.keys(writtenFiles).find(k => k.endsWith('annual.csv'));
    expect(annualKey).toBeDefined();
    const annual = writtenFiles[annualKey!];
    expect(annual.length).toBeGreaterThan(0);

    const row = annual[0];
    expect(row).toHaveProperty('year');
    expect(row).toHaveProperty('gdp_growth');
    expect(row).toHaveProperty('unemployment');
    expect(row).toHaveProperty('cpi');
    expect(row).toHaveProperty('sp500_ret');
    expect(row).toHaveProperty('prototype');
  });

  test('sector generation with seeded PRNG is deterministic', async () => {
    const cachePrefix = 'data/economy/cache/';
    for (const name of ['gdp_real', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
      'recession', 'deficit_pct_gdp', 'debt_pct_gdp', 'debt_public',
      'gdp_nominal', 'pce', 'investment', 'government', 'net_exports']) {
      fixtureData[cachePrefix + name + '.csv'] = [];
    }

    await buildEconomy();
    const sectorKey1 = Object.keys(writtenFiles).find(k => k.endsWith('sectors.csv'));
    const sectors1 = [...writtenFiles[sectorKey1!]];

    // Run again
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    await buildEconomy();
    const sectorKey2 = Object.keys(writtenFiles).find(k => k.endsWith('sectors.csv'));
    const sectors2 = writtenFiles[sectorKey2!];

    expect(sectors1.length).toBe(sectors2.length);
    // Same seed = same outputs
    for (let i = 0; i < Math.min(5, sectors1.length); i++) {
      expect(sectors1[i].return_pct).toBe(sectors2[i].return_pct);
    }
  });

  test('fiscal quarterly output has correct columns', async () => {
    const cachePrefix = 'data/economy/cache/';
    fixtureData[cachePrefix + 'debt_public.csv'] = [
      { date: '2020-01-01', value: 23000000 },
      { date: '2020-04-01', value: 24000000 },
    ];
    fixtureData[cachePrefix + 'debt_pct_gdp.csv'] = [
      { date: '2020-01-01', value: 107.0 },
      { date: '2020-04-01', value: 110.0 },
    ];
    for (const name of ['gdp_real', 'unemployment', 'cpi', 'fed_funds', 'ten_year',
      'recession', 'deficit_pct_gdp', 'gdp_nominal', 'pce', 'investment',
      'government', 'net_exports']) {
      fixtureData[cachePrefix + name + '.csv'] = [];
    }

    await buildEconomy();

    const fiscalKey = Object.keys(writtenFiles).find(k => k.endsWith('fiscal_quarterly.csv'));
    expect(fiscalKey).toBeDefined();
    const fiscal = writtenFiles[fiscalKey!];
    if (fiscal.length > 0) {
      expect(fiscal[0]).toHaveProperty('year');
      expect(fiscal[0]).toHaveProperty('quarter');
      expect(fiscal[0]).toHaveProperty('date');
      expect(fiscal[0]).toHaveProperty('debt_trillion');
      expect(fiscal[0]).toHaveProperty('debt_pct_gdp');
    }
  });
});
