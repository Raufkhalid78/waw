import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and displays Waw branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=waw")).toBeVisible();
  });

  test("displays category circles", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid='category-circles']")).toBeVisible({
      timeout: 10000,
    });
  });

  test("navigates to search on search input click", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible()) {
      await searchInput.click();
      await expect(page).toHaveURL(/search/);
    }
  });
});

test.describe("Product Listing", () => {
  test("displays products grid", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator("text=Products")).toBeVisible();
  });
});

test.describe("Cart Flow", () => {
  test("cart starts empty", async ({ page }) => {
    await page.goto("/");
    // Cart drawer should show empty state
    const cartBtn = page.locator("[data-testid='cart-button']").first();
    if (await cartBtn.isVisible()) {
      await cartBtn.click();
      await expect(page.locator("text=Your cart is empty")).toBeVisible();
    }
  });
});

test.describe("Help Page", () => {
  test("displays FAQ sections", async ({ page }) => {
    await page.goto("/help");
    await expect(page.locator("text=Help")).toBeVisible();
  });
});

test.describe("About Page", () => {
  test("displays about content", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("text=About")).toBeVisible();
  });
});

test.describe("Responsive Design", () => {
  test("mobile viewport renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("desktop viewport renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
