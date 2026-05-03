import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { UnemploymentMonthly } from '../../types.js';
import { COUNTIES, geoNames, benchmarkColors, getCountyColor } from './geo-config.js';

export function WestTexasUnemployment() {
  useSeoHead(
    'West Texas Unemployment',
    'Monthly unemployment rates \u2014 US vs. Texas vs. 30 West Texas counties from 2005 to present.',
  );

  const data = getCsv<UnemploymentMonthly>('/data/west-texas/unemployment_monthly.csv');
  if (!data) return h(Loading, null);

  const haveData = data.length > 0 && new Set(data.map(r => r.geo)).size > 2;
  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Compute regional average per month for the overview chart
  const monthBuckets = new Map<string, number[]>();
  for (const r of data) {
    if (COUNTIES.includes(r.geo as any) && r.unemployment_rate != null && !isNaN(r.unemployment_rate)) {
      if (!monthBuckets.has(r.date)) monthBuckets.set(r.date, []);
      monthBuckets.get(r.date)!.push(r.unemployment_rate);
    }
  }

  const regionalAvgData = [...monthBuckets.entries()]
    .filter(([, vals]) => vals.length >= 3)
    .map(([date, vals]) => {
      const d = new Date(date);
      return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: vals.reduce((a, b) => a + b, 0) / vals.length };
    })
    .sort((a, b) => a.x - b.x);

  // Overview chart: US, TX, Regional Average
  const overviewLines = [
    { geo: 'US', color: benchmarkColors.US, label: 'United States' },
    { geo: 'TX', color: benchmarkColors.TX, label: 'Texas' },
  ].map(({ geo, color, label }) => ({
    data: data
      .filter(r => r.geo === geo && r.unemployment_rate != null)
      .map(r => { const d = new Date(r.date); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: r.unemployment_rate }; }),
    color,
    label,
  })).filter(s => s.data.length > 0);

  if (regionalAvgData.length > 0) {
    overviewLines.push({ data: regionalAvgData, color: '#e07a5f', label: 'West TX Region (30-county avg)' });
  }

  // All-county detail chart: just the counties (no US/TX to keep scale readable)
  const countyGeos = [...COUNTIES].filter(g => data.some(r => r.geo === g));
  const countyLines = countyGeos.map(geo => ({
    data: data
      .filter(r => r.geo === geo && r.unemployment_rate != null)
      .map(r => { const d = new Date(r.date); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: r.unemployment_rate }; }),
    color: getCountyColor(geo),
    label: geoNames[geo] || geo,
  })).filter(s => s.data.length > 0);

  // Latest values table (all geos)
  const allGeos = ['US', 'TX', ...countyGeos];
  const latestByGeo = allGeos.map(geo => {
    const geoRows = data.filter(r => r.geo === geo && r.unemployment_rate != null);
    if (geoRows.length === 0) return null;
    const latest = geoRows.reduce((best, r) => r.date > best.date ? r : best);
    return {
      geography: geoNames[geo] || geo,
      latest_rate: latest.unemployment_rate,
      as_of: latest.date,
    };
  }).filter(Boolean) as Array<{ geography: string; latest_rate: number; as_of: string }>;

  return h('div', null,
    h('h1', null, 'Unemployment'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Monthly unemployment rates \u2014 US vs. Texas vs. 30 West Texas counties',
    ),

    h('p', { style: proseStyle },
      'Monthly unemployment rates from the Bureau of Labor Statistics Local Area Unemployment Statistics (LAUS) program for all 30 counties in the Texas Comptroller\'s West Texas region.',
    ),

    h(Callout, { type: 'note', title: 'Regional definition' },
      'The West Texas region is defined by the Texas Comptroller of Public Accounts and includes 30 counties spanning the Edwards Plateau, Permian Basin, and Trans-Pecos areas. Many of these counties have populations under 5,000, so individual county rates can be volatile.',
    ),

    // Overview chart: US vs TX vs Regional Average
    haveData
      ? h('div', null,
          h('h2', { id: 'overview' }, 'Regional Overview'),
          h(VizWrapper, { title: 'Monthly unemployment rate \u2014 US vs. Texas vs. West TX regional average' },
            h(LineGraph, {
              pointRadius: 2,
              data: [],
              multiLine: overviewLines,
              height: 420,
              title: 'Unemployment Rate \u2014 Regional Overview',
            }),
          ),
        )
      : h(Callout, { type: 'warning' },
          'Unemployment data not yet available. Run the data pipeline to fetch BLS LAUS county data.',
        ),

    // All counties chart
    haveData && countyLines.length > 0
      ? h('div', null,
          h('h2', { id: 'counties' }, 'All Counties'),
          h('p', { style: proseStyle },
            'Individual unemployment rates for all 30 counties. Use the table below to sort and compare specific counties.',
          ),
          h(VizWrapper, { title: 'Monthly unemployment rate \u2014 all 30 West Texas counties' },
            h(LineGraph, {
              pointRadius: 1,
              data: [],
              multiLine: countyLines,
              height: 500,
              title: 'County Unemployment Rates',
            }),
          ),
        )
      : null,

    // Latest values table
    haveData && latestByGeo.length > 0
      ? h('div', null,
          h('h2', { id: 'latest' }, 'Latest Values'),
          h(VizWrapper, { title: 'Most recent unemployment rate by geography' },
            h(DataGrid, {
              columns: [
                { key: 'geography', header: 'Geography', sortable: true },
                {
                  key: 'latest_rate',
                  header: 'Latest Rate (%)',
                  sortable: true,
                  render: (v: unknown) => fmtPct(v as number),
                },
                { key: 'as_of', header: 'As Of', sortable: true },
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
