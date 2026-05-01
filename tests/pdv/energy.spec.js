// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { hash: '#/energy',               text: ['energy', 'crude'] },
  { hash: '#/energy/us-markets',    text: ['WTI', 'Brent'] },
  { hash: '#/energy/intl-markets',  text: ['international', 'crude'] },
  { hash: '#/energy/supply-demand', text: ['supply', 'demand'] },
  { hash: '#/energy/events',        text: ['event'] },
  { hash: '#/energy/forecasts',     text: ['forecast', 'STEO'] },
  { hash: '#/energy/prices-map',    text: ['PADD', 'gasoline'] },
  { hash: '#/energy/change-map',    text: ['10-year', 'PADD'] },
  { hash: '#/energy/about',         text: ['methodology', 'EIA'] },
];

test.describe('Energy pages', () => {
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
