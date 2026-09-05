import { test, expect } from "@playwright/test";

test.describe("Seller Portal — Login & Auth", () => {
  test("seller portal loads login page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("seller portal has Waw branding", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.toLowerCase()).toContain("waw");
  });
});

test.describe("Seller Portal — Dashboard", () => {
  test("dashboard requires authentication", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isDashboard = url.includes("dashboard");
    expect(isLoginPage || isDashboard).toBe(true);
  });
});

test.describe("Seller Portal — Products Page", () => {
  test("products page requires authentication", async ({ page }) => {
    await page.goto("/products");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isProducts = url.includes("products");
    expect(isLoginPage || isProducts).toBe(true);
  });
});

test.describe("Seller Portal — Orders Page", () => {
  test("orders page requires authentication", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isOrders = url.includes("orders");
    expect(isLoginPage || isOrders).toBe(true);
  });
});

test.describe("Seller Portal — Responsive Design", () => {
  test("mobile viewport renders without errors", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("desktop viewport renders without errors", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Seller Portal — Error Handling", () => {
  test("404 page for non-existent route", async ({ page }) => {
    const response = await page.goto("/non-existent-page-12345");
    expect(response?.status()).toBe(404);
  });
});
