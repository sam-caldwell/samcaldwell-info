import { h } from '../../h.js';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { useSeoHead } from '../../components/SeoHead.js';

const proseStyle = { color: '#495057', maxWidth: '72ch', lineHeight: '1.6', fontSize: '0.98rem' };

export function WestTexasAbout() {
  useSeoHead(
    'West Texas Methodology',
    'Data sources, geographic scope, FIPS codes, and caveats for the 30-county West Texas regional economy analysis.',
  );

  return h('div', null,
    h('h1', null, 'Methodology'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Data sources, geographic scope, and caveats',
    ),

    // Geographic scope
    h('h2', null, 'Geographic Scope'),
    h('p', { style: proseStyle },
      'This analysis covers all 30 counties in the Texas Comptroller of Public Accounts\' official West Texas region. The region spans the Edwards Plateau, Permian Basin, and Trans-Pecos areas with a combined population of approximately 662,000 (2019).',
    ),
    h(VizWrapper, { title: 'All 30 West Texas counties' },
      h(DataGrid, {
        columns: [
          { key: 'county', header: 'County' },
          { key: 'seat', header: 'County Seat' },
          { key: 'fips', header: 'FIPS' },
        ],
        data: [
          { county: 'Andrews', seat: 'Andrews', fips: '48003' },
          { county: 'Borden', seat: 'Gail', fips: '48033' },
          { county: 'Coke', seat: 'Robert Lee', fips: '48081' },
          { county: 'Concho', seat: 'Paint Rock', fips: '48095' },
          { county: 'Crane', seat: 'Crane', fips: '48103' },
          { county: 'Crockett', seat: 'Ozona', fips: '48105' },
          { county: 'Dawson', seat: 'Lamesa', fips: '48115' },
          { county: 'Ector', seat: 'Odessa', fips: '48135' },
          { county: 'Gaines', seat: 'Seminole', fips: '48165' },
          { county: 'Glasscock', seat: 'Garden City', fips: '48173' },
          { county: 'Howard', seat: 'Big Spring', fips: '48227' },
          { county: 'Irion', seat: 'Mertzon', fips: '48235' },
          { county: 'Kimble', seat: 'Junction', fips: '48267' },
          { county: 'Loving', seat: 'Mentone', fips: '48301' },
          { county: 'Martin', seat: 'Stanton', fips: '48317' },
          { county: 'Mason', seat: 'Mason', fips: '48319' },
          { county: 'McCulloch', seat: 'Brady', fips: '48307' },
          { county: 'Menard', seat: 'Menard', fips: '48327' },
          { county: 'Midland', seat: 'Midland', fips: '48329' },
          { county: 'Pecos', seat: 'Fort Stockton', fips: '48371' },
          { county: 'Reagan', seat: 'Big Lake', fips: '48383' },
          { county: 'Reeves', seat: 'Pecos', fips: '48389' },
          { county: 'Schleicher', seat: 'Eldorado', fips: '48413' },
          { county: 'Sterling', seat: 'Sterling City', fips: '48431' },
          { county: 'Sutton', seat: 'Sonora', fips: '48435' },
          { county: 'Terrell', seat: 'Sanderson', fips: '48443' },
          { county: 'Tom Green', seat: 'San Angelo', fips: '48451' },
          { county: 'Upton', seat: 'Rankin', fips: '48461' },
          { county: 'Ward', seat: 'Monahans', fips: '48475' },
          { county: 'Winkler', seat: 'Kermit', fips: '48495' },
        ],
        pageSize: 35,
        striped: true,
        compact: true,
      }),
    ),
    h('p', { style: proseStyle },
      'State-level data (Texas) and national data (United States) are included as benchmarks. Region definition: ',
      h('a', { href: 'https://comptroller.texas.gov/economy/economic-data/regions/2020/snap-west.php', target: '_blank' },
        'Texas Comptroller \u2014 West Texas Region'),
      '.',
    ),

    // Data sources
    h('h2', null, 'Data Sources'),
    h(VizWrapper, { title: 'Source attribution, frequency, and lag' },
      h(DataGrid, {
        columns: [
          { key: 'source', header: 'Source' },
          { key: 'dataset', header: 'Dataset' },
          { key: 'what', header: 'What' },
          { key: 'frequency', header: 'Frequency' },
          { key: 'lag', header: 'Lag' },
        ],
        data: [
          { source: 'BLS LAUS', dataset: 'Local Area Unemployment Statistics', what: 'County unemployment rate for 30 counties', frequency: 'Monthly', lag: '~1 month' },
          { source: 'BEA Regional', dataset: 'CAINC1', what: 'County per-capita personal income (30 counties)', frequency: 'Annual', lag: '~6\u20139 months' },
          { source: 'BEA Regional', dataset: 'CAGDP1', what: 'County GDP (30 counties)', frequency: 'Annual', lag: '~6\u20139 months' },
          { source: 'FRED', dataset: 'UNRATE', what: 'US civilian unemployment rate', frequency: 'Monthly', lag: '~1 week' },
          { source: 'FRED', dataset: 'TXUR', what: 'Texas unemployment rate', frequency: 'Monthly', lag: '~1 month' },
        ],
        striped: true,
        compact: true,
      }),
    ),

    // Pipeline
    h('h2', null, 'Pipeline'),
    h('pre', { style: { background: '#f8f9fa', padding: '16px', borderRadius: '4px', fontSize: '0.85rem', overflow: 'auto', color: '#495057' } },
      `pipeline/fetch/bls.ts  \u2192 data/west-texas/cache/bls_laus_{county}_ur.csv  (30 counties)
pipeline/fetch/bea.ts  \u2192 data/west-texas/cache/bea_income.csv, bea_gdp.csv  (30 counties + TX + US)
pipeline/build/west-texas.ts \u2192 data/west-texas/unemployment_monthly.csv
                               data/west-texas/income_annual.csv
                               data/west-texas/gdp_annual.csv
                               data/west-texas/west_texas_summary.csv`,
    ),

    // Caveats
    h('h2', null, 'Caveats and Limitations'),

    h('p', { style: proseStyle },
      h('strong', null, 'Small-county volatility.'),
      ' Many West Texas counties have populations under 5,000. A single business opening or closing can swing the unemployment rate by several percentage points. The 30-county regional average smooths much of this volatility.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'BEA data suppression.'),
      ' The BEA may suppress county-level GDP or income data for confidentiality when too few establishments contribute to a given industry. Missing values are shown as gaps.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'BLS rate limits.'),
      ' The BLS API allows 25 requests/day without a key. With 30 counties, the pipeline needs an API key (BLS_API_KEY) to fetch all counties in a single run.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'Lagged data.'),
      ' BEA county data has a 6\u20139 month lag. BLS LAUS county data has a ~1 month lag.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'Energy-economy link.'),
      ' Many of these counties are in or adjacent to the Permian Basin, the largest US oil-producing region. Local economic conditions are strongly influenced by oil and gas prices. See the ',
      h('a', { href: '#/energy' }, 'Energy'),
      ' section for price trends.',
    ),

    // License
    h('h2', null, 'License'),
    h('p', { style: proseStyle },
      'Code: MIT. Data: public domain (US government sources).',
    ),
  );
}
