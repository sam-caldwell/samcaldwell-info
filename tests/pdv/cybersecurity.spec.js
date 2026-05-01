// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { hash: '#/cybersecurity',          text: ['threat', 'CVE'] },
  { hash: '#/cybersecurity/threats',  text: ['threat', 'country'] },
  { hash: '#/cybersecurity/botnets',  text: ['botnet', 'malware'] },
  { hash: '#/cybersecurity/cves',     text: ['CVE', 'EPSS'] },
  { hash: '#/cybersecurity/about',    text: ['methodology', 'Abuse.ch'] },
];

test.describe('Cybersecurity pages', () => {
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
