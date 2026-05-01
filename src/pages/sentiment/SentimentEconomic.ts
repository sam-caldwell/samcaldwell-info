import { BarGraph, LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';
import type { AdminSentiment, UmcsentMonthly, WorldEvent } from '../../types.js';

function partyColor(party: string): string {
  return party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
}

export function SentimentEconomic() {
  useSeoHead(
    'Economic Sentiment',
    'U. Michigan Consumer Sentiment Index, 1999 to present, by presidential administration.',
  );

  const rawSent = getCsv<AdminSentiment>('/data/sentiment/admin_sentiment.csv');
  const monthly = getCsv<UmcsentMonthly>('/data/sentiment/umcsent_monthly.csv');
  const events = getCsv<WorldEvent>('/data/sentiment/events.csv');
  if (!rawSent || !monthly || !events) return h(Loading, null);

  const sent = rawSent.filter(r => r.party != null && r.party !== '');

  const adminLabel = (r: AdminSentiment) =>
    `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;

  // Baseline
  const umcsentVals = monthly.map(r => r.umcsent).filter(v => v != null && !isNaN(v));
  const baseline = umcsentVals.length
    ? Math.round(umcsentVals.reduce((s, v) => s + v, 0) / umcsentVals.length * 10) / 10
    : 0;

  // UMCSENT timeline
  const timelineData = monthly
    .filter(r => r.umcsent != null && !isNaN(r.umcsent))
    .map((r, i) => ({ x: i, y: r.umcsent }));

  // Per-admin average bar
  const avgBarData = sent
    .filter(r => r.umcsent_avg != null)
    .map(r => ({
      label: adminLabel(r),
      value: r.umcsent_avg as number,
      color: partyColor(r.party),
    }));

  // Vs baseline bar
  const vsBaselineData = sent
    .filter(r => r.umcsent_vs_baseline != null)
    .map(r => ({
      label: adminLabel(r),
      value: r.umcsent_vs_baseline as number,
      color: partyColor(r.party),
    }));

  // Events table
  const eventsTableData = events.map(r => ({
    date: r.date,
    category: r.category,
    event: r.event,
    severity: r.severity,
  }));

  return h('div', null,
    h('h1', null, 'Economic Sentiment'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'U. Michigan Consumer Sentiment Index, 1999 to present',
    ),

    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'The ',
      h('strong', null, 'University of Michigan Index of Consumer Sentiment (UMCSENT)'),
      ' has been published monthly since 1952. It\'s a survey-based index \u2014 households answer five questions about their own financial situation, expected business conditions, and attitudes toward major purchases. The output is a single number; higher = more optimistic. It\'s the most widely-cited measure of "what the public feels about the economy."',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        'UMCSENT is a measure of ',
        h('strong', null, 'economic mood'),
        ', not presidential approval. It correlates with, but is not the same as, how the public feels about the president. A president can be unpopular while the economy feels good (Trump I, 2018-19) or popular while it feels bad (Bush 43 post-9/11, 2001).',
      ),
    ),

    // UMCSENT timeline
    h('h2', { id: 'timeline' }, 'UMCSENT timeline, administration-shaded'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'World events are marked on the time axis. The dotted line represents the long-run baseline.',
    ),
    h(VizWrapper, { title: 'UMCSENT monthly \u2014 shaded by administration, marked world events' },
      h(LineGraph, {
        data: timelineData,
        lineColor: '#1d3557',
        showArea: false,
        height: 400,
        title: 'UMCSENT monthly',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      `Baseline: ${baseline} (mean of 1999-to-present monthly observations).`,
    ),

    // Per-admin average bar
    h('h2', { id: 'avg' }, 'Per-administration UMCSENT average'),
    h('p', { style: { color: '#495057', lineHeight: '1.5', maxWidth: '65ch' } },
      `Horizontal reference line is the long-run baseline across the window (${baseline}). Trump I's elevated average reflects the pre-COVID expansion; the Biden and Trump II averages sit well below baseline \u2014 inflation-era mood.`,
    ),
    h(VizWrapper, { title: 'UMCSENT: term-average sentiment per administration' },
      h(BarGraph, {
        data: avgBarData,
        height: 360,
        showValues: true,
        title: 'UMCSENT: term-average sentiment per administration',
      }),
    ),

    // Vs baseline
    h('h2', { id: 'vs-baseline' }, 'Vs baseline'),
    h(VizWrapper, { title: 'UMCSENT average minus long-run baseline' },
      h(BarGraph, {
        data: vsBaselineData,
        height: 360,
        showValues: true,
        title: 'UMCSENT average minus long-run baseline',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      `Baseline = ${baseline} (mean of 1999-to-present monthly observations).`,
    ),

    // World events table
    h('h2', { id: 'events' }, 'World events observed'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Events marked on the timeline above. Add more by editing data/sentiment/events.csv in the repository.',
    ),
    h(VizWrapper, { title: 'World events' },
      h(DataGrid, {
        columns: [
          { key: 'date', header: 'Date', sortable: true },
          { key: 'category', header: 'Category', sortable: true },
          { key: 'event', header: 'Event', sortable: true },
          { key: 'severity', header: 'Severity', sortable: true },
        ],
        data: eventsTableData,
        striped: true,
        compact: true,
      }),
    ),

    // Source
    h('h2', null, 'Source'),
    h('ul', { style: { color: '#495057', lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'University of Michigan Surveys of Consumers'),
        ', distributed via FRED: ',
        h('em', null, 'University of Michigan: Consumer Sentiment'),
        ' [UMCSENT]. ',
        h('a', { href: 'https://fred.stlouisfed.org/series/UMCSENT', target: '_blank', rel: 'noopener noreferrer' }, 'https://fred.stlouisfed.org/series/UMCSENT'),
        ' \u2014 public-domain.',
      ),
    ),
  );
}
