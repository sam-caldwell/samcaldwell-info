import { BarGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct, fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';
import type { AdminSentiment } from '../../types.js';

function partyColor(party: string): string {
  return party === 'Democratic' ? partyColors.Democratic : partyColors.Republican;
}

function partyBadge(party: string) {
  const color = partyColor(party);
  return h('span', {
    style: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      fontSize: '0.72rem',
      fontWeight: '600',
      letterSpacing: '0.04em',
      color: '#fff',
      background: color,
    },
  }, party.toUpperCase());
}

export function SentimentIndex() {
  useSeoHead(
    'Public Presidential Sentiment',
    'Approval, economic sentiment, and media sentiment by administration \u2014 1999 to present.',
  );

  const rawSent = getCsv<AdminSentiment>('/data/sentiment/admin_sentiment.csv');
  if (!rawSent) return h(Loading, null);

  const sent = rawSent.filter(r => r.party != null && r.party !== '');

  const adminLabel = (r: AdminSentiment) =>
    `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;

  // Combined bar data for Gallup
  const gallupBarData = sent
    .filter(r => r.gallup_avg != null)
    .map(r => ({
      label: adminLabel(r),
      value: Math.abs((r.gallup_avg as number) ?? 0),
      color: partyColor(r.party),
    }));

  // Table data
  const tableData = sent.map(r => ({
    president: r.president + (r.ongoing ? ' *' : ''),
    party: r.party,
    gallup_avg: r.gallup_avg,
    gallup_vs_baseline: r.gallup_vs_baseline,
    umcsent_avg: r.umcsent_avg,
    umcsent_vs_baseline: r.umcsent_vs_baseline,
  }));

  return h('div', null,
    h('h1', null, 'Public Presidential Sentiment'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Approval, economic sentiment, and media sentiment by administration \u2014 1999 to present',
    ),

    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'This report measures three different dimensions of public sentiment during each presidential administration from 1999 to the present:',
    ),

    h('ol', { style: { color: '#495057', lineHeight: '2', maxWidth: '65ch' } },
      h('li', null,
        h('strong', null, 'Political approval'),
        ' \u2014 aggregate Gallup approval averages by administration (hand-curated; polling APIs aren\'t free for full history).',
      ),
      h('li', null,
        h('strong', null, 'Economic sentiment'),
        ' \u2014 University of Michigan Consumer Sentiment Index (UMCSENT, monthly, via FRED \u2014 public-domain; auto-refreshed daily).',
      ),
      h('li', null,
        h('strong', null, 'Media sentiment'),
        ' \u2014 GDELT Doc 2.0 daily average-tone of US-presidency English-language news (CC-BY-NC; 2017-present only).',
      ),
      h('li', null,
        h('strong', null, 'Society radar'),
        ' \u2014 editorial six-aspect summary (Public Safety, Economy, Health, Prosperity, Happiness, Peace) on a \u221210/+10 scale per administration.',
      ),
    ),

    h(Callout, { type: 'important' },
      h('span', null,
        'None of these measures capture presidents directly \u2014 they capture ',
        h('strong', null, 'public response'),
        ' during a period that includes the president plus every other influence on public mood (wars, pandemics, the business cycle, global shocks, media environment). Treat these as descriptive, not causal. See ',
        h('a', { href: '#/sentiment/about' }, 'Methodology'),
        ' for the full caveats.',
      ),
    ),

    // Summary table
    h('h2', { id: 'summary' }, 'Summary by administration'),
    h(VizWrapper, { title: 'Sentiment summary \u2014 1999 to present' },
      h(DataGrid, {
        columns: [
          { key: 'president', header: 'President', sortable: true },
          {
            key: 'party', header: 'Party', sortable: true,
            render: (v: unknown) => partyBadge(v as string),
          },
          {
            key: 'gallup_avg', header: 'Gallup avg (%)', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 1),
          },
          {
            key: 'gallup_vs_baseline', header: 'vs baseline', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              if (n == null || isNaN(n)) return '\u2014';
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, (n > 0 ? '+' : '') + n.toFixed(1));
            },
          },
          {
            key: 'umcsent_avg', header: 'UMCSENT avg', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return n != null && !isNaN(n) ? n.toFixed(1) : '\u2014';
            },
          },
          {
            key: 'umcsent_vs_baseline', header: 'vs baseline', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              if (n == null || isNaN(n)) return '\u2014';
              return h('span', {
                style: { color: n < 0 ? '#bc4749' : '#2f9e44', fontWeight: '600' },
              }, (n > 0 ? '+' : '') + n.toFixed(1));
            },
          },
        ],
        data: tableData,
        striped: true,
        compact: true,
      }),
    ),

    // Combined bar chart
    h('h2', { id: 'combined' }, 'Political approval vs economic sentiment'),
    h('p', { style: { color: '#495057', lineHeight: '1.5', maxWidth: '65ch' } },
      'Two different things the two measures capture: approval is ',
      h('em', null, 'about the president'),
      ', UMCSENT is ',
      h('em', null, 'about the economy the public perceives'),
      '. They often move together but don\'t have to.',
    ),
    h(VizWrapper, { title: 'Gallup approval avg (%) per administration' },
      h(BarGraph, {
        data: gallupBarData,
        height: 360,
        showValues: true,
        title: 'Gallup approval avg (%)',
      }),
    ),

    // Where to go next
    h('h2', { id: 'next' }, 'Where to go next'),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/sentiment/approval' }, h('strong', null, 'Political Approval \u2192')),
        ' \u2014 Gallup per-admin averages, min/max volatility, exit vs. peak comparison.',
      ),
      h('li', null,
        h('a', { href: '#/sentiment/economic' }, h('strong', null, 'Economic Sentiment \u2192')),
        ' \u2014 UMCSENT timeline shaded by administration, world events overlay, per-admin averages vs long-run baseline.',
      ),
      h('li', null,
        h('a', { href: '#/sentiment/media' }, h('strong', null, 'Media Sentiment \u2192')),
        ' \u2014 GDELT-derived average-tone timeline, per-admin tone averages, coverage begins 2017.',
      ),
      h('li', null,
        h('a', { href: '#/sentiment/society' }, h('strong', null, 'Society Radar \u2192')),
        ' \u2014 six-aspect radar chart on a \u221210/+10 scale per administration (editorial).',
      ),
      h('li', null,
        h('a', { href: '#/sentiment/network' }, h('strong', null, 'Network Graph \u2192')),
        ' \u2014 force-directed graph linking presidents to legislation and events.',
      ),
      h('li', null,
        h('a', { href: '#/sentiment/about' }, h('strong', null, 'Methodology \u2192')),
        ' \u2014 source provenance, why "sentiment toward an administration" is imprecise, caveats.',
      ),
    ),
  );
}
