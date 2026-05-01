import { h } from '../../h.js';
import { useSeoHead } from '../../components/SeoHead.js';

const proseStyle = { color: '#495057', maxWidth: '72ch', lineHeight: '1.6', fontSize: '0.98rem' };

function SectionDivider() {
  return h('hr', { style: { border: 'none', borderTop: '1px solid #dee2e6', margin: '32px 0' } });
}

export function SentimentAbout() {
  useSeoHead(
    'Sentiment Methodology & Caveats',
    'Sources, definitions, and limits for the public presidential sentiment analysis.',
  );

  return h('div', null,
    h('h1', null, 'Methodology & Caveats'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'Sources, definitions, limits',
    ),

    // What this analysis measures
    h('h2', null, 'What this analysis measures'),
    h('p', { style: proseStyle },
      'Three loosely-related signals that get conflated in casual talk about "sentiment toward a president":',
    ),
    h('table', {
      style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '20px' },
    },
      h('thead', null,
        h('tr', null,
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Section'),
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Asks'),
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Source'),
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Refresh'),
        ),
      ),
      h('tbody', null,
        ...([
          ['Approval', '"Do you approve of the job President X is doing?"', 'Gallup aggregate (hand-curated)', 'On demand'],
          ['Economic', '"How do you feel about the economy?"', 'U. Michigan Consumer Sentiment (FRED UMCSENT)', 'Daily'],
          ['Media', '"What tone is US English news using when writing about the presidency?"', 'GDELT Doc 2.0 API \u2014 avg article tone', 'Daily (2017-present only)'],
          ['Society radar', '"Across six aspects, where did each administration land relative to a long-run baseline?"', 'Editorial aggregation anchored on measurable signals', 'On demand (edit society_scores.csv)'],
        ] as [string, string, string, string][]).map(([section, asks, source, refresh], i) =>
          h('tr', {
            key: String(i),
            style: { background: i % 2 === 0 ? '#f8f9fa' : '#fff' },
          },
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef', fontWeight: '600' } },
              h('a', { href: `#/sentiment/${section.toLowerCase()}` }, section),
            ),
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef', color: '#495057' } }, asks),
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef', color: '#495057' } }, source),
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef', color: '#6c757d' } }, refresh),
          )
        ),
      ),
    ),
    h('p', { style: proseStyle },
      'These measure different things and often diverge. A president can enjoy strong consumer sentiment (good economy) while having weak approval (wars, scandals, polarization) \u2014 or vice versa.',
    ),

    h(SectionDivider, null),

    // Approval
    h('h2', null, 'Approval \u2014 how it\'s collected'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null, 'Gallup surveys roughly 1,000 US adults at a time by phone, asking the job approval question worded identically since 1938.'),
      h('li', null, 'The values here are ', h('strong', null, 'term averages'), ' computed by Gallup from all polls taken during each president\'s term.'),
      h('li', null, 'These aggregates are facts in the ', h('em', null, 'Feist v. Rural'), ' sense and are redistributable; exact poll-by-poll microdata is not.'),
      h('li', null, 'Stored in data/sentiment/gallup_approval.csv. Values are hand-entered from Gallup\'s published summaries and updated when the user refreshes them \u2014 not automatically.'),
    ),
    h('p', { style: proseStyle },
      h('strong', null, 'Why hand-curated?'),
      ' No free programmatic interface exists for Gallup\'s historical series. Modern polling APIs (FiveThirtyEight\'s old feed, Pew, etc.) either no longer exist, are paywalled, or restrict redistribution.',
    ),

    // Economic sentiment
    h('h2', null, 'Economic sentiment \u2014 how it\'s collected'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null, 'U. Michigan\'s Surveys of Consumers asks households five questions about: personal finances (two), business conditions (two), and major-purchase attitudes (one). Responses are indexed against a 1966 baseline of 100.'),
      h('li', null, 'Published monthly; available from FRED as series UMCSENT with full history back to 1952.'),
      h('li', null, 'The value is computed from ', h('em', null, 'consumer'), ' responses \u2014 it\'s what the public feels about the economy, not what economists model.'),
    ),

    h(SectionDivider, null),

    // Administration attribution
    h('h2', null, 'Administration attribution'),
    h('p', { style: proseStyle },
      'Each monthly observation is attributed to whichever president was in office on the 14th of that month \u2014 same convention used in the ',
      h('a', { href: '#/presidential' }, 'Presidential Economies'),
      ' analysis. Inaugurations on January 20 mean the outgoing president keeps January of transition years.',
    ),

    // Baselines
    h('h2', null, 'Baselines'),
    h('p', { style: proseStyle },
      '"Baseline" in this report = mean across the 1999-to-present window ',
      h('strong', null, 'of the administrations actually displayed'),
      '. It\'s a simple reference line, not a statistical null.',
    ),

    h(SectionDivider, null),

    // Why not scorecards
    h('h2', null, 'Why you should not read these as president scorecards'),
    h('p', { style: proseStyle },
      'All eight caveats from the ',
      h('a', { href: '#/presidential/about' }, 'Presidential Economies methodology'),
      ' apply here, plus:',
    ),
    h('ol', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Approval has a rally effect.'),
        ' Presidents get bumps during crises regardless of performance (Bush 43 hit 90% after 9/11 without changing any policy). Term averages smooth some of this but not all.',
      ),
      h('li', null,
        h('strong', null, 'Economic sentiment is dominated by inflation perception and gas prices.'),
        ' Multiple studies find that household feelings about the economy track gas prices and grocery-aisle inflation more than GDP or unemployment. Whoever happens to be in office during an inflation episode inherits bad sentiment that is not primarily about them.',
      ),
      h('li', null,
        h('strong', null, 'Polarization.'),
        ' Partisan sort over the past 25 years means that a large fraction of the population gives the president of their own party ~90% approval and the other party ~5%, regardless of events. This compresses ',
        h('em', null, 'every'),
        ' modern president\'s possible approval range \u2014 Trump I was the first president to never hit 50% because partisan floors and ceilings have tightened, not because he was uniquely disliked.',
      ),
      h('li', null,
        h('strong', null, 'Event-date attribution is fuzzy.'),
        ' The world-events list is editorial \u2014 a non-exhaustive set of high-salience moments chosen for illustration, not a statistical fixture.',
      ),
    ),

    h(SectionDivider, null),

    // Data sources
    h('h2', null, 'Data sources'),

    h('h3', null, 'Public-domain (safe to redistribute)'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'University of Michigan'),
        ' / Federal Reserve Bank of St. Louis (distributor): ',
        h('em', null, 'UMCSENT'),
        '. ',
        h('a', { href: 'https://fred.stlouisfed.org/series/UMCSENT', target: '_blank', rel: 'noopener noreferrer' }, 'https://fred.stlouisfed.org/series/UMCSENT'),
      ),
      h('li', null,
        h('strong', null, 'National Bureau of Economic Research:'),
        ' recession dating used on the Economic Sentiment page.',
      ),
    ),

    h('h3', null, 'Aggregate (fact-like, redistributable)'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Gallup News:'),
        ' ',
        h('em', null, 'Presidential Job Approval Center'),
        ' \u2014 term averages. ',
        h('a', { href: 'https://news.gallup.com/interactives/185273/presidential-job-approval-center.aspx', target: '_blank', rel: 'noopener noreferrer' }, 'https://news.gallup.com/interactives/185273/presidential-job-approval-center.aspx'),
      ),
    ),

    h('h3', null, 'Creative Commons (CC-BY-NC, non-commercial)'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'The GDELT Project:'),
        ' ',
        h('em', null, 'Doc 2.0 API \u2014 Timeline Tone'),
        ' (avg tone of English US news matching a presidency-focused query). Data licensed CC-BY-NC 4.0. Coverage on this site: January 2017 to present. ',
        h('a', { href: 'https://www.gdeltproject.org/', target: '_blank', rel: 'noopener noreferrer' }, 'https://www.gdeltproject.org/'),
      ),
    ),

    h('h3', null, 'Research-use (Media Cloud)'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Media Cloud:'),
        ' ',
        h('em', null, 'Search API total-count'),
        ' \u2014 monthly story-volume counts matching our presidency query. Used under Media Cloud\'s academic/research terms of service. Coverage: January 2008 to present. ',
        h('a', { href: 'https://mediacloud.org/', target: '_blank', rel: 'noopener noreferrer' }, 'https://mediacloud.org/'),
      ),
    ),

    h('p', { style: proseStyle },
      'This site\'s use of GDELT and Media Cloud is non-commercial: no ads, no product sales, educational research only.',
    ),

    h('h3', null, 'Editorial'),
    h('ul', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null, 'World-events list: hand-curated by the site author, maintained in data/sentiment/events.csv. Corrections welcome via the repository.'),
      h('li', null, 'Society-radar scores: hand-curated by the site author, maintained in data/sentiment/society_scores.csv. Per-row calibration notes are in the CSV. Scores are anchored on measurable signals (UMCSENT, Gallup approval, NBER recessions, wars-in-progress, published violent-crime indices) but the final \u221210/+10 mapping per aspect is one author\'s aggregation. Corrections welcome via the repository.'),
    ),

    h(SectionDivider, null),

    // Code license
    h('h2', null, 'Code license'),
    h('p', { style: proseStyle },
      'MIT \u2014 see the ',
      h('a', { href: 'https://github.com/sam-caldwell/samcaldwell.info/blob/main/LICENSE', target: '_blank', rel: 'noopener noreferrer' }, 'LICENSE'),
      ' file in the repository.',
    ),

    // Disclaimer
    h('h2', null, 'Disclaimer'),
    h('p', { style: proseStyle },
      'Nothing in this analysis constitutes political, investment, or financial advice. Aggregates shown are descriptive summaries of publicly-available historical data; they say nothing about future performance or about the policies that produced them.',
    ),
  );
}
