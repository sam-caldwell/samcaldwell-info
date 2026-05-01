import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtDollars, fmtSignedPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { PaddGas10y } from '../../types.js';

export function EnergyChangeMap() {
  useSeoHead(
    '10-Year Fuel Price Change \u2014 US Map',
    'How gasoline prices have moved by PADD region since ~10 years ago \u2014 absolute and percentage change per region.',
  );

  const padd = getCsv<PaddGas10y>('/data/energy/padd_gas_10y.csv');
  if (!padd) return h(Loading, null);

  const haveData = padd.length > 0;

  // Sort by pct_change descending
  const sortedPadd = [...padd].sort((a, b) => (b.pct_change_10y || 0) - (a.pct_change_10y || 0));

  return h('div', null,
    h('h1', null, '10-Year Fuel Price Change \u2014 US Map'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'How gasoline prices have moved by PADD region since ~10 years ago',
    ),

    h(Callout, { type: 'note' },
      'Percentage change in retail regular gasoline by PADD region between the current week and the nearest observation ~10 years ago. Positive (red) = prices rose; negative (green) = prices fell.',
    ),

    // Map placeholder
    h('h2', { id: 'map' }, '10-Year % Change by Region'),
    h(Callout, { type: 'note', title: 'Choropleth map in development' },
      'An interactive choropleth map of 10-year PADD gas price changes is being developed. The table below shows absolute and percentage change per region.',
    ),

    // Table
    h('h2', { id: 'table' }, 'By PADD Region'),
    haveData
      ? h(VizWrapper, { title: 'Retail gasoline \u2014 10-year change by PADD' },
          h(DataGrid, {
            columns: [
              { key: 'area_name', header: 'Region', sortable: true },
              {
                key: 'price_10y_ago',
                header: '10y Ago ($/gal)',
                sortable: true,
                render: (v: unknown) => fmtDollars(v as number, 3),
              },
              {
                key: 'price_now',
                header: 'Now ($/gal)',
                sortable: true,
                render: (v: unknown) => h('span', { style: { fontWeight: '600' } }, fmtDollars(v as number, 3)),
              },
              {
                key: 'abs_change_10y',
                header: '\u0394 abs ($/gal)',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  if (n == null || isNaN(n)) return '\u2014';
                  const color = n > 0 ? '#bc4749' : n < 0 ? '#2f9e44' : '#6c757d';
                  const sign = n > 0 ? '+' : '';
                  return h('span', { style: { color, fontWeight: '600' } }, `${sign}${n.toFixed(3)}`);
                },
              },
              {
                key: 'pct_change_10y',
                header: '\u0394 %',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  if (n == null || isNaN(n)) return '\u2014';
                  const color = n > 0 ? '#bc4749' : n < 0 ? '#2f9e44' : '#6c757d';
                  return h('span', { style: { color, fontWeight: '600' } }, fmtSignedPct(n));
                },
              },
              { key: 'date_10y_ago', header: 'Base-Period Date', sortable: true },
            ],
            data: sortedPadd,
            striped: true,
            compact: true,
          }),
        )
      : h(Callout, { type: 'warning' },
          '10-year PADD data not populated \u2014 requires the EIA pipeline to have accumulated \u226510 years of weekly history. Bootstrap fetches ~10 years on first run.',
        ),
  );
}
