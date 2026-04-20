// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Home (/)', () => {
  test('loads with Analytics branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Analytics/i);
    await expect(page.locator('h1').first()).toContainText(/Home/i);
  });

  test('navbar has brand + all three top-level links', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('.navbar');
    await expect(nav).toBeVisible();
    await expect(nav).toContainText(/Analytics/i);
    await expect(nav.getByRole('link', { name: /^Home$/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /US Economy 1999 to Present/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Presidential Economies/i })).toBeVisible();
  });

  test('analyses grid has two live cards + one planned placeholder', async ({ page }) => {
    await page.goto('/');
    const liveCards = page.locator('a.analysis-card');
    await expect(liveCards).toHaveCount(2);
    await expect(liveCards.nth(0)).toContainText(/US Economy 1999 to Present/i);
    await expect(liveCards.nth(1)).toContainText(/Presidential Economies/i);
    await expect(page.locator('.analysis-card--placeholder')).toHaveCount(1);
  });

  test('footer shows copyright + Sonora, TX + samcaldwell.net', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('.nav-footer, footer').first();
    await expect(footer).toContainText(/©\s*2026\s*Sam Caldwell/i);
    await expect(footer).toContainText(/Sonora,?\s*Texas/i);
    await expect(footer).toContainText(/samcaldwell\.net/i);
  });

  test('favicon is linked', async ({ page }) => {
    await page.goto('/');
    const favicon = page.locator('link[rel="icon"], link[rel="shortcut icon"]').first();
    const href = await favicon.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/favicon\.(svg|ico)$/i);
  });
});
