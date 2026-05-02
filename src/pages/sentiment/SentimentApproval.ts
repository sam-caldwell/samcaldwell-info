import { BarGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtPct } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';
import type { AdminSentiment, GallupApproval } from '../../types.js';

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
      color: '#fff',
      background: color,
    },
  }, party.toUpperCase());
}

export function SentimentApproval() {
  useSeoHead(
    'Political Approval',
    'Gallup per-administration averages, 1999 to present.',
  );

  const rawSent = getCsv<AdminSentiment>('/data/sentiment/admin_sentiment.csv');
  const gallup = getCsv<GallupApproval>('/data/sentiment/gallup_approval.csv');
  if (!rawSent || !gallup) return h(Loading, null);

  const sent = rawSent.filter(r => r.party != null && r.party !== '');

  const adminLabel = (r: AdminSentiment) =>
    `${r.president.split(' ').pop()}${r.ongoing ? ' *' : ''}`;

  // Compute baseline from gallup data
  const approvals = gallup.map(r => r.avg_approval).filter(v => v != null && !isNaN(v));
  const baseline = approvals.length
    ? Math.round(approvals.reduce((s, v) => s + v, 0) / approvals.length * 10) / 10
    : 0;

  // Approval bar data
  const approvalBarData = sent
    .filter(r => r.gallup_avg != null)
    .map(r => ({
      label: adminLabel(r),
      value: Math.abs((r.gallup_avg as number) ?? 0),
      color: partyColor(r.party),
    }));

  // Gallup detail table data
  const tableData = gallup.map(r => ({
    president: r.president,
    party: r.party,
    avg_approval: r.avg_approval,
    min_approval: r.min_approval,
    max_approval: r.max_approval,
    last_approval: r.last_approval,
    notes: r.notes || '',
  }));

  return h('div', null,
    h('h1', null, 'Political Approval'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Gallup per-administration averages, 1999 to present',
    ),

    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'Gallup\'s ',
      h('em', null, 'job approval'),
      ' question is the longest continuous polling series of its kind. The numbers below are ',
      h('strong', null, 'term-average approval ratings'),
      ' \u2014 not snapshot polls. They tell you what percentage of Americans, on average across each president\'s entire term, answered "approve" when asked whether they approved of the job the president was doing.',
    ),

    h(Callout, { type: 'note' },
      h('span', null,
        'Gallup approval is not available from a free API; the values in gallup_approval.csv are ',
        h('strong', null, 'hand-curated'),
        ' from Gallup\'s published summaries and updated on demand, not daily. The ',
        h('em', null, 'economic-sentiment'),
        ' portion of this site refreshes daily from FRED; this section does not.',
      ),
    ),

    // Per-administration average bar
    h('h2', { id: 'avg' }, 'Per-administration average'),
    h('p', { style: { color: '#6c757d', fontSize: '0.9rem' } },
      `Horizontal reference: the average of completed admins' averages (${baseline}%).`,
    ),
    h(VizWrapper, { title: 'Gallup approval: term average per administration' },
      h(BarGraph, {
        data: approvalBarData,
        height: 360,
        showValues: true,
        title: 'Gallup approval: term average per administration',
      }),
    ),

    // Range description
    h('h2', { id: 'range' }, 'Range: min to max during each term'),
    h('p', { style: { color: '#495057', lineHeight: '1.5', maxWidth: '65ch' } },
      'Presidents often peak early (honeymoon) or after major rallying events (9/11), and decline late. The table below shows the full min\u2013max range each president traversed, with their term-average and exit approval.',
    ),

    // Detailed Gallup table
    h('h2', { id: 'table' }, 'Detailed Gallup table'),
    h(VizWrapper, { title: 'Gallup approval detail' },
      h(DataGrid, {
        columns: [
          { key: 'president', header: 'President', sortable: true },
          {
            key: 'party', header: 'Party', sortable: true,
            render: (v: unknown) => partyBadge(v as string),
          },
          {
            key: 'avg_approval', header: 'Avg (%)', sortable: true,
            render: (v: unknown) => {
              const n = v as number;
              return h('span', { style: { fontWeight: '600' } }, fmtPct(n, 1));
            },
          },
          {
            key: 'min_approval', header: 'Min (%)', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 0),
          },
          {
            key: 'max_approval', header: 'Max (%)', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 0),
          },
          {
            key: 'last_approval', header: 'Exit (%)', sortable: true,
            render: (v: unknown) => fmtPct(v as number, 0),
          },
          { key: 'notes', header: 'Notes', sortable: false },
        ],
        data: tableData,
        striped: true,
        compact: true,
      }),
    ),

    // Sources
    h('h2', null, 'Sources'),
    h('ul', { style: { color: '#495057', lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Gallup News:'),
        ' ',
        h('em', null, 'Presidential Job Approval Center.'),
        ' ',
        h('a', { href: 'https://news.gallup.com/interactives/185273/presidential-job-approval-center.aspx', target: '_blank', rel: 'noopener noreferrer' }, 'https://news.gallup.com/interactives/185273/presidential-job-approval-center.aspx'),
      ),
      h('li', null,
        h('strong', null, 'The American Presidency Project (UCSB):'),
        ' ',
        h('em', null, 'Presidential Job Approval Tables.'),
        ' ',
        h('a', { href: 'https://www.presidency.ucsb.edu/statistics/data/presidential-job-approval', target: '_blank', rel: 'noopener noreferrer' }, 'https://www.presidency.ucsb.edu/statistics/data/presidential-job-approval'),
      ),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem', maxWidth: '65ch', lineHeight: '1.5' } },
      'Aggregate averages are facts in the Feist v. Rural sense (not copyrightable), but survey methodology and phrasing vary across polling firms. These figures use Gallup\'s consistent methodology throughout.',
    ),
  );
}
