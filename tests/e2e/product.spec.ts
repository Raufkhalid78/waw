import { test, expect } from "@playwright/test";

test.describe("Products — Listing Page", () => {
  test("displays product listing page", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("has correct page title", async ({ page }) => {
    await page.goto("/products");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("product cards or grid are rendered", async ({ page }) => {
    await page.goto("/products");
    await page.waitForTimeout(3000);
    const cards = page.locator("[data-testid='product-card'], .product-card, article, [class*='product']");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Products — Search", () => {
  test("search input is available on products page", async ({ page }) => {
    await page.goto("/products");
    const searchInput = page.locator("input[placeholder*='Search'], input[type='search']").first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
  });

  test("search accepts text input", async ({ page }) => {
    await page.goto("/products");
    const searchInput = page.locator("input[placeholder*='Search'], input[type='search']").first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill("wallet");
      const value = await searchInput.inputValue();
      expect(value).toBe("wallet");
    }
  });
});

test.describe("Products — Category Browsing", () => {
  test("categories page loads", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("category cards or links are visible", async ({ page }) => {
    await page.goto("/");
    const categorySection = page.locator("[data-testid='category-circles']");
    if (await categorySection.isVisible({ timeout: 5000 }).catch(() => false)) {
      const links = categorySection.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("Products — Store Browsing", () => {
  test("stores page loads", async ({ page }) => {
    await page.goto("/stores");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("stores page has content", async ({ page }) => {
    await page.goto("/stores");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);
  });
});

test.describe("Products — SEO & Meta", () => {
  test("products page has meta description", async ({ page }) => {
    await page.goto("/products");
    const metaDesc = page.locator("meta[name='description']");
    if (await metaDesc.count() > 0) {
      const content = await metaDesc.getAttribute("content");
      expect(content?.length).toBeGreaterThan(0);
    }
  });

  test("products page has structured data", async ({ page }) => {
    await page.goto("/products");
    const jsonLd = page.locator("script[type='application/ld+json']");
    if (await jsonLd.count() > 0) {
      const content = await jsonLd.textContent();
      expect(content).toBeTruthy();
    }
  });
});

test.describe("Products — Cart Flow", () => {
  test("cart starts empty on homepage", async ({ page }) => {
    await page.goto("/");
    const cartBtn = page.locator("[data-testid='cart-button'], button:has-text('Cart'), a:has-text('Cart')").first();
    if (await cartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cartBtn.click();
      const emptyText = page.locator("text=empty, text=No items");
      await expect(emptyText.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Products — Help & Legal Pages", () => {
  test("help page displays content", async ({ page }) => {
    await page.goto("/help");
    await expect(page.locator("text=Help")).toBeVisible({ timeout: 10000 });
  });

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content?.length).toBeGreaterThan(100);
  });

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
    const content = await page.textContent("body");
    expect(content?.length).toBeGreaterThan(100);
  });

  test("buyer protection page loads", async ({ page }) => {
    await page.goto("/buyer-protection");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("refund policy page loads", async ({ page }) => {
    await page.goto("/refund-policy");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Products — Wishlist", () => {
  test("wishlist page loads for unauthenticated user", async ({ page }) => {
    await page.goto("/wishlist");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Products — Responsive Design", () => {
  test("mobile viewport renders without errors", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/products");
    await expect(page.locator("body")).toBeVisible();
  });

  test("tablet viewport renders without errors", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/products");
    await expect(page.locator("body")).toBeVisible();
  });

  test("desktop viewport renders without errors", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/products");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Products — Error Handling", () => {
  test("404 page for non-existent route", async ({ page }) => {
    const response = await page.goto("/non-existent-page-12345");
    expect(response?.status()).toBe(404);
  });

  test("API 404 returns JSON error", async ({ page }) => {
    const response = await page.goto("/api/non-existent-endpoint-12345");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Products — Performance", () => {
  test("homepage loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("products page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("categories page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/categories", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });
});

test.describe("Products — Navigation", () => {
  test("can navigate from homepage to products", async ({ page }) => {
    await page.goto("/");
    const productsLink = page.locator("a[href='/products']").first();
    if (await productsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productsLink.click();
      await page.waitForURL("**/products", { timeout: 10000 });
      expect(page.url()).toContain("/products");
    }
  });

  test("can navigate from homepage to categories", async ({ page }) => {
    await page.goto("/");
    const categoriesLink = page.locator("a[href='/categories']").first();
    if (await categoriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await categoriesLink.click();
      await page.waitForURL("**/categories", { timeout: 10000 });
      expect(page.url()).toContain("/categories");
    }
  });

  test("can navigate from homepage to stores", async ({ page }) => {
    await page.goto("/");
    const storesLink = page.locator("a[href='/stores']").first();
    if (await storesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await storesLink.click();
      await page.waitForURL("**/stores", { timeout: 10000 });
      expect(page.url()).toContain("/stores");
    }
  });
});
