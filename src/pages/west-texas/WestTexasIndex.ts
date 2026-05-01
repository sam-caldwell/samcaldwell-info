import { useState, useEffect } from 'specifyjs';
import { h } from '../../h.js';
import { fetchCsv } from '../../utils/csv.js';
import { fmtPct, fmtSignedPct, fmtDollars, toneBySign } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { ValueCard } from '../../components/ValueCard.js';
import { CardRow } from '../../components/CardRow.js';
import { Callout } from '../../components/Callout.js';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import type { WestTexasSummary } from '../../types.js';

export function WestTexasIndex() {
  useSeoHead(
    'West Texas',
    'Regional economy comparison \u2014 Sonora, Eldorado, Ozona, and Junction vs. Texas and the US: unemployment, income, and GDP.',
  );

  const [summary, setSummary] = useState<WestTexasSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCsv<WestTexasSummary>('/data/west-texas/west_texas_summary.csv').then(s => {
      setSummary(s);
      setLoading(false);
    });
  }, []);

  if (loading) return h(Loading, null);

  const summ = summary.length > 0 ? summary[0] : null;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  const usUr = summ ? Number(summ.us_ur) : NaN;
  const txUr = summ ? Number(summ.tx_ur) : NaN;
  const regUr = summ ? Number(summ.regional_avg_ur) : NaN;
  const spread = !isNaN(regUr) && !isNaN(usUr) ? regUr - usUr : NaN;

  const usIncome = summ ? Number(summ.us_income) : NaN;
  const txIncome = summ ? Number(summ.tx_income) : NaN;
  const regIncome = summ ? Number(summ.regional_avg_income) : NaN;

  return h('div', null,
    h('h1', null, 'West Texas'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Regional economy \u2014 Sonora, Eldorado, Ozona, and Junction vs. Texas and the US',
    ),

    h('p', { style: proseStyle },
      'A comparison of the West Texas regional economy to the state of Texas and the United States, focusing on four small towns in the Edwards Plateau and Permian Basin fringe:',
    ),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null, h('strong', null, 'Sonora'), ' (Sutton County, pop. ~3,000)'),
      h('li', null, h('strong', null, 'Eldorado'), ' (Schleicher County, pop. ~2,800)'),
      h('li', null, h('strong', null, 'Ozona'), ' (Crockett County, pop. ~3,400)'),
      h('li', null, h('strong', null, 'Junction'), ' (Kimble County, pop. ~4,400)'),
    ),
    h('p', { style: proseStyle },
      'These communities share an economy shaped by ranching, oil and gas services, and highway commerce. County-level data from the Bureau of Labor Statistics and Bureau of Economic Analysis allows direct comparison to state and national benchmarks.',
    ),

    // Unemployment cards
    summ ? h(CardRow, null,
      h(ValueCard, {
        label: 'US Unemployment',
        value: fmtPct(usUr),
        sublabel: 'Latest month, BLS',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Texas Unemployment',
        value: fmtPct(txUr),
        sublabel: 'Latest month, BLS',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'West TX Region',
        value: fmtPct(regUr),
        sublabel: 'Avg of 4 counties',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Regional Spread',
        value: fmtSignedPct(!isNaN(spread) ? Math.round(spread * 10) / 10 : NaN),
        sublabel: 'Region vs. US',
        tone: !isNaN(spread)
          ? (spread > 0 ? 'negative' : spread < 0 ? 'positive' : 'neutral')
          : 'neutral',
      }),
    ) : h(Callout, { type: 'warning' },
      'West Texas dataset not yet populated. Run the data pipeline or wait for the next CI deploy.',
    ),

    // Income cards
    summ && !isNaN(usIncome) ? h(CardRow, null,
      h(ValueCard, {
        label: 'US Per-Capita Income',
        value: fmtDollars(usIncome, 0),
        sublabel: 'Latest year, BEA',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Texas Per-Capita Income',
        value: fmtDollars(txIncome, 0),
        sublabel: 'Latest year, BEA',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'West TX Region',
        value: fmtDollars(regIncome, 0),
        sublabel: 'Avg of 4 counties',
        tone: 'neutral',
      }),
    ) : null,

    // Sections
    h('h2', { id: 'sections' }, 'Sections'),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/west-texas/unemployment' }, h('strong', null, 'Unemployment \u2192')),
        ' \u2014 Monthly unemployment rates for each county vs. Texas and the US, from 2005 to present.',
      ),
      h('li', null,
        h('a', { href: '#/west-texas/income' }, h('strong', null, 'Per-Capita Income \u2192')),
        ' \u2014 Annual per-capita personal income by county, with comparisons to state and national averages.',
      ),
      h('li', null,
        h('a', { href: '#/west-texas/gdp' }, h('strong', null, 'Economic Output \u2192')),
        ' \u2014 Annual GDP for Texas and the US, with county-level output where available from the BEA.',
      ),
      h('li', null,
        h('a', { href: '#/west-texas/about' }, h('strong', null, 'Methodology \u2192')),
        ' \u2014 Data sources, FIPS codes, population context, and caveats about small-county volatility.',
      ),
    ),

    // Data sources
    h('h2', { id: 'data-sources' }, 'Data Sources'),
    h(VizWrapper, { title: 'West Texas data source attribution' },
      h(DataGrid, {
        columns: [
          { key: 'source', header: 'Source' },
          { key: 'what', header: 'What' },
          { key: 'license', header: 'License' },
          { key: 'refresh', header: 'Refresh' },
        ],
        data: [
          { source: 'BLS LAUS', what: 'Monthly county unemployment rates', license: 'Public domain (US gov)', refresh: 'Monthly' },
          { source: 'BEA Regional', what: 'Annual county GDP and per-capita income', license: 'Public domain (US gov)', refresh: 'Annual (~6 mo lag)' },
          { source: 'FRED', what: 'US unemployment (UNRATE), Texas unemployment (TXUR), Texas real GSP (TXRGSP)', license: 'Public domain', refresh: 'Daily / monthly' },
        ],
        striped: true,
        compact: true,
      }),
    ),
  );
}
