import { h } from '../../h.js';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { useSeoHead } from '../../components/SeoHead.js';

const proseStyle = { color: '#495057', maxWidth: '72ch', lineHeight: '1.6', fontSize: '0.98rem' };

export function WestTexasAbout() {
  useSeoHead(
    'West Texas Methodology',
    'Data sources, geographic scope, FIPS codes, and caveats for the West Texas regional economy analysis.',
  );

  return h('div', null,
    h('h1', null, 'Methodology'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Data sources, geographic scope, and caveats',
    ),

    // Geographic scope
    h('h2', null, 'Geographic Scope'),
    h('p', { style: proseStyle },
      'This analysis covers four small towns in the West Texas Edwards Plateau and Permian Basin fringe region. County-level data is the finest granularity available from federal statistical agencies for these locations.',
    ),
    h(VizWrapper, { title: 'Towns, counties, and primary economies' },
      h(DataGrid, {
        columns: [
          { key: 'town', header: 'Town' },
          { key: 'county', header: 'County' },
          { key: 'fips', header: 'FIPS' },
          { key: 'pop', header: 'Pop. (est.)' },
          { key: 'economy', header: 'Primary Economy' },
        ],
        data: [
          { town: 'Sonora', county: 'Sutton', fips: '48435', pop: '~3,000', economy: 'Ranching, oil/gas services, IH-10 corridor' },
          { town: 'Eldorado', county: 'Schleicher', fips: '48413', pop: '~2,800', economy: 'Ranching, oil/gas, agriculture' },
          { town: 'Ozona', county: 'Crockett', fips: '48105', pop: '~3,400', economy: 'Ranching, oil/gas, IH-10 corridor' },
          { town: 'Junction', county: 'Kimble', fips: '48267', pop: '~4,400', economy: 'Ranching, tourism (Llano River), agriculture' },
        ],
        striped: true,
        compact: true,
      }),
    ),
    h('p', { style: proseStyle },
      'State-level data (Texas) and national data (United States) are included as benchmarks for comparison.',
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
          { source: 'BLS LAUS', dataset: 'Local Area Unemployment Statistics', what: 'County unemployment rate, labor force, employment', frequency: 'Monthly', lag: '~1 month' },
          { source: 'BEA Regional', dataset: 'CAINC1', what: 'County per-capita personal income', frequency: 'Annual', lag: '~6\u20139 months' },
          { source: 'BEA Regional', dataset: 'CAGDP1', what: 'County GDP (total market value of production)', frequency: 'Annual', lag: '~6\u20139 months' },
          { source: 'FRED', dataset: 'UNRATE', what: 'US civilian unemployment rate', frequency: 'Monthly', lag: '~1 week' },
          { source: 'FRED', dataset: 'TXUR', what: 'Texas unemployment rate', frequency: 'Monthly', lag: '~1 month' },
          { source: 'FRED', dataset: 'TXRGSP', what: 'Texas real gross state product', frequency: 'Annual', lag: '~6 months' },
        ],
        striped: true,
        compact: true,
      }),
    ),
    h('p', { style: proseStyle },
      'All data is public domain (US government work). Attribution is provided as courtesy.',
    ),

    // Pipeline
    h('h2', null, 'Pipeline'),
    h('pre', { style: { background: '#f8f9fa', padding: '16px', borderRadius: '4px', fontSize: '0.85rem', overflow: 'auto', color: '#495057' } },
      `fetch_fred.R      \u2192 data/economy/cache/unemployment.csv, tx_unemployment.csv, tx_rgsp.csv
fetch_bls.R       \u2192 data/west-texas/cache/bls_laus_{county}_ur.csv
fetch_bea.R       \u2192 data/west-texas/cache/bea_income.csv, bea_gdp.csv
build_west_texas.R \u2192 data/west-texas/unemployment_monthly.csv
                     data/west-texas/income_annual.csv
                     data/west-texas/gdp_annual.csv
                     data/west-texas/west_texas_summary.csv`,
    ),

    // Caveats
    h('h2', null, 'Caveats and Limitations'),

    h('p', { style: proseStyle },
      h('strong', null, 'Small-county volatility.'),
      ' Counties with populations under 5,000 exhibit high variability in economic statistics. A single business opening or closing can swing the unemployment rate by several percentage points. The four-county regional average smooths some of this volatility but does not eliminate it.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'BEA data suppression.'),
      ' The BEA may suppress county-level GDP or income data for confidentiality when too few establishments contribute to a given industry. Missing values are shown as gaps rather than interpolated.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'Lagged data.'),
      ' BEA county income and GDP are published with a 6\u20139 month lag. BLS LAUS county data is published with a ~1 month lag. FRED state-level series are typically available within 1\u20132 months.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'Energy-economy link.'),
      ' These counties are in or adjacent to the Permian Basin, the largest US oil-producing region. Local economic conditions are strongly influenced by oil and gas prices. See the ',
      h('a', { href: '#/energy' }, 'Energy'),
      ' section for WTI crude and natural gas price trends.',
    ),

    h('p', { style: proseStyle },
      h('strong', null, 'Not causal.'),
      ' The comparisons presented are descriptive. Differences between county, state, and national data reflect many factors beyond local policy \u2014 including industry composition, demographic shifts, and commodity price cycles.',
    ),

    // License
    h('h2', null, 'License'),
    h('p', { style: proseStyle },
      'Code: MIT. Data: public domain (US government sources).',
    ),
  );
}
