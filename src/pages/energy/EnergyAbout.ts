import { h } from '../../h.js';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { useSeoHead } from '../../components/SeoHead.js';

const proseStyle = { color: '#495057', maxWidth: '72ch', lineHeight: '1.6', fontSize: '0.98rem' };

export function EnergyAbout() {
  useSeoHead(
    'Energy Methodology & Sources',
    'How the energy analysis is assembled \u2014 data sources, refresh cadence, PADD regions, forecast methodology, sentiment methodology, and caveats.',
  );

  return h('div', null,
    h('h1', null, 'Methodology & Sources'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'How the energy analysis is assembled',
    ),

    // Data sources
    h('h2', null, 'Data Sources'),
    h(VizWrapper, { title: 'Source attribution and licensing' },
      h(DataGrid, {
        columns: [
          { key: 'source', header: 'Source' },
          { key: 'what', header: 'What' },
          { key: 'license', header: 'License' },
          { key: 'refresh', header: 'Refresh' },
        ],
        data: [
          { source: 'FRED', what: 'WTI, Brent, Henry Hub natural gas, US retail gasoline, US average electricity, US crude production / stocks / gasoline demand', license: 'Public domain', refresh: 'Daily' },
          { source: 'EIA Open Data API v2', what: 'PADD-level weekly retail gas, STEO monthly forecasts, international retail prices', license: 'Public domain (US gov)', refresh: 'Daily' },
          { source: 'Curated events (data/energy/events_energy.csv)', what: 'Major energy-market events with editorial sentiment scores', license: 'Editorial', refresh: 'On demand' },
        ],
        striped: true,
        compact: true,
      }),
    ),
    h('p', { style: proseStyle },
      'All sources are non-commercial-friendly and public domain / editorial. Attribution appears on each page that uses the data.',
    ),

    // Pipeline
    h('h2', null, 'Pipeline'),
    h('pre', { style: { background: '#f8f9fa', padding: '16px', borderRadius: '4px', fontSize: '0.85rem', overflow: 'auto', color: '#495057' } },
      `data/economy/cache/          FRED series caches (incremental)
data/energy/cache/           EIA series caches (incremental)
data/energy/events_energy.csv   Hand-curated events
data/energy/                 Output CSVs consumed by the site
  us_prices_daily.csv
  us_gas_retail_weekly.csv
  us_electricity_monthly.csv
  us_supply_demand.csv
  padd_gasoline_weekly.csv
  padd_gas_current.csv
  padd_gas_10y.csv
  intl_prices.csv
  steo_forecast.csv
  energy_summary.csv`,
    ),
    h('p', { style: proseStyle }, 'R orchestrators:'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null, h('code', null, 'R/fetch_fred.R'), ' \u2014 common FRED fetcher (shared with other analyses)'),
      h('li', null, h('code', null, 'R/fetch_eia.R'), ' \u2014 incremental EIA v2 client'),
      h('li', null, h('code', null, 'R/build_energy.R'), ' \u2014 joins caches, writes output CSVs'),
    ),

    // PADD regions
    h('h2', null, 'PADD Regions (Used Throughout)'),
    h('p', { style: proseStyle },
      'The Energy Information Administration organizes the US into five PADD regions (Petroleum Administration for Defense Districts):',
    ),
    h(VizWrapper, { title: 'PADD region definitions' },
      h(DataGrid, {
        columns: [
          { key: 'padd', header: 'PADD' },
          { key: 'region', header: 'Region' },
          { key: 'states', header: 'States' },
        ],
        data: [
          { padd: '1', region: 'East Coast', states: 'CT, DE, DC, FL, GA, ME, MD, MA, NH, NJ, NY, NC, PA, RI, SC, VT, VA, WV' },
          { padd: '2', region: 'Midwest', states: 'IL, IN, IA, KS, KY, MI, MN, MO, NE, ND, OH, OK, SD, TN, WI' },
          { padd: '3', region: 'Gulf Coast', states: 'AL, AR, LA, MS, NM, TX' },
          { padd: '4', region: 'Rocky Mountain', states: 'CO, ID, MT, UT, WY' },
          { padd: '5', region: 'West Coast', states: 'AK, AZ, CA, HI, NV, OR, WA' },
        ],
        striped: true,
        compact: true,
      }),
    ),
    h('p', { style: proseStyle },
      'Maps on the prices and change pages color every state by its PADD\'s price / price-change. State-level weekly gasoline coverage exists for only ~10 states in EIA\'s public data \u2014 PADD aggregation is the honest choice until broader coverage is available.',
    ),

    // Forecast methodology
    h('h2', null, 'Forecast Methodology'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Short-term (STEO):'),
        ' pulled directly from EIA\'s Short-Term Energy Outlook monthly release. Horizon ~24 months. Updated monthly ~mid-month.',
      ),
      h('li', null,
        h('strong', null, 'Long-term (AEO):'),
        ' not published on this site. AEO is scenario-based, annual, and appropriate to consume directly from ',
        h('a', { href: 'https://www.eia.gov/outlooks/aeo/', target: '_blank', rel: 'noopener noreferrer' }, 'eia.gov/outlooks/aeo/'),
        '.',
      ),
    ),

    // Sentiment methodology
    h('h2', null, 'Sentiment Methodology'),
    h('p', { style: proseStyle },
      'Energy-event sentiment scores in events_energy.csv are editorial single-author estimates of the market-and-industry impact of each event, on a \u22121..+1 scale:',
    ),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null, h('strong', null, '\u22121.0 to \u22120.6:'), ' major negative shock (hurricanes destroying refining capacity, wars cutting supply, COVID demand collapse)'),
      h('li', null, h('strong', null, '\u22120.6 to \u22120.3:'), ' notable negative (sanctions, price crashes that hurt producers, regulatory shocks)'),
      h('li', null, h('strong', null, '\u22120.3 to 0.0:'), ' mildly negative (uncertainty, minor disruption)'),
      h('li', null, h('strong', null, '0.0 to 0.3:'), ' mildly positive (supply discipline, capacity additions)'),
      h('li', null, h('strong', null, '0.3 to 1.0:'), ' significantly positive (major tech shift, coordinated supply stabilization)'),
    ),
    h('p', { style: proseStyle },
      'Each row carries a notes column explaining the anchor. Future enhancement: derive event-period sentiment from GDELT average tone for the \u00B130-day window around each event, using the same fetcher already cached for the Sentiment analysis.',
    ),

    // Caveats
    h('h2', null, 'Caveats'),
    h('ol', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Retail prices carry large tax components,'),
        ' especially internationally (Europe >50%, US ~20%). Raw cross-country comparisons conflate market moves with tax policy.',
      ),
      h('li', null,
        h('strong', null, 'EIA series availability changes.'),
        ' Some international endpoints have patchy coverage; the fetcher degrades gracefully when a series is unavailable.',
      ),
      h('li', null,
        h('strong', null, 'STEO forecasts are institutional estimates, not guarantees.'),
        ' EIA explicitly notes STEO is a "best estimate" subject to revision.',
      ),
      h('li', null,
        h('strong', null, '10-year change windows'),
        ' use the closest-to-10y observation rather than exactly 10y. Weekly data means \u00B1 a few days of slippage.',
      ),
      h('li', null,
        h('strong', null, 'PADD is a supply-side construct,'),
        ' not a demand-side one \u2014 regions reflect where refining and pipelines go, not necessarily where demand is highest or pricing most representative.',
      ),
    ),

    // Code license
    h('h2', null, 'Code License'),
    h('p', { style: proseStyle },
      'MIT \u2014 see the ',
      h('a', { href: 'https://github.com/sam-caldwell/samcaldwell.info/blob/main/LICENSE', target: '_blank', rel: 'noopener noreferrer' }, 'LICENSE'),
      ' file.',
    ),
  );
}
