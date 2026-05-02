import { LineGraph, DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import type { FccAppsByYearType } from '../../types.js';

const typeColors: Record<string, string> = {
  Amateur: '#2a6f97',
  'Amateur Vanity': '#6a4c93',
  GMRS: '#e07a5f',
};

export function FccByYear() {
  useSeoHead(
    'FCC Applications by Year',
    'Year-over-year FCC license application trends by service type.',
  );

  const data = getCsv<FccAppsByYearType>('/data/fcc/fcc_apps_by_year_type.csv');
  if (!data) return h(Loading, null);

  const types = [...new Set(data.map(r => String(r.application_type)))];

  const multiLine = types.map(type => {
    const typeData = data
      .filter(r => String(r.application_type) === type)
      .sort((a, b) => Number(a.year) - Number(b.year))
      .map(r => ({ x: Number(r.year), y: Number(r.count) }));
    return {
      data: typeData,
      color: typeColors[type] || '#6c757d',
      label: type,
    };
  }).filter(s => s.data.length > 0);

  // Wide-format table
  const allYears = [...new Set(data.map(r => Number(r.year)))].sort((a, b) => b - a);
  const wideData = allYears.map(year => {
    const row: Record<string, unknown> = { year };
    types.forEach(type => {
      const match = data.find(r => Number(r.year) === year && String(r.application_type) === type);
      row[type] = match ? Number(match.count) : 0;
    });
    return row;
  });

  const tableColumns = [
    { key: 'year', header: 'Year', sortable: true },
    ...types.map(type => ({
      key: type,
      header: type,
      sortable: true,
      render: (v: unknown) => fmtNum(v as number),
    })),
  ];

  return h('div', null,
    h('h1', null, 'Applications by Year'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Year-over-year FCC application trends by service type',
    ),

    h(VizWrapper, { title: 'Applications per year by service type \u2014 FCC ULS' },
      h(LineGraph, {
        pointRadius: 2,
        data: [],
        multiLine,
        height: 420,
        title: 'Applications by Year and Type',
      }),
    ),

    h(VizWrapper, { title: 'Application counts by year' },
      h(DataGrid, {
        columns: tableColumns,
        data: wideData,
        pageSize: 20,
        striped: true,
        compact: true,
      }),
    ),
  );
}
