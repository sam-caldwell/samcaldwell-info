import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtDollars, fmtNum } from '../../utils/formatters.js';
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

  // Build multi-line for GDP value (actual output)
  const validData = data.filter(r => r.value != null && !isNaN(Number(r.value)));
  const geos = geoOrder.filter(g => validData.some(r => r.geo === g));
  const allYears = [...new Set(validData.map(r => r.year))].sort((a, b) => a - b);
  const yearIndex = new Map(allYears.map((y, i) => [y, i]));

  // County GDP is thousands of dollars; US/TX GDP is billions.
  // Separate county-level chart from national/state since scales differ vastly.
  const countyGeos = geos.filter(g => !['US', 'TX'].includes(g));
  const countyLines = countyGeos.map(geo => {
    const geoData = validData
      .filter(r => r.geo === geo)
      .sort((a, b) => a.year - b.year)
      .map(r => ({ x: yearIndex.get(r.year) || 0, y: Number(r.value) }));
    return { data: geoData, color: geoColors[geo] || '#6c757d', label: geoNames[geo] || geo };
  }).filter(s => s.data.length > 0);

  // Wide-format GDP table
  const allGeosForTable = geoOrder.filter(g => data.some(r => r.geo === g));
  const allTableYears = [...new Set(data.map(r => r.year))].sort((a, b) => b - a);

  const wideData = allTableYears.map(year => {
    const row: Record<string, unknown> = { year };
    allGeosForTable.forEach(geo => {
      const match = data.find(r => r.geo === geo && r.year === year);
      const label = geoNames[geo] || geo;
      row[label] = match?.value ?? null;
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
        return n != null && !isNaN(n) ? fmtNum(n, 0) : '\u2014';
      },
    })),
  ];

  return h('div', null,
    h('h1', null, 'Economic Output'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Annual GDP \u2014 county-level output from the Bureau of Economic Analysis',
    ),

    h('p', { style: proseStyle },
      'Annual gross domestic product from BEA\'s CAGDP1 table. County GDP reflects the total market value of goods and services produced within each county \u2014 heavily influenced by oil and gas extraction and ranching in this region.',
    ),

    h(Callout, { type: 'note', title: 'County GDP caveats' },
      'County GDP for very small counties may be suppressed by the BEA for confidentiality. Values shown are in thousands of dollars.',
    ),

    // County GDP chart
    haveData && countyLines.length > 0
      ? h('div', null,
          h('h2', { id: 'chart' }, 'County GDP Over Time'),
          h('p', { style: { color: '#495057', lineHeight: '1.5' } },
            'Annual GDP (thousands of dollars) for four West Texas counties. The x-axis represents years from ',
            String(allYears[0] || ''),
            ' to ',
            String(allYears[allYears.length - 1] || ''),
            '.',
          ),
          h(VizWrapper, { title: 'County GDP \u2014 BEA CAGDP1 (thousands $)' },
            h(LineGraph, {
              pointRadius: 2,
              data: [],
              multiLine: countyLines,
              height: 420,
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

    // GDP table
    haveData && wideData.length > 0
      ? h('div', null,
          h('h2', { id: 'table' }, 'GDP by Year'),
          h('p', { style: { color: '#495057', lineHeight: '1.5' } },
            'Full comparison table. Values in thousands of dollars for counties.',
          ),
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
