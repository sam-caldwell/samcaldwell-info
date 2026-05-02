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
    // administrations.csv must exist
    if (path.endsWith('administrations.csv')) return true;
    if (path.endsWith('umcsent.csv')) return 'umcsent.csv' in fixtureData;
    if (path.endsWith('gdelt_tone.csv')) return 'gdelt_tone.csv' in fixtureData;
    if (path.endsWith('mediacloud_volume.csv')) return 'mediacloud_volume.csv' in fixtureData;
    if (path.endsWith('gallup_approval.csv')) return 'gallup_approval.csv' in fixtureData;
    return true;
  },
  mkdirSync: () => {},
}));

import { buildSentiment } from '../../../../pipeline/build/sentiment';

describe('buildSentiment', () => {
  beforeEach(() => {
    for (const k of Object.keys(writtenFiles)) delete writtenFiles[k];
    for (const k of Object.keys(fixtureData)) delete fixtureData[k];

    // Admin definitions required for tagging
    fixtureData['administrations.csv'] = [
      { president: 'Barack Obama', party: 'Democratic', start_date: '2009-01-20', effective_end: '2017-01-20', ongoing: 'FALSE' },
      { president: 'Donald Trump (1st term)', party: 'Republican', start_date: '2017-01-20', effective_end: '2021-01-20', ongoing: 'FALSE' },
      { president: 'Joe Biden', party: 'Democratic', start_date: '2021-01-20', effective_end: '2025-01-20', ongoing: 'FALSE' },
      { president: 'Donald Trump (2nd term)', party: 'Republican', start_date: '2025-01-20', effective_end: '2026-05-01', ongoing: 'TRUE' },
    ];
  });

  test('UMCSENT tagging by admin', async () => {
    fixtureData['umcsent.csv'] = [
      { date: '2017-02-01', value: 96.3 }, // mid-month Feb 14 -> Trump I
      { date: '2021-02-01', value: 76.8 }, // mid-month Feb 14 -> Biden
      { date: '2025-02-01', value: 64.7 }, // mid-month Feb 14 -> Trump II
    ];

    await buildSentiment();

    const umcKey = Object.keys(writtenFiles).find(k => k.endsWith('umcsent_monthly.csv'));
    expect(umcKey).toBeDefined();
    const umc = writtenFiles[umcKey!];

    const trump1 = umc.find((r: any) => r.date === '2017-02-01');
    expect(trump1?.president).toBe('Donald Trump (1st term)');

    const biden = umc.find((r: any) => r.date === '2021-02-01');
    expect(biden?.president).toBe('Joe Biden');

    const trump2 = umc.find((r: any) => r.date === '2025-02-01');
    expect(trump2?.president).toBe('Donald Trump (2nd term)');
  });

  test('baseline calculation is mean of all values', async () => {
    fixtureData['umcsent.csv'] = [
      { date: '2021-02-01', value: 80 },
      { date: '2021-03-01', value: 90 },
      { date: '2021-04-01', value: 100 },
    ];

    await buildSentiment();

    const sentKey = Object.keys(writtenFiles).find(k => k.endsWith('admin_sentiment.csv'));
    expect(sentKey).toBeDefined();
    const sent = writtenFiles[sentKey!];

    // Baseline row should have mean of 80, 90, 100 = 90
    const baseline = sent.find((r: any) => String(r.president).startsWith('BASELINE'));
    expect(baseline).toBeDefined();
    expect(baseline.umcsent_avg).toBe(90);
  });

  test('admin_sentiment has correct column set', async () => {
    fixtureData['umcsent.csv'] = [
      { date: '2021-02-01', value: 76.8 },
    ];

    await buildSentiment();

    const sentKey = Object.keys(writtenFiles).find(k => k.endsWith('admin_sentiment.csv'));
    const sent = writtenFiles[sentKey!];
    expect(sent.length).toBeGreaterThan(0);

    const row = sent[0];
    const expectedCols = [
      'president', 'party', 'umcsent_avg', 'umcsent_min', 'umcsent_max',
      'months', 'umcsent_vs_baseline', 'tone_avg', 'mc_stories_per_month_avg',
    ];
    for (const col of expectedCols) {
      expect(row).toHaveProperty(col);
    }
  });
});
