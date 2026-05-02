import { describe, test, expect, mock, beforeEach } from 'bun:test';

const fixtureData: Record<string, any[]> = {};
const writtenFiles: Record<string, any[]> = {};

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: (path: string) => {
    // Match by suffix since paths will be absolute
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
  existsSync: () => true,
  mkdirSync: () => {},
}));

import { buildPresidential } from '../../../../pipeline/build/presidential';

describe('buildPresidential', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
  });

  function setupBasicFixtures() {
    // Monthly economy data spanning Biden -> Trump II transition
    fixtureData['monthly.csv'] = [
      { year: 2021, month: 1, date: '2021-01-01', unemployment: 6.7, cpi: 1.4, fed_funds: 0.09, ten_year: 1.09, vix: 33.0, sp500_level: 3700 },
      { year: 2021, month: 2, date: '2021-02-01', unemployment: 6.2, cpi: 1.7, fed_funds: 0.08, ten_year: 1.26, vix: 22.0, sp500_level: 3800 },
      { year: 2025, month: 1, date: '2025-01-01', unemployment: 4.0, cpi: 2.9, fed_funds: 4.50, ten_year: 4.2, vix: 16.0, sp500_level: 5800 },
      { year: 2025, month: 2, date: '2025-02-01', unemployment: 4.1, cpi: 2.8, fed_funds: 4.50, ten_year: 4.3, vix: 17.0, sp500_level: 5900 },
    ];
    fixtureData['annual.csv'] = [
      { year: 2021, gdp_growth: 5.8, recession: 0, deficit_pct_gdp: -12.1, debt_added_trillion: 1.5 },
      { year: 2025, gdp_growth: 2.1, recession: 0, deficit_pct_gdp: -6.3, debt_added_trillion: 1.5 },
    ];
    fixtureData['fiscal_quarterly.csv'] = [];
  }

  test('mid-month assignment: Jan 14 2021 -> Trump I, Feb 14 2021 -> Biden', async () => {
    setupBasicFixtures();
    await buildPresidential();

    const monthlyAdminKey = Object.keys(writtenFiles).find(k => k.endsWith('monthly_admin.csv'));
    expect(monthlyAdminKey).toBeDefined();
    const monthlyAdmin = writtenFiles[monthlyAdminKey!];

    // Jan 2021: date is 2021-01-01, mid-month = Jan 14 -> Trump I (term ended 2021-01-20)
    const jan2021 = monthlyAdmin.find((r: any) => r.date === '2021-01-01');
    expect(jan2021).toBeDefined();
    expect(jan2021.president).toBe('Donald Trump (1st term)');

    // Feb 2021: date is 2021-02-01, mid-month = Feb 14 -> Biden (started 2021-01-20)
    const feb2021 = monthlyAdmin.find((r: any) => r.date === '2021-02-01');
    expect(feb2021).toBeDefined();
    expect(feb2021.president).toBe('Joe Biden');
  });

  test('6 administrations are generated', async () => {
    setupBasicFixtures();
    await buildPresidential();

    const adminsKey = Object.keys(writtenFiles).find(k => k.endsWith('administrations.csv'));
    expect(adminsKey).toBeDefined();
    const admins = writtenFiles[adminsKey!];
    expect(admins).toHaveLength(6);

    const names = admins.map((a: any) => a.president);
    expect(names).toContain('Bill Clinton');
    expect(names).toContain('George W. Bush');
    expect(names).toContain('Barack Obama');
    expect(names).toContain('Donald Trump (1st term)');
    expect(names).toContain('Joe Biden');
    expect(names).toContain('Donald Trump (2nd term)');
  });

  test('ongoing flag on last admin', async () => {
    setupBasicFixtures();
    await buildPresidential();

    const adminsKey = Object.keys(writtenFiles).find(k => k.endsWith('administrations.csv'));
    const admins = writtenFiles[adminsKey!];

    // Last admin (Trump 2nd term) should be ongoing
    const last = admins[admins.length - 1];
    expect(last.president).toBe('Donald Trump (2nd term)');
    expect(last.ongoing).toBe('TRUE');

    // Biden should not be ongoing
    const biden = admins.find((a: any) => a.president === 'Joe Biden');
    expect(biden!.ongoing).toBe('FALSE');
  });

  test('admin_summary has correct columns', async () => {
    setupBasicFixtures();
    await buildPresidential();

    const summaryKey = Object.keys(writtenFiles).find(k => k.endsWith('admin_summary.csv'));
    expect(summaryKey).toBeDefined();
    const summary = writtenFiles[summaryKey!];
    expect(summary.length).toBeGreaterThan(0);

    const row = summary[0];
    const expectedCols = [
      'president', 'party', 'start_date', 'end_date', 'ongoing',
      'unemployment_start', 'unemployment_end', 'unemployment_change',
      'cpi_avg', 'sp500_total_return', 'sp500_annualized_return',
      'gdp_growth_avg',
    ];
    for (const col of expectedCols) {
      expect(row).toHaveProperty(col);
    }
  });
});
