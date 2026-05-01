// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { hash: '#/sentiment',           text: ['sentiment', 'approval'] },
  { hash: '#/sentiment/approval',  text: ['Gallup', 'approval'] },
  { hash: '#/sentiment/economic',  text: ['Consumer Sentiment', 'Michigan'] },
  { hash: '#/sentiment/media',     text: ['GDELT', 'tone'] },
  { hash: '#/sentiment/society',   text: ['society', 'score'] },
  { hash: '#/sentiment/network',   text: ['network', 'president'] },
  { hash: '#/sentiment/about',     text: ['methodology'] },
];

test.describe('Sentiment pages', () => {
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
