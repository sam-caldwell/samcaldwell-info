import { BarGraph, LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct, fmtSignedPct, fmtNum, toneBySign } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';
import type { AdminSummary, MonthlyAdmin } from '../../types.js';

interface AdminRow {
  president: string;
  party: string;
  window_first: string;
  window_last: string;
  months: number;
  ongoing: number;
  gdp_growth_avg: number;
  unemployment_change: number;
  cpi_avg: number;
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

function partyBadge(party: string) {
  const color = party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
  return h('span', {
    style: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      fontSize: '0.72rem',
      fontWeight: '600',
      letterSpacing: '0.04em',
      color: '#fff',
      background: color,
    },
  }, party.toUpperCase());
}

function partyColor(party: string): string {
  return party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
}

export function PresidentialIndex() {
  useSeoHead(
    'Presidential Economies',
    'Economic indicators and markets by administration, 1999 to present.',
  );

  const admins = getCsv<AdminRow>('/data/presidential-economies/admin_summary.csv');
  const monthly = getCsv<MonthlyRow>('/data/presidential-economies/monthly_admin.csv');
  if (!admins || !monthly) return h(Loading, null);

  const adminLabel = (r: AdminRow) =>
    `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;

  // Summary table data
  const tableData = admins.map(r => ({
    president: r.president + (r.ongoing ? ' *' : ''),
    party: r.party,
    window: `${r.window_first} \u2013 ${r.window_last}`,
    months: r.months,
    gdp_growth_avg: r.gdp_growth_avg,
    unemployment_change: r.unemployment_change,
    cpi_avg: r.cpi_avg,
    sp500_total_return: r.sp500_total_return,
    sp500_annualized_return: r.sp500_annualized_return,
    vix_avg: r.vix_avg,
  }));

  // GDP bar chart
  const gdpBarData = admins.map(r => ({
    label: adminLabel(r),
    value: r.gdp_growth_avg,
    color: partyColor(r.party),
  }));

  // S&P 500 total return bar chart
  const sp500BarData = admins.map(r => ({
    label: adminLabel(r),
    value: r.sp500_total_return,
    color: partyColor(r.party),
  }));

  // S&P 500 timeline
  const sp500Timeline = monthly
    .filter(r => r.sp500_level != null && !isNaN(r.sp500_level))
    .map((r, i) => ({ x: i, y: r.sp500_level }));

  return h('div', null,
    h('h1', null, 'Presidential Economies'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Economic indicators and markets by administration, 1999 to present',
    ),

    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'This report slices the same 1999-to-present US economic data used in the ',
      h('a', { href: '#/economy' }, 'US Economy'),
      ' analysis by the president in office. Each calendar month is assigned to whichever president held office on the 14th of that month; inaugurations on January 20 mean the incoming president\'s first ',
      h('em', null, 'full'),
      ' month is February.',
    ),

    h(Callout, { type: 'important' },
      h('span', null,
        h('strong', null, 'Read the caveats before drawing conclusions.'),
        ' Presidents do not fully control the economy. Inherited conditions, Federal Reserve monetary policy, external shocks (dot-com bust, 2008 financial crisis, COVID-19), and multi-year policy lags all dwarf the effect of any single White House. See the ',
        h('a', { href: '#/presidential/about' }, 'methodology page'),
        ' for a fuller discussion.',
      ),
    ),

    h('p', { style: { color: '#495057', fontSize: '0.92rem', fontStyle: 'italic' } },
      'Administrations marked with an asterisk (*) are ongoing \u2014 their stats cover only the portion of their term observed so far.',
    ),

    // Summary table
    h('h2', { id: 'summary' }, 'Summary table'),
    h(VizWrapper, { title: 'Administration summary \u2014 1999 to present' },
      h(DataGrid, {
        columns: [
          { key: 'president', header: 'President', sortable: true },
          {
            key: 'party', header: 'Party', sortable: true,
            render: (v: unknown) => partyBadge(v as string),
          },
          { key: 'window', header: 'Window', sortable: true },
          { key: 'months', header: 'Months', sortable: true },
          {
            key: 'gdp_growth_avg', header: 'GDP avg (%)', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 2),
          },
          {
            key: 'unemployment_change', header: '\u0394Unemployment (pp)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { color: n > 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, n != null ? (n > 0 ? '+' : '') + n.toFixed(1) : '\u2014');
            },
          },
          {
            key: 'cpi_avg', header: 'CPI avg (%)', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 2),
          },
          {
            key: 'sp500_total_return', header: 'S&P total (%)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: { fontWeight: '600', color: n < 0 ? '#bc4749' : '#2f9e44' },
              }, fmtPct(n, 1));
            },
          },
          {
            key: 'sp500_annualized_return', header: 'S&P annual (%)', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 1),
          },
          {
            key: 'vix_avg', header: 'VIX avg', sortable: true,
            render: (v: unknown) => fmtNum(v as number, 1),
          },
        ],
        data: tableData,
        striped: true,
        compact: true,
      }),
    ),

    // GDP bar
    h('h2', { id: 'gdp' }, 'GDP growth by administration'),
    h(VizWrapper, { title: 'Average real GDP growth during each administration' },
      h(BarGraph, {
        data: gdpBarData,
        height: 360,
        showValues: true,
        title: 'Average real GDP growth during each administration',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      'Annual GDP growth, calendar years averaged by admin.',
    ),

    // S&P 500 total return bar
    h('h2', { id: 'sp500' }, 'S&P 500 total return by administration'),
    h(VizWrapper, { title: 'S&P 500 total return over each administration' },
      h(BarGraph, {
        data: sp500BarData,
        height: 360,
        showValues: true,
        title: 'S&P 500 total return over each administration',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      'First-full-month close to last-month close; nominal.',
    ),

    // S&P 500 timeline
    h('h2', { id: 'timeline' }, 'S&P 500 timeline with administration bands'),
    h(VizWrapper, { title: 'S&P 500 monthly level \u2014 colored by administration' },
      h(LineGraph, {
        data: sp500Timeline,
        lineColor: '#1d3557',
        showArea: false,
        height: 360,
        title: 'S&P 500 monthly level',
      }),
    ),

    // Where to go next
    h('h2', { id: 'next' }, 'Where to go next'),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/presidential/growth' }, h('strong', null, 'Economic Growth by Admin \u2192')),
        ' \u2014 GDP, unemployment, inflation tracked by administration.',
      ),
      h('li', null,
        h('a', { href: '#/presidential/markets' }, h('strong', null, 'Markets by Admin \u2192')),
        ' \u2014 S&P 500, VIX, and volatility across administrations.',
      ),
      h('li', null,
        h('a', { href: '#/presidential/fiscal' }, h('strong', null, 'Fiscal Policy \u2192')),
        ' \u2014 Federal deficit and national debt under each president.',
      ),
      h('li', null,
        h('a', { href: '#/presidential/about' }, h('strong', null, 'Methodology & Caveats \u2192')),
        ' \u2014 How administrations are assigned to months, limitations of per-administration comparisons, data sources.',
      ),
    ),
  );
}
