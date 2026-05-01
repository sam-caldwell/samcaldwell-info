// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { hash: '#/presidential',         text: ['administration', 'GDP'] },
  { hash: '#/presidential/growth',  text: ['GDP', 'growth'] },
  { hash: '#/presidential/markets', text: ['market', 'return'] },
  { hash: '#/presidential/fiscal',  text: ['debt', 'deficit'] },
  { hash: '#/presidential/about',   text: ['methodology', 'descriptive'] },
];

test.describe('Presidential Economies pages', () => {
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

  test('overview lists all administrations', async ({ page }) => {
    await page.goto('/#/presidential');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    const body = page.locator('.app-content');
    for (const name of ['Clinton', 'Bush', 'Obama', 'Biden', 'Trump']) {
      await expect(body).toContainText(new RegExp(name, 'i'));
    }
  });
});
