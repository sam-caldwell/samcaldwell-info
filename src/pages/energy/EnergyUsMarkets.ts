import { LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { UsPricesDaily } from '../../types.js';

interface GasRetailWeekly {
  date: string;
  retail_gas: number;
}

interface ElectricityMonthly {
  date: string;
  electricity: number;
}

export function EnergyUsMarkets() {
  useSeoHead(
    'US Energy Markets',
    'Crude oil, natural gas, retail gasoline, electricity \u2014 daily and weekly US energy prices from FRED.',
  );

  const prices = getCsv<UsPricesDaily>('/data/energy/us_prices_daily.csv');
  const gas = getCsv<GasRetailWeekly>('/data/energy/us_gas_retail_weekly.csv');
  const elec = getCsv<ElectricityMonthly>('/data/energy/us_electricity_monthly.csv');
  if (!prices || !gas || !elec) return h(Loading, null);

  const havePrices = prices.length > 0;
  const haveGas = gas.length > 0;
  const haveElec = elec.length > 0;

  // WTI and Brent multi-line data
  const wtiData = prices.filter(p => p.wti != null && !isNaN(p.wti)).map(p => { const d = new Date(p.date); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365, y: p.wti }; });
  const brentData = prices.filter(p => p.brent != null && !isNaN(p.brent)).map(p => { const d = new Date(p.date); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365, y: p.brent }; });

  const crudeMultiLine = [
    { data: wtiData, color: '#2a6f97', label: 'WTI ($/bbl)' },
    { data: brentData, color: '#e07a5f', label: 'Brent ($/bbl)' },
  ].filter(s => s.data.length > 0);

  // Natural gas
  const natgasData = prices.filter(p => p.natgas != null && !isNaN(p.natgas)).map(p => { const d = new Date(p.date); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365, y: p.natgas }; });

  // Retail gasoline
  const gasData = gas.filter(g => g.retail_gas != null && !isNaN(g.retail_gas)).map(g => { const d = new Date(g.date); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12 + (d.getUTCDate() - 1) / 365, y: g.retail_gas }; });

  // Electricity
  const elecData = elec.filter(e => e.electricity != null && !isNaN(e.electricity)).map(e => { const d = new Date(e.date); return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: e.electricity }; });

  return h('div', null,
    h('h1', null, 'US Energy Markets'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Crude oil, natural gas, retail gasoline, electricity \u2014 daily and weekly',
    ),

    h(Callout, { type: 'note' },
      'Daily WTI + Brent + Henry Hub from FRED; weekly US regular gasoline national average; monthly US electricity retail. Dashed vertical markers in the original analysis highlight major energy-market events.',
    ),

    // Crude oil chart
    h('h2', { id: 'crude' }, 'Crude Oil: WTI and Brent'),
    havePrices && crudeMultiLine[0].data.length > 0
      ? h(VizWrapper, { title: 'WTI & Brent crude oil \u2014 daily spot prices' },
          h(LineGraph, {
        pointRadius: 2,
            data: [],
        multiLine: crudeMultiLine,
            height: 360,
            title: 'WTI & Brent crude oil \u2014 daily spot prices',
          }),
        )
      : h(Callout, { type: 'warning' }, 'Crude oil price data is not yet available.'),

    // Retail gasoline chart
    h('h2', { id: 'retail-gas' }, 'Retail Gasoline (Weekly)'),
    haveGas
      ? h(VizWrapper, { title: 'US retail regular gasoline \u2014 national average' },
          h(LineGraph, {
        pointRadius: 2,
            data: gasData,
            lineColor: '#bc4749',
            showArea: true,
            height: 320,
            title: 'US retail regular gasoline \u2014 FRED series GASREGW, weekly',
          }),
        )
      : h(Callout, { type: 'warning' }, 'Retail gasoline data is not yet available.'),

    // Natural gas chart
    h('h2', { id: 'natgas' }, 'Natural Gas: Henry Hub Spot'),
    havePrices && natgasData.length > 0
      ? h(VizWrapper, { title: 'Henry Hub natural-gas spot price' },
          h(LineGraph, {
        pointRadius: 2,
            data: natgasData,
            lineColor: '#6a4c93',
            showArea: true,
            height: 320,
            title: 'Henry Hub natural-gas spot price',
          }),
        )
      : h(Callout, { type: 'warning' }, 'Natural gas price data is not yet available.'),

    // Electricity chart
    h('h2', { id: 'electricity' }, 'Retail Electricity (Monthly, US Average)'),
    haveElec
      ? h(VizWrapper, { title: 'US average retail electricity price (all sectors)' },
          h(LineGraph, {
        pointRadius: 2,
            data: elecData,
            lineColor: '#2f9e44',
            height: 320,
            title: 'US average retail electricity price (all sectors)',
          }),
        )
      : h(Callout, { type: 'warning' }, 'Electricity price data is not yet available.'),
  );
}
