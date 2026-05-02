import { BarGraph, LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct, fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';

interface AdminRow {
  president: string;
  party: string;
  ongoing: number;
  sp500_total_return: number;
  sp500_annualized_return: number;
  vix_avg: number;
}

interface MonthlyRow {
  date: string;
  sp500_level: number;
  president: string;
  party: string;
}

function partyColor(party: string): string {
  return party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
}

function adminLabel(r: AdminRow): string {
  return `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;
}

export function PresidentialMarkets() {
  useSeoHead(
    'Markets by Administration',
    'S&P 500, volatility, and returns per president from 1999 to present.',
  );

  const admins = getCsv<AdminRow>('/data/presidential-economies/admin_summary.csv');
  const monthly = getCsv<MonthlyRow>('/data/presidential-economies/monthly_admin.csv');
  if (!admins || !monthly) return h(Loading, null);

  // Total return bar
  const totalReturnData = admins.map(r => ({
    label: adminLabel(r),
    value: Math.abs(r.sp500_total_return ?? 0),
    color: partyColor(r.party),
  }));

  // Annualized return bar
  const annualizedData = admins.map(r => ({
    label: adminLabel(r),
    value: Math.abs(r.sp500_annualized_return ?? 0),
    color: partyColor(r.party),
  }));

  // VIX bar
  const vixData = admins.map(r => ({
    label: adminLabel(r),
    value: Math.abs(r.vix_avg ?? 0),
    color: partyColor(r.party),
  }));

  // S&P 500 timeline
  const sp500Timeline = monthly
    .filter(r => r.sp500_level != null && !isNaN(r.sp500_level))
    .map((r, i) => ({ x: i, y: r.sp500_level }));

  return h('div', null,
    h('h1', null, 'Markets by Administration'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'S&P 500, volatility, and returns per president',
    ),

    h(Callout, { type: 'warning' },
      h('span', null,
        h('strong', null, 'Market data on this site is a calibrated synthetic overlay'),
        ' (FRED\'s market series are licensed and cannot be redistributed). Directional comparisons hold but exact levels are illustrative. See ',
        h('a', { href: '#/presidential/about' }, 'Methodology'),
        ' and the ',
        h('a', { href: '#/economy/about' }, 'Data & Citations page'),
        ' for details.',
      ),
    ),

    // Total return
    h('h2', { id: 'total' }, 'S&P 500 total return'),
    h(VizWrapper, { title: 'Cumulative S&P 500 return over each administration\'s term' },
      h(BarGraph, {
        data: totalReturnData,
        height: 360,
        showValues: true,
        title: 'Cumulative S&P 500 return over each administration\'s term',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      'First-full-month close to last-month close; nominal.',
    ),

    // Annualized return
    h('h2', { id: 'annualized' }, 'S&P 500 annualized return'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Normalizes total return by term length, so 4-year admins compare fairly to 8-year admins.',
    ),
    h(VizWrapper, { title: 'Annualized S&P 500 return per administration' },
      h(BarGraph, {
        data: annualizedData,
        height: 360,
        showValues: true,
        title: 'Annualized S&P 500 return per administration',
      }),
    ),

    // VIX
    h('h2', { id: 'vix' }, 'Volatility \u2014 average VIX'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Higher VIX = more market uncertainty.',
    ),
    h(VizWrapper, { title: 'Average VIX per administration' },
      h(BarGraph, {
        data: vixData,
        height: 360,
        showValues: true,
        title: 'Average VIX per administration',
      }),
    ),

    // S&P 500 timeline
    h('h2', { id: 'timeline' }, 'Monthly S&P 500 level, administration-shaded'),
    h(VizWrapper, { title: 'S&P 500 monthly level \u2014 shaded by administration' },
      h(LineGraph, {
        pointRadius: 2,
        data: sp500Timeline,
        lineColor: '#1d3557',
        showArea: false,
        height: 360,
        title: 'S&P 500 monthly level \u2014 shaded by administration',
      }),
    ),
  );
}
