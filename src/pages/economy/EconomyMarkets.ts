import { DataGrid, LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct, fmtSignedPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';

interface AnnualRow {
  year: number;
  gdp_growth: number;
  unemployment: number;
  cpi: number;
  fed_funds: number;
  ten_year: number;
  sp500_ret: number;
  dow_ret: number;
  nasdaq_ret: number;
  vix_avg: number;
  prototype: number;
}

interface SectorRow {
  year: number;
  sector: string;
  return_pct: number;
}

/** Pearson correlation between two number arrays */
function pearsonR(xs: number[], ys: number[]): number | null {
  const pairs: [number, number][] = [];
  for (let i = 0; i < xs.length && i < ys.length; i++) {
    if (xs[i] != null && ys[i] != null && !isNaN(xs[i]) && !isNaN(ys[i])) {
      pairs.push([xs[i], ys[i]]);
    }
  }
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? null : num / denom;
}

export function EconomyMarkets() {
  useSeoHead(
    'Economy vs Markets',
    'Do equities actually track economic fundamentals? GDP vs S&P 500, correlation analysis, and sector returns by year.',
  );

  const annual = getCsv<AnnualRow>('/data/economy/annual.csv');
  const sectors = getCsv<SectorRow>('/data/economy/sectors.csv');
  if (!annual || !sectors) return h(Loading, null);

  const asOfYear = Math.max(...annual.map(r => r.year));
  const completed = annual.filter(r => r.prototype === 0);

  // GDP vs S&P dual-axis: render as two overlaid line series
  const gdpLine = annual.filter(r => r.gdp_growth != null && !isNaN(Number(r.gdp_growth))).map((r, i) => ({ x: i, y: Number(r.gdp_growth) }));
  const sp500Line = annual.filter(r => r.sp500_ret != null && !isNaN(Number(r.sp500_ret))).map((r, i) => ({ x: i, y: Number(r.sp500_ret) }));

  const dualAxisLines = [
    { data: gdpLine, color: '#2a6f97', label: 'GDP growth (%)' },
    { data: sp500Line, color: '#bc4749', label: 'S&P 500 return (%)' },
  ].filter(s => s.data.length > 0);

  // Correlation table
  const corPairs = [
    { pair: 'GDP vs S&P 500', xs: completed.map(r => r.gdp_growth), ys: completed.map(r => r.sp500_ret) },
    { pair: 'GDP vs Dow', xs: completed.map(r => r.gdp_growth), ys: completed.map(r => r.dow_ret) },
    { pair: 'GDP vs NASDAQ', xs: completed.map(r => r.gdp_growth), ys: completed.map(r => r.nasdaq_ret) },
    { pair: 'CPI vs S&P 500', xs: completed.map(r => r.cpi), ys: completed.map(r => r.sp500_ret) },
    { pair: 'Unemployment vs S&P 500', xs: completed.map(r => r.unemployment), ys: completed.map(r => r.sp500_ret) },
    { pair: '10Y yield vs S&P 500', xs: completed.map(r => r.ten_year), ys: completed.map(r => r.sp500_ret) },
  ];

  const correlationData = corPairs.map(cp => {
    const r = pearsonR(cp.xs, cp.ys);
    return {
      pair: cp.pair,
      correlation: r != null ? r.toFixed(2) : '\u2014',
    };
  });

  // Market returns by year DataGrid
  const marketReturns = annual.map(r => ({
    year: r.prototype === 1 ? `${r.year}*` : String(r.year),
    gdp_growth: r.gdp_growth,
    sp500_ret: r.sp500_ret,
    dow_ret: r.dow_ret,
    nasdaq_ret: r.nasdaq_ret,
    vix_avg: r.vix_avg,
  }));

  // Sector returns DataGrid
  const sectorData = sectors.map(r => ({
    year: r.year,
    sector: r.sector,
    return_pct: r.return_pct,
  }));

  return h('div', null,
    h('h1', null, 'Economy vs Markets'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Do equities actually track economic fundamentals?',
    ),
    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'A recurring question: how tightly is the stock market coupled to economic growth? This page puts the two side-by-side, looks at correlations, and lets you drill into S&P 500 sector performance by year.',
    ),

    // Dual-axis GDP vs S&P 500
    h('h2', { id: 'dual' }, 'Annual GDP growth vs S&P 500 return'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Two very different pictures in the same window \u2014 equity returns are far more volatile than GDP.',
    ),
    h(VizWrapper, { title: 'GDP growth (blue) vs S&P 500 return (red)' },
      h(LineGraph, {
        data: [],
        multiLine: dualAxisLines,
        height: 360,
        title: 'GDP growth vs S&P 500 return',
      }),
    ),

    // Correlation table
    h('h2', { id: 'corr' }, 'How correlated are they, really?'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Each row compares a pair of indicators across completed years. The 2020 COVID year and the 2022 inflation shock pull the relationship around quite a bit.',
    ),
    h(VizWrapper, { title: 'Correlations across indicators (completed years)' },
      h(DataGrid, {
        columns: [
          { key: 'pair', header: 'Indicator pair (completed years)', width: '280px' },
          {
            key: 'correlation',
            header: 'Pearson r',
            width: '120px',
            sortable: true,
            render: (v: unknown) => {
              const s = v as string;
              if (s === '\u2014') return h('span', { style: { color: '#6c757d' } }, '\u2014');
              const n = parseFloat(s);
              const color = n > 0 ? '#2f9e44' : '#bc4749';
              return h('span', { style: { fontWeight: '600', color } }, s);
            },
          },
        ],
        data: correlationData,
        striped: true,
        compact: true,
        bordered: true,
      }),
    ),

    // Market returns DataGrid
    h('h2', { id: 'returns' }, 'Market returns by year'),
    h(VizWrapper, { title: 'Annual market returns and economic indicators' },
      h(DataGrid, {
        columns: [
          { key: 'year', header: 'Year', width: '80px', sortable: true },
          {
            key: 'gdp_growth',
            header: 'GDP growth (%)',
            width: '120px',
            sortable: true,
            render: (v: unknown) => fmtSignedPct(v as number),
          },
          {
            key: 'sp500_ret',
            header: 'S&P 500 (%)',
            width: '110px',
            sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, fmtSignedPct(n));
            },
          },
          {
            key: 'dow_ret',
            header: 'Dow (%)',
            width: '100px',
            sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, fmtSignedPct(n));
            },
          },
          {
            key: 'nasdaq_ret',
            header: 'NASDAQ (%)',
            width: '110px',
            sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, fmtSignedPct(n));
            },
          },
          {
            key: 'vix_avg',
            header: 'VIX (avg)',
            width: '90px',
            sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null && !isNaN(n) ? n.toFixed(1) : '\u2014';
            },
          },
        ],
        data: marketReturns,
        pageSize: 30,
        striped: true,
        compact: true,
        bordered: true,
      }),
    ),

    // Sector returns
    h('h2', { id: 'sectors' }, 'S&P 500 sector returns'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Sector tile size is scaled by absolute return; color shows sign (green = positive, red = negative). Browse by year and sector below.',
    ),
    h(VizWrapper, { title: 'Sector returns by year' },
      h(DataGrid, {
        columns: [
          { key: 'year', header: 'Year', width: '80px', sortable: true, filterable: true },
          { key: 'sector', header: 'Sector', width: '220px', sortable: true, filterable: true },
          {
            key: 'return_pct',
            header: 'Return (%)',
            width: '120px',
            sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, fmtSignedPct(n));
            },
          },
        ],
        data: sectorData,
        pageSize: 20,
        striped: true,
        compact: true,
        bordered: true,
      }),
    ),
  );
}
