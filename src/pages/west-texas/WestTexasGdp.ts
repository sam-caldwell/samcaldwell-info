import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { GdpAnnual } from '../../types.js';
import { COUNTIES, geoNames, getCountyColor } from './geo-config.js';

export function WestTexasGdp() {
  useSeoHead(
    'West Texas Economic Output',
    'Annual GDP \u2014 30 West Texas counties with year-over-year growth from the Bureau of Economic Analysis.',
  );

  const data = getCsv<GdpAnnual>('/data/west-texas/gdp_annual.csv');
  if (!data) return h(Loading, null);

  const haveData = data.length > 0 && new Set(data.map(r => r.geo)).size > 1;
  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  const validData = data.filter(r => r.value != null && !isNaN(Number(r.value)));

  // County GDP chart (counties only — US/TX scale differs vastly)
  const countyGeos = [...COUNTIES].filter(g => validData.some(r => r.geo === g));
  const countyLines = countyGeos.map(geo => {
    const geoData = validData
      .filter(r => r.geo === geo)
      .sort((a, b) => a.year - b.year)
      .map(r => ({ x: r.year, y: Number(r.value) }));
    return { data: geoData, color: getCountyColor(geo), label: geoNames[geo] || geo };
  }).filter(s => s.data.length > 0);

  // Latest GDP table: all geos
  const allGeos = ['US', 'TX', ...countyGeos];
  const latestByGeo = allGeos.map(geo => {
    const geoRows = validData.filter(r => r.geo === geo);
    if (geoRows.length === 0) return null;
    const latest = geoRows.reduce((best, r) => r.year > best.year ? r : best);
    const growthRow = data.find(r => r.geo === geo && r.year === latest.year);
    return {
      geography: geoNames[geo] || geo,
      gdp: latest.value,
      growth_pct: growthRow?.gdp_growth_pct ?? null,
      year: latest.year,
    };
  }).filter(Boolean) as Array<{ geography: string; gdp: number; growth_pct: number | null; year: number }>;

  return h('div', null,
    h('h1', null, 'Economic Output'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Annual GDP \u2014 30 West Texas counties from the Bureau of Economic Analysis',
    ),

    h('p', { style: proseStyle },
      'Annual gross domestic product from BEA\'s CAGDP1 table for all 30 counties in the Texas Comptroller\'s West Texas region. County GDP reflects the total market value of goods and services produced within each county.',
    ),

    h(Callout, { type: 'note', title: 'County GDP caveats' },
      'County GDP for very small counties may be suppressed by the BEA for confidentiality. County values are in thousands of dollars; US and Texas values are in millions.',
    ),

    // County GDP chart
    haveData && countyLines.length > 0
      ? h('div', null,
          h('h2', { id: 'chart' }, 'County GDP Over Time'),
          h(VizWrapper, { title: 'County GDP \u2014 BEA CAGDP1 (thousands $)' },
            h(LineGraph, {
              pointRadius: 1,
              data: [],
              multiLine: countyLines,
              height: 500,
              title: 'County GDP (thousands $)',
            }),
          ),
        )
      : h(Callout, { type: 'warning' },
          h('span', null,
            'GDP chart data not yet available. The BEA API key must be activated and the data pipeline run. See ',
            h('a', { href: '#/west-texas/about' }, 'Methodology'),
            '.',
          ),
        ),

    // Latest GDP table
    haveData && latestByGeo.length > 0
      ? h('div', null,
          h('h2', { id: 'table' }, 'Latest GDP by Geography'),
          h(VizWrapper, { title: 'Most recent GDP and growth by geography' },
            h(DataGrid, {
              columns: [
                { key: 'geography', header: 'Geography', sortable: true },
                { key: 'gdp', header: 'GDP', sortable: true, render: (v: unknown) => {
                  const n = v as number;
                  return n != null && !isNaN(n) ? fmtNum(n, 0) : '\u2014';
                }},
                { key: 'growth_pct', header: 'YoY Growth %', sortable: true, render: (v: unknown) => {
                  const n = v as number;
                  return n != null && !isNaN(n) ? n.toFixed(1) + '%' : '\u2014';
                }},
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
