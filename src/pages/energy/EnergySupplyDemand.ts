import { LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { SupplyDemandRow } from '../../types.js';

export function EnergySupplyDemand() {
  useSeoHead(
    'Supply & Demand',
    'US crude production, inventories, and gasoline demand (weekly) \u2014 supply-side fundamentals from FRED and EIA.',
  );

  const sdData = getCsv<SupplyDemandRow>('/data/energy/us_supply_demand.csv');
  if (!sdData) return h(Loading, null);

  const haveData = sdData.length > 0;
  const haveProd = haveData && sdData.some(r => r.us_crude_prod != null && !isNaN(r.us_crude_prod));
  const haveStocks = haveData && sdData.some(r => r.us_crude_stocks != null && !isNaN(r.us_crude_stocks));
  const haveDemand = haveData && sdData.some(r => r.us_gas_demand != null && !isNaN(r.us_gas_demand));
  const anySeries = haveProd || haveStocks || haveDemand;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Production data (convert to mbd)
  const prodData = haveProd
    ? sdData
        .filter(r => r.us_crude_prod != null && !isNaN(r.us_crude_prod))
        .map((r, i) => ({ x: i, y: r.us_crude_prod / 1000 }))
    : [];

  // Stocks data (convert to million bbl)
  const stocksData = haveStocks
    ? sdData
        .filter(r => r.us_crude_stocks != null && !isNaN(r.us_crude_stocks))
        .map((r, i) => ({ x: i, y: r.us_crude_stocks / 1000 }))
    : [];

  // Demand data (convert to mbd)
  const demandData = haveDemand
    ? sdData
        .filter(r => r.us_gas_demand != null && !isNaN(r.us_gas_demand))
        .map((r, i) => ({ x: i, y: r.us_gas_demand / 1000 }))
    : [];

  return h('div', null,
    h('h1', null, 'Supply & Demand'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'US crude production, inventories, and gasoline demand (weekly)',
    ),

    !anySeries
      ? h(Callout, { type: 'warning' },
          h('span', null,
            'US weekly crude-production, inventory, and gasoline-demand series are pending re-integration. FRED retired the original series IDs (WCRFPUS2/WCESTUS1/WGFUPUS2); the EIA petroleum supply and stocks endpoints are the replacement \u2014 to be wired in a follow-up. Price timelines on the ',
            h('a', { href: '#/energy/us-markets' }, 'US Markets'),
            ' page continue to update daily.',
          ),
        )
      : null,

    // Production chart
    h('h2', { id: 'production' }, 'US Crude Oil Production'),
    h('p', { style: proseStyle },
      'Weekly field production, million barrels per day. Post-2011 shale-oil revolution visible in the sharp rise from ~5.5 mbd to ~13 mbd.',
    ),
    haveProd
      ? h(VizWrapper, { title: 'US crude oil field production' },
          h(LineGraph, {
            data: prodData,
            lineColor: '#2a6f97',
            showArea: true,
            height: 340,
            title: 'US crude oil field production \u2014 FRED WCRFPUS2, weekly',
          }),
        )
      : null,

    // Stocks chart
    h('h2', { id: 'stocks' }, 'US Crude Oil Inventories'),
    h('p', { style: proseStyle },
      'Commercial ending stocks, million barrels. Sharp seasonality plus secular shifts tied to SPR releases and refinery utilization.',
    ),
    haveStocks
      ? h(VizWrapper, { title: 'US commercial crude-oil ending stocks' },
          h(LineGraph, {
            data: stocksData,
            lineColor: '#6a4c93',
            showArea: true,
            height: 340,
            title: 'US commercial crude-oil ending stocks \u2014 FRED WCESTUS1, weekly',
          }),
        )
      : null,

    // Demand chart
    h('h2', { id: 'demand' }, 'US Gasoline Demand (Product Supplied, Proxy)'),
    h('p', { style: proseStyle },
      'Finished motor gasoline product supplied \u2014 widely used as a proxy for US end-user gasoline demand.',
    ),
    haveDemand
      ? h(VizWrapper, { title: 'US finished motor gasoline \u2014 product supplied' },
          h(LineGraph, {
            data: demandData,
            lineColor: '#bc4749',
            showArea: true,
            height: 340,
            title: 'US finished motor gasoline \u2014 product supplied \u2014 FRED WGFUPUS2, weekly',
          }),
        )
      : null,
  );
}
