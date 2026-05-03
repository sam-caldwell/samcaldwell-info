// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { hash: '#/fcc',               text: ['FCC', 'Amateur', 'GMRS'] },
  { hash: '#/fcc/by-type',       text: ['type', 'service'] },
  { hash: '#/fcc/by-year',       text: ['year'] },
  { hash: '#/fcc/ham-decisions',  text: ['HAM', 'decision'] },
  { hash: '#/fcc/gmrs-decisions', text: ['GMRS', 'decision'] },
  { hash: '#/fcc/gmrs-felony',   text: ['felony', 'qualification'] },
  { hash: '#/fcc/about',         text: ['methodology', 'ULS'] },
];

test.describe('FCC pages', () => {
  for (const p of pages) {
    test(`renders: ${p.hash}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));

      await page.goto(`/${p.hash}`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);

      const content = page.locator('.app-content');
      await expect(content).toBeVisible();

      for (const needle of p.text) {
        await expect(content).toContainText(new RegExp(needle, 'i'));
      }

      expect(errors, `uncaught JS errors on ${p.hash}`).toEqual([]);
    });
  }
});
