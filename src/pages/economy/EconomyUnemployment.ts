import { LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';

interface MonthlyRow {
  date: string;
  unemployment: number;
}

interface AdminRow {
  president: string;
  party: string;
  start_date: string;
  effective_end: string;
  ongoing: number;
}

/** Compute a trailing rolling mean over k values */
function rollingMean(values: number[], k: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < k - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - k + 1; j <= i; j++) sum += values[j];
      result.push(sum / k);
    }
  }
  return result;
}

/** Compute pandemic-excluded 5y rolling mean */
function rollingMeanExcluding(
  values: number[],
  dates: string[],
  k: number,
  excludeStart: string,
  excludeEnd: string,
): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const windowStart = Math.max(0, i - k + 1);
    const windowVals: number[] = [];
    for (let j = windowStart; j <= i; j++) {
      if (dates[j] < excludeStart || dates[j] > excludeEnd) {
        windowVals.push(values[j]);
      }
    }
    result.push(windowVals.length >= 24 ? windowVals.reduce((a, b) => a + b, 0) / windowVals.length : null);
  }
  return result;
}

export function EconomyUnemployment() {
  useSeoHead(
    'Unemployment \u2014 1999 to Present',
    'Monthly US unemployment rate with 1/5/10-year rolling averages, administration bands, and a pandemic-excluded adjusted average.',
  );

  const rawMonthly = getCsv<MonthlyRow>('/data/economy/monthly.csv');
  const admins = getCsv<AdminRow>('/data/presidential-economies/administrations.csv');
  if (!rawMonthly || !admins) return h(Loading, null);

  const monthly = rawMonthly
    .filter(r => r.unemployment != null && !isNaN(r.unemployment))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (monthly.length === 0) return h('p', null, 'No unemployment data available.');

  const values = monthly.map(r => r.unemployment);
  const dates = monthly.map(r => r.date);

  const avg1y = rollingMean(values, 12);
  const avg5y = rollingMean(values, 60);
  const avg10y = rollingMean(values, 120);
  const avg5yAdj = rollingMeanExcluding(values, dates, 60, '2020-03-01', '2021-12-31');

  // Build multi-line data
  const multiLine = [
    {
      data: values.map((v, i) => { const d = new Date(dates[i]); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: v }; }),
      color: '#1d1d1d',
      label: 'Unemployment (actual)',
    },
    {
      data: avg1y.map((v, i) => { const d = new Date(dates[i]); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: v ?? NaN }; }).filter(p => !isNaN(p.y)),
      color: '#2f9e44',
      label: '1-yr rolling avg',
    },
    {
      data: avg5y.map((v, i) => { const d = new Date(dates[i]); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: v ?? NaN }; }).filter(p => !isNaN(p.y)),
      color: '#e07a5f',
      label: '5-yr rolling avg',
    },
    {
      data: avg10y.map((v, i) => { const d = new Date(dates[i]); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: v ?? NaN }; }).filter(p => !isNaN(p.y)),
      color: '#6a4c93',
      label: '10-yr rolling avg',
    },
    {
      data: avg5yAdj.map((v, i) => { const d = new Date(dates[i]); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: v ?? NaN }; }).filter(p => !isNaN(p.y)),
      color: '#6c757d',
      label: '5-yr adj (excl. pandemic)',
    },
  ].filter(s => s.data.length > 0);

  return h('div', null,
    h('h1', null, 'Unemployment \u2014 1999 to Present'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Monthly rate with administration bands and rolling averages',
    ),

    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'The heavy black line is ',
      h('strong', null, 'actual unemployment'),
      ' (BLS civilian unemployment rate, monthly). Dashed colored lines are ',
      h('strong', null, 'trailing rolling averages'),
      ': 1-year, 5-year, and 10-year. The dashed grey line is a ',
      h('strong', null, 'pandemic-adjusted'),
      ' 5-year average that excludes March 2020 \u2013 December 2021, the window where the labor market was severely distorted by COVID-19 and its aftermath.',
    ),

    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Colored vertical bands show each presidential administration\'s term.',
    ),

    // Main chart
    h(VizWrapper, { title: 'US unemployment rate \u2014 actual vs trailing averages' },
      h(LineGraph, {
        pointRadius: 2,
        data: [],
        multiLine,
        height: 400,
        title: 'US unemployment rate \u2014 actual vs trailing averages',
      }),
    ),
    h('p', { style: { fontSize: '0.85rem', color: '#6c757d', textAlign: 'center' } },
      'Administration bands + pandemic exclusion window',
    ),

    // Reading the chart
    h('h2', { id: 'reading' }, 'Reading the chart'),
    h('ul', { style: { color: '#495057', lineHeight: '2', maxWidth: '65ch' } },
      h('li', null,
        h('strong', null, 'Heavy black'),
        ' \u2014 the raw monthly rate. Every movement you see is a BLS release.',
      ),
      h('li', null,
        h('strong', null, '1-year (green dashed)'),
        ' \u2014 smooths away monthly noise but still follows cyclical turns. Useful for "where are we ',
        h('em', null, 'really'),
        ' right now?"',
      ),
      h('li', null,
        h('strong', null, '5-year (orange dashed)'),
        ' \u2014 removes business-cycle noise. A rising 5-yr average signals structural labor-market deterioration; a falling one signals structural tightness.',
      ),
      h('li', null,
        h('strong', null, '10-year (purple dashed)'),
        ' \u2014 secular trend; moves slowly. Currently dominated by the post-GFC recovery long plateau and the 2020 spike.',
      ),
      h('li', null,
        h('strong', null, '5-year adjusted (grey dotted)'),
        ' \u2014 same 5-year window but excludes March 2020 \u2013 December 2021 observations. Shows what "normal" labor-market conditions looked like minus the pandemic shock. Useful when judging whether the current labor market is "tight" versus pre-pandemic norms rather than pandemic-distorted norms.',
      ),
    ),

    // Why the pandemic exclusion matters
    h('h2', { id: 'pandemic' }, 'Why the pandemic exclusion matters'),
    h('p', { style: { color: '#495057', maxWidth: '65ch', lineHeight: '1.55' } },
      'March 2020 \u2013 April 2020 saw unemployment spike from 3.5% to 14.7% in a single month \u2014 a once-in-a-century labor-market shock driven by public-health policy, not underlying economic conditions. Including those months in a trailing 5-year average keeps them in every window until ~March 2025, distorting any "how does the current rate compare to recent history" judgment throughout the Biden term and most of Trump\'s second term.',
    ),
    h('p', { style: { color: '#495057', maxWidth: '65ch', lineHeight: '1.55' } },
      'The adjusted line answers: ',
      h('strong', null, '"Compared to the pre-pandemic trend, how does the current labor market look?"'),
    ),

    // Data source
    h('h2', { id: 'source' }, 'Data source'),
    h('p', { style: { color: '#495057', maxWidth: '65ch', lineHeight: '1.55' } },
      'BLS Civilian Unemployment Rate (FRED series ',
      h('code', null, 'UNRATE'),
      '), monthly. Loaded from ',
      h('code', null, 'data/economy/monthly.csv'),
      ' which is refreshed daily from FRED. Administration boundaries from the presidential-economies analysis\'s ',
      h('code', null, 'administrations.csv'),
      '.',
    ),
  );
}
