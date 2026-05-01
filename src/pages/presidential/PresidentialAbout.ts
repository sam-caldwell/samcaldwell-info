import { h } from '../../h.js';
import { useSeoHead } from '../../components/SeoHead.js';

const proseStyle = { color: '#495057', maxWidth: '72ch', lineHeight: '1.6', fontSize: '0.98rem' };

function SectionDivider() {
  return h('hr', { style: { border: 'none', borderTop: '1px solid #dee2e6', margin: '32px 0' } });
}

export function PresidentialAbout() {
  useSeoHead(
    'Presidential Economies \u2014 Methodology & Caveats',
    'How to read these numbers responsibly: administration assignment, aggregation methods, and why these are not scorecards.',
  );

  return h('div', null,
    h('h1', null, 'Methodology & Caveats'),
    h('p', { style: { color: '#6c757d', fontSize: '0.95rem' } },
      'How to read these numbers responsibly',
    ),

    // Scope
    h('h2', null, 'Scope'),
    h('p', { style: proseStyle },
      'This analysis covers January 1999 through the present. Since Bill Clinton\'s first full term started in 1993, only the last two years of his second term appear in the data (1999 \u2013 January 2001). Every subsequent administration is fully covered except the current one, which is ongoing.',
    ),

    // How months are assigned
    h('h2', null, 'How months are assigned to presidents'),
    h('p', { style: proseStyle },
      'Each calendar month is attributed to whichever president was in office on the ',
      h('strong', null, '14th of that month'),
      '. Because US inaugurations fall on January 20:',
    ),
    h('ul', { style: { ...proseStyle, lineHeight: '1.8' } },
      h('li', null, 'The outgoing president "keeps" January of the handover year (they held office for 19 of 31 days).'),
      h('li', null, 'The incoming president\'s first ', h('em', null, 'full'), ' month is February.'),
    ),
    h('p', { style: proseStyle },
      'This matches the standard academic convention for per-administration economic comparisons.',
    ),

    // How aggregates are computed
    h('h2', null, 'How per-administration aggregates are computed'),
    h('table', {
      style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '20px' },
    },
      h('thead', null,
        h('tr', null,
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Metric'),
          h('th', { style: { textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #dee2e6', fontWeight: '600', color: '#1d3557' } }, 'Method'),
        ),
      ),
      h('tbody', null,
        ...([
          ['GDP growth (avg)', 'Calendar-year real GDP growth (%YoY), averaged across the calendar years whose July 1 falls in the admin\'s window'],
          ['Unemployment \u0394', 'Unemployment rate at last month \u2212 rate at first month (percentage points)'],
          ['CPI avg', 'Mean of monthly CPI year-over-year inflation across the admin\'s months'],
          ['Fed Funds \u0394', 'Fed Funds rate at last month \u2212 rate at first month (percentage points)'],
          ['S&P 500 total return', '(last month close / first month close \u2212 1) \u00D7 100'],
          ['S&P 500 annualized', '(end / start)^(1/years) \u2212 1, with years = months / 12'],
          ['VIX avg', 'Mean of monthly VIX across admin window'],
          ['Recession years', 'Count of calendar years flagged as NBER recession in the admin window'],
          ['Debt added ($T)', 'GFDEBTN at last quarter in admin window \u2212 GFDEBTN at first quarter (converted from $M to $T)'],
          ['\u0394 Debt/GDP (pp)', 'GFDEGDQ188S at last quarter \u2212 at first quarter (percentage points)'],
          ['Avg deficit (% GDP)', 'Mean of annual FYFSGDA188S across calendar years attributed to admin'],
        ] as [string, string][]).map(([metric, method], i) =>
          h('tr', {
            key: String(i),
            style: { background: i % 2 === 0 ? '#f8f9fa' : '#fff' },
          },
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef', fontWeight: '600' } }, metric),
            h('td', { style: { padding: '6px 12px', borderBottom: '1px solid #e9ecef', color: '#495057' } }, method),
          )
        ),
      ),
    ),
    h('p', { style: { ...proseStyle, fontSize: '0.9rem', color: '#6c757d' } },
      'Current (ongoing) administrations are flagged with ongoing = TRUE in the CSV and with an asterisk (*) in all charts and tables.',
    ),

    h(SectionDivider, null),

    // Why not scorecards
    h('h2', null, 'Why these numbers should not be read as presidential "scorecards"'),
    h('p', { style: proseStyle },
      'Correlation is not causation, especially here:',
    ),
    h('ol', { style: { ...proseStyle, lineHeight: '2' } },
      h('li', null,
        h('strong', null, 'Inherited conditions.'),
        ' Every president takes office with an economy shaped by decisions made under predecessors, sometimes decades earlier. The 2008 crisis began 6 months before Obama\'s term; COVID-19 arrived in Trump I\'s fourth year; post-pandemic inflation peaked under Biden but was driven by global supply-chain and stimulus factors with long lags.',
      ),
      h('li', null,
        h('strong', null, 'Monetary policy is independent.'),
        ' The Federal Reserve is structurally independent from the White House. Interest-rate decisions \u2014 which drive most market behavior \u2014 are made by the FOMC, not the president.',
      ),
      h('li', null,
        h('strong', null, 'Global shocks.'),
        ' Dot-com bust, GFC, COVID-19, wars, oil-price shocks \u2014 external events typically dwarf the economic impact of any domestic executive action.',
      ),
      h('li', null,
        h('strong', null, 'Policy lag.'),
        ' Legislation enacted in year N of a term typically affects the economy in year N+2 or later. Attributing a term\'s results to that term\'s policies is usually wrong.',
      ),
      h('li', null,
        h('strong', null, 'Congress, not the president, writes fiscal policy.'),
        ' Major spending, tax, and trade changes require congressional action.',
      ),
      h('li', null,
        h('strong', null, 'Selection bias.'),
        ' Terms vary from 4 to 8 years and overlap with very different business-cycle phases. Comparing a term that started at a recession trough to one that started at a peak produces radically different headline numbers for reasons unrelated to presidential policy.',
      ),
      h('li', null,
        h('strong', null, 'Fiscal-year vs. presidential-year mismatch.'),
        ' The federal fiscal year runs October to September, and each year\'s budget is drafted and enacted by Congress and signed by the president ',
        h('em', null, 'before'),
        ' the fiscal year begins. FY2021, for example, was legislated under Trump but executed largely under Biden. This report uses a mid-year rule to attribute fiscal data, but that convention is imperfect \u2014 a president inherits fiscal decisions made by their predecessor and Congress.',
      ),
      h('li', null,
        h('strong', null, 'Mandatory vs. discretionary.'),
        ' The majority of federal spending (Social Security, Medicare, Medicaid, interest on the debt) is ',
        h('em', null, 'mandatory'),
        ' and continues regardless of who holds office. Presidents and Congresses have limited year-to-year control over these flows.',
      ),
    ),
    h('p', { style: proseStyle },
      'Use these charts as descriptive context, not causal claims.',
    ),

    h(SectionDivider, null),

    // Data sources
    h('h2', null, 'Data sources'),
    h('p', { style: proseStyle },
      'All underlying data comes from the ',
      h('a', { href: '#/economy' }, 'US Economy analysis'),
      '; see its ',
      h('a', { href: '#/economy/about' }, 'Data & Citations page'),
      ' for the full source list (BEA, BLS, Federal Reserve, NBER via FRED). This report only derives admin slices \u2014 it does not introduce any new data source.',
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
      'Nothing on this site constitutes investment, tax, legal, political, or financial advice. The market data is a calibrated synthetic overlay and should not be used as a source of record.',
    ),
  );
}
