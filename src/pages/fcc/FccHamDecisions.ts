import { BarGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import type { FccDecisionCount } from '../../types.js';

const decisionColors: Record<string, string> = {
  Granted: '#2f9e44',
  Denied: '#bc4749',
  Pending: '#f2c14e',
  Expired: '#6c757d',
};

export function FccHamDecisions() {
  useSeoHead(
    'HAM License Decisions',
    'Amateur Radio (HAM) license applications by decision status \u2014 granted, denied, and pending.',
  );

  const data = getCsv<FccDecisionCount>('/data/fcc/fcc_ham_by_decision.csv');
  if (!data) return h(Loading, null);

  const barData = data.map(r => ({
    x: String(r.decision),
    y: Number(r.count),
    color: decisionColors[String(r.decision)] || '#6c757d',
  }));

  const total = data.reduce((sum, r) => sum + Number(r.count || 0), 0);

  return h('div', null,
    h('h1', null, 'HAM License Decisions'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Amateur Radio license applications by decision status',
    ),

    h(Callout, { type: 'note', title: 'Service codes' },
      'Includes both standard Amateur (HA) and Amateur Vanity (HV) service codes.',
    ),

    h(VizWrapper, { title: 'HAM applications by decision \u2014 FCC ULS' },
      h(BarGraph, {
        data: barData,
        height: 400,
        title: 'HAM License Decisions',
      }),
    ),

    h(VizWrapper, { title: 'Decision detail' },
      h(DataGrid, {
        columns: [
          { key: 'decision', header: 'Decision', sortable: true },
          { key: 'count', header: 'Applications', sortable: true, render: (v: unknown) => fmtNum(v as number) },
          {
            key: 'pct', header: '% of Total', sortable: true,
            render: (_v: unknown, row: any) => total > 0
              ? (Number(row.count) / total * 100).toFixed(1) + '%'
              : '\u2014',
          },
        ],
        data,
        striped: true,
        compact: true,
      }),
    ),
  );
}
