// @ts-check
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 667 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1280, height: 1024 },
];

const PAGES = ['/', '/#/economy', '/#/energy', '/#/west-texas'];

test.describe('Responsive rendering', () => {
  for (const viewport of VIEWPORTS) {
    for (const path of PAGES) {
      test(`${viewport.name} (${viewport.width}x${viewport.height}) — ${path}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(path);
        await page.waitForLoadState('load');
        await page.waitForTimeout(2000);

        // Content area should be visible
        await expect(page.locator('.app-content')).toBeVisible();

        // No excessive horizontal overflow (small tolerance for scrollbar)
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(viewport.width + 20);
      });
    }
  }
});
