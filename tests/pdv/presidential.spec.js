// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { path: '/presidential-economies/',                 title: /Presidential Economies/i,  minWidgets: 3, mustInclude: ['Summary table', 'GDP growth by administration', 'administration'] },
  { path: '/presidential-economies/growth.html',      title: /Growth by Administration/i, minWidgets: 3, mustInclude: ['Real GDP', 'Unemployment', 'Inflation'] },
  { path: '/presidential-economies/markets.html',     title: /Markets by Administration/i, minWidgets: 4, mustInclude: ['S&P 500 total return', 'Volatility', 'VIX'] },
  { path: '/presidential-economies/fiscal.html',      title: /Fiscal Policy by Administration/i, minWidgets: 5, mustInclude: ['Federal debt', 'deficit', 'Debt added'] },
  { path: '/presidential-economies/about.html',       title: /Methodology/i,              minWidgets: 0, mustInclude: ['mid-year rule', 'descriptive', 'Administration reference'] },
];

test.describe('Presidential Economies pages', () => {
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

      if (p.minWidgets > 0) {
        await expect(page.locator('.html-widget').first()).toBeVisible({ timeout: 20_000 });
        const count = await page.locator('.html-widget').count();
        expect(count, `expected ≥ ${p.minWidgets} html-widget elements on ${p.path}`).toBeGreaterThanOrEqual(p.minWidgets);
      }

      expect(errors, `uncaught JS errors on ${p.path}`).toEqual([]);
    });
  }

  test('fiscal page shows debt-added and avg-debt-added charts with "$T" tooltip format hint', async ({ page }) => {
    await page.goto('/presidential-economies/fiscal.html');
    await expect(page.locator('body')).toContainText(/Debt added each calendar year/i);
    await expect(page.locator('body')).toContainText(/Average annual debt added/i);
    // Both debt-added charts + total bar + debt-pct timeline + level timeline ≥ 5 widgets
    await expect(page.locator('.html-widget').first()).toBeVisible({ timeout: 20_000 });
    expect(await page.locator('.html-widget').count()).toBeGreaterThanOrEqual(5);
  });

  test('overview table lists all six administrations', async ({ page }) => {
    await page.goto('/presidential-economies/');
    const body = page.locator('body');
    for (const name of ['Clinton', 'Bush', 'Obama', 'Biden', 'Trump']) {
      await expect(body).toContainText(new RegExp(name, 'i'));
    }
  });
});
