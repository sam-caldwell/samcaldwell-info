import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
import { fmtNum } from '../../utils/formatters.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { ValueCard } from '../../components/ValueCard.js';
import { CardRow } from '../../components/CardRow.js';
import { Callout } from '../../components/Callout.js';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import type { FccAppsByType } from '../../types.js';

export function FccIndex() {
  useSeoHead(
    'FCC Applications',
    'Analysis of Federal Communications Commission license applications \u2014 Amateur Radio (HAM) and GMRS services.',
  );

  const appsByType = getCsv<FccAppsByType>('/data/fcc/fcc_apps_by_type.csv');
  if (!appsByType) return h(Loading, null);

  const proseStyle = { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' };

  const totalApps = appsByType.reduce((sum, r) => sum + Number(r.count || 0), 0);
  const hamCount = appsByType
    .filter(r => String(r.application_type).startsWith('Amateur'))
    .reduce((sum, r) => sum + Number(r.count || 0), 0);
  const gmrsCount = appsByType
    .filter(r => String(r.application_type) === 'GMRS')
    .reduce((sum, r) => sum + Number(r.count || 0), 0);

  return h('div', null,
    h('h1', null, 'FCC Applications'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Federal Communications Commission \u2014 Amateur Radio and GMRS license application analysis',
    ),

    h('p', { style: proseStyle },
      'Analysis of FCC Universal Licensing System (ULS) application data for Amateur Radio (HAM) and General Mobile Radio Service (GMRS) licenses. Data is sourced from FCC bulk data downloads, which provide complete application records including filing dates, grant/denial decisions, and applicant qualification responses.',
    ),

    totalApps > 0 ? h(CardRow, null,
      h(ValueCard, {
        label: 'Total Applications',
        value: fmtNum(totalApps),
        sublabel: 'All service types',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'Amateur Radio',
        value: fmtNum(hamCount),
        sublabel: 'HA + HV services',
        tone: 'neutral',
      }),
      h(ValueCard, {
        label: 'GMRS',
        value: fmtNum(gmrsCount),
        sublabel: 'ZA service',
        tone: 'neutral',
      }),
    ) : h(Callout, { type: 'warning' },
      'FCC dataset not yet populated. Run the data pipeline to fetch FCC bulk data.',
    ),

    h('h2', { id: 'sections' }, 'Sections'),
    h('ul', { style: { lineHeight: '2', fontSize: '1rem' } },
      h('li', null,
        h('a', { href: '#/fcc/by-type' }, h('strong', null, 'Applications by Type \u2192')),
        ' \u2014 Total application counts broken down by service type.',
      ),
      h('li', null,
        h('a', { href: '#/fcc/by-year' }, h('strong', null, 'Applications by Year \u2192')),
        ' \u2014 Year-over-year application trends by service type.',
      ),
      h('li', null,
        h('a', { href: '#/fcc/ham-decisions' }, h('strong', null, 'HAM Decisions \u2192')),
        ' \u2014 Amateur Radio license applications by decision status.',
      ),
      h('li', null,
        h('a', { href: '#/fcc/gmrs-decisions' }, h('strong', null, 'GMRS Decisions \u2192')),
        ' \u2014 GMRS license applications by decision, timing, and pending status.',
      ),
      h('li', null,
        h('a', { href: '#/fcc/gmrs-felony' }, h('strong', null, 'GMRS Felony Analysis \u2192')),
        ' \u2014 GMRS applications where the basic qualification (felony conviction) question was answered yes.',
      ),
      h('li', null,
        h('a', { href: '#/fcc/about' }, h('strong', null, 'Methodology \u2192')),
        ' \u2014 Data sources, field definitions, and pipeline details.',
      ),
    ),

    h('h2', { id: 'data-sources' }, 'Data Sources'),
    h(VizWrapper, { title: 'FCC data source attribution' },
      h(DataGrid, {
        columns: [
          { key: 'source', header: 'Source' },
          { key: 'what', header: 'What' },
          { key: 'license', header: 'License' },
          { key: 'refresh', header: 'Refresh' },
        ],
        data: [
          { source: 'FCC ULS Bulk Data', what: 'Amateur Radio (HA/HV) application records', license: 'Public domain (US gov)', refresh: 'Weekly' },
          { source: 'FCC ULS Bulk Data', what: 'GMRS (ZA) application records', license: 'Public domain (US gov)', refresh: 'Weekly' },
        ],
        striped: true,
        compact: true,
      }),
    ),
  );
}
