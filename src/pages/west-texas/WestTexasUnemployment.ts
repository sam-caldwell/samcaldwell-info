import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { UnemploymentMonthly } from '../../types.js';

const geoOrder = ['US', 'TX', 'sutton', 'schleicher', 'crockett', 'kimble'];
const geoColors: Record<string, string> = {
  US: '#1d3557',
  TX: '#2a6f97',
  sutton: '#e07a5f',
  schleicher: '#6a4c93',
  crockett: '#2f9e44',
  kimble: '#f2c14e',
};
const geoNames: Record<string, string> = {
  US: 'United States',
  TX: 'Texas',
  sutton: 'Sutton Co. (Sonora)',
  schleicher: 'Schleicher Co. (Eldorado)',
  crockett: 'Crockett Co. (Ozona)',
  kimble: 'Kimble Co. (Junction)',
};

export function WestTexasUnemployment() {
  useSeoHead(
    'West Texas Unemployment',
    'Monthly unemployment rates \u2014 US vs. Texas vs. West TX counties (Sutton, Schleicher, Crockett, Kimble) from 2005 to present.',
  );

  const data = getCsv<UnemploymentMonthly>('/data/west-texas/unemployment_monthly.csv');
  if (!data) return h(Loading, null);

  const haveData = data.length > 0 && new Set(data.map(r => r.geo)).size > 2;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // Build multi-line data: one series per geo
  const geos = geoOrder.filter(g => data.some(r => r.geo === g));

  const multiLine = geos.map(geo => {
    const geoData = data
      .filter(r => r.geo === geo && r.unemployment_rate != null && !isNaN(r.unemployment_rate))
      .map(r => {
        const d = new Date(r.date);
        return { x: d.getUTCFullYear() + d.getUTCMonth() / 12, y: r.unemployment_rate };
      });
    return {
      data: geoData,
      color: geoColors[geo] || '#6c757d',
      label: geoNames[geo] || geo,
    };
  }).filter(s => s.data.length > 0);

  // Latest values table
  const latestByGeo = geos.map(geo => {
    const geoRows = data.filter(r => r.geo === geo && r.unemployment_rate != null);
    if (geoRows.length === 0) return null;
    const latest = geoRows.reduce((best, r) => r.date > best.date ? r : best);
    return {
      geography: geoNames[geo] || geo,
      latest_rate: latest.unemployment_rate,
      as_of: latest.date,
    };
  }).filter(Boolean) as Array<{ geography: string; latest_rate: number; as_of: string }>;

  return h('div', null,
    h('h1', null, 'Unemployment'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Monthly unemployment rates \u2014 US vs. Texas vs. West TX counties',
    ),

    h('p', { style: proseStyle },
      'Monthly unemployment rates from the Bureau of Labor Statistics Local Area Unemployment Statistics (LAUS) program. County-level data is available from 2005 onward for Sutton, Schleicher, Crockett, and Kimble counties.',
    ),

    h(Callout, { type: 'note', title: 'Small-county volatility' },
      'These counties have populations of 2,800\u20134,400. A single large employer opening or closing can move the unemployment rate by several percentage points. The national and state lines provide stable reference points; the county lines show the real texture of the local labor market.',
    ),

    // Multi-series chart
    haveData
      ? h('div', null,
          h('h2', { id: 'chart' }, 'Monthly Unemployment Rate'),
          h(VizWrapper, { title: 'Monthly unemployment rate \u2014 BLS LAUS | County vs. state vs. national' },
            h(LineGraph, {
        pointRadius: 2,
              data: [],
        multiLine,
              height: 420,
              title: 'Monthly Unemployment Rate',
            }),
          ),
        )
      : h(Callout, { type: 'warning' },
          'Unemployment data not yet available. Run the data pipeline to fetch BLS LAUS county data.',
        ),

    // Latest values table
    haveData && latestByGeo.length > 0
      ? h('div', null,
          h('h2', { id: 'latest' }, 'Latest Values'),
          h(VizWrapper, { title: 'Most recent unemployment rate by geography' },
            h(DataGrid, {
              columns: [
                { key: 'geography', header: 'Geography', sortable: true },
                {
                  key: 'latest_rate',
                  header: 'Latest Rate (%)',
                  sortable: true,
                  render: (v: unknown) => fmtPct(v as number),
                },
                { key: 'as_of', header: 'As Of', sortable: true },
              ],
              data: latestByGeo,
              striped: true,
              compact: true,
            }),
          ),
        )
      : null,
  );
}
