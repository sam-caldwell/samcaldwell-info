import { useHead } from 'specifyjs';
import { h } from '../h.js';

interface AnalysisCardProps {
  href: string;
  title: string;
  description: string;
  badges: string[];
  placeholder?: boolean;
}

function AnalysisCard(props: AnalysisCardProps) {
  const { href, title, description, badges, placeholder } = props;

  const badgeEls = badges.map((b, i) =>
    h('span', {
      key: String(i),
      style: {
        fontSize: '0.68rem',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        padding: '3px 8px',
        background: b === 'Planned' ? '#adb5bd' : (b === 'Live' ? '#2a6f97' : 'transparent'),
        color: b === 'Live' || b === 'Planned' ? '#fff' : '#6c757d',
        border: b !== 'Live' && b !== 'Planned' ? '1px solid #ced4da' : 'none',
        borderRadius: '3px',
        fontWeight: '600',
      },
    }, b)
  );

  const cardContent = [
    h('div', { key: 'badges', style: { display: 'flex', gap: '6px', marginBottom: '10px' } }, ...badgeEls),
    h('h3', { key: 'title', style: { margin: '0 0 10px', fontSize: '1.25rem', color: '#1d3557', fontWeight: '600' } }, title),
    h('p', { key: 'desc', style: { fontSize: '0.95rem', color: '#495057', lineHeight: '1.5', margin: '0 0 14px', flex: '1' } }, description),
    !placeholder ? h('span', { key: 'cta', style: { fontSize: '0.9rem', color: '#2a6f97', fontWeight: '600', marginTop: 'auto' } }, 'Open analysis \u2192') : null,
  ];

  if (placeholder) {
    return h('div', {
      style: {
        display: 'flex', flexDirection: 'column', padding: '22px',
        background: '#f8f9fa', border: '1px dashed #dee2e6', borderRadius: '10px',
        opacity: '0.55', cursor: 'default', minHeight: '220px',
      },
    }, ...cardContent);
  }

  return h('a', {
    href: `#${href}`,
    style: {
      display: 'flex', flexDirection: 'column', padding: '22px',
      background: '#fff', border: '1px solid #dee2e6', borderRadius: '10px',
      textDecoration: 'none', color: 'inherit', minHeight: '220px',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
    },
    onMouseEnter: (e: any) => {
      const el = e.currentTarget;
      el.style.transform = 'translateY(-2px)';
      el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)';
      el.style.borderColor = '#2a6f97';
    },
    onMouseLeave: (e: any) => {
      const el = e.currentTarget;
      el.style.transform = '';
      el.style.boxShadow = '';
      el.style.borderColor = '#dee2e6';
    },
  }, ...cardContent);
}

const analyses: AnalysisCardProps[] = [
  {
    href: '/economy',
    title: 'US Economy 1999 to Present',
    description: 'Drill-down analysis of GDP, employment, inflation, interest rates, and financial markets from 1999 to the present. Compare the current year to every prior year in the window; explore quarterly detail, GDP components, and economy-vs-market correlations by sector.',
    badges: ['Live', '2026'],
  },
  {
    href: '/presidential',
    title: 'Presidential Economies',
    description: 'The same 1999-to-present economic dataset sliced by the president in office. Per-administration comparisons of GDP growth, unemployment changes, inflation, and S&P 500 performance \u2014 with clear methodology caveats about why these numbers are descriptive, not causal.',
    badges: ['Live', '1999\u2013present'],
  },
  {
    href: '/sentiment',
    title: 'Public Presidential Sentiment',
    description: 'Three complementary measures of public mood per administration: Gallup approval averages, U. Michigan Consumer Sentiment, and a planned media-tone section. World-events overlay marks the moments that moved the needle.',
    badges: ['Live', '1999\u2013present'],
  },
  {
    href: '/cybersecurity',
    title: 'Cybersecurity Threats',
    description: 'World map of active threat infrastructure (botnet C2s, malware hosts) geolocated to city/province; CISA KEV catalog of known-exploited CVEs with EPSS movement and CVSS scores. Daily snapshots accumulate over time.',
    badges: ['Live', 'Daily'],
  },
  {
    href: '/energy',
    title: 'Energy',
    description: 'US and international energy markets: crude, natural gas, retail gasoline, and electricity prices. Supply-demand indicators, event-driven sentiment, STEO short-term forecasts, and fuel-price maps by PADD region.',
    badges: ['Live', 'Daily'],
  },
  {
    href: '/west-texas',
    title: 'West Texas',
    description: 'Regional economic comparison of four small West Texas towns \u2014 Sonora, Eldorado, Ozona, and Junction \u2014 against state and national benchmarks. County-level unemployment, per-capita income, and GDP from BLS and BEA data.',
    badges: ['Live', '2005\u2013present'],
  },
];

export function Home() {
  useHead({
    title: 'Analytics \u2014 samcaldwell.info',
    description: 'Interactive visual analyses of public topics \u2014 US economy, presidential comparisons, public sentiment, cybersecurity threats, energy markets, and West Texas regional data.',
  });

  return h('div', null,
    // Intro
    h('div', { style: { maxWidth: '62ch', color: '#495057', fontSize: '1.02rem', lineHeight: '1.55' } },
      'Open-source interactive visualizations of public topics. Each analysis is self-contained, reproducible, and built on a pure open-source stack.',
    ),

    // Analysis cards grid
    h('h2', { id: 'analyses' }, 'Analyses'),
    h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
        margin: '28px 0 40px',
      },
    },
      ...analyses.map((a) => h(AnalysisCard, { ...a, key: a.href })),
      h(AnalysisCard, {
        key: 'planned',
        href: '',
        title: 'More analyses',
        description: 'Additional analyses on other public topics will be added here over time. Suggestions welcome via the repository.',
        badges: ['Planned'],
        placeholder: true,
      }),
    ),

    // Principles
    h('h2', { id: 'principles' }, 'How this site is built'),
    h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        margin: '24px 0 40px',
      },
    },
      ...[
        ['Pure open-source', 'Every library is MIT, Apache 2.0, or BSD-licensed. No commercial components, no trackers, no ads.'],
        ['Data transparency', 'Every analysis ships with a data dictionary, provenance notes, and attribution for every source.'],
        ['Self-contained HTML', 'Every page inlines its JS/CSS \u2014 no third-party CDN, no external fetches at load time.'],
        ['Static hosting', 'Served from GitHub Pages. No server, no database, no user accounts.'],
      ].map(([title, desc]) =>
        h('div', {
          key: title,
          style: { padding: '14px 16px', background: '#f8f9fa', borderLeft: '3px solid #2a6f97', borderRadius: '3px' },
        },
          h('strong', { style: { color: '#1d3557', display: 'block', marginBottom: '2px' } }, title),
          h('span', { style: { color: '#495057', fontSize: '0.92rem', lineHeight: '1.45' } }, desc),
        )
      ),
    ),

    // Source link
    h('p', null,
      'Source: ',
      h('a', { href: 'https://github.com/sam-caldwell/samcaldwell.info', target: '_blank', rel: 'noopener noreferrer' }, 'github.com/sam-caldwell/samcaldwell.info'),
      ' \u00B7 ',
      h('a', { href: 'https://github.com/sam-caldwell/samcaldwell.info/blob/main/LICENSE', target: '_blank', rel: 'noopener noreferrer' }, 'License'),
      ' (MIT)',
    ),
  );
}
