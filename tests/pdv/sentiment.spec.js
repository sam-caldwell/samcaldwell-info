// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { path: '/sentiment/',              title: /Public Presidential Sentiment/i,       minWidgets: 1, mustInclude: ['Political approval', 'Economic', 'Media'] },
  { path: '/sentiment/approval.html', title: /Political Approval/i,     minWidgets: 2, mustInclude: ['Gallup', 'term average', 'hand-curated'] },
  { path: '/sentiment/economic.html', title: /Economic Sentiment/i,     minWidgets: 3, mustInclude: ['UMCSENT', 'Consumer Sentiment', 'World events'] },
  { path: '/sentiment/media.html',    title: /Media Sentiment/i,        minWidgets: 3, mustInclude: ['GDELT', 'Media Cloud', 'Attribution'] },
  { path: '/sentiment/about.html',    title: /Methodology/i,            minWidgets: 0, mustInclude: ['term averages', 'rally effect', 'polarization'] },
];

test.describe('Sentiment pages', () => {
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

  test('economic page has UMCSENT timeline with event markers', async ({ page }) => {
    await page.goto('/sentiment/economic.html');
    // H2 headings rendered into DOM (chart titles are inside widget canvases)
    await expect(page.locator('body')).toContainText(/UMCSENT timeline/i);
    await expect(page.locator('body')).toContainText(/World events observed/i);
    // Event names appear in the events reactable at the bottom
    await expect(page.locator('body')).toContainText(/COVID-19|9\/11|Great Recession/i);
    // At least 3 widgets: timeline + admin avg + vs-baseline + events table
    expect(await page.locator('.html-widget').count()).toBeGreaterThanOrEqual(3);
  });

  test('approval page shows all six administrations in the detailed table', async ({ page }) => {
    await page.goto('/sentiment/approval.html');
    const body = page.locator('body');
    for (const name of ['Clinton', 'Bush', 'Obama', 'Biden', 'Trump']) {
      await expect(body).toContainText(new RegExp(name, 'i'));
    }
  });
});
