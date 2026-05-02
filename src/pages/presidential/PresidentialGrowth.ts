import { BarGraph, LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';

interface AdminRow {
  president: string;
  party: string;
  ongoing: number;
  gdp_growth_avg: number;
  unemployment_start: number;
  unemployment_end: number;
  cpi_avg: number;
}

interface MonthlyRow {
  date: string;
  unemployment: number;
  president: string;
  party: string;
}

function partyColor(party: string): string {
  return party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
}

function adminLabel(r: AdminRow): string {
  return `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;
}

export function PresidentialGrowth() {
  useSeoHead(
    'Growth by Administration',
    'Real GDP, unemployment, and inflation under each president from 1999 to present.',
  );

  const admins = getCsv<AdminRow>('/data/presidential-economies/admin_summary.csv');
  const monthly = getCsv<MonthlyRow>('/data/presidential-economies/monthly_admin.csv');
  if (!admins || !monthly) return h(Loading, null);

  // GDP growth bar
  const gdpBarData = admins.map(r => ({
    label: adminLabel(r),
    value: Math.abs(r.gdp_growth_avg ?? 0),
    color: partyColor(r.party),
  }));

  // Unemployment start vs end: grouped bars approximated as two separate bar charts
  const unemploymentStartData = admins.map(r => ({
    label: adminLabel(r),
    value: Math.abs(r.unemployment_start ?? 0),
    color: '#adb5bd',
  }));

  const unemploymentEndData = admins.map(r => ({
    label: adminLabel(r),
    value: Math.abs(r.unemployment_end ?? 0),
    color: partyColor(r.party),
  }));

  // CPI bar
  const cpiBarData = admins.map(r => ({
    label: adminLabel(r),
    value: Math.abs(r.cpi_avg ?? 0),
    color: partyColor(r.party),
  }));

  // Unemployment timeline
  const unemploymentTimeline = monthly
    .filter(r => r.unemployment != null && !isNaN(r.unemployment))
    .map((r, i) => ({ x: i, y: r.unemployment }));

  return h('div', null,
    h('h1', null, 'Growth by Administration'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Real GDP, unemployment, and inflation under each president',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        'All comparisons are descriptive, not causal. See ',
        h('a', { href: '#/presidential/about' }, 'Methodology'),
        '.',
      ),
    ),

    // GDP growth
    h('h2', { id: 'gdp' }, 'Real GDP growth'),
    h(VizWrapper, { title: 'Average real GDP growth per administration' },
      h(BarGraph, {
        data: gdpBarData,
        height: 360,
        showValues: true,
        title: 'Average real GDP growth per administration',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      'Calendar-year GDP growth, averaged across years in admin window.',
    ),

    // Unemployment start vs end
    h('h2', { id: 'unemployment' }, 'Unemployment \u2014 start vs end'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Bars show the unemployment rate at the admin\'s first full month vs. last month in the data window. Downward movement means unemployment fell.',
    ),
    h(VizWrapper, { title: 'Unemployment rate \u2014 first month (grey) per administration' },
      h(BarGraph, {
        data: unemploymentStartData,
        height: 320,
        showValues: true,
        title: 'Unemployment \u2014 first month',
      }),
    ),
    h(VizWrapper, { title: 'Unemployment rate \u2014 last month (party-colored) per administration' },
      h(BarGraph, {
        data: unemploymentEndData,
        height: 320,
        showValues: true,
        title: 'Unemployment \u2014 last month',
      }),
    ),

    // CPI inflation
    h('h2', { id: 'cpi' }, 'Inflation (CPI, year-over-year)'),
    h(VizWrapper, { title: 'Average CPI inflation per administration' },
      h(BarGraph, {
        data: cpiBarData,
        height: 360,
        showValues: true,
        title: 'Average CPI inflation per administration',
      }),
    ),

    // Monthly unemployment timeline
    h('h2', { id: 'unemployment-timeline' }, 'Monthly unemployment, administration-shaded'),
    h(VizWrapper, { title: 'Unemployment rate \u2014 by administration' },
      h(LineGraph, {
        pointRadius: 2,
        data: unemploymentTimeline,
        lineColor: '#1d3557',
        showArea: false,
        height: 360,
        title: 'Unemployment rate \u2014 by administration',
      }),
    ),
  );
}
