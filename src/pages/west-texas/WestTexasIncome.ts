import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtDollars } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { IncomeAnnual } from '../../types.js';
import { COUNTIES, geoNames, benchmarkColors, getCountyColor } from './geo-config.js';

export function WestTexasIncome() {
  useSeoHead(
    'West Texas Per-Capita Income',
    'Annual per-capita personal income \u2014 30 West Texas counties vs. state vs. national from the Bureau of Economic Analysis.',
  );

  const data = getCsv<IncomeAnnual>('/data/west-texas/income_annual.csv');
  if (!data) return h(Loading, null);

  const haveData = data.length > 0 && new Set(data.map(r => r.geo)).size > 1;
  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Compute regional average per year
  const yearBuckets = new Map<number, number[]>();
  for (const r of data) {
    if (COUNTIES.includes(r.geo as any) && r.value != null && !isNaN(r.value)) {
      if (!yearBuckets.has(r.year)) yearBuckets.set(r.year, []);
      yearBuckets.get(r.year)!.push(r.value);
    }
  }

  // Overview chart: US, TX, Regional Average
  const overviewLines = [
    { geo: 'US', color: benchmarkColors.US, label: 'United States' },
    { geo: 'TX', color: benchmarkColors.TX, label: 'Texas' },
  ].map(({ geo, color, label }) => ({
    data: data
      .filter(r => r.geo === geo && r.value != null)
      .sort((a, b) => a.year - b.year)
      .map(r => ({ x: r.year, y: r.value })),
    color,
    label,
  })).filter(s => s.data.length > 0);

  const regionalAvgData = [...yearBuckets.entries()]
    .filter(([, vals]) => vals.length >= 3)
    .map(([year, vals]) => ({ x: year, y: vals.reduce((a, b) => a + b, 0) / vals.length }))
    .sort((a, b) => a.x - b.x);

  if (regionalAvgData.length > 0) {
    overviewLines.push({ data: regionalAvgData, color: '#e07a5f', label: 'West TX Region (avg)' });
  }

  // Latest income table: all geos
  const countyGeos = [...COUNTIES].filter(g => data.some(r => r.geo === g));
  const allGeos = ['US', 'TX', ...countyGeos];
  const latestByGeo = allGeos.map(geo => {
    const geoRows = data.filter(r => r.geo === geo && r.value != null);
    if (geoRows.length === 0) return null;
    const latest = geoRows.reduce((best, r) => r.year > best.year ? r : best);
    return {
      geography: geoNames[geo] || geo,
      latest_income: latest.value,
      year: latest.year,
    };
  }).filter(Boolean) as Array<{ geography: string; latest_income: number; year: number }>;

  return h('div', null,
    h('h1', null, 'Per-Capita Income'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Annual per-capita personal income \u2014 30 West Texas counties vs. state vs. national',
    ),

    h('p', { style: proseStyle },
      'Annual per-capita personal income from the Bureau of Economic Analysis (BEA) Regional Economic Accounts for all 30 counties in the Texas Comptroller\'s West Texas region.',
    ),

    h(Callout, { type: 'note', title: 'BEA publication lag' },
      'County-level income data is published annually with a lag of approximately 6\u20139 months. Some small counties may have data suppressed for confidentiality.',
    ),

    // Overview chart
    haveData
      ? h('div', null,
          h('h2', { id: 'overview' }, 'Regional Overview'),
          h(VizWrapper, { title: 'Per-capita income \u2014 US vs. Texas vs. West TX regional average' },
            h(LineGraph, {
              pointRadius: 2,
              data: [],
              multiLine: overviewLines,
              height: 420,
              title: 'Per-Capita Income \u2014 Regional Overview',
            }),
          ),
        )
      : h(Callout, { type: 'warning' },
          h('span', null,
            'Income data not yet available. The BEA API key must be activated and the data pipeline run. See ',
            h('a', { href: '#/west-texas/about' }, 'Methodology'),
            '.',
          ),
        ),

    // Latest income table
    haveData && latestByGeo.length > 0
      ? h('div', null,
          h('h2', { id: 'latest' }, 'Latest Per-Capita Income'),
          h(VizWrapper, { title: 'Most recent per-capita income by geography' },
            h(DataGrid, {
              columns: [
                { key: 'geography', header: 'Geography', sortable: true },
                {
                  key: 'latest_income',
                  header: 'Per-Capita Income',
                  sortable: true,
                  render: (v: unknown) => {
                    const n = v as number;
                    return n != null && !isNaN(n) ? fmtDollars(n, 0) : '\u2014';
                  },
                },
                { key: 'year', header: 'Year', sortable: true },
              ],
              data: latestByGeo,
              pageSize: 35,
              striped: true,
              compact: true,
            }),
          ),
        )
      : null,
  );
}
