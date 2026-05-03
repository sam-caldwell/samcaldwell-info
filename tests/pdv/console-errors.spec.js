// @ts-check
const { test, expect } = require('@playwright/test');

// Representative pages from each section
const pagesToScan = [
  '/',
  '/#/economy',
  '/#/economy/growth',
  '/#/economy/indicators',
  '/#/presidential',
  '/#/presidential/growth',
  '/#/sentiment',
  '/#/sentiment/approval',
  '/#/sentiment/network',
  '/#/cybersecurity',
  '/#/cybersecurity/cves',
  '/#/energy',
  '/#/energy/us-markets',
  '/#/energy/prices-map',
  '/#/west-texas',
  '/#/fcc',
  '/#/fcc/gmrs-decisions',
];

test.describe('No runtime errors', () => {
  for (const path of pagesToScan) {
    test(`no uncaught JS errors on ${path}`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(String(err)));

      await page.goto(path);
      await page.waitForLoadState('load');
      await page.waitForTimeout(2000);

      expect(pageErrors, `uncaught JS exceptions on ${path}`).toEqual([]);
    });
  }
});
