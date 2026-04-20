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
];

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
