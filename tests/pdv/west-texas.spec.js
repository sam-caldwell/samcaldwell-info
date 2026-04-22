// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  {
    path: '/west-texas/',
    title: /West Texas/i,
    mustInclude: ['Sonora', 'Eldorado', 'Ozona', 'Junction'],
  },
  {
    path: '/west-texas/unemployment.html',
    title: /Unemployment/i,
    mustInclude: ['unemployment', 'county'],
  },
  {
    path: '/west-texas/income.html',
    title: /Income/i,
    mustInclude: ['income', 'BEA'],
  },
  {
    path: '/west-texas/gdp.html',
    title: /Economic Output/i,
    mustInclude: ['GDP'],
  },
  {
    path: '/west-texas/about.html',
    title: /Methodology/i,
    mustInclude: ['BLS', 'BEA', 'FIPS', 'Sutton'],
  },
];

test.describe('West Texas pages', () => {
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

      expect(errors, `uncaught JS errors on ${p.path}`).toEqual([]);
    });
  }

  test('unemployment page has at least 1 chart widget', async ({ page }) => {
    await page.goto('/west-texas/unemployment.html');
    await expect(page.locator('.html-widget').first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('.html-widget').count()).toBeGreaterThanOrEqual(1);
  });

  test('overview page mentions all four towns', async ({ page }) => {
    await page.goto('/west-texas/');
    for (const town of ['Sonora', 'Eldorado', 'Ozona', 'Junction']) {
      await expect(page.locator('body')).toContainText(town);
    }
  });
});
