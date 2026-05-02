import { describe, test, expect, mock, beforeEach } from 'bun:test';

const writtenFiles: Record<string, any[]> = {};
const writtenColumns: Record<string, string[]> = {};

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: () => [],
  writeCsv: (path: string, rows: any[], cols?: string[]) => {
    writtenFiles[path] = rows;
    if (cols) writtenColumns[path] = cols;
  },
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

import { buildSynthetic } from '../../../../pipeline/build/synthetic';

describe('buildSynthetic', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(writtenColumns)) delete writtenColumns[k];
  });

  test('produces 6 CSV files', async () => {
    await buildSynthetic();

    const keys = Object.keys(writtenFiles);
    const expectedSuffixes = [
      'annual.csv', 'gdp_components.csv', 'quarterly.csv',
      'monthly.csv', 'fiscal_quarterly.csv', 'sectors.csv',
    ];

    for (const suffix of expectedSuffixes) {
      const found = keys.find(k => k.endsWith(suffix));
      expect(found).toBeDefined();
    }
  });

  test('annual.csv has correct column names', async () => {
    await buildSynthetic();

    const annualKey = Object.keys(writtenColumns).find(k => k.endsWith('annual.csv'));
    expect(annualKey).toBeDefined();
    const cols = writtenColumns[annualKey!];

    expect(cols).toContain('year');
    expect(cols).toContain('gdp_growth');
    expect(cols).toContain('unemployment');
    expect(cols).toContain('cpi');
    expect(cols).toContain('sp500_ret');
    expect(cols).toContain('recession');
    expect(cols).toContain('prototype');
  });

  test('quarterly.csv has correct column names', async () => {
    await buildSynthetic();

    const qKey = Object.keys(writtenColumns).find(k => k.endsWith('quarterly.csv'));
    expect(qKey).toBeDefined();
    const cols = writtenColumns[qKey!];

    expect(cols).toContain('year');
    expect(cols).toContain('quarter');
    expect(cols).toContain('date');
    expect(cols).toContain('period');
    expect(cols).toContain('gdp_growth');
    expect(cols).toContain('sp500_ret_qoq');
    expect(cols).toContain('vix');
  });

  test('monthly sp500_level is cumulative and increasing on average', async () => {
    await buildSynthetic();

    const monthlyKey = Object.keys(writtenFiles).find(k => k.endsWith('monthly.csv'));
    expect(monthlyKey).toBeDefined();
    const monthly = writtenFiles[monthlyKey!];

    expect(monthly.length).toBeGreaterThan(100);

    // Starting level should be around 1260 (initial value in buildSynthetic)
    const first = monthly[0];
    expect(first.sp500_level).toBeGreaterThan(1000);
    expect(first.sp500_level).toBeLessThan(1500);

    // Final level should be higher than start (market goes up over time)
    const last = monthly[monthly.length - 1];
    expect(last.sp500_level).toBeGreaterThan(first.sp500_level);
  });

  test('sectors has 11 sectors with return_pct', async () => {
    await buildSynthetic();

    const sectorKey = Object.keys(writtenFiles).find(k => k.endsWith('sectors.csv'));
    expect(sectorKey).toBeDefined();
    const sectors = writtenFiles[sectorKey!];

    const uniqueSectors = new Set(sectors.map((r: any) => r.sector));
    expect(uniqueSectors.size).toBe(11);
    expect(uniqueSectors.has('Information Technology')).toBe(true);
    expect(uniqueSectors.has('Energy')).toBe(true);

    // Each sector should have a return_pct value
    for (const row of sectors) {
      expect(row).toHaveProperty('return_pct');
      expect(typeof row.return_pct).toBe('number');
    }
  });
});
