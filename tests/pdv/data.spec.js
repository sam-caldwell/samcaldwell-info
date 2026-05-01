// @ts-check
const { test, expect } = require('@playwright/test');

const csvs = [
  // Economy
  { path: '/data/economy/annual.csv',           mustCols: ['year', 'gdp_growth', 'unemployment', 'cpi'], minRows: 25 },
  { path: '/data/economy/quarterly.csv',        mustCols: ['year', 'quarter', 'gdp_growth'], minRows: 100 },
  { path: '/data/economy/monthly.csv',          mustCols: ['year', 'month', 'unemployment', 'cpi', 'fed_funds'], minRows: 300 },
  { path: '/data/economy/gdp_components.csv',   mustCols: ['year', 'consumption', 'investment', 'government'], minRows: 25 },
  { path: '/data/economy/fiscal_quarterly.csv', mustCols: ['year', 'quarter', 'debt_trillion'], minRows: 100 },

  // Presidential
  { path: '/data/presidential-economies/administrations.csv', mustCols: ['president', 'party', 'start_date'], minRows: 6 },
  { path: '/data/presidential-economies/admin_summary.csv',   mustCols: ['president', 'party'], minRows: 6 },
  { path: '/data/presidential-economies/monthly_admin.csv',   mustCols: ['year', 'month', 'president', 'party'], minRows: 300 },

  // Sentiment
  { path: '/data/sentiment/gallup_approval.csv',  mustCols: ['president', 'party', 'avg_approval'], minRows: 6 },
  { path: '/data/sentiment/umcsent_monthly.csv',  mustCols: ['date', 'umcsent', 'president'], minRows: 300 },
  { path: '/data/sentiment/admin_sentiment.csv',  mustCols: ['president', 'party', 'umcsent_avg', 'gallup_avg'], minRows: 6 },

  // Cybersecurity
  { path: '/data/cybersecurity/threats_summary.csv', mustCols: ['as_of', 'total_ips_today'], minRows: 1 },

  // Energy
  { path: '/data/energy/us_prices_daily.csv',    mustCols: ['date', 'wti', 'brent', 'natgas'], minRows: 500 },
  { path: '/data/energy/energy_summary.csv',     mustCols: ['as_of', 'wti_spot', 'brent_spot'], minRows: 1 },
  { path: '/data/energy/padd_gas_current.csv',   mustCols: ['area_name', 'price_now'], minRows: 3 },

  // West Texas
  { path: '/data/west-texas/unemployment_monthly.csv', mustCols: ['date', 'geo', 'unemployment_rate'], minRows: 50 },
];

test.describe('Data CSVs deployed', () => {
  for (const c of csvs) {
    test(`CSV available: ${c.path}`, async ({ request, baseURL }) => {
      const resp = await request.get(new URL(c.path, baseURL).toString());
      expect(resp.status(), `status for ${c.path}`).toBe(200);

      const body = await resp.text();
      const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0);
      expect(lines.length, `row count for ${c.path}`).toBeGreaterThanOrEqual(c.minRows + 1);

      const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      for (const col of c.mustCols) {
        expect(header, `${c.path} missing column "${col}"`).toContain(col);
      }
    });
  }
});

test.describe('SEO static files', () => {
  test('sitemap.xml exists with URLs', async ({ request, baseURL }) => {
    const resp = await request.get(new URL('/sitemap.xml', baseURL).toString());
    expect(resp.ok()).toBe(true);
    const text = await resp.text();
    expect(text).toContain('samcaldwell.info');
    expect(text).toContain('<url>');
  });

  test('robots.txt exists', async ({ request, baseURL }) => {
    const resp = await request.get(new URL('/robots.txt', baseURL).toString());
    expect(resp.ok()).toBe(true);
    const text = await resp.text();
    expect(text).toContain('Sitemap:');
  });

  test('llms.txt exists', async ({ request, baseURL }) => {
    const resp = await request.get(new URL('/llms.txt', baseURL).toString());
    expect(resp.ok()).toBe(true);
    const text = await resp.text();
    expect(text).toContain('samcaldwell.info');
  });
});
