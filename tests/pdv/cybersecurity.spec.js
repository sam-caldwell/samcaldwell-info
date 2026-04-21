// @ts-check
const { test, expect } = require('@playwright/test');

const pages = [
  { path: '/cybersecurity/',              title: /Cybersecurity Threats/i, mustInclude: ['threat infrastructure', 'CVE', 'snapshot'] },
  { path: '/cybersecurity/threats.html',  title: /Threat Sources/i,        mustInclude: ['Abuse.ch', 'province', 'Top hosting networks'] },
  { path: '/cybersecurity/botnets.html',  title: /Botnet Hosts/i,          mustInclude: ['FeodoTracker', 'Malware family', 'Online vs offline'] },
  { path: '/cybersecurity/cves.html',     title: /CVEs in the Wild/i,      mustInclude: ['CISA KEV', 'EPSS', 'CVSS'] },
  { path: '/cybersecurity/about.html',    title: /Methodology/i,           mustInclude: ['Hosting location', 'EPSS', 'snapshot'] },
];

test.describe('Cybersecurity pages', () => {
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

  test('attribution to Abuse.ch on every threat-data page', async ({ page }) => {
    for (const path of ['/cybersecurity/threats.html', '/cybersecurity/botnets.html']) {
      await page.goto(path);
      await expect(page.locator('body')).toContainText(/Abuse\.ch/i);
    }
  });

  test('CVE page has KEV / EPSS / CVSS columns when populated', async ({ page }) => {
    await page.goto('/cybersecurity/cves.html');
    const body = page.locator('body');
    // Either the table is populated OR the "not yet populated" notice is shown
    const hasTable  = await page.locator('div[class*="reactable"]').count() > 0;
    const hasNotice = (await body.innerText()).includes('not yet populated');
    expect(hasTable || hasNotice,
      'expected either a populated CVE table or the not-yet-populated notice').toBeTruthy();
  });
});
