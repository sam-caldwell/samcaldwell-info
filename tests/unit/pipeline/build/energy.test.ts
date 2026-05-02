import { describe, test, expect, mock, beforeEach } from 'bun:test';

const fixtureData: Record<string, any[]> = {};
const writtenFiles: Record<string, any[]> = {};

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
    for (const key of Object.keys(fixtureData)) {
      if (path.endsWith(key)) return true;
    }
    // Return false for events_energy.csv
    if (path.endsWith('events_energy.csv')) return false;
    return true;
  },
  copyFileSync: () => {},
  mkdirSync: () => {},
}));

import { buildEnergy } from '../../../../pipeline/build/energy';

describe('buildEnergy', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];
  });

  test('daily price join (WTI, Brent, natgas)', async () => {
    fixtureData['wti.csv'] = [
      { date: '2024-01-02', value: 72.5 },
      { date: '2024-01-03', value: 73.0 },
    ];
    fixtureData['brent.csv'] = [
      { date: '2024-01-02', value: 77.0 },
      { date: '2024-01-03', value: 77.5 },
    ];
    fixtureData['natgas_henry_hub.csv'] = [
      { date: '2024-01-02', value: 2.55 },
    ];
    fixtureData['gas_retail_us.csv'] = [];
    fixtureData['elec_retail_us.csv'] = [];
    fixtureData['padd_gasoline_weekly.csv'] = [];
    fixtureData['intl_gasoline_monthly.csv'] = [];
    fixtureData['steo_monthly.csv'] = [];

    await buildEnergy();

    const dailyKey = Object.keys(writtenFiles).find(k => k.endsWith('us_prices_daily.csv'));
    expect(dailyKey).toBeDefined();
    const daily = writtenFiles[dailyKey!];

    // Full join: 2 dates from WTI/Brent, natgas only on one
    expect(daily.length).toBe(2);

    const jan2 = daily.find((r: any) => r.date === '2024-01-02');
    expect(jan2).toBeDefined();
    expect(jan2.wti).toBe(72.5);
    expect(jan2.brent).toBe(77.0);
    expect(jan2.natgas).toBe(2.55);

    const jan3 = daily.find((r: any) => r.date === '2024-01-03');
    expect(jan3.wti).toBe(73.0);
    expect(jan3.natgas == null).toBe(true); // null or undefined
  });

  test('PADD current price calculation', async () => {
    fixtureData['wti.csv'] = [];
    fixtureData['brent.csv'] = [];
    fixtureData['natgas_henry_hub.csv'] = [];
    fixtureData['gas_retail_us.csv'] = [];
    fixtureData['elec_retail_us.csv'] = [];
    fixtureData['intl_gasoline_monthly.csv'] = [];
    fixtureData['steo_monthly.csv'] = [];

    // Two PADDs, two weeks of data
    fixtureData['padd_gasoline_weekly.csv'] = [
      { period: '2024-06-10', duoarea: 'R10', area_name: 'PADD 1', product: 'EPMR', value: 3.50 },
      { period: '2024-06-17', duoarea: 'R10', area_name: 'PADD 1', product: 'EPMR', value: 3.55 },
      { period: '2024-06-10', duoarea: 'R20', area_name: 'PADD 2', product: 'EPMR', value: 3.20 },
      { period: '2024-06-17', duoarea: 'R20', area_name: 'PADD 2', product: 'EPMR', value: 3.25 },
    ];

    await buildEnergy();

    const currentKey = Object.keys(writtenFiles).find(k => k.endsWith('padd_gas_current.csv'));
    expect(currentKey).toBeDefined();
    const current = writtenFiles[currentKey!];

    // Latest date is 2024-06-17
    const r10 = current.find((r: any) => r.duoarea === 'R10');
    expect(r10).toBeDefined();
    expect(r10.price_now).toBe(3.55);
  });

  test('energy_summary output', async () => {
    fixtureData['wti.csv'] = [{ date: '2024-06-17', value: 80.5 }];
    fixtureData['brent.csv'] = [{ date: '2024-06-17', value: 85.0 }];
    fixtureData['natgas_henry_hub.csv'] = [{ date: '2024-06-17', value: 2.75 }];
    fixtureData['gas_retail_us.csv'] = [{ date: '2024-06-17', value: 3.45 }];
    fixtureData['elec_retail_us.csv'] = [];
    fixtureData['padd_gasoline_weekly.csv'] = [];
    fixtureData['intl_gasoline_monthly.csv'] = [];
    fixtureData['steo_monthly.csv'] = [];

    await buildEnergy();

    const summaryKey = Object.keys(writtenFiles).find(k => k.endsWith('energy_summary.csv'));
    expect(summaryKey).toBeDefined();
    const summary = writtenFiles[summaryKey!];
    expect(summary).toHaveLength(1);
    expect(summary[0].wti_spot).toBe(80.5);
    expect(summary[0].brent_spot).toBe(85.0);
    expect(summary[0].us_retail_gasoline).toBe(3.45);
    expect(summary[0].henry_hub_natgas).toBe(2.75);
  });
});
