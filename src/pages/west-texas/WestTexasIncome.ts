import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtDollars } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { IncomeAnnual } from '../../types.js';

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

export function WestTexasIncome() {
  useSeoHead(
    'West Texas Per-Capita Income',
    'Annual per-capita personal income \u2014 county vs. state vs. national from the Bureau of Economic Analysis.',
  );

  const data = getCsv<IncomeAnnual>('/data/west-texas/income_annual.csv');
  if (!data) return h(Loading, null);

  const haveData = data.length > 0 && new Set(data.map(r => r.geo)).size > 1;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Build multi-line data: one series per geo, x = year
  const geos = geoOrder.filter(g => data.some(r => r.geo === g));
  const allYears = [...new Set(data.map(r => r.year))].sort((a, b) => a - b);
  const yearIndex = new Map(allYears.map((y, i) => [y, i]));

  const multiLine = geos.map(geo => {
    const geoData = data
      .filter(r => r.geo === geo && r.value != null && !isNaN(r.value))
      .sort((a, b) => a.year - b.year)
      .map(r => ({
        x: yearIndex.get(r.year) || 0,
        y: r.value,
      }));
    return {
      data: geoData,
      color: geoColors[geo] || '#6c757d',
      label: geoNames[geo] || geo,
    };
  }).filter(s => s.data.length > 0);

  // Wide-format table: one column per geo, rows by year (descending)
  const wideData = allYears
    .sort((a, b) => b - a)
    .map(year => {
      const row: Record<string, unknown> = { year };
      geos.forEach(geo => {
        const match = data.find(r => r.geo === geo && r.year === year);
        const label = geoNames[geo] || geo;
        row[label] = match?.value ?? null;
      });
      return row;
    });

  const tableColumns = [
    { key: 'year', header: 'Year', sortable: true },
    ...geos.map(geo => ({
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
    h('h1', null, 'Per-Capita Income'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Annual per-capita personal income \u2014 county vs. state vs. national',
    ),

    h('p', { style: proseStyle },
      'Annual per-capita personal income from the Bureau of Economic Analysis (BEA) Regional Economic Accounts. Income includes wages, proprietors\' income, dividends, interest, rent, and transfer receipts.',
    ),

    h(Callout, { type: 'note', title: 'BEA publication lag' },
      'County-level income data is published annually with a lag of approximately 6\u20139 months. The most recent year shown may be one to two years behind the current calendar year.',
    ),

    // Multi-series chart
    haveData
      ? h('div', null,
          h('h2', { id: 'chart' }, 'Per-Capita Personal Income'),
          h(VizWrapper, { title: 'Per-capita personal income \u2014 BEA CAINC1 | Annual, by county' },
            h(LineGraph, {
        pointRadius: 2,
              data: [],
        multiLine,
              height: 420,
              title: 'Per-Capita Personal Income',
            }),
          ),
        )
      : h(Callout, { type: 'warning' },
          h('span', null,
            'Income data not yet available. The BEA API key must be activated and the data pipeline run to populate this page. Check the ',
            h('a', { href: '#/west-texas/about' }, 'Methodology'),
            ' page for details.',
          ),
        ),

    // Wide-format table
    haveData && wideData.length > 0
      ? h('div', null,
          h('h2', { id: 'table' }, 'Income by Year'),
          h(VizWrapper, { title: 'Per-capita income comparison by year' },
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
