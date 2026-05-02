import { BarGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { FccFelonyDecision, FccTimingRow, FccFelonyCounts } from '../../types.js';

const decisionColors: Record<string, string> = {
  Granted: '#2f9e44',
  Denied: '#bc4749',
  Pending: '#f2c14e',
  Expired: '#6c757d',
};

export function FccGmrsFelony() {
  useSeoHead(
    'GMRS Felony Analysis',
    'GMRS license applications where the basic qualification (felony conviction) question was answered yes.',
  );

  const felonyDecision = getCsv<FccFelonyDecision>('/data/fcc/fcc_gmrs_felony_decision.csv');
  const felonyTiming = getCsv<FccTimingRow>('/data/fcc/fcc_gmrs_felony_timing.csv');
  const felonyCounts = getCsv<FccFelonyCounts>('/data/fcc/fcc_gmrs_felony_counts.csv');

  if (!felonyDecision || !felonyTiming || !felonyCounts) return h(Loading, null);

  // 8. Felony-flagged by decision
  const felonyBars = felonyDecision.map(r => ({
    x: String(r.decision),
    y: Number(r.count),
    color: decisionColors[String(r.decision)] || '#6c757d',
  }));

  // 9. Felony timing bars (grouped by decision)
  const felonyTimingBars = felonyTiming.map(r => ({
    x: String(r.decision),
    y: Number(r.avg_days || 0),
    color: decisionColors[String(r.decision)] || '#6c757d',
  }));

  // 10. Felony counts (grouped bar: convicted Y/N x Granted/Denied)
  const felonyCountBars = felonyCounts.map(r => ({
    x: `${r.convicted_label} / ${r.decision}`,
    y: Number(r.count),
    color: String(r.convicted) === 'Y'
      ? (String(r.decision) === 'Granted' ? '#2f9e44' : '#bc4749')
      : (String(r.decision) === 'Granted' ? '#a8d5ba' : '#e8a0a2'),
  }));

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  return h('div', null,
    h('h1', null, 'GMRS Felony Analysis'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Analysis of GMRS applications with felony conviction disclosure',
    ),

    h(Callout, { type: 'note', title: 'Basic Qualification Question' },
      'FCC Form 605 asks: "Has the Applicant or any party to this application or amendment, or any party directly or indirectly controlling the Applicant, ever been convicted of a felony by any state or federal court?" This analysis examines applications where this question was answered "Yes."',
    ),

    // 8. Felony by decision
    h('h2', { id: 'felony-decisions' }, 'Felony-Flagged Applications by Decision'),
    h('p', { style: proseStyle },
      'Distribution of outcomes for GMRS applications where the felony conviction question was answered "Yes."',
    ),
    felonyBars.length > 0
      ? h(VizWrapper, { title: 'Felony-flagged GMRS applications by decision' },
          h(BarGraph, {
            data: felonyBars,
            height: 400,
            title: 'Felony Applications by Decision',
          }),
        )
      : h(Callout, { type: 'note' }, 'No felony-flagged applications found.'),

    felonyDecision.length > 0
      ? h(VizWrapper, { title: 'Felony-flagged decision detail' },
          h(DataGrid, {
            columns: [
              { key: 'decision', header: 'Decision', sortable: true },
              { key: 'count', header: 'Applications', sortable: true, render: (v: unknown) => fmtNum(v as number) },
            ],
            data: felonyDecision,
            striped: true,
            compact: true,
          }),
        )
      : null,

    // 9. Felony timing
    h('h2', { id: 'felony-timing' }, 'Felony-Flagged Processing Time'),
    h('p', { style: proseStyle },
      'Duration from filing to decision for GMRS applications with felony disclosure, broken down by outcome.',
    ),
    felonyTiming.length > 0
      ? h(VizWrapper, { title: 'Felony-flagged: filing to decision duration' },
          h(DataGrid, {
            columns: [
              { key: 'decision', header: 'Decision', sortable: true },
              { key: 'count', header: 'Applications', sortable: true, render: (v: unknown) => fmtNum(v as number) },
              { key: 'min_days', header: 'Min Days', sortable: true },
              { key: 'max_days', header: 'Max Days', sortable: true },
              { key: 'avg_days', header: 'Avg Days', sortable: true },
            ],
            data: felonyTiming,
            striped: true,
            compact: true,
          }),
        )
      : h(Callout, { type: 'note' }, 'No felony timing data available.'),

    felonyTimingBars.length > 0
      ? h(VizWrapper, { title: 'Avg days from filing to decision (felony-flagged)' },
          h(BarGraph, {
            data: felonyTimingBars,
            height: 400,
            title: 'Avg Processing Time (Felony)',
          }),
        )
      : null,

    // 10. Granted/Denied by felony answer
    h('h2', { id: 'felony-comparison' }, 'Granted/Denied by Felony Question'),
    h('p', { style: proseStyle },
      'Comparison of grant and denial rates based on whether the applicant disclosed a felony conviction.',
    ),
    felonyCountBars.length > 0
      ? h(VizWrapper, { title: 'GMRS granted/denied by felony disclosure' },
          h(BarGraph, {
            data: felonyCountBars,
            height: 400,
            title: 'Outcomes by Felony Disclosure',
          }),
        )
      : h(Callout, { type: 'note' }, 'No felony comparison data available.'),

    felonyCounts.length > 0
      ? h(VizWrapper, { title: 'Felony comparison detail' },
          h(DataGrid, {
            columns: [
              { key: 'convicted_label', header: 'Felony Question', sortable: true },
              { key: 'decision', header: 'Decision', sortable: true },
              { key: 'count', header: 'Applications', sortable: true, render: (v: unknown) => fmtNum(v as number) },
            ],
            data: felonyCounts,
            striped: true,
            compact: true,
          }),
        )
      : null,
  );
}
