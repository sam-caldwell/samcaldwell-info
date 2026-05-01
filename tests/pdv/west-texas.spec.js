// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { hash: '#/west-texas',              text: ['Sonora', 'Eldorado', 'Ozona', 'Junction'] },
  { hash: '#/west-texas/unemployment', text: ['unemployment'] },
  { hash: '#/west-texas/income',       text: ['income'] },
  { hash: '#/west-texas/gdp',          text: ['GDP'] },
  { hash: '#/west-texas/about',        text: ['methodology', 'BLS'] },
];

test.describe('West Texas pages', () => {
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
