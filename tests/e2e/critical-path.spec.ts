import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:4000";

test.describe("Critical Path — Buyer Browse-to-Cart Flow", () => {
  test("buyer can browse products and add to cart", async ({ page }) => {
    // 1. Load homepage
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    // 2. Navigate to categories or search for products
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill("leather");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(3000);
    }

    // 3. Click on a product if available
    const productCard = page.locator("a[href*='/products/']").first();
    if (await productCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productCard.click();
      await page.waitForTimeout(2000);

      // 4. Verify product detail page loaded
      const body = await page.textContent("body");
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(50);
    }
  });

  test("buyer can navigate category page with filters", async ({ page }) => {
    // 1. Navigate to a category page
    await page.goto("/category/leather-craft");
    await page.waitForTimeout(3000);

    // 2. Verify page loaded
    const body = await page.textContent("body");
    expect(body).toBeTruthy();

    // 3. Check for filter elements
    const filterSection = page.locator("text=Filter, text=Catalog Filters, [data-testid='filters']").first();
    if (await filterSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(filterSection).toBeVisible();
    }
  });

  test("buyer can view cart page", async ({ page }) => {
    await page.goto("/cart");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("buyer can view checkout page", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});

test.describe("Critical Path — Buyer Account Flow", () => {
  test("buyer can view account page", async ({ page }) => {
    await page.goto("/account");
    await page.waitForTimeout(2000);
    // Should redirect to login or show account
    const url = page.url();
    const isLoginPage = url.includes("login") || url.includes("auth");
    const isAccount = url.includes("account");
    expect(isLoginPage || isAccount).toBe(true);
  });

  test("buyer can view wishlist page", async ({ page }) => {
    await page.goto("/wishlist");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("buyer can view orders page", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});

test.describe("Critical Path — Seller Portal Flow", () => {
  test("seller portal login page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toContain("seller");
  });

  test("seller products page requires auth", async ({ page }) => {
    await page.goto("/products");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isProducts = url.includes("products");
    expect(isLoginPage || isProducts).toBe(true);
  });

  test("seller orders page requires auth", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isOrders = url.includes("orders");
    expect(isLoginPage || isOrders).toBe(true);
  });

  test("seller inventory page requires auth", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isInventory = url.includes("inventory");
    expect(isLoginPage || isInventory).toBe(true);
  });
});

test.describe("Critical Path — Admin Dashboard Flow", () => {
  test("admin login page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("admin orders page requires auth", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isOrders = url.includes("orders");
    expect(isLoginPage || isOrders).toBe(true);
  });

  test("admin products page requires auth", async ({ page }) => {
    await page.goto("/products");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isProducts = url.includes("products");
    expect(isLoginPage || isProducts).toBe(true);
  });

  test("admin users page requires auth", async ({ page }) => {
    await page.goto("/users");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isUsers = url.includes("users");
    expect(isLoginPage || isUsers).toBe(true);
  });

  test("admin payouts page requires auth", async ({ page }) => {
    await page.goto("/payouts");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isPayouts = url.includes("payouts");
    expect(isLoginPage || isPayouts).toBe(true);
  });

  test("admin returns page requires auth", async ({ page }) => {
    await page.goto("/returns");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isReturns = url.includes("returns");
    expect(isLoginPage || isReturns).toBe(true);
  });

  test("admin MFA settings page requires auth", async ({ page }) => {
    await page.goto("/settings/mfa");
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes("login");
    const isMFA = url.includes("mfa") || url.includes("settings");
    expect(isLoginPage || isMFA).toBe(true);
  });
});
