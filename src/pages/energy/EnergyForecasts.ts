import { LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { SteoForecast, UsPricesDaily } from '../../types.js';

export function EnergyForecasts() {
  useSeoHead(
    'Energy Forecasts',
    'EIA Short-Term Energy Outlook (STEO) \u2014 monthly forecast through next ~24 months for WTI crude, US production, and Henry Hub natural gas.',
  );

  const steo = getCsv<SteoForecast>('/data/energy/steo_forecast.csv');
  const prices = getCsv<UsPricesDaily>('/data/energy/us_prices_daily.csv');
  if (!steo || !prices) return h(Loading, null);

  const haveSteo = steo.length > 0;
  const havePrices = prices.length > 0;

  // WTI history + STEO forecast
  const wtiHist = prices
    .filter(p => p.wti != null && !isNaN(p.wti))
    .map((p, i) => ({ x: i, y: p.wti }));

  const wtiForeSeries = steo.filter(s => s.series_id === 'WTIPUUS' && s.value != null && !isNaN(Number(s.value)));
  const wtiFore = wtiForeSeries.map((s, i) => ({ x: wtiHist.length + i, y: Number(s.value) }));

  const wtiMultiLine = [
    { data: wtiHist, color: '#1d3557', label: 'WTI history' },
    { data: wtiFore, color: '#e07a5f', label: 'STEO forecast' },
  ].filter(s => s.data.length > 0);

  // US crude production forecast
  const prodFore = steo
    .filter(s => s.series_id === 'COPRPUS' && s.value != null && !isNaN(Number(s.value)))
    .map((s, i) => ({ x: i, y: Number(s.value) }));

  // Henry Hub natgas forecast
  const ngFore = steo
    .filter(s => s.series_id === 'NGHHMCF' && s.value != null && !isNaN(Number(s.value)))
    .map((s, i) => ({ x: i, y: Number(s.value) }));

  return h('div', null,
    h('h1', null, 'Energy Forecasts'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'EIA Short-Term Energy Outlook (STEO) \u2014 monthly forecast through next ~24 months',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Source:'),
        ' EIA Short-Term Energy Outlook (STEO) \u2014 published monthly, forecast horizon ~24 months. Public domain. The long-term horizon (20+ years) is covered by EIA\'s Annual Energy Outlook (AEO), which we don\'t publish here because AEO is annual and scenario-dependent; interested readers should go direct to ',
        h('a', { href: 'https://www.eia.gov/outlooks/aeo/', target: '_blank', rel: 'noopener noreferrer' }, 'eia.gov/outlooks/aeo/'),
        '.',
      ),
    ),

    // WTI history + forecast
    h('h2', { id: 'wti-forecast' }, 'WTI Crude Spot \u2014 History + STEO Forecast'),
    haveSteo && havePrices && wtiHist.length > 0
      ? h(VizWrapper, { title: 'WTI crude \u2014 history and STEO forecast' },
          h(LineGraph, {
            multiLine: wtiMultiLine,
            height: 360,
            title: 'WTI crude \u2014 history (solid) and STEO forecast (dashed)',
          }),
        )
      : null,

    // US crude production forecast
    h('h2', { id: 'prod-forecast' }, 'US Crude Production Forecast'),
    prodFore.length > 0
      ? h(VizWrapper, { title: 'STEO US crude-oil production forecast' },
          h(LineGraph, {
            data: prodFore,
            lineColor: '#2a6f97',
            showArea: true,
            height: 340,
            title: 'STEO US crude-oil production forecast',
          }),
        )
      : h('p', { style: { color: '#6c757d' } }, 'No STEO production series cached.'),

    // Henry Hub forecast
    h('h2', { id: 'natgas-forecast' }, 'Henry Hub Natural Gas Forecast'),
    ngFore.length > 0
      ? h(VizWrapper, { title: 'STEO Henry Hub natural-gas forecast' },
          h(LineGraph, {
            data: ngFore,
            lineColor: '#6a4c93',
            showArea: true,
            height: 340,
            title: 'STEO Henry Hub natural-gas forecast',
          }),
        )
      : h('p', { style: { color: '#6c757d' } }, 'No STEO natural-gas series cached.'),

    !haveSteo
      ? h(Callout, { type: 'warning' },
          'STEO forecast data not yet populated \u2014 ensure EIA_API_KEY is set and rerun the pipeline. STEO bootstrap fetches ~70 monthly observations per series.',
        )
      : null,
  );
}
