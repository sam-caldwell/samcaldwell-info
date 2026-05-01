import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtDollars } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { PaddGasCurrent } from '../../types.js';

export function EnergyPricesMap() {
  useSeoHead(
    'Current Fuel Prices \u2014 US Map',
    'PADD-region retail gasoline, most recent weekly snapshot with week-over-week change by region.',
  );

  const padd = getCsv<PaddGasCurrent>('/data/energy/padd_gas_current.csv');
  if (!padd) return h(Loading, null);

  const haveData = padd.length > 0;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Sort by current price descending
  const sortedPadd = [...padd].sort((a, b) => (b.price_now || 0) - (a.price_now || 0));

  return h('div', null,
    h('h1', null, 'Current Fuel Prices \u2014 US Map'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'PADD-region retail gasoline, most recent weekly snapshot',
    ),

    h(Callout, { type: 'note' },
      'Retail regular gasoline by PADD region (Petroleum Administration for Defense District). Each state is shaded by its PADD\'s weekly price. Source: EIA weekly retail-price survey. Cadence: weekly.',
    ),

    // Map placeholder
    h('h2', { id: 'map' }, 'Current PADD Retail Gasoline'),
    h(Callout, { type: 'note', title: 'Choropleth map in development' },
      'An interactive choropleth map of PADD gas prices is being developed. The table below shows current prices per PADD region with week-over-week change.',
    ),

    // PADD table
    h('h2', { id: 'table' }, 'By PADD Region'),
    haveData
      ? h(VizWrapper, { title: 'Retail regular gasoline by PADD region' },
          h(DataGrid, {
            columns: [
              { key: 'area_name', header: 'Region', sortable: true },
              {
                key: 'price_now',
                header: 'Current ($/gal)',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  return h('span', { style: { fontWeight: '600' } }, fmtDollars(n, 3));
                },
              },
              {
                key: 'price_prior',
                header: 'Prior Week ($/gal)',
                sortable: true,
                render: (v: unknown) => fmtDollars(v as number, 3),
              },
              {
                key: 'wow_change',
                header: '\u0394 WoW',
                sortable: true,
                render: (v: unknown) => {
                  const n = v as number;
                  if (n == null || isNaN(n)) return '\u2014';
                  const color = n > 0 ? '#bc4749' : n < 0 ? '#2f9e44' : '#6c757d';
                  const sign = n > 0 ? '+' : '';
                  return h('span', { style: { color, fontWeight: '600' } }, `${sign}${n.toFixed(3)}`);
                },
              },
            ],
            data: sortedPadd,
            striped: true,
            compact: true,
          }),
        )
      : h(Callout, { type: 'warning' },
          'PADD gasoline data not yet populated \u2014 ensure EIA_API_KEY is set and rerun the pipeline.',
        ),

    // Why PADD
    h('h2', null, 'Why PADD and Not State?'),
    h('p', { style: proseStyle },
      'EIA publishes weekly retail gasoline at the 5 PADD regions comprehensively. State-level weekly coverage exists for only ~10 states. For a complete national picture without geographic holes, PADD aggregation is the honest choice. Every state in a PADD shares the same color because they share the same weekly aggregate.',
    ),
  );
}
