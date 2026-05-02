import { BarGraph, LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { FccDecisionCount, FccTimingRow, FccPendingElapsed } from '../../types.js';

const decisionColors: Record<string, string> = {
  Granted: '#2f9e44',
  Denied: '#bc4749',
  Pending: '#f2c14e',
  Expired: '#6c757d',
};

export function FccGmrsDecisions() {
  useSeoHead(
    'GMRS License Decisions',
    'GMRS license applications \u2014 decisions, processing times for granted and denied, and pending application aging.',
  );

  const byDecision = getCsv<FccDecisionCount>('/data/fcc/fcc_gmrs_by_decision.csv');
  const grantedTiming = getCsv<FccTimingRow>('/data/fcc/fcc_gmrs_granted_timing.csv');
  const deniedTiming = getCsv<FccTimingRow>('/data/fcc/fcc_gmrs_denied_timing.csv');
  const pendingElapsed = getCsv<FccPendingElapsed>('/data/fcc/fcc_gmrs_pending_elapsed.csv');

  if (!byDecision || !grantedTiming || !deniedTiming || !pendingElapsed) return h(Loading, null);

  // 4. GMRS by decision bar chart
  const decisionBars = byDecision.map(r => ({
    x: String(r.decision),
    y: Number(r.count),
    color: decisionColors[String(r.decision)] || '#6c757d',
  }));

  // 5. Granted timing multi-line (min/max/avg)
  const grantedLines = ['min_days', 'max_days', 'avg_days'].map(field => ({
    data: grantedTiming
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map(r => ({ x: Number(r.year), y: Number((r as any)[field] || 0) })),
    color: field === 'min_days' ? '#2f9e44' : field === 'max_days' ? '#bc4749' : '#2a6f97',
    label: field === 'min_days' ? 'Min Days' : field === 'max_days' ? 'Max Days' : 'Avg Days',
  })).filter(s => s.data.length > 0);

  // 6. Denied timing multi-line
  const deniedLines = ['min_days', 'max_days', 'avg_days'].map(field => ({
    data: deniedTiming
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map(r => ({ x: Number(r.year), y: Number((r as any)[field] || 0) })),
    color: field === 'min_days' ? '#2f9e44' : field === 'max_days' ? '#bc4749' : '#2a6f97',
    label: field === 'min_days' ? 'Min Days' : field === 'max_days' ? 'Max Days' : 'Avg Days',
  })).filter(s => s.data.length > 0);

  // 7. Pending elapsed bar chart
  const pendingBars = pendingElapsed.map(r => ({
    x: String(r.range),
    y: Number(r.count),
    color: '#f2c14e',
  }));

  return h('div', null,
    h('h1', null, 'GMRS License Decisions'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'General Mobile Radio Service application decisions, processing times, and pending aging',
    ),

    // 4. GMRS by decision
    h('h2', { id: 'decisions' }, 'Applications by Decision'),
    h(VizWrapper, { title: 'GMRS applications by decision \u2014 FCC ULS' },
      h(BarGraph, {
        data: decisionBars,
        height: 400,
        title: 'GMRS Decisions',
      }),
    ),

    h(VizWrapper, { title: 'GMRS decision detail' },
      h(DataGrid, {
        columns: [
          { key: 'decision', header: 'Decision', sortable: true },
          { key: 'count', header: 'Applications', sortable: true, render: (v: unknown) => fmtNum(v as number) },
        ],
        data: byDecision,
        striped: true,
        compact: true,
      }),
    ),

    // 5. Granted timing
    h('h2', { id: 'granted-timing' }, 'Granted \u2014 Filing to Decision Time'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Min, max, and average number of days from application filing to grant decision, by year.',
    ),
    grantedLines.length > 0
      ? h(VizWrapper, { title: 'GMRS granted: days from filing to decision' },
          h(LineGraph, {
            pointRadius: 2,
            data: [],
            multiLine: grantedLines,
            height: 420,
            title: 'Filing to Grant (days)',
          }),
        )
      : h(Callout, { type: 'note' }, 'No granted timing data available.'),

    grantedTiming.length > 0
      ? h(VizWrapper, { title: 'Granted timing by year' },
          h(DataGrid, {
            columns: [
              { key: 'year', header: 'Year', sortable: true },
              { key: 'count', header: 'Granted', sortable: true, render: (v: unknown) => fmtNum(v as number) },
              { key: 'min_days', header: 'Min Days', sortable: true },
              { key: 'max_days', header: 'Max Days', sortable: true },
              { key: 'avg_days', header: 'Avg Days', sortable: true },
            ],
            data: grantedTiming,
            pageSize: 15,
            striped: true,
            compact: true,
          }),
        )
      : null,

    // 6. Denied timing
    h('h2', { id: 'denied-timing' }, 'Denied \u2014 Filing to Decision Time'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Min, max, and average number of days from application filing to denial, by year.',
    ),
    deniedLines.length > 0
      ? h(VizWrapper, { title: 'GMRS denied: days from filing to decision' },
          h(LineGraph, {
            pointRadius: 2,
            data: [],
            multiLine: deniedLines,
            height: 420,
            title: 'Filing to Denial (days)',
          }),
        )
      : h(Callout, { type: 'note' }, 'No denied timing data available.'),

    deniedTiming.length > 0
      ? h(VizWrapper, { title: 'Denied timing by year' },
          h(DataGrid, {
            columns: [
              { key: 'year', header: 'Year', sortable: true },
              { key: 'count', header: 'Denied', sortable: true, render: (v: unknown) => fmtNum(v as number) },
              { key: 'min_days', header: 'Min Days', sortable: true },
              { key: 'max_days', header: 'Max Days', sortable: true },
              { key: 'avg_days', header: 'Avg Days', sortable: true },
            ],
            data: deniedTiming,
            pageSize: 15,
            striped: true,
            compact: true,
          }),
        )
      : null,

    // 7. Pending elapsed
    h('h2', { id: 'pending' }, 'Pending \u2014 Elapsed Time Since Filing'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Distribution of currently pending GMRS applications by time elapsed since initial filing.',
    ),
    h(VizWrapper, { title: 'Pending GMRS applications by elapsed time' },
      h(BarGraph, {
        data: pendingBars,
        height: 400,
        title: 'Pending Elapsed Time',
      }),
    ),

    h(VizWrapper, { title: 'Pending elapsed detail' },
      h(DataGrid, {
        columns: [
          { key: 'range', header: 'Time Range', sortable: true },
          { key: 'count', header: 'Applications', sortable: true, render: (v: unknown) => fmtNum(v as number) },
        ],
        data: pendingElapsed,
        striped: true,
        compact: true,
      }),
    ),
  );
}
