// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { hash: '#/economy',              text: ['1999', 'snapshot'] },
  { hash: '#/economy/growth',       text: ['GDP', 'growth'] },
  { hash: '#/economy/indicators',   text: ['unemployment', 'inflation'] },
  { hash: '#/economy/unemployment', text: ['rolling', 'unemployment'] },
  { hash: '#/economy/markets',      text: ['S&P 500', 'market'] },
  { hash: '#/economy/about',        text: ['FRED', 'Data'] },
];

test.describe('Economy pages', () => {
  for (const p of pages) {
    test(`renders: ${p.hash}`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err)));

      await page.goto(`/${p.hash}`);
      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);

      const content = page.locator('.app-content');
      await expect(content).toBeVisible();
      await expect(content.locator('h1').first()).toBeVisible();

      for (const needle of p.text) {
        await expect(content).toContainText(new RegExp(needle, 'i'));
      }

      expect(errors, `uncaught JS errors on ${p.hash}`).toEqual([]);
    });
  }
});
