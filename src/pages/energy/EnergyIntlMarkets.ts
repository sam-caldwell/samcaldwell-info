import { LineGraph, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { UsPricesDaily } from '../../types.js';

export function EnergyIntlMarkets() {
  useSeoHead(
    'International Energy Markets',
    'WTI vs Brent spread as a proxy for the US-vs-international crude-benchmark gap, plus interpretation of the Brent premium.',
  );

  const prices = getCsv<UsPricesDaily>('/data/energy/us_prices_daily.csv');
  if (!prices) return h(Loading, null);

  const havePrices = prices.length > 0;
  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  // WTI vs Brent multi-line
  const filtered = prices.filter(p => p.wti != null && !isNaN(p.wti) && p.brent != null && !isNaN(p.brent));
  const wtiData = filtered.map((p, i) => ({ x: i, y: p.wti }));
  const brentData = filtered.map((p, i) => ({ x: i, y: p.brent }));
  const spreadData = filtered.map((p, i) => ({ x: i, y: p.brent - p.wti }));

  const crudeMultiLine = [
    { data: wtiData, color: '#2a6f97', label: 'WTI ($/bbl)' },
    { data: brentData, color: '#e07a5f', label: 'Brent ($/bbl)' },
  ].filter(s => s.data.length > 0);

  return h('div', null,
    h('h1', null, 'International Energy Markets'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'WTI vs Brent spread + international context',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Retail fuel prices by country'),
        ' aren\'t available through any free public API \u2014 EIA doesn\'t publish them; IEA keeps them behind a paid subscription; commercial feeds (Platts, Argus, IHS Markit) are licensed. This page shows the available free-data alternative: the ',
        h('strong', null, 'WTI\u2013Brent spread'),
        ' as a proxy for the US-vs-international crude-benchmark gap.',
      ),
    ),

    // WTI vs Brent chart
    h('h2', { id: 'wti-brent' }, 'WTI vs Brent'),
    h('p', { style: proseStyle },
      'WTI (US benchmark, Cushing Oklahoma) and Brent (North Sea, international waterborne benchmark) diverge when US shale production outruns takeaway capacity (WTI discount widens) or when geopolitical risk concentrates in the Middle East / Europe (Brent premium widens).',
    ),

    havePrices && wtiData.length > 0
      ? h(VizWrapper, { title: 'WTI vs Brent \u2014 daily spot prices' },
          h(LineGraph, {
        pointRadius: 2,
            data: [],
        multiLine: crudeMultiLine,
            height: 360,
            title: 'WTI vs Brent \u2014 daily spot prices',
          }),
        )
      : h(Callout, { type: 'warning' }, 'Price data is not yet available.'),

    // Brent premium chart
    h('h2', { id: 'spread' }, 'Brent Premium (Brent \u2212 WTI)'),
    h('p', { style: proseStyle }, 'Positive values = Brent trades above WTI.'),

    havePrices && spreadData.length > 0
      ? h(VizWrapper, { title: 'Brent premium over WTI' },
          h(LineGraph, {
        pointRadius: 2,
            data: spreadData,
            lineColor: '#6a4c93',
            showArea: true,
            height: 320,
            title: 'Brent premium over WTI',
          }),
        )
      : null,

    // Interpretation
    h('h2', null, 'Interpretation'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Wide Brent premium'),
        ' (>$5) typically signals US shale glut or Cushing storage constraints (2011\u20132014); Middle East supply risk (2018, 2020 March Saudi-Russia war); or European demand spikes (post-Ukraine).',
      ),
      h('li', null,
        h('strong', null, 'Narrow or inverted spread'),
        ' (WTI > Brent) is rare and usually reflects US-specific supply disruptions or Brent oversupply.',
      ),
      h('li', null,
        h('strong', null, 'Secular narrowing since 2016'),
        ' \u2014 US became a significant crude exporter after the 2015 export-ban repeal, arbitraging the two benchmarks more tightly.',
      ),
    ),

    // Missing data explanation
    h('h2', null, 'What\'s Missing and Why'),
    h('table', {
      style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '20px' },
    },
      h('thead', null,
        h('tr', null,
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Data'),
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Why not on this page'),
        ),
      ),
      h('tbody', null,
        ...([
          ['Country-level retail gasoline / diesel', "Not in EIA's free data; IEA publishes behind paid subscription"],
          ['Country-level natural-gas prices', 'Same \u2014 TTF, JKM, NBP benchmarks sit behind commercial feeds'],
          ['Global refining margins', 'Same'],
          ['Detailed refined-product prices', 'Same'],
        ] as [string, string][]).map(([data, reason], i) =>
          h('tr', { key: String(i), style: { background: i % 2 === 0 ? '#f8f9fa' : '#fff' } },
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef' } }, data),
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef', color: '#495057' } }, reason),
          )
        ),
      ),
    ),

    h('p', { style: proseStyle },
      'A comprehensive international price section would require a paid data feed. The visualizations shipped here use only public-domain US government data.',
    ),
  );
}
