// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Home (/#/)', () => {
  test('loads with Analytics branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Analytics/i);
  });

  test('sidebar has all section links', async ({ page }) => {
    await page.goto('/');
    // Sidebar should contain all 7 section labels
    const sidebar = page.locator('[role="navigation"]').first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText(/Home/i);
    await expect(sidebar).toContainText(/US Economy/i);
    await expect(sidebar).toContainText(/Presidential/i);
    await expect(sidebar).toContainText(/Sentiment/i);
    await expect(sidebar).toContainText(/Cybersecurity/i);
    await expect(sidebar).toContainText(/Energy/i);
    await expect(sidebar).toContainText(/West Texas/i);
  });

  test('analyses grid has six live cards + one planned placeholder', async ({ page }) => {
    await page.goto('/');
    // Cards are <a> elements with h3 headings
    const cards = page.locator('a h3');
    await expect(cards).toHaveCount(6);
    await expect(cards.nth(0)).toContainText(/US Economy 1999 to Present/i);
    await expect(cards.nth(1)).toContainText(/Presidential Economies/i);
    await expect(cards.nth(2)).toContainText(/Public Presidential Sentiment/i);
    await expect(cards.nth(3)).toContainText(/Cybersecurity Threats/i);
    await expect(cards.nth(4)).toContainText(/Energy/i);
    await expect(cards.nth(5)).toContainText(/West Texas/i);
  });

  test('footer shows version + copyright + timestamp', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer').first();
    await expect(footer).toContainText(/v\d+\.\d+\.\d+/); // semantic version
    await expect(footer).toContainText(/©\s*2026\s*Sam Caldwell/i);
    await expect(footer).toContainText(/Sonora,?\s*Texas/i);
    await expect(footer).toContainText(/samcaldwell\.net/i);
    await expect(footer).toContainText(/Updated:\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+UTC/);
  });

  test('favicon is linked', async ({ page }) => {
    await page.goto('/');
    const favicon = page.locator('link[rel="icon"]').first();
    const href = await favicon.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/favicon\.(svg|ico)$/i);
  });
});
