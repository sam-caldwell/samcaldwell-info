// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { path: '/economy/',                 title: /US Economy 1999 to Present/i, minWidgets: 2, mustInclude: ['2026 Snapshot', 'S&P 500'] },
  { path: '/economy/growth.html',      title: /Economic Growth/i,             minWidgets: 4, mustInclude: ['Annual real GDP', 'sunburst', 'Recessions'] },
  { path: '/economy/indicators.html',  title: /Economic Indicators/i,         minWidgets: 3, mustInclude: ['Summary table', 'Comparative monthly', 'Rate environment'] },
  { path: '/economy/markets.html',     title: /Economy vs Markets/i,          minWidgets: 4, mustInclude: ['S&P 500 return', 'correlated', 'sector'] },
  { path: '/economy/about.html',       title: /Data.*Citations/i,             minWidgets: 0, mustInclude: ['Data dictionary', 'Citations', 'FRED'] },
];

test.describe('Economy pages', () => {
  for (const p of pages) {
    test(`renders: ${p.path}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));

      const resp = await page.goto(p.path);
      expect(resp && resp.status()).toBeLessThan(400);

      await expect(page).toHaveTitle(p.title);

      // Heading present
      await expect(page.locator('h1').first()).toBeVisible();

      // Required text content anywhere on the page
      for (const needle of p.mustInclude) {
        await expect(page.locator('body')).toContainText(new RegExp(needle, 'i'));
      }

      if (p.minWidgets > 0) {
        // Wait for htmlwidgets to initialize
        await expect(page.locator('.html-widget').first()).toBeVisible({ timeout: 20_000 });
        const count = await page.locator('.html-widget').count();
        expect(count, `expected ≥ ${p.minWidgets} html-widget elements on ${p.path}`).toBeGreaterThanOrEqual(p.minWidgets);
      }

      expect(errors, `uncaught JS errors on ${p.path}`).toEqual([]);
    });
  }

  test('indicators page has reactable + sparklines', async ({ page }) => {
    await page.goto('/economy/indicators.html');
    // reactable renders into divs with class starting with 'rt-' or id matching '_reactable_*'
    await expect(page.locator('div[class*="-reactable"], div.reactable').first())
      .toBeVisible({ timeout: 20_000 });
    // Sparklines use <canvas> inside the table cells
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 20_000 });
  });
});
