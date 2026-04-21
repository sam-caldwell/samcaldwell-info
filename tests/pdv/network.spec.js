// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Sentiment network graph', () => {
  test('network page renders the D3 SVG after data loads', async ({ page }) => {
    await page.goto('/sentiment/network.html');
    await expect(page).toHaveTitle(/Presidents.*Legislation.*Events/i);
    // Container div must exist
    await expect(page.locator('#net-viz')).toBeVisible();
    // After d3 loads the JSON, there should be an SVG inside #net-viz with node groups
    await expect(page.locator('#net-viz svg')).toBeVisible({ timeout: 10_000 });
    // At least the three node types should be drawn (circles + rects + polygons inside nodes)
    const hasCircle  = await page.locator('#net-viz svg g.node circle').count();
    const hasRect    = await page.locator('#net-viz svg g.node rect').count();
    const hasPolygon = await page.locator('#net-viz svg g.node polygon').count();
    expect(hasCircle,  'expected at least one president circle').toBeGreaterThan(0);
    expect(hasRect,    'expected at least one legislation square').toBeGreaterThan(0);
    expect(hasPolygon, 'expected at least one event triangle').toBeGreaterThan(0);
  });

  test('D3 asset is served and network JSON is valid', async ({ request, baseURL }) => {
    const d3Resp = await request.get(new URL('/js/d3.v7.min.js', baseURL).toString());
    expect(d3Resp.status()).toBe(200);
    expect(await d3Resp.text()).toMatch(/d3js\.org v7/);

    const jsonResp = await request.get(new URL('/data/sentiment/network.json', baseURL).toString());
    expect(jsonResp.status()).toBe(200);
    const graph = await jsonResp.json();
    expect(graph.nodes.length).toBeGreaterThanOrEqual(20);
    expect(graph.links.length).toBeGreaterThanOrEqual(20);
    const types = new Set(graph.nodes.map(n => n.type));
    expect(types.has('president'),   'graph must have president nodes').toBeTruthy();
    expect(types.has('legislation'), 'graph must have legislation nodes').toBeTruthy();
    expect(types.has('event'),       'graph must have event nodes').toBeTruthy();
  });

  test('controls toggle node visibility', async ({ page }) => {
    await page.goto('/sentiment/network.html');
    await expect(page.locator('#net-viz svg g.node').first()).toBeVisible({ timeout: 10_000 });

    const rectCountBefore = await page.locator('#net-viz svg g.node:visible rect').count();
    expect(rectCountBefore).toBeGreaterThan(0);

    // Un-check "Legislation" — its squares should disappear
    await page.locator('#net-chk-leg').uncheck();
    await page.waitForTimeout(200);

    const visibleNodes = page.locator('#net-viz svg g.node').filter({
      hasNot: page.locator('[style*="display: none"]')
    });
    // Easier check: look at the display style directly
    const hiddenLegCount = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#net-viz svg g.node'))
        .filter(g => g.style.display === 'none')
        .filter(g => g.querySelector('rect'))
        .length
    );
    expect(hiddenLegCount, 'unchecking Legislation should hide legislation nodes')
      .toBeGreaterThan(0);
  });
});
