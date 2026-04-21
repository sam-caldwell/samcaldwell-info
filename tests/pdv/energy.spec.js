// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { path: '/energy/',                   title: /Energy/i,                     mustInclude: ['WTI', 'Brent', 'PADD'] },
  { path: '/energy/us-markets.html',    title: /US Energy Markets/i,          mustInclude: ['Crude oil', 'Henry Hub', 'gasoline'] },
  { path: '/energy/intl-markets.html',  title: /International Energy/i,       mustInclude: ['WTI', 'Brent', 'premium'] },
  { path: '/energy/supply-demand.html', title: /Supply.*Demand/i,             mustInclude: ['production', 'inventories', 'demand'] },
  { path: '/energy/events.html',        title: /Energy Events/i,              mustInclude: ['OPEC', 'sentiment', 'Historical'] },
  { path: '/energy/forecasts.html',     title: /Energy Forecasts/i,           mustInclude: ['STEO', 'WTI', 'forecast'] },
  { path: '/energy/prices-map.html',    title: /Current Fuel Prices/i,        mustInclude: ['PADD', 'retail gasoline', 'region'] },
  { path: '/energy/change-map.html',    title: /10-Year Fuel Price Change/i,  mustInclude: ['10-year', 'PADD'] },
  { path: '/energy/about.html',         title: /Methodology/i,                mustInclude: ['FRED', 'EIA', 'PADD'] },
];

test.describe('Energy pages', () => {
  for (const p of pages) {
    test(`renders: ${p.path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));

      const resp = await page.goto(p.path);
      expect(resp && resp.status()).toBeLessThan(400);

      await expect(page).toHaveTitle(p.title);
      await expect(page.locator('h1').first()).toBeVisible();

      for (const needle of p.mustInclude) {
        await expect(page.locator('body')).toContainText(new RegExp(needle, 'i'));
      }

      expect(errors, `uncaught JS errors on ${p.path}`).toEqual([]);
    });
  }

  test('us-markets has at least 3 widgets (WTI/Brent, retail gas, natgas)', async ({ page }) => {
    await page.goto('/energy/us-markets.html');
    await expect(page.locator('.html-widget').first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('.html-widget').count()).toBeGreaterThanOrEqual(3);
  });

  test('events page has timeline + reactable', async ({ page }) => {
    await page.goto('/energy/events.html');
    await expect(page.locator('body')).toContainText(/Recent events|Historical/i);
    // OPEC / Russia / COVID labels should appear in the events table
    const body = page.locator('body');
    await expect(body).toContainText(/OPEC/i);
    await expect(body).toContainText(/Russia|Ukraine/i);
    await expect(body).toContainText(/COVID/i);
  });
});
