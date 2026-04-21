// @ts-check
const { test, expect, devices } = require('@playwright/test');

// Strip `defaultBrowserType` from devices — test.use() in a describe block
// cannot change browser type. Keep only viewport/userAgent/scale flags.
const pick = (d) => ({
  viewport:          d.viewport,
  userAgent:         d.userAgent,
  deviceScaleFactor: d.deviceScaleFactor,
  isMobile:          d.isMobile,
  hasTouch:          d.hasTouch,
});

const VIEWPORTS = [
  { label: 'iPhone 13',    ...pick(devices['iPhone 13']) },
  { label: 'Pixel 7',      ...pick(devices['Pixel 7'])   },
  { label: 'iPad (gen 7)', ...pick(devices['iPad (gen 7)']) },
  { label: 'Desktop-1280', viewport: { width: 1280, height: 800 } },
];

// Representative sample of pages across all four analyses.
const PAGES = [
  '/',
  '/economy/',
  '/economy/indicators.html',
  '/presidential-economies/',
  '/presidential-economies/fiscal.html',
  '/sentiment/',
  '/sentiment/society.html',
];

for (const v of VIEWPORTS) {
  test.describe(`Responsive — ${v.label}`, () => {
    test.use(v);

    for (const path of PAGES) {
      test(`${path} fits viewport (no horizontal scroll)`, async ({ page }) => {
        await page.goto(path);
        // Allow htmlwidgets to initialize
        await page.waitForLoadState('networkidle', { timeout: 20_000 });

        const [scrollW, clientW] = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.clientWidth,
        ]);
        // Allow 4px of sub-pixel fuzz for scrollbars / float rounding
        expect(scrollW, `horizontal overflow on ${path}`).toBeLessThanOrEqual(clientW + 4);
      });
    }

    test('home: navbar present; brand visible or in hamburger toggle', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.navbar')).toBeVisible();
      // Either the full brand is visible (desktop) or the navbar-toggler button is (mobile)
      const brand = page.getByText('Analytics').first();
      const toggler = page.locator('button.navbar-toggler').first();
      const brandVisible = await brand.isVisible().catch(() => false);
      const togglerVisible = await toggler.isVisible().catch(() => false);
      expect(brandVisible || togglerVisible,
             'neither brand nor hamburger toggle was visible').toBeTruthy();
    });

    test('home: all analysis cards visible in the viewport (after scroll)', async ({ page }) => {
      await page.goto('/');
      const cards = page.locator('a.analysis-card');
      await expect(cards).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await cards.nth(i).scrollIntoViewIfNeeded();
        await expect(cards.nth(i)).toBeVisible();
      }
    });
  });
}
