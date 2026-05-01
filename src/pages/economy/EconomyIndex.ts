import { useState, useEffect } from 'specifyjs';
import { DataGrid, LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { fetchCsv } from '../../utils/csv.js';
import { fmtPct, fmtSignedPct, percentileVsHistory, toneBySign } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { ValueCard } from '../../components/ValueCard.js';
import { CardRow } from '../../components/CardRow.js';
import { Callout } from '../../components/Callout.js';

interface AnnualRow {
  year: number;
  gdp_growth: number;
  unemployment: number;
  cpi: number;
  fed_funds: number;
  ten_year: number;
  sp500_ret: number;
  vix_avg: number;
  prototype: number;
  recession: number;
}

interface MonthlyRow {
  date: string;
  sp500_level: number;
}

function toneByThreshold(v: number | null | undefined, threshold: number): 'positive' | 'negative' | 'neutral' {
  if (v == null || isNaN(v)) return 'neutral';
  return v <= threshold ? 'positive' : 'negative';
}

export function EconomyIndex() {
  useSeoHead(
    'US Economy 1999 to Present',
    'A visual analysis of the current year in the context of every year since 1999 — GDP, employment, inflation, rates, and markets.',
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
  const historyStart = Math.min(...history.map(r => r.year));

  if (!current) return h('p', null, 'No data available.');

  // Percentiles
  const gdpPct = percentileVsHistory(current.gdp_growth, history.map(r => r.gdp_growth));
  const urPct = percentileVsHistory(current.unemployment, history.map(r => r.unemployment));
  const cpiPct = percentileVsHistory(current.cpi, history.map(r => r.cpi));
  const spPct = percentileVsHistory(current.sp500_ret, history.map(r => r.sp500_ret));

  const vsLabel = ` vs ${historyStart}\u2013${asOfYear - 1}`;
  const pctSublabel = (pct: number, suffix = '') =>
    `${pct}th percentile${suffix}`;

  // Summary DataGrid: each indicator with range data
  const indicators = [
    { name: 'GDP growth', col: 'gdp_growth' as const },
    { name: 'Unemployment', col: 'unemployment' as const },
    { name: 'CPI inflation', col: 'cpi' as const },
    { name: 'Fed Funds', col: 'fed_funds' as const },
    { name: '10Y Treasury', col: 'ten_year' as const },
    { name: 'S&P 500 return', col: 'sp500_ret' as const },
    { name: 'VIX (avg)', col: 'vix_avg' as const },
  ];

  const rangeData = indicators.map(ind => {
    const vals = history.map(r => r[ind.col]).filter(v => v != null && !isNaN(v));
    const curVal = current[ind.col];
    return {
      indicator: ind.name,
      current: curVal != null ? curVal.toFixed(2) : '\u2014',
      min: vals.length ? Math.min(...vals).toFixed(2) : '\u2014',
      max: vals.length ? Math.max(...vals).toFixed(2) : '\u2014',
      median: vals.length ? vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)].toFixed(2) : '\u2014',
      percentile: vals.length && curVal != null ? `${percentileVsHistory(curVal, vals)}%` : '\u2014',
    };
  });

  // S&P 500 line data
  const sp500Data = monthly
    .filter(r => r.sp500_level != null && !isNaN(r.sp500_level))
    .map((r, i) => ({ x: i, y: r.sp500_level }));

  return h('div', null,
    h('h1', null, `US Economy 1999 to Present`),
    h('p', { style: { color: '#495057', fontSize: '1.05rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'An interactive drill-down analysis of the US economy placed against every year since 1999. Use the sidebar to move between panels, or click the links at the bottom of this page.',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Macro data'),
        ' comes from FRED (public-domain US government series, refreshed daily). ',
        h('strong', null, 'Market data'),
        ' (S&P 500, Dow, NASDAQ, VIX, sector returns) is a calibrated synthetic overlay \u2014 FRED\'s proprietary market licenses prohibit redistribution of the raw series. The current (partial) year is flagged with an asterisk. See ',
        h('a', { href: '#/economy/about' }, 'Data & Citations'),
        ' for the full data dictionary and source attribution.',
      ),
    ),

    // Snapshot cards
    h('h2', { id: 'snapshot' }, `${asOfYear} Snapshot`),
    h(CardRow, null,
      h(ValueCard, {
        label: 'Real GDP growth (YoY)',
        value: fmtSignedPct(current.gdp_growth),
        sublabel: pctSublabel(gdpPct, vsLabel),
        tone: toneBySign(current.gdp_growth),
      }),
      h(ValueCard, {
        label: 'Unemployment rate',
        value: fmtPct(current.unemployment),
        sublabel: pctSublabel(urPct, ' (lower = better)'),
        tone: toneByThreshold(current.unemployment, 5),
      }),
      h(ValueCard, {
        label: 'CPI inflation (YoY)',
        value: fmtPct(current.cpi),
        sublabel: pctSublabel(cpiPct),
        tone: toneByThreshold(current.cpi, 3),
      }),
      h(ValueCard, {
        label: 'Fed Funds target',
        value: fmtPct(current.fed_funds, 2),
        sublabel: 'Upper bound, period avg',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: '10Y Treasury',
        value: fmtPct(current.ten_year, 2),
        sublabel: 'Period avg',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'S&P 500 (YTD)',
        value: fmtSignedPct(current.sp500_ret),
        sublabel: pctSublabel(spPct),
        tone: toneBySign(current.sp500_ret),
      }),
    ),

    // Range comparison table
    h('h2', { id: 'range' }, 'Where does the current year sit in the historical range?'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      `Each row shows the range of every year since 1999 (excluding the current partial year) for a given indicator, with the current year's value and percentile.`,
    ),
    h(VizWrapper, { title: `${asOfYear} values vs ${historyStart}\u2013${asOfYear - 1} range` },
      h(DataGrid, {
        columns: [
          { key: 'indicator', header: 'Indicator', width: '180px', sortable: true },
          { key: 'current', header: `${asOfYear}*`, width: '100px', sortable: true },
          { key: 'min', header: 'Min', width: '90px', sortable: true },
          { key: 'median', header: 'Median', width: '90px', sortable: true },
          { key: 'max', header: 'Max', width: '90px', sortable: true },
          { key: 'percentile', header: 'Percentile', width: '100px', sortable: true },
        ],
        data: rangeData,
        striped: true,
        compact: true,
        bordered: true,
      }),
    ),

    // S&P 500 monthly chart
    h('h2', { id: 'sp500' }, 'S&P 500 over the full history'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Monthly S&P 500 index level from 1999 to present.',
    ),
    h(VizWrapper, { title: 'S&P 500 \u2014 monthly level' },
      h(LineGraph, {
        data: sp500Data,
        lineColor: '#2a6f97',
        showArea: true,
        height: 320,
        title: 'S&P 500 \u2014 monthly level',
      }),
    ),

    // Where to go next
    h('h2', { id: 'next' }, 'Where to go next'),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/economy/growth' }, h('strong', null, 'Economic Growth \u2192')),
        ' \u2014 GDP growth, quarterly detail, and GDP components (consumption / investment / government / net exports).',
      ),
      h('li', null,
        h('a', { href: '#/economy/indicators' }, h('strong', null, 'Indicators \u2192')),
        ' \u2014 Unemployment, inflation, rates, VIX \u2014 filterable table with historical context; click a row for the full time series.',
      ),
      h('li', null,
        h('a', { href: '#/economy/unemployment' }, h('strong', null, 'Unemployment Deep-Dive \u2192')),
        ' \u2014 Monthly unemployment with 1/5/10-year rolling averages, administration bands, and a pandemic-excluded adjusted average.',
      ),
      h('li', null,
        h('a', { href: '#/economy/markets' }, h('strong', null, 'Economy vs Markets \u2192')),
        ' \u2014 Do markets actually track economic growth? Correlation scatter, dual-axis view, and sector treemap.',
      ),
      h('li', null,
        h('a', { href: '#/economy/about' }, h('strong', null, 'Data & Citations \u2192')),
        ' \u2014 Data dictionary, source attribution, and licensing.',
      ),
    ),
  );
}
