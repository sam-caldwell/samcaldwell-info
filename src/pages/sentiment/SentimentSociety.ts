import { DataGrid, VizWrapper } from '@asymmetric-effort/specifyjs/components';
import { h } from '../../h.js';
import { getCsv } from '../../utils/data-cache.js';
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

/** Build an SVG radar chart for society scores */
function RadarChart(props: {
  aspects: string[];
  series: { label: string; values: number[]; color: string }[];
  minVal: number;
  maxVal: number;
  size?: number;
}) {
  const { aspects, series, minVal, maxVal, size = 400 } = props;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const n = aspects.length;
  const range = maxVal - minVal;

  // Angle for each axis (start from top, go clockwise)
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Convert a value to a distance from center
  const valToR = (v: number) => ((v - minVal) / range) * radius;

  // Point on axis at given distance
  const point = (i: number, r: number) => ({
    x: cx + Math.cos(angle(i)) * r,
    y: cy + Math.sin(angle(i)) * r,
  });

  // Grid rings at -10, -5, 0, +5, +10
  const rings = [-10, -5, 0, 5, 10];
  const gridRings = rings.map(v => {
    const r = valToR(v);
    const pts = Array.from({ length: n }, (_, i) => point(i, r));
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
    return h('path', {
      key: `ring-${v}`,
      d,
      fill: 'none',
      stroke: v === 0 ? '#495057' : '#dee2e6',
      'stroke-width': v === 0 ? '1.5' : '0.75',
      'stroke-dasharray': v === 0 ? '' : '3,3',
    });
  });

  // Axis lines
  const axisLines = aspects.map((_, i) => {
    const outer = point(i, radius);
    return h('line', {
      key: `axis-${i}`,
      x1: String(cx), y1: String(cy),
      x2: String(outer.x.toFixed(1)), y2: String(outer.y.toFixed(1)),
      stroke: '#dee2e6',
      'stroke-width': '0.75',
    });
  });

  // Axis labels
  const labelOffset = radius + 24;
  const axisLabels = aspects.map((label, i) => {
    const p = point(i, labelOffset);
    const anchor = Math.abs(p.x - cx) < 5 ? 'middle' : p.x > cx ? 'start' : 'end';
    return h('text', {
      key: `label-${i}`,
      x: String(p.x.toFixed(1)),
      y: String(p.y.toFixed(1)),
      'text-anchor': anchor,
      'dominant-baseline': p.y < cy ? 'auto' : 'hanging',
      'font-size': '11',
      'font-weight': '500',
      fill: '#1d3557',
    }, label);
  });

  // Ring value labels (on the first axis)
  const ringLabels = rings.map(v => {
    const p = point(0, valToR(v));
    return h('text', {
      key: `ringval-${v}`,
      x: String((p.x + 4).toFixed(1)),
      y: String((p.y - 4).toFixed(1)),
      'font-size': '9',
      fill: '#6c757d',
    }, String(v));
  });

  // Data polygons
  const polygons = series.map((s, si) => {
    const pts = s.values.map((v, i) => point(i, valToR(v)));
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
    return h('path', {
      key: `poly-${si}`,
      d,
      fill: s.color,
      'fill-opacity': '0.12',
      stroke: s.color,
      'stroke-width': '2',
      'stroke-linejoin': 'round',
    });
  });

  // Data points (dots)
  const dots = series.flatMap((s, si) =>
    s.values.map((v, i) => {
      const p = point(i, valToR(v));
      return h('circle', {
        key: `dot-${si}-${i}`,
        cx: String(p.x.toFixed(1)),
        cy: String(p.y.toFixed(1)),
        r: '3.5',
        fill: s.color,
        stroke: '#fff',
        'stroke-width': '1.5',
      });
    })
  );

  // Legend
  const legend = h('div', {
    style: {
      display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center',
      marginTop: '12px', fontSize: '0.85rem',
    },
  }, ...series.map((s, i) =>
    h('span', {
      key: `leg-${i}`,
      style: { display: 'flex', alignItems: 'center', gap: '5px' },
    },
      h('span', {
        style: {
          display: 'inline-block', width: '14px', height: '14px',
          borderRadius: '3px', background: s.color,
        },
      }),
      s.label,
    )
  ));

  return h('div', { style: { textAlign: 'center' } },
    h('svg', {
      viewBox: `0 0 ${size} ${size}`,
      style: { width: '100%', maxWidth: `${size}px`, height: 'auto' },
    },
      ...gridRings,
      ...axisLines,
      ...axisLabels,
      ...ringLabels,
      ...polygons,
      ...dots,
    ),
    legend,
  );
}

export function SentimentSociety() {
  useSeoHead(
    'Society Radar',
    'Sentiment across six aspects of public life, by administration \u2014 editorial calibrations on a \u221210/+10 scale.',
  );

  const scores = getCsv<SocietyScore>('/data/sentiment/society_scores.csv');
  if (!scores) return h(Loading, null);

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

  const adminLabels: Record<string, string> = {
    'Bill Clinton': 'Clinton',
    'George W. Bush': 'Bush',
    'Barack Obama': 'Obama',
    'Donald Trump (1st term)': 'Trump I',
    'Joe Biden': 'Biden',
    'Donald Trump (2nd term)': 'Trump II',
  };

  // Build radar series
  const presentAdmins = adminOrder.filter(a => scores.some(s => s.president === a));
  const radarSeries = presentAdmins.map(admin => ({
    label: adminLabels[admin] || admin,
    color: adminColors[admin] || '#6c757d',
    values: aspectOrder.map(aspect => {
      const match = scores.find(s => s.aspect === aspect && s.president === admin);
      return match ? Number(match.score) || 0 : 0;
    }),
  }));

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
      'Each axis is one aspect of public life. Each colored polygon represents one administration. Points further from center indicate more positive sentiment; points closer to center indicate more negative sentiment. The bold ring marks the neutral baseline (0).',
    ),

    h(Callout, { type: 'important' },
      h('span', null,
        h('strong', null, 'These scores are editorial calibrations.'),
        ' They anchor on measurable signals used elsewhere on this site (UMCSENT, Gallup approval, NBER recessions, wars-in-progress, published violent-crime indices) plus historical commentary, but the final single-number \u221210/+10 mapping per aspect is a single author\'s aggregation. See ',
        h('a', { href: '#/sentiment/about' }, 'Methodology'),
        ' for the full caveats, and data/sentiment/society_scores.csv in the repo for the rationale attached to each score. Corrections welcome via the repo.',
      ),
    ),

    // Radar chart
    h('h2', { id: 'radar' }, 'Sentiment radar by administration'),
    h(VizWrapper, { title: 'Sentiment across six aspects of society, by administration' },
      h(RadarChart, {
        aspects: aspectOrder,
        series: radarSeries,
        minVal: -10,
        maxVal: 10,
        size: 420,
      }),
    ),
    h('p', { style: { color: '#6c757d', fontSize: '0.88rem' } },
      '\u221210 extreme negative (center) \u00B7 0 baseline (bold ring) \u00B7 +10 extreme positive (outer edge)',
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
      'A polygon that stays near the bold ring across all axes = a baseline administration (nothing notably better or worse than average). A polygon that extends outward on an axis = notably positive on that aspect; a polygon that collapses inward = notably negative. Overlapping polygons make it easy to compare which administrations excelled or struggled on each dimension.',
    ),

    // Methodology
    h('h2', null, 'Aspects'),
    h('p', { style: { color: '#495057', lineHeight: '1.5', maxWidth: '65ch' } },
      'The six axes are anchored to public data where possible:',
    ),
    h('ul', { style: { color: '#495057', lineHeight: '1.6' } },
      h('li', null, h('strong', null, 'Public Safety'), ' \u2014 violent-crime indices, mass-shooting cadence, foreign attacks on US soil'),
      h('li', null, h('strong', null, 'Economy'), ' \u2014 GDP growth, unemployment change, CPI inflation, UMCSENT'),
      h('li', null, h('strong', null, 'Health'), ' \u2014 pandemic impact, uninsured rate, opioid death curve'),
      h('li', null, h('strong', null, 'Prosperity'), ' \u2014 median real income growth, S&P 500 return, housing starts'),
      h('li', null, h('strong', null, 'Happiness'), ' \u2014 Gallup approval, general social survey, "right direction" polling'),
      h('li', null, h('strong', null, 'Peace'), ' \u2014 wars initiated/inherited, military deployments, diplomatic milestones'),
    ),
  );
}
