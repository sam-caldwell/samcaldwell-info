import { useState, useEffect } from 'specifyjs';
import { BarGraph, LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { fetchCsv } from '../../utils/csv.js';
import { fmtPct, fmtSignedPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { TabPanel } from '../../components/TabPanel.js';

interface AnnualRow {
  year: number;
  gdp_growth: number;
  unemployment: number;
  sp500_ret: number;
  recession: number;
  prototype: number;
}

interface QuarterlyRow {
  year: number;
  quarter: number;
  date: string;
  period: string;
  gdp_growth: number;
}

interface ComponentRow {
  year: number;
  consumption: number;
  investment: number;
  government: number;
  net_exports: number;
}

export function EconomyGrowth() {
  useSeoHead(
    'Economic Growth',
    'Real GDP growth: headline annual, quarterly detail, and expenditure components (consumption, investment, government, net exports) from 1999 to present.',
  );

  const [annual, setAnnual] = useState<AnnualRow[]>([]);
  const [quarterly, setQuarterly] = useState<QuarterlyRow[]>([]);
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCsv<AnnualRow>('/data/economy/annual.csv'),
      fetchCsv<QuarterlyRow>('/data/economy/quarterly.csv'),
      fetchCsv<ComponentRow>('/data/economy/gdp_components.csv'),
    ]).then(([a, q, c]) => {
      setAnnual(a);
      setQuarterly(q);
      setComponents(c);
      setLoading(false);
    });
  }, []);

  if (loading) return h(Loading, null);

  const asOfYear = Math.max(...annual.map(r => r.year));
  const completedYears = annual.filter(r => r.prototype === 0);
  const longRunAvg = completedYears.length
    ? completedYears.reduce((s, r) => s + r.gdp_growth, 0) / completedYears.length
    : 0;

  // Headline tab: BarGraph of annual GDP growth
  function headlineTab() {
    const barData = annual.map(r => ({
      label: r.prototype === 1 ? `${r.year}*` : String(r.year),
      value: r.gdp_growth,
      color: r.gdp_growth < 0 ? '#bc4749' : '#2a6f97',
    }));

    return h('div', null,
      h(VizWrapper, { title: `Real GDP growth, YoY % (* = current partial year)` },
        h(BarGraph, {
          data: barData,
          height: 360,
          showValues: true,
          title: 'Real GDP growth, YoY %',
        }),
      ),
      h('p', { style: { color: '#6c757d', fontSize: '0.9rem', marginTop: '8px' } },
        `Long-run average (completed years): ${longRunAvg.toFixed(2)}%`,
      ),
    );
  }

  // Quarterly detail tab: LineGraph
  function quarterlyTab() {
    const qData = quarterly
      .filter(r => r.gdp_growth != null && !isNaN(r.gdp_growth))
      .map((r, i) => ({ x: i, y: r.gdp_growth }));

    return h('div', null,
      h('p', { style: { color: '#495057', lineHeight: '1.5' } },
        'Every quarter since 1999 through the most recent available quarter. Recession periods are shaded.',
      ),
      h(VizWrapper, { title: 'Quarterly GDP growth' },
        h(LineGraph, {
          data: qData,
          lineColor: '#2a6f97',
          height: 340,
          title: 'Quarterly GDP growth (YoY proxy)',
        }),
      ),
    );
  }

  // Components tab: multi-line chart of GDP expenditure shares
  function componentsTab() {
    const multiLine = [
      {
        data: components.map((r, i) => ({ x: i, y: r.consumption })),
        color: '#2a6f97',
        label: 'Consumption (C)',
      },
      {
        data: components.map((r, i) => ({ x: i, y: r.investment })),
        color: '#2f9e44',
        label: 'Investment (I)',
      },
      {
        data: components.map((r, i) => ({ x: i, y: r.government })),
        color: '#e07a5f',
        label: 'Government (G)',
      },
      {
        data: components.map((r, i) => ({ x: i, y: r.net_exports })),
        color: '#6a4c93',
        label: 'Net exports (NX)',
      },
    ];

    return h('div', null,
      h('p', { style: { color: '#495057', lineHeight: '1.5' } },
        'Stacked area showing the expenditure breakdown. Each line represents the share of GDP for that component.',
      ),
      h(VizWrapper, { title: 'GDP expenditure components, share of GDP' },
        h(LineGraph, {
          multiLine,
          height: 360,
          title: 'GDP expenditure components, share of GDP',
        }),
      ),
    );
  }

  // Recession data grid
  const recessionRows = annual
    .filter(r => r.recession === 1)
    .map(r => ({
      year: r.year,
      gdp_growth: r.gdp_growth,
      unemployment: r.unemployment,
      sp500_ret: r.sp500_ret,
    }));

  return h('div', null,
    h('h1', null, 'Economic Growth'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Real GDP \u2014 headline, quarterly detail, and components',
    ),
    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'Use the tabs below to drill from the annual headline into quarterly detail and into the GDP expenditure components.',
    ),

    h('h2', { id: 'annual' }, 'Annual real GDP growth'),
    h(TabPanel, {
      tabs: [
        { label: 'Headline', content: headlineTab },
        { label: 'Quarterly detail', content: quarterlyTab },
        { label: 'Components (share of GDP)', content: componentsTab },
      ],
    }),

    // Recession depths table
    h('h2', { id: 'recessions' }, 'Recessions \u2014 how deep, how long?'),
    h(VizWrapper, { title: 'Recession years' },
      h(DataGrid, {
        columns: [
          { key: 'year', header: 'Year', width: '90px', sortable: true },
          {
            key: 'gdp_growth',
            header: 'GDP growth (%)',
            sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2a6f97', fontWeight: '600' },
              }, fmtPct(n));
            },
          },
          {
            key: 'unemployment',
            header: 'Unemployment (%)',
            sortable: true,
            render: (v: unknown) => fmtPct(v as number),
          },
          {
            key: 'sp500_ret',
            header: 'S&P 500 return (%)',
            sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2a6f97', fontWeight: '600' },
              }, fmtSignedPct(n));
            },
          },
        ],
        data: recessionRows,
        striped: true,
        compact: true,
        bordered: true,
      }),
    ),
  );
}
