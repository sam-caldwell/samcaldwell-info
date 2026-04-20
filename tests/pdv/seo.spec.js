// @ts-check
const { test, expect } = require('@playwright/test');

// Fail if any excluded platform's meta tags appear.
const EXCLUDED_META = [
  /^og:/i,                       // Open Graph — Meta-originated
  /^twitter:/i,                  // Twitter Cards
  /^fb:/i,
  /^instagram:/i,
  /^tiktok:/i,
];

test.describe('SEO metadata + structured data', () => {
  test('meta tags: author, keywords, geo, canonical — present and correct', async ({ page }) => {
    await page.goto('/');

    const author = await page.locator('meta[name="author"]').first().getAttribute('content');
    expect(author).toMatch(/Sam Caldwell/i);

    const keywords = await page.locator('meta[name="keywords"]').first().getAttribute('content');
    expect(keywords).toMatch(/Sam Caldwell/i);
    expect(keywords).toMatch(/Sonora/i);
    expect(keywords).toMatch(/103 E Chestnut/i);
    expect(keywords).toMatch(/76950/i);

    expect(await page.locator('meta[name="geo.region"]').first().getAttribute('content')).toMatch(/US-TX/i);
    expect(await page.locator('meta[name="geo.placename"]').first().getAttribute('content')).toMatch(/Sonora/i);
    expect(await page.locator('meta[name="geo.position"]').first().getAttribute('content')).toMatch(/30\.5683/);

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    expect(canonical).toMatch(/^https:\/\/samcaldwell\.info\/?$/);
  });

  test('JSON-LD: Person schema with PostalAddress + WebSite schema', async ({ page }) => {
    await page.goto('/');
    const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blobs.length).toBeGreaterThanOrEqual(2);

    const parsed = blobs.map((b) => {
      try { return JSON.parse(b); } catch { return null; }
    }).filter(Boolean);

    const person = parsed.find((x) => x['@type'] === 'Person');
    expect(person, 'expected a Person JSON-LD block').toBeTruthy();
    expect(person.name).toMatch(/Sam Caldwell/i);
    expect(person.address).toBeTruthy();
    expect(person.address.streetAddress).toMatch(/103 E Chestnut/i);
    expect(person.address.addressLocality).toMatch(/Sonora/i);
    expect(person.address.addressRegion).toBe('TX');
    expect(person.address.postalCode).toBe('76950');

    const site = parsed.find((x) => x['@type'] === 'WebSite');
    expect(site, 'expected a WebSite JSON-LD block').toBeTruthy();
    expect(site.url).toMatch(/samcaldwell\.info/i);
  });

  test('NO Open Graph / Twitter / Meta-family tags anywhere', async ({ page }) => {
    // Spot-check a few pages: home, economy index, presidential index
    for (const path of ['/', '/economy/', '/presidential-economies/']) {
      await page.goto(path);
      const metas = await page.locator('meta').evaluateAll((nodes) =>
        nodes.map((n) => ({
          name: n.getAttribute('name') || '',
          property: n.getAttribute('property') || '',
        }))
      );
      const offenders = metas.filter(({ name, property }) =>
        EXCLUDED_META.some((rx) => rx.test(name) || rx.test(property))
      );
      expect(offenders, `excluded meta tags found on ${path}: ${JSON.stringify(offenders)}`).toEqual([]);
    }
  });
});
