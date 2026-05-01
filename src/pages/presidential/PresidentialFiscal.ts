import { BarGraph, LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct, fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';
import type { FiscalQuarterly } from '../../types.js';

interface AdminRow {
  president: string;
  party: string;
  ongoing: number;
  debt_start_trillion: number;
  debt_end_trillion: number;
  debt_added_trillion: number;
  avg_annual_debt_added_trillion: number;
  debt_pct_gdp_start: number;
  debt_pct_gdp_end: number;
  debt_pct_gdp_change: number;
  avg_deficit_pct_gdp: number;
}

interface FiscalRow {
  date: string;
  debt_trillion: number;
  debt_pct_gdp: number;
}

function partyColor(party: string): string {
  return party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
}

function adminLabel(r: AdminRow): string {
  return `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;
}

function partyBadge(party: string) {
  const color = partyColor(party);
  return h('span', {
    style: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      fontSize: '0.72rem',
      fontWeight: '600',
      color: '#fff',
      background: color,
    },
  }, party.toUpperCase());
}

export function PresidentialFiscal() {
  useSeoHead(
    'Fiscal Policy by Administration',
    'Federal deficit and national debt under each president, 1999 to present.',
  );

  const admins = getCsv<AdminRow>('/data/presidential-economies/admin_summary.csv');
  const fiscal = getCsv<FiscalRow>('/data/economy/fiscal_quarterly.csv');
  if (!admins || !fiscal) return h(Loading, null);

  // Debt level timeline
  const debtTimeline = fiscal
    .filter(r => r.debt_trillion != null && !isNaN(r.debt_trillion))
    .map((r, i) => ({ x: i, y: r.debt_trillion }));

  // Debt as % of GDP timeline
  const debtPctGdpTimeline = fiscal
    .filter(r => r.debt_pct_gdp != null && !isNaN(r.debt_pct_gdp))
    .map((r, i) => ({ x: i, y: r.debt_pct_gdp }));

  // Average deficit as % of GDP bar
  const avgDeficitData = admins.map(r => ({
    label: adminLabel(r),
    value: r.avg_deficit_pct_gdp,
    color: partyColor(r.party),
  }));

  // Average annual debt added bar
  const avgDebtAddedData = admins.map(r => ({
    label: adminLabel(r),
    value: r.avg_annual_debt_added_trillion,
    color: partyColor(r.party),
  }));

  // Total debt added bar
  const totalDebtAddedData = admins.map(r => ({
    label: adminLabel(r),
    value: r.debt_added_trillion,
    color: partyColor(r.party),
  }));

  // Fiscal summary table data
  const tableData = admins.map(r => ({
    president: r.president + (r.ongoing ? ' *' : ''),
    party: r.party,
    debt_start_trillion: r.debt_start_trillion,
    debt_end_trillion: r.debt_end_trillion,
    debt_added_trillion: r.debt_added_trillion,
    debt_pct_gdp_start: r.debt_pct_gdp_start,
    debt_pct_gdp_end: r.debt_pct_gdp_end,
    debt_pct_gdp_change: r.debt_pct_gdp_change,
    avg_deficit_pct_gdp: r.avg_deficit_pct_gdp,
  }));

  return h('div', null,
    h('h1', null, 'Fiscal Policy by Administration'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Federal deficit and national debt under each president',
    ),

    h(Callout, { type: 'important' },
      h('span', null,
        'Attribution caveats compound on fiscal data. The president who takes office in January ',
        h('strong', null, 'inherits'),
        ' the fiscal year that started the previous October, which was drafted and enacted under the prior administration. Major legislation (tax cuts, stimulus, entitlement reform) is passed by Congress, not the White House. Recessions and wars drive deficits regardless of who holds office. Read these numbers as ',
        h('em', null, 'descriptive context'),
        ' for each administration\'s fiscal environment, not as a causal scorecard. See ',
        h('a', { href: '#/presidential/about' }, 'Methodology'),
        ' for more.',
      ),
    ),

    // Debt level timeline
    h('h2', { id: 'debt-level' }, 'Federal debt \u2014 total outstanding'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Quarterly level of federal debt held by the public, shaded by administration.',
    ),
    h(VizWrapper, { title: 'Federal debt outstanding \u2014 shaded by administration' },
      h(LineGraph, {
        data: debtTimeline,
        lineColor: '#1d3557',
        showArea: true,
        height: 360,
        title: 'Federal debt outstanding ($T)',
      }),
    ),

    // Debt as % of GDP
    h('h2', { id: 'debt-pct-gdp' }, 'Federal debt as % of GDP'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Debt-to-GDP normalizes for economic growth and inflation \u2014 a better long-run stress metric than the nominal dollar amount.',
    ),
    h(VizWrapper, { title: 'Federal debt as a share of GDP' },
      h(LineGraph, {
        data: debtPctGdpTimeline,
        lineColor: '#6a4c93',
        showArea: false,
        height: 360,
        title: 'Federal debt as a share of GDP (%)',
      }),
    ),

    // Average deficit as % of GDP
    h('h2', { id: 'avg-deficit' }, 'Average deficit as % of GDP'),
    h(VizWrapper, { title: 'Average annual deficit / surplus as % of GDP, per administration' },
      h(BarGraph, {
        data: avgDeficitData,
        height: 360,
        showValues: true,
        title: 'Average annual deficit / surplus as % of GDP, per administration',
      }),
    ),

    // Average annual debt added
    h('h2', { id: 'avg-debt-added' }, 'Average annual debt added per administration'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Normalizes "debt added" for term length (so 4-year admins compare fairly against 8-year admins).',
    ),
    h(VizWrapper, { title: 'Average annual debt added during each administration' },
      h(BarGraph, {
        data: avgDebtAddedData,
        height: 360,
        showValues: true,
        title: 'Average annual debt added ($T/yr)',
      }),
    ),

    // Total debt added
    h('h2', { id: 'debt-added' }, 'Total debt added during each administration'),
    h(VizWrapper, { title: 'Increase in federal debt during each administration' },
      h(BarGraph, {
        data: totalDebtAddedData,
        height: 360,
        showValues: true,
        title: 'Increase in federal debt ($T)',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      'End-of-term debt minus first-quarter-in-window debt.',
    ),

    // Fiscal summary table
    h('h2', { id: 'fiscal-table' }, 'Fiscal summary by administration'),
    h(VizWrapper, { title: 'Fiscal summary table' },
      h(DataGrid, {
        columns: [
          { key: 'president', header: 'President', sortable: true },
          {
            key: 'party', header: 'Party', sortable: true,
            render: (v: unknown) => partyBadge(v as string),
          },
          {
            key: 'debt_start_trillion', header: 'Debt start ($T)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null ? `$${n.toFixed(2)}` : '\u2014';
            },
          },
          {
            key: 'debt_end_trillion', header: 'Debt end ($T)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null ? `$${n.toFixed(2)}` : '\u2014';
            },
          },
          {
            key: 'debt_added_trillion', header: 'Debt added ($T)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', { style: { fontWeight: '600' } },
                n != null ? `$${n.toFixed(2)}` : '\u2014');
            },
          },
          {
            key: 'debt_pct_gdp_start', header: 'Debt/GDP start', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 1),
          },
          {
            key: 'debt_pct_gdp_end', header: 'Debt/GDP end', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 1),
          },
          {
            key: 'debt_pct_gdp_change', header: '\u0394 Debt/GDP (pp)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null ? n.toFixed(1) : '\u2014';
            },
          },
          {
            key: 'avg_deficit_pct_gdp', header: 'Avg deficit (% GDP)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', {
                style: {
                  color: n != null && n < 0 ? '#bc4749' : '#2f9e44',
                  fontWeight: '600',
                },
              }, n != null ? fmtPct(n, 2) : '\u2014');
            },
          },
        ],
        data: tableData,
        striped: true,
        compact: true,
      }),
    ),
  );
}
