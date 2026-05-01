import { useState, useEffect } from 'specifyjs';
import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { fetchCsv } from '../../utils/csv.js';
import { useSeoHead } from '../../components/SeoHead.js';
import { Loading } from '../../components/Loading.js';
import { Callout } from '../../components/Callout.js';
import { partyColors } from '../../theme.js';
import type { SocietyScore } from '../../types.js';

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

function scoreCell(v: number | null) {
  if (v == null || isNaN(v)) return '\u2014';
  const color = v > 0 ? '#2f9e44' : v < 0 ? '#bc4749' : '#6c757d';
  const sign = v > 0 ? '+' : '';
  return h('span', {
    style: { fontWeight: '600', color },
  }, `${sign}${v}`);
}

export function SentimentSociety() {
  useSeoHead(
    'Society Radar',
    'Sentiment across six aspects of public life, by administration \u2014 editorial calibrations on a \u221210/+10 scale.',
  );

  const [scores, setScores] = useState<SocietyScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCsv<SocietyScore>('/data/sentiment/society_scores.csv').then(data => {
      setScores(data);
      setLoading(false);
    });
  }, []);

  if (loading) return h(Loading, null);

  const aspectOrder = ['Public Safety', 'Economy', 'Health', 'Prosperity', 'Happiness', 'Peace'];
  const adminOrder = [
    'Bill Clinton', 'George W. Bush', 'Barack Obama',
    'Donald Trump (1st term)', 'Joe Biden', 'Donald Trump (2nd term)',
  ];

  const adminColors: Record<string, string> = {
    'Bill Clinton': '#e63946',
    'George W. Bush': '#f77f00',
    'Barack Obama': '#fcbf49',
    'Donald Trump (1st term)': '#2f9e44',
    'Joe Biden': '#2a6f97',
    'Donald Trump (2nd term)': '#7b2cbf',
  };

  // Build a pivot table: rows = aspects, columns = presidents
  const pivotData = aspectOrder.map(aspect => {
    const row: Record<string, unknown> = { aspect };
    for (const admin of adminOrder) {
      const match = scores.find(s => s.aspect === aspect && s.president === admin);
      row[admin] = match ? match.score : null;
    }
    return row;
  });

  // Present admins (those that exist in data)
  const presentAdmins = adminOrder.filter(a => scores.some(s => s.president === a));

  // Pivot DataGrid columns
  const pivotColumns = [
    { key: 'aspect', header: 'Aspect', sortable: true },
    ...presentAdmins.map(admin => ({
      key: admin,
      header: admin.replace(' (1st term)', ' I').replace(' (2nd term)', ' II'),
      sortable: true,
      render: (v: unknown) => scoreCell(v as number | null),
    })),
  ];

  // Full scores table
  const tableData = scores.map(r => ({
    president: r.president + (r.president.includes('2nd term') ? ' *' : ''),
    party: r.party,
    aspect: r.aspect,
    score: r.score,
    notes: r.notes,
  }));

  return h('div', null,
    h('h1', null, 'Society Radar'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Sentiment across six aspects of public life, by administration',
    ),

    h('p', { style: { color: '#495057', fontSize: '1.02rem', maxWidth: '65ch', lineHeight: '1.55' } },
      'Each column is one presidential administration. Rows are six aspects of public life; the score represents sentiment from ',
      h('strong', null, '\u221210'),
      ' (extreme negative) to ',
      h('strong', null, '+10'),
      ' (extreme positive), with ',
      h('strong', null, '0'),
      ' as the baseline. A score of 0 means sentiment on that aspect was neutral during that administration.',
    ),

    h(Callout, { type: 'important' },
      h('span', null,
        h('strong', null, 'These scores are editorial calibrations.'),
        ' They anchor on measurable signals used elsewhere on this site (UMCSENT, Gallup approval, NBER recessions, wars-in-progress, published violent-crime indices) plus historical commentary, but the final single-number \u221210/+10 mapping per aspect is a single author\'s aggregation. See ',
        h('a', { href: '#/sentiment/about' }, 'Methodology'),
        ' for the full caveats, and data/sentiment/society_scores.csv in the repo for the rationale attached to each score. Corrections welcome via the repo.',
      ),
    ),

    // Radar as pivot table
    h('h2', { id: 'radar' }, 'Scores by aspect and administration'),
    h(VizWrapper, { title: 'Sentiment across six aspects of society, by administration' },
      h(DataGrid, {
        columns: pivotColumns,
        data: pivotData,
        striped: true,
        compact: true,
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      '\u221210 extreme negative \u00B7 0 baseline \u00B7 +10 extreme positive',
    ),

    // Full scores table
    h('h2', { id: 'table' }, 'Scores table'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Full list of curated scores, with per-row justification notes. Edit data/sentiment/society_scores.csv to refine.',
    ),
    h(VizWrapper, { title: 'Society scores detail' },
      h(DataGrid, {
        columns: [
          { key: 'president', header: 'President', sortable: true },
          {
            key: 'party', header: 'Party', sortable: true,
            render: (v: unknown) => partyBadge(v as string),
          },
          { key: 'aspect', header: 'Aspect', sortable: true },
          {
            key: 'score', header: 'Score (-10...+10)', sortable: true,
            render: (v: unknown) => scoreCell(v as number | null),
          },
          { key: 'notes', header: 'Calibration notes', sortable: false },
        ],
        data: tableData,
        pageSize: 40,
        striped: true,
        compact: true,
      }),
    ),

    // Reading the chart
    h('h2', null, 'Reading the chart'),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'A row that stays near ',
      h('strong', null, '0'),
      ' across all administrations = a baseline aspect (nothing notably better or worse than average). A score that spikes ',
      h('strong', null, 'positive'),
      ' = notably positive on that aspect; a score that goes ',
      h('strong', null, 'deeply negative'),
      ' = notably negative.',
    ),
    h('p', { style: { color: '#495057', lineHeight: '1.55', maxWidth: '65ch' } },
      'Because the six aspects are independent, an administration can be strong on some and weak on others \u2014 Clinton\'s scores fill the positive half on economy and prosperity but sit near the middle on peace; Bush 43\'s inner score on peace reflects the wars in progress throughout his term; Trump I\'s health score collapses to a deep negative because of COVID-19\'s first-wave fatalities.',
    ),

    // Methodology summary
    h('h2', null, 'Methodology summary'),
    h('ul', { style: { color: '#495057', lineHeight: '2', maxWidth: '65ch' } },
      h('li', null,
        h('strong', null, 'Six aspects'),
        ' chosen for their independent signal: Public Safety, Economy, Health, Prosperity, Happiness, Peace.',
      ),
      h('li', null,
        h('strong', null, 'Scale'),
        ' is \u221210 to +10, calibrated so that 0 = long-run baseline for US conditions since ~1990. Values outside \u00B15 are reserved for historically extreme situations (war, pandemic, recession depth).',
      ),
      h('li', null,
        h('strong', null, 'Data anchors'),
        ' per aspect:',
        h('ul', null,
          h('li', null, h('em', null, 'Public Safety'), ': violent-crime rate trend (FBI UCR); high-salience events; Gallup crime-worry polling.'),
          h('li', null, h('em', null, 'Economy'), ': UMCSENT, NBER recession dating, GDP growth pattern.'),
          h('li', null, h('em', null, 'Health'), ': life-expectancy trajectory, major public-health events, major legislative changes.'),
          h('li', null, h('em', null, 'Prosperity'), ': real-wage growth, household-wealth trajectory, inflation impact on cost of living.'),
          h('li', null, h('em', null, 'Happiness'), ': UMCSENT level, Gallup life-satisfaction, approval bottoms.'),
          h('li', null, h('em', null, 'Peace'), ': number and scale of active wars involving US forces; major international crises on US agenda.'),
        ),
      ),
      h('li', null,
        h('strong', null, 'Ongoing administration (Trump 2nd term)'),
        ' gets partial scores; aspects that can\'t be judged yet are omitted.',
      ),
    ),

    // Sources
    h('h2', null, 'Sources'),
    h('p', { style: { color: '#495057', lineHeight: '1.5' } },
      'Anchor data comes from the same sources already cited elsewhere \u2014 see ',
      h('a', { href: '#/economy/about' }, 'Data & Citations'),
      ' and ',
      h('a', { href: '#/sentiment/about' }, 'Methodology'),
      '.',
    ),
  );
}
