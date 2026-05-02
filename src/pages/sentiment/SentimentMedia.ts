import { BarGraph, LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';
import type { AdminSentiment, GdeltToneMonthly } from '../../types.js';

function partyColor(party: string): string {
  return party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
}

function partyBadge(party: string) {
  if (!party) return h('span', null, '');
  const color = partyColor(party);
  return h('span', {
    style: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      fontSize: '0.72rem',
      fontWeight: '600',
      color: '#fff',
      background: color,
    },
  }, party.toUpperCase());
}

export function SentimentMedia() {
  useSeoHead(
    'Media Sentiment',
    'GDELT average-tone of US-presidency English-language news, 2017 to present.',
  );

  const rawSent = getCsv<AdminSentiment>('/data/sentiment/admin_sentiment.csv');
  const monthly = getCsv<GdeltToneMonthly>('/data/sentiment/gdelt_tone_monthly.csv');
  if (!rawSent || !monthly) return h(Loading, null);

  const sent = rawSent.filter(r => r.party != null && r.party !== '');

  const adminLabel = (r: AdminSentiment) =>
    `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;

  // Baseline
  const toneVals = monthly.map(r => r.tone).filter(v => v != null && !isNaN(v));
  const toneBaseline = toneVals.length
    ? Math.round(toneVals.reduce((s, v) => s + v, 0) / toneVals.length * 100) / 100
    : 0;

  // Tone timeline
  const timelineData = monthly
    .filter(r => r.tone != null && !isNaN(r.tone))
    .map((r, i) => ({ x: i, y: r.tone }));

  // Per-admin average bar (only admins with >=3 months data)
  const hasData = sent.filter(r => r.tone_avg != null && r.tone_months != null && r.tone_months >= 3);
  const avgBarData = hasData.map(r => ({
    label: adminLabel(r),
    value: Math.abs((r.tone_avg as number) ?? 0),
    color: partyColor(r.party),
  }));

  // Vs baseline bar
  const vsBaselineData = hasData
    .filter(r => r.tone_vs_baseline != null)
    .map(r => ({
      label: adminLabel(r),
      value: Math.abs((r.tone_vs_baseline as number) ?? 0),
      color: partyColor(r.party),
    }));

  // Full table data
  const tableData = sent.map(r => ({
    president: r.president + (r.ongoing ? ' *' : ''),
    party: r.party,
    tone_avg: r.tone_avg,
    tone_min: r.tone_min,
    tone_max: r.tone_max,
    tone_months: r.tone_months,
    tone_vs_baseline: r.tone_vs_baseline,
  }));

  return h('div', null,
    h('h1', null, 'Media Sentiment'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'GDELT average-tone of US-presidency English-language news, 2017 to present',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Data source:'),
        ' ',
        h('a', { href: 'https://www.gdeltproject.org/', target: '_blank', rel: 'noopener noreferrer' }, 'GDELT'),
        ' Doc 2.0 API \u2014 daily average ',
        h('em', null, 'tone'),
        ' of English-language news articles from US sources matching ("white house" OR president OR presidential). Licensed ',
        h('strong', null, 'CC-BY-NC'),
        ': redistributed here for non-commercial analytical purposes with attribution. Not affiliated with or endorsed by The GDELT Project.',
      ),
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        h('strong', null, 'Coverage:'),
        ' For this query, GDELT returned data starting ',
        h('strong', null, 'January 2017'),
        '. Administrations before Trump I (Clinton, Bush 43, Obama except his final month) are absent from this section and show no value.',
      ),
    ),

    // What tone is and isn't
    h('h2', null, 'What "tone" is, and isn\'t'),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'GDELT computes tone as the difference between positive- and negative-valence word counts in each article, normalized to roughly ',
      h('strong', null, '\u2212100 to +100'),
      '. Typical US political news sits in the ',
      h('strong', null, '\u22121 to \u22123'),
      ' range \u2014 slightly negative on average, which is consistent with news writing conventions (crises and conflicts drive more coverage than stability).',
    ),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Tone is not the same as approval:',
    ),
    h('ul', { style: { color: '#495057', lineHeight: '1.8', maxWidth: '65ch' } },
      h('li', null, 'It measures the ', h('strong', null, 'tone of articles'), ', not the ', h('strong', null, 'opinion of readers'), '.'),
      h('li', null, 'A very positive article can be written about a policy many readers oppose; a very negative article can cover a president\'s political opponents.'),
      h('li', null, 'A lexicon-based score cannot distinguish subject from context: "Trump condemned the attack" is neutral about Trump but GDELT\'s tone picks up the word "attack."'),
    ),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Treat this as a ',
      h('strong', null, 'coarse environmental signal'),
      ' about the media climate during each administration, not a precision instrument.',
    ),

    // Tone timeline
    h('h2', { id: 'timeline' }, 'Monthly tone \u2014 by administration'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      `Chart is shaded by administration. Horizontal dotted line is the long-run baseline (${toneBaseline.toFixed(2)}).`,
    ),
    h(VizWrapper, { title: 'GDELT monthly average tone \u2014 US-presidency English news' },
      h(LineGraph, {
        data: timelineData,
        lineColor: '#1d3557',
        showArea: false,
        height: 400,
        title: 'GDELT monthly average tone',
      }),
    ),

    // Per-admin average bar
    h('h2', { id: 'avg' }, 'Per-administration average tone'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Only administrations with at least 3 months of GDELT coverage are charted.',
    ),
    h(VizWrapper, { title: 'Term-average media tone per administration' },
      h(BarGraph, {
        data: avgBarData,
        height: 360,
        showValues: true,
        title: 'Term-average media tone per administration',
      }),
    ),

    // Vs baseline
    h('h2', { id: 'vs-baseline' }, 'Vs baseline'),
    h(VizWrapper, { title: 'Media tone minus long-run baseline' },
      h(BarGraph, {
        data: vsBaselineData,
        height: 360,
        showValues: true,
        title: 'Media tone minus long-run baseline',
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      `Baseline = ${toneBaseline.toFixed(2)} (mean of monthly tone, 2017-to-present).`,
    ),

    // Full table
    h('h2', null, 'Full table'),
    h(VizWrapper, { title: 'Media tone detail' },
      h(DataGrid, {
        columns: [
          { key: 'president', header: 'President', sortable: true },
          {
            key: 'party', header: 'Party', sortable: true,
            render: (v: unknown) => partyBadge(v as string),
          },
          {
            key: 'tone_avg', header: 'Tone avg', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', { style: { fontWeight: '600' } },
                n != null && !isNaN(n) ? n.toFixed(2) : '\u2014');
            },
          },
          {
            key: 'tone_min', header: 'Min', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null && !isNaN(n) ? n.toFixed(2) : '\u2014';
            },
          },
          {
            key: 'tone_max', header: 'Max', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null && !isNaN(n) ? n.toFixed(2) : '\u2014';
            },
          },
          {
            key: 'tone_months', header: 'Months with data', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null ? String(n) : '\u2014';
            },
          },
          {
            key: 'tone_vs_baseline', header: 'vs baseline', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              if (n == null || isNaN(n)) return '\u2014';
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, n.toFixed(2));
            },
          },
        ],
        data: tableData,
        striped: true,
        compact: true,
      }),
    ),

    // Caveats
    h('h2', null, 'Caveats'),
    h('ol', { style: { color: '#495057', lineHeight: '2', maxWidth: '65ch' } },
      h('li', null,
        h('strong', null, 'Coverage starts 2017.'),
        ' GDELT\'s GKG indexes articles globally, but for this specific query the API returned daily tone data beginning in January 2017. Pre-2017 admins show NA.',
      ),
      h('li', null,
        h('strong', null, 'Tone is lexicon-based.'),
        ' GDELT counts positive and negative valence words in each article. It does not understand ',
        h('em', null, 'who the article is about'),
        ' or ',
        h('em', null, 'what the author\'s intent is'),
        '. A headline like "Biden condemns Putin" registers as negative because of "condemns," even though Biden is the subject speaking against a negative event.',
      ),
      h('li', null,
        h('strong', null, 'US-English-only slice.'),
        ' The query filters to sourcelang:eng sourcecountry:US. International and non-English coverage is excluded \u2014 which matters because global news framing often differs from US framing.',
      ),
      h('li', null,
        h('strong', null, 'Query is a keyword proxy.'),
        ' "white house" OR president OR presidential catches most US executive-branch coverage but is not an exact match for "articles about the sitting president."',
      ),
      h('li', null,
        h('strong', null, 'Volume varies by era.'),
        ' Later years have denser news indexing, so the stability of averages is not uniform. The tone_months column in the table shows effective sample size per admin.',
      ),
    ),

    // Attribution
    h('h2', null, 'Attribution & license'),
    h('h3', null, 'GDELT \u2014 tone'),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Tone data sourced from the ',
      h('strong', null, 'GDELT Project'),
      ' (',
      h('em', null, 'Global Database of Events, Language, and Tone'),
      '). The GDELT project is a collaboration of Google Jigsaw with founders Kalev Leetaru and Philip Schrodt. Data made available under ',
      h('strong', null, 'Creative Commons Attribution-NonCommercial (CC-BY-NC)'),
      '. See ',
      h('a', { href: 'https://www.gdeltproject.org/', target: '_blank', rel: 'noopener noreferrer' }, 'https://www.gdeltproject.org/'),
      '.',
    ),

    h('h3', null, 'Non-commercial use'),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'This site\'s use of all media-analytics data (GDELT, Media Cloud) is non-commercial: the site carries no ads, sells no products, and is published for public educational research.',
    ),
  );
}
