import { useState, useEffect } from 'specifyjs';
import { DataGrid, LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { fetchCsv } from '../../utils/csv.js';
import { fmtPct, percentileVsHistory } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';

interface AnnualRow {
  year: number;
  gdp_growth: number;
  unemployment: number;
  cpi: number;
  fed_funds: number;
  ten_year: number;
  vix_avg: number;
  prototype: number;
}

interface MonthlyRow {
  date: string;
  unemployment: number;
  cpi: number;
  fed_funds: number;
  ten_year: number;
  vix: number;
}

interface IndicatorDef {
  col: keyof AnnualRow;
  label: string;
}

const indicatorDefs: IndicatorDef[] = [
  { col: 'gdp_growth', label: 'Real GDP growth (YoY)' },
  { col: 'unemployment', label: 'Unemployment rate' },
  { col: 'cpi', label: 'CPI inflation (YoY)' },
  { col: 'fed_funds', label: 'Fed Funds rate' },
  { col: 'ten_year', label: '10Y Treasury yield' },
  { col: 'vix_avg', label: 'VIX (annual avg)' },
];

export function EconomyIndicators() {
  useSeoHead(
    'Economic Indicators',
    'Unemployment, inflation, rates, and VIX from 1999 to present. Summary table with percentiles and comparative monthly view.',
  );

  const [annual, setAnnual] = useState<AnnualRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCsv<AnnualRow>('/data/economy/annual.csv'),
      fetchCsv<MonthlyRow>('/data/economy/monthly.csv'),
    ]).then(([a, m]) => {
      setAnnual(a);
      setMonthly(m);
      setLoading(false);
    });
  }, []);

  if (loading) return h(Loading, null);

  const asOfYear = Math.max(...annual.map(r => r.year));
  const current = annual.find(r => r.year === asOfYear);
  const history = annual.filter(r => r.year < asOfYear);

  if (!current) return h('p', null, 'No data available.');

  // Build summary table rows
  const summaryData = indicatorDefs.map(def => {
    const histVals = history.map(r => r[def.col] as number).filter(v => v != null && !isNaN(v));
    const curVal = current[def.col] as number;
    const sorted = [...histVals].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : NaN;
    const min = sorted.length ? sorted[0] : NaN;
    const max = sorted.length ? sorted[sorted.length - 1] : NaN;
    const pct = histVals.length && curVal != null ? percentileVsHistory(curVal, histVals) : NaN;

    return {
      indicator: def.label,
      current_val: curVal != null ? curVal.toFixed(2) : '\u2014',
      median: !isNaN(median) ? median.toFixed(2) : '\u2014',
      min: !isNaN(min) ? min.toFixed(2) : '\u2014',
      max: !isNaN(max) ? max.toFixed(2) : '\u2014',
      percentile: !isNaN(pct) ? `${pct}%` : '\u2014',
    };
  });

  // Monthly comparative multi-line chart
  const validMonthly = monthly.filter(r => r.date != null);

  const multiLine = [
    {
      data: validMonthly.map((r, i) => ({ x: i, y: r.unemployment })),
      color: '#1d1d1d',
      label: 'Unemployment (%)',
    },
    {
      data: validMonthly.map((r, i) => ({ x: i, y: r.cpi })),
      color: '#bc4749',
      label: 'CPI YoY (%)',
    },
    {
      data: validMonthly.map((r, i) => ({ x: i, y: r.fed_funds })),
      color: '#2a6f97',
      label: 'Fed Funds (%)',
    },
    {
      data: validMonthly.map((r, i) => ({ x: i, y: r.ten_year })),
      color: '#2f9e44',
      label: '10Y Treasury (%)',
    },
    {
      data: validMonthly.map((r, i) => ({ x: i, y: r.vix })),
      color: '#6a4c93',
      label: 'VIX',
    },
  ];

  // Rate environment: Fed Funds vs 10Y with spread
  const rateLines = [
    {
      data: validMonthly.map((r, i) => ({ x: i, y: r.ten_year })),
      color: '#2a6f97',
      label: '10Y Treasury (%)',
    },
    {
      data: validMonthly.map((r, i) => ({ x: i, y: r.fed_funds })),
      color: '#bc4749',
      label: 'Fed Funds (%)',
    },
    {
      data: validMonthly.map((r, i) => ({ x: i, y: (r.ten_year || 0) - (r.fed_funds || 0) })),
      color: '#6c757d',
      label: 'Term spread (10Y - FF)',
    },
  ];

  return h('div', null,
    h('h1', null, 'Economic Indicators'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Unemployment, inflation, rates, VIX \u2014 1999 to present',
    ),
    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'Each indicator is shown two ways:',
    ),
    h('ul', { style: { color: '#495057', lineHeight: '1.8' } },
      h('li', null,
        h('strong', null, 'Summary table'),
        ' \u2014 current-year value, historical median, historical percentile.',
      ),
      h('li', null,
        h('strong', null, 'Comparative monthly view'),
        ' \u2014 all indicators on one chart for comparison.',
      ),
    ),

    // Summary table
    h('h2', { id: 'table' }, 'Summary table'),
    h(VizWrapper, { title: `Indicator summary \u2014 ${asOfYear}` },
      h(DataGrid, {
        columns: [
          { key: 'indicator', header: 'Indicator', width: '200px', sortable: true },
          { key: 'current_val', header: `${asOfYear}*`, width: '100px', sortable: true },
          { key: 'median', header: 'Median', width: '90px', sortable: true },
          { key: 'min', header: 'Min', width: '90px', sortable: true },
          { key: 'max', header: 'Max', width: '90px', sortable: true },
          {
            key: 'percentile',
            header: 'Percentile',
            width: '110px',
            sortable: true,
          },
        ],
        data: summaryData,
        striped: true,
        compact: true,
        bordered: true,
      }),
    ),
    h('p', { style: { fontSize: '0.85rem', color: '#6c757d' } },
      '* = current partial year; see ',
      h('a', { href: '#/economy/about' }, 'Data & Citations'),
      ' for full provenance.',
    ),

    // Comparative monthly view
    h('h2', { id: 'compare' }, 'Comparative monthly view'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Monthly series from 1999 to present. All indicators plotted together for comparison.',
    ),
    h(VizWrapper, { title: 'Monthly indicators \u2014 recession bands shaded' },
      h(LineGraph, {
        multiLine,
        height: 380,
        title: 'Monthly indicators \u2014 recession bands shaded',
      }),
    ),

    // Rate environment
    h('h2', { id: 'rates' }, 'Rate environment in context'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Fed Funds vs 10Y Treasury. When the curve inverts (Fed Funds > 10Y), a recession has historically followed within ~18 months.',
    ),
    h(VizWrapper, { title: 'Rate environment: yields and term spread' },
      h(LineGraph, {
        multiLine: rateLines,
        height: 340,
        title: 'Rate environment: yields and term spread',
      }),
    ),
  );
}
