import { BarGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import type { FccAppsByType } from '../../types.js';

const typeColors: Record<string, string> = {
  Amateur: '#2a6f97',
  'Amateur Vanity': '#6a4c93',
  GMRS: '#e07a5f',
};

export function FccByType() {
  useSeoHead(
    'FCC Applications by Type',
    'FCC license applications broken down by radio service type \u2014 Amateur, Amateur Vanity, and GMRS.',
  );

  const data = getCsv<FccAppsByType>('/data/fcc/fcc_apps_by_type.csv');
  if (!data) return h(Loading, null);

  const barData = data.map(r => ({
    label: String(r.application_type),
    value: Number(r.count),
    color: typeColors[String(r.application_type)] || '#6c757d',
  }));

  return h('div', null,
    h('h1', null, 'Applications by Type'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'FCC license applications by radio service type',
    ),

    h(VizWrapper, { title: 'Application counts by service type \u2014 FCC ULS' },
      h(BarGraph, {
        data: barData,
        height: 400,
        title: 'Applications by Type',
      }),
    ),

    h(VizWrapper, { title: 'Application counts detail' },
      h(DataGrid, {
        columns: [
          { key: 'application_type', header: 'Service Type', sortable: true },
          { key: 'count', header: 'Applications', sortable: true, render: (v: unknown) => fmtNum(v as number) },
        ],
        data,
        striped: true,
        compact: true,
      }),
    ),
  );
}
