import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct, fmtDollars } from '../../utils/formatters.js';
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
    'Regional economy \u2014 30-county West Texas region vs. Texas and the US: unemployment, income, and GDP.',
  );

  const summary = getCsv<WestTexasSummary>('/data/west-texas/west_texas_summary.csv');
  if (!summary) return h(Loading, null);

  const summ = summary.length > 0 ? summary[0] : null;

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  const usUr = summ ? Number(summ.us_ur) : NaN;
  const txUr = summ ? Number(summ.tx_ur) : NaN;
  const regUr = summ ? Number(summ.regional_avg_ur) : NaN;
  const spread = !isNaN(regUr) && !isNaN(usUr) ? regUr - usUr : NaN;
  const countyCount = summ ? Number(summ.county_count || 30) : 30;

  const usIncome = summ ? Number(summ.us_income) : NaN;
  const txIncome = summ ? Number(summ.tx_income) : NaN;
  const regIncome = summ ? Number(summ.regional_avg_income) : NaN;

  return h('div', null,
    h('h1', null, 'West Texas'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Regional economy \u2014 30-county West Texas region vs. Texas and the US',
    ),

    h('p', { style: proseStyle },
      'A comprehensive analysis of the West Texas regional economy as defined by the Texas Comptroller of Public Accounts. The region encompasses 30 counties spanning the Edwards Plateau, Permian Basin, and Trans-Pecos areas, with a combined population of approximately 662,000.',
    ),

    h('p', { style: proseStyle },
      'The region\'s economy is shaped by oil and gas extraction, ranching, and support services. Counties range from Midland and Ector (major Permian Basin metros) to Loving County (population ~64, the least populous county in the US).',
    ),

    h(Callout, { type: 'note', title: 'Regional definition' },
      h('span', null,
        'This analysis uses the Texas Comptroller\'s official ',
        h('a', { href: 'https://comptroller.texas.gov/economy/economic-data/regions/2020/snap-west.php', target: '_blank' }, 'West Texas region'),
        ' definition: Andrews, Borden, Coke, Concho, Crane, Crockett, Dawson, Ector, Gaines, Glasscock, Howard, Irion, Kimble, Loving, Martin, Mason, McCulloch, Menard, Midland, Pecos, Reagan, Reeves, Schleicher, Sterling, Sutton, Terrell, Tom Green, Upton, Ward, and Winkler counties.',
      ),
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
        sublabel: `Avg of ${countyCount} counties`,
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Regional Spread',
        value: !isNaN(spread) ? (spread >= 0 ? '+' : '') + spread.toFixed(1) + '%' : '\u2014',
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
        sublabel: `Avg of ${countyCount} counties`,
        tone: 'neutral',
      }),
    ) : null,

    // Sections
    h('h2', { id: 'sections' }, 'Sections'),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/west-texas/unemployment' }, h('strong', null, 'Unemployment \u2192')),
        ' \u2014 Monthly unemployment rates for all 30 counties vs. Texas and the US, from 2005 to present.',
      ),
      h('li', null,
        h('a', { href: '#/west-texas/income' }, h('strong', null, 'Per-Capita Income \u2192')),
        ' \u2014 Annual per-capita personal income for all 30 counties, with state and national comparisons.',
      ),
      h('li', null,
        h('a', { href: '#/west-texas/gdp' }, h('strong', null, 'Economic Output \u2192')),
        ' \u2014 Annual GDP for all 30 counties where available from the BEA.',
      ),
      h('li', null,
        h('a', { href: '#/west-texas/about' }, h('strong', null, 'Methodology \u2192')),
        ' \u2014 Data sources, county list, and caveats about small-county volatility.',
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
          { source: 'BLS LAUS', what: 'Monthly county unemployment rates (30 counties)', license: 'Public domain (US gov)', refresh: 'Monthly' },
          { source: 'BEA Regional', what: 'Annual county GDP and per-capita income (30 counties)', license: 'Public domain (US gov)', refresh: 'Annual (~6 mo lag)' },
          { source: 'FRED', what: 'US unemployment (UNRATE), Texas unemployment (TXUR)', license: 'Public domain', refresh: 'Daily / monthly' },
          { source: 'TX Comptroller', what: 'West Texas region definition (30 counties)', license: 'Public domain (TX gov)', refresh: 'Static' },
        ],
        striped: true,
        compact: true,
      }),
    ),
  );
}
