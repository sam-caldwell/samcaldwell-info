import { describe, test, expect, mock, beforeEach } from 'bun:test';

const fixtureData: Record<string, any[]> = {};
const writtenFiles: Record<string, any[]> = {};

mock.module('../../../../pipeline/lib/csv', () => ({
  readCsv: (path: string) => {
    // Match longest key first to avoid 'unemployment.csv' matching 'tx_unemployment.csv'
    const keys = Object.keys(fixtureData).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (path.endsWith(key)) return fixtureData[key];
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
    const keys = Object.keys(fixtureData).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (path.endsWith(key)) return true;
    }
    return false;
  },
  mkdirSync: () => {},
}));

import { buildWestTexas } from '../../../../pipeline/build/west-texas';

describe('buildWestTexas', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
  });

  test('unemployment_monthly binds rows from 6 geos', async () => {
    // 4 counties + US + TX = 6 geo sources
    fixtureData['bls_laus_sutton_ur.csv'] = [{ date: '2024-01-01', value: 3.2 }];
    fixtureData['bls_laus_schleicher_ur.csv'] = [{ date: '2024-01-01', value: 4.1 }];
    fixtureData['bls_laus_crockett_ur.csv'] = [{ date: '2024-01-01', value: 3.8 }];
    fixtureData['bls_laus_kimble_ur.csv'] = [{ date: '2024-01-01', value: 5.0 }];
    fixtureData['unemployment.csv'] = [{ date: '2024-01-01', value: 3.7 }]; // US
    fixtureData['tx_unemployment.csv'] = [{ date: '2024-01-01', value: 4.0 }]; // TX
    fixtureData['bea_income.csv'] = [];
    fixtureData['bea_gdp.csv'] = [];

    await buildWestTexas();

    const unempKey = Object.keys(writtenFiles).find(k => k.endsWith('unemployment_monthly.csv'));
    expect(unempKey).toBeDefined();
    const unemp = writtenFiles[unempKey!];

    // Should have 6 rows (one per geo)
    expect(unemp).toHaveLength(6);

    const geos = new Set(unemp.map((r: any) => r.geo));
    expect(geos.has('sutton')).toBe(true);
    expect(geos.has('schleicher')).toBe(true);
    expect(geos.has('crockett')).toBe(true);
    expect(geos.has('kimble')).toBe(true);
    expect(geos.has('US')).toBe(true);
    expect(geos.has('TX')).toBe(true);

    // Check geo_label
    const sutton = unemp.find((r: any) => r.geo === 'sutton');
    expect(sutton!.geo_label).toBe('Sutton Co. (Sonora)');
  });

  test('GDP YoY growth calculation', async () => {
    fixtureData['bls_laus_sutton_ur.csv'] = [];
    fixtureData['bls_laus_schleicher_ur.csv'] = [];
    fixtureData['bls_laus_crockett_ur.csv'] = [];
    fixtureData['bls_laus_kimble_ur.csv'] = [];
    fixtureData['unemployment.csv'] = [];
    fixtureData['tx_unemployment.csv'] = [];
    fixtureData['bea_income.csv'] = [];
    fixtureData['bea_gdp.csv'] = [
      { year: 2022, geo: 'sutton', geo_label: 'Sutton Co.', value: 100000 },
      { year: 2023, geo: 'sutton', geo_label: 'Sutton Co.', value: 105000 }, // 5% growth
      { year: 2022, geo: 'TX', geo_label: 'Texas', value: 2000000 },
      { year: 2023, geo: 'TX', geo_label: 'Texas', value: 2060000 }, // 3% growth
    ];

    await buildWestTexas();

    const gdpKey = Object.keys(writtenFiles).find(k => k.endsWith('gdp_annual.csv'));
    expect(gdpKey).toBeDefined();
    const gdp = writtenFiles[gdpKey!];

    // First year of each geo has null growth (no prior year)
    const sutton2022 = gdp.find((r: any) => r.geo === 'sutton' && r.year === 2022);
    expect(sutton2022!.gdp_growth_pct).toBeNull();

    // Second year: (105000/100000 - 1) * 100 = 5.0
    const sutton2023 = gdp.find((r: any) => r.geo === 'sutton' && r.year === 2023);
    expect(sutton2023!.gdp_growth_pct).toBe(5);

    // Texas: (2060000/2000000 - 1) * 100 = 3.0
    const tx2023 = gdp.find((r: any) => r.geo === 'TX' && r.year === 2023);
    expect(tx2023!.gdp_growth_pct).toBe(3);
  });

  test('summary computes regional average UR', async () => {
    fixtureData['bls_laus_sutton_ur.csv'] = [{ date: '2024-01-01', value: 3.0 }];
    fixtureData['bls_laus_schleicher_ur.csv'] = [{ date: '2024-01-01', value: 4.0 }];
    fixtureData['bls_laus_crockett_ur.csv'] = [{ date: '2024-01-01', value: 5.0 }];
    fixtureData['bls_laus_kimble_ur.csv'] = [{ date: '2024-01-01', value: 6.0 }];
    fixtureData['unemployment.csv'] = [{ date: '2024-01-01', value: 3.7 }];
    fixtureData['tx_unemployment.csv'] = [{ date: '2024-01-01', value: 4.0 }];
    fixtureData['bea_income.csv'] = [];
    fixtureData['bea_gdp.csv'] = [];

    await buildWestTexas();

    const summaryKey = Object.keys(writtenFiles).find(k => k.endsWith('west_texas_summary.csv'));
    expect(summaryKey).toBeDefined();
    const summary = writtenFiles[summaryKey!];
    expect(summary).toHaveLength(1);

    // Regional avg = (3+4+5+6)/4 = 4.5
    expect(summary[0].regional_avg_ur).toBe(4.5);
    expect(summary[0].us_ur).toBe(3.7);
    expect(summary[0].tx_ur).toBe(4.0);
  });
});
