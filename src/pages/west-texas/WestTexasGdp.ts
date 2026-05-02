import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtDollars, fmtSignedPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { GdpAnnual } from '../../types.js';

const geoOrder = ['US', 'TX', 'sutton', 'schleicher', 'crockett', 'kimble'];
const geoColors: Record<string, string> = {
  US: '#1d3557',
  TX: '#2a6f97',
  sutton: '#e07a5f',
  schleicher: '#6a4c93',
  crockett: '#2f9e44',
  kimble: '#f2c14e',
};
const geoNames: Record<string, string> = {
  US: 'United States',
  TX: 'Texas',
  sutton: 'Sutton Co. (Sonora)',
  schleicher: 'Schleicher Co. (Eldorado)',
  crockett: 'Crockett Co. (Ozona)',
  kimble: 'Kimble Co. (Junction)',
};

export function WestTexasGdp() {
  useSeoHead(
    'West Texas Economic Output',
    'Annual GDP \u2014 Texas vs. national, with county-level output where available from the Bureau of Economic Analysis.',
  );

  const data = getCsv<GdpAnnual>('/data/west-texas/gdp_annual.csv');
  if (!data) return h(Loading, null);

  const haveData = data.length > 0 && new Set(data.map(r => r.geo)).size > 1;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Build multi-line data for GDP growth
  const geos = geoOrder.filter(g => data.some(r => r.geo === g && r.gdp_growth_pct != null && !isNaN(r.gdp_growth_pct)));
  const growthData = data.filter(r => r.gdp_growth_pct != null && !isNaN(r.gdp_growth_pct));
  const allYears = [...new Set(growthData.map(r => r.year))].sort((a, b) => a - b);
  const yearIndex = new Map(allYears.map((y, i) => [y, i]));

  const multiLine = geos.map(geo => {
    const geoData = growthData
      .filter(r => r.geo === geo)
      .sort((a, b) => a.year - b.year)
      .map(r => ({
        x: yearIndex.get(r.year) || 0,
        y: r.gdp_growth_pct,
      }));
    return {
      data: geoData,
      color: geoColors[geo] || '#6c757d',
      label: geoNames[geo] || geo,
    };
  }).filter(s => s.data.length > 0);

  // Wide-format GDP table
  const allGeosForTable = geoOrder.filter(g => data.some(r => r.geo === g));
  const allTableYears = [...new Set(data.map(r => r.year))].sort((a, b) => b - a);

  const wideData = allTableYears.map(year => {
    const row: Record<string, unknown> = { year };
    allGeosForTable.forEach(geo => {
      const match = data.find(r => r.geo === geo && r.year === year);
      const label = geoNames[geo] || geo;
      row[label] = match?.gdp ?? null;
    });
    return row;
  });

  const tableColumns = [
    { key: 'year', header: 'Year', sortable: true },
    ...allGeosForTable.map(geo => ({
      key: geoNames[geo] || geo,
      header: geoNames[geo] || geo,
      sortable: true,
      render: (v: unknown) => {
        const n = v as number;
        return n != null && !isNaN(n) ? fmtDollars(n, 0) : '\u2014';
      },
    })),
  ];

  return h('div', null,
    h('h1', null, 'Economic Output'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Annual GDP \u2014 Texas vs. national, with county-level output where available',
    ),

    h('p', { style: proseStyle },
      'Annual gross domestic product from the Bureau of Economic Analysis. State and national GDP data come from FRED (TXRGSP, GDPC1); county-level GDP comes from BEA\'s CAGDP1 table.',
    ),

    h(Callout, { type: 'note', title: 'County GDP caveats' },
      'County GDP for very small counties may be suppressed by the BEA for confidentiality. Where available, the data shows the total market value of goods and services produced within the county \u2014 heavily influenced by oil and gas extraction and ranching in this region.',
    ),

    // GDP growth chart
    haveData && multiLine.length > 0
      ? h('div', null,
          h('h2', { id: 'growth' }, 'Annual GDP Growth'),
          h(VizWrapper, { title: 'Annual GDP growth \u2014 BEA CAGDP1 + FRED | Year-over-year % change' },
            h(LineGraph, {
        pointRadius: 2,
              data: [],
        multiLine,
              height: 420,
              title: 'Annual GDP Growth',
            }),
          ),
        )
      : h(Callout, { type: 'warning' },
          h('span', null,
            'GDP data not yet available. The BEA API key must be activated and the data pipeline run to populate this page. Check the ',
            h('a', { href: '#/west-texas/about' }, 'Methodology'),
            ' page for details.',
          ),
        ),

    // GDP table
    haveData && wideData.length > 0
      ? h('div', null,
          h('h2', { id: 'table' }, 'GDP by Year'),
          h(VizWrapper, { title: 'GDP comparison by year' },
            h(DataGrid, {
              columns: tableColumns,
              data: wideData,
              pageSize: 15,
              striped: true,
              compact: true,
            }),
          ),
        )
      : null,
  );
}
