// @ts-check
const { test, expect } = require('@playwright/test');

const pagesToScan = [
  '/',
  '/economy/',
  '/economy/growth.html',
  '/economy/indicators.html',
  '/economy/markets.html',
  '/economy/about.html',
  '/presidential-economies/',
  '/presidential-economies/growth.html',
  '/presidential-economies/markets.html',
  '/presidential-economies/fiscal.html',
  '/presidential-economies/about.html',
  '/sentiment/',
  '/sentiment/approval.html',
  '/sentiment/economic.html',
  '/sentiment/media.html',
  '/sentiment/society.html',
  '/sentiment/network.html',
  '/sentiment/about.html',
  '/cybersecurity/',
  '/cybersecurity/threats.html',
  '/cybersecurity/botnets.html',
  '/cybersecurity/cves.html',
  '/cybersecurity/about.html',
];

// Benign messages to ignore — third-party libs occasionally log info-level
// warnings we don't want to gate the build on. Tighten over time.
const IGNORE_PATTERNS = [
  /^\[ECharts\].*recommend/i,   // ECharts informational tips
  /DevTools/i,                  // DevTools banners
];

test.describe('No runtime errors', () => {
  for (const path of pagesToScan) {
    test(`console clean + no 4xx/5xx resources on ${path}`, async ({ page }) => {
      const consoleErrors = [];
      const pageErrors = [];
      const badResponses = [];

      page.on('pageerror', (err) => pageErrors.push(String(err)));
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!IGNORE_PATTERNS.some((rx) => rx.test(text))) {
            consoleErrors.push(text);
          }
        }
      });
      page.on('response', (resp) => {
        const url = resp.url();
        const status = resp.status();
        // Only care about same-origin assets — third-party CDN failures aren't our bug.
        if (status >= 400 && (url.includes('samcaldwell.info') || url.startsWith('/'))) {
          badResponses.push(`${status} ${url}`);
        }
      });

      await page.goto(path, { waitUntil: 'networkidle', timeout: 45_000 });
      // Give widgets a moment after idle to finish async inits
      await page.waitForTimeout(500);

      expect(pageErrors,     `uncaught JS exceptions on ${path}`).toEqual([]);
      expect(consoleErrors,  `console.error() messages on ${path}`).toEqual([]);
      expect(badResponses,   `same-origin 4xx/5xx responses on ${path}`).toEqual([]);
    });
  }
});
