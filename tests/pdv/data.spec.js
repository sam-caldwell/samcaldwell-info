// @ts-check
const { test, expect } = require('@playwright/test');

const csvs = [
  // Economy
  { path: '/data/economy/annual.csv',           mustCols: ['year', 'gdp_growth', 'unemployment', 'cpi', 'deficit_pct_gdp', 'debt_trillion_eoy', 'debt_added_trillion'], minRows: 25 },
  { path: '/data/economy/quarterly.csv',        mustCols: ['year', 'quarter', 'gdp_growth', 'unemployment', 'cpi'], minRows: 100 },
  { path: '/data/economy/monthly.csv',          mustCols: ['year', 'month', 'unemployment', 'cpi', 'fed_funds', 'ten_year'], minRows: 300 },
  { path: '/data/economy/gdp_components.csv',   mustCols: ['year', 'consumption', 'investment', 'government', 'net_exports'], minRows: 25 },
  { path: '/data/economy/sectors.csv',          mustCols: ['year', 'sector', 'return_pct'], minRows: 100 },
  { path: '/data/economy/fiscal_quarterly.csv', mustCols: ['year', 'quarter', 'debt_trillion', 'debt_pct_gdp'], minRows: 100 },

  // Presidential-economies
  { path: '/data/presidential-economies/administrations.csv', mustCols: ['president', 'party', 'start_date'], minRows: 6 },
  { path: '/data/presidential-economies/admin_summary.csv',   mustCols: ['president', 'party', 'sp500_total_return', 'debt_added_trillion', 'avg_annual_debt_added_trillion'], minRows: 6 },
  { path: '/data/presidential-economies/monthly_admin.csv',   mustCols: ['year', 'month', 'president', 'party'], minRows: 300 },

  // Sentiment
  { path: '/data/sentiment/gallup_approval.csv',  mustCols: ['president', 'party', 'avg_approval'], minRows: 6 },
  { path: '/data/sentiment/events.csv',           mustCols: ['date', 'category', 'event'], minRows: 10 },
  { path: '/data/sentiment/umcsent_monthly.csv',  mustCols: ['date', 'umcsent', 'president', 'party'], minRows: 300 },
  { path: '/data/sentiment/admin_sentiment.csv',  mustCols: ['president', 'party', 'umcsent_avg', 'gallup_avg', 'tone_avg', 'mc_stories_per_month_avg'], minRows: 6 },
  { path: '/data/sentiment/gdelt_tone_monthly.csv',       mustCols: ['date', 'tone', 'president', 'party'], minRows: 60 },
  { path: '/data/sentiment/mediacloud_volume_monthly.csv', mustCols: ['date', 'mc_relevant', 'president', 'party'], minRows: 100 },
  { path: '/data/sentiment/society_scores.csv',           mustCols: ['president', 'party', 'aspect', 'score', 'notes'], minRows: 30 },

  // Cybersecurity (best-effort: CSVs may have minimal rows on first run before bootstrap completes)
  { path: '/data/cybersecurity/threats_summary.csv',      mustCols: ['as_of', 'total_ips_today', 'provinces_today'], minRows: 1 },
];

// Separate test — bundled jQuery must be ≥ 3.5.0 (patched to 3.7.1 post-render
// via scripts/patch_jquery.py). The OLD directory name 'jquery-1.11.3' is
// kept so existing <script src> references resolve, but the FILE CONTENT is
// jQuery 3.7.1. The check looks at the content, not the path.
test.describe('Security — jQuery patched', () => {
  test('every bundled jQuery is ≥ 3.5.0', async ({ request, baseURL }) => {
    // The sparkline page brings in the jquery-1.11.3 path; fetch it and
    // parse the version comment.
    const urls = [
      '/site_libs/jquery-1.11.3/jquery.min.js',
      '/site_libs/jquery-3.5.1/jquery.min.js',  // Quarto's own copy
    ];
    for (const u of urls) {
      const full = new URL(u, baseURL).toString();
      const r = await request.get(full);
      if (r.status() === 404) continue;  // Not every deploy has every path
      const body = await r.text();
      const m = body.match(/jQuery v(\d+)\.(\d+)\.(\d+)/);
      expect(m, `no jQuery version header in ${u}`).not.toBeNull();
      const [_, major, minor] = m;
      const majorN = Number(major), minorN = Number(minor);
      const ge350 = majorN > 3 || (majorN === 3 && minorN >= 5);
      expect(ge350, `jQuery version ${m[0]} at ${u} is < 3.5.0`).toBeTruthy();
    }
  });
});

test.describe('Data CSVs deployed', () => {
  for (const c of csvs) {
    test(`CSV available and well-formed: ${c.path}`, async ({ request, baseURL }) => {
      const resp = await request.get(new URL(c.path, baseURL).toString());
      expect(resp.status(), `status for ${c.path}`).toBe(200);

      const body = await resp.text();
      const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
      expect(lines.length, `row count for ${c.path}`).toBeGreaterThanOrEqual(c.minRows + 1);

      const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      for (const col of c.mustCols) {
        expect(header, `${c.path} missing expected column "${col}"`).toContain(col);
      }
    });
  }
});
