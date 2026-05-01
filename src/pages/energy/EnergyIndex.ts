import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtDollars, fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { ValueCard } from '../../components/ValueCard.js';
import { CardRow } from '../../components/CardRow.js';
import { Callout } from '../../components/Callout.js';
import type { EnergySummary } from '../../types.js';

export function EnergyIndex() {
  useSeoHead(
    'Energy',
    'Daily-refreshed analysis of the global energy sector: US and international prices, production and consumption, short-term forecasts, event-driven sentiment, and geographic breakdowns.',
  );

  const summary = getCsv<EnergySummary>('/data/energy/energy_summary.csv');
  if (!summary) return h(Loading, null);

  const summ = summary.length > 0 ? summary[0] : null;
  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  return h('div', null,
    h('h1', null, 'Energy'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Markets, supply-demand, forecasts, and event-driven sentiment',
    ),

    h('p', { style: proseStyle },
      'Daily-refreshed analysis of the global energy sector: US and international prices, production and consumption, short-term forecasts, event-driven sentiment, and geographic breakdowns.',
    ),

    // Summary cards
    summ ? h(CardRow, null,
      h(ValueCard, {
        label: 'WTI crude',
        value: fmtDollars(summ.wti_spot),
        sublabel: 'USD/bbl, latest',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Brent crude',
        value: fmtDollars(summ.brent_spot),
        sublabel: 'USD/bbl, latest',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'US retail gasoline',
        value: fmtDollars(summ.us_retail_gasoline, 3),
        sublabel: 'USD/gal, weekly',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Henry Hub natgas',
        value: fmtDollars(summ.henry_hub_natgas),
        sublabel: 'USD/MMBtu, latest',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'US crude production',
        value: summ.us_crude_production_mbd != null ? `${summ.us_crude_production_mbd.toFixed(1)} M` : '\u2014',
        sublabel: 'bbl/day, most recent weekly',
        tone: 'neutral',
      }),
    ) : h(Callout, { type: 'warning' },
      'Energy dataset not yet populated. The CI pipeline fetches it on first run; check back after the next deploy.',
    ),

    // Summary DataGrid
    summ ? h('div', null,
      h('h2', { id: 'summary' }, 'Summary'),
      h(VizWrapper, { title: 'Energy market snapshot' },
        h(DataGrid, {
          columns: [
            { key: 'metric', header: 'Metric', sortable: false },
            { key: 'value', header: 'Value', sortable: false },
            { key: 'unit', header: 'Unit', sortable: false },
          ],
          data: [
            { metric: 'WTI crude', value: fmtDollars(summ.wti_spot), unit: 'USD/bbl' },
            { metric: 'Brent crude', value: fmtDollars(summ.brent_spot), unit: 'USD/bbl' },
            { metric: 'US retail gasoline', value: fmtDollars(summ.us_retail_gasoline, 3), unit: 'USD/gal' },
            { metric: 'Henry Hub natural gas', value: fmtDollars(summ.henry_hub_natgas), unit: 'USD/MMBtu' },
            { metric: 'US crude production', value: summ.us_crude_production_mbd != null ? `${summ.us_crude_production_mbd.toFixed(1)}` : '\u2014', unit: 'M bbl/day' },
          ],
          striped: true,
          compact: true,
        }),
      ),
    ) : null,

    // Sections
    h('h2', { id: 'sections' }, 'Sections'),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/energy/us-markets' }, h('strong', null, 'US Markets \u2192')),
        ' \u2014 WTI / Brent / gasoline / natural-gas / electricity timelines with event overlays.',
      ),
      h('li', null,
        h('a', { href: '#/energy/intl-markets' }, h('strong', null, 'International Markets \u2192')),
        ' \u2014 WTI vs Brent spread as a proxy for the US-vs-international crude-benchmark gap.',
      ),
      h('li', null,
        h('a', { href: '#/energy/supply-demand' }, h('strong', null, 'Supply & Demand \u2192')),
        ' \u2014 US crude production, stocks, and gasoline demand.',
      ),
      h('li', null,
        h('a', { href: '#/energy/events' }, h('strong', null, 'Events \u2192')),
        ' \u2014 Historical and recent energy-market events with sentiment, overlaid on price timelines.',
      ),
      h('li', null,
        h('a', { href: '#/energy/forecasts' }, h('strong', null, 'Forecasts \u2192')),
        ' \u2014 EIA Short-Term Energy Outlook (STEO) monthly forecasts for prices, production, electricity generation.',
      ),
      h('li', null,
        h('a', { href: '#/energy/prices-map' }, h('strong', null, 'Current Fuel Prices Map \u2192')),
        ' \u2014 US choropleth of current retail gasoline prices by PADD region.',
      ),
      h('li', null,
        h('a', { href: '#/energy/change-map' }, h('strong', null, '10-Year Price Change Map \u2192')),
        ' \u2014 Where gasoline has moved most over the past decade.',
      ),
      h('li', null,
        h('a', { href: '#/energy/about' }, h('strong', null, 'Methodology \u2192')),
        ' \u2014 Data sources, refresh cadence, attribution, caveats.',
      ),
    ),

    // Data sources
    h('h2', { id: 'data-sources' }, 'Data Sources'),
    h(VizWrapper, { title: 'Energy data source attribution' },
      h(DataGrid, {
        columns: [
          { key: 'source', header: 'Source' },
          { key: 'what', header: 'What' },
          { key: 'license', header: 'License' },
          { key: 'refresh', header: 'Refresh' },
        ],
        data: [
          { source: 'FRED', what: 'WTI, Brent, US retail gas, Henry Hub, US electricity, US crude production / stocks / gasoline demand', license: 'Public domain', refresh: 'Daily' },
          { source: 'EIA Open Data API', what: 'PADD-level weekly retail gas, STEO forecasts, international prices', license: 'Public domain (US gov)', refresh: 'Daily' },
          { source: 'Curated events', what: 'data/energy/events_energy.csv \u2014 hand-authored major energy events 1999-present', license: 'Editorial', refresh: 'On demand' },
        ],
        striped: true,
        compact: true,
      }),
    ),
  );
}
