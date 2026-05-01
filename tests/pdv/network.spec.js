// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Sentiment network graph', () => {
  test('network JSON is valid with correct structure', async ({ request, baseURL }) => {
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

  test('network page renders content', async ({ page }) => {
    await page.goto('/#/sentiment/network');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const content = page.locator('.app-content');
    await expect(content).toBeVisible();
    await expect(content).toContainText(/network|president|legislation/i);
  });
});
