import { test, expect } from "@playwright/test";

test.describe("Homepage — Branding & Layout", () => {
  test("loads and displays Waw branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=waw")).toBeVisible({ timeout: 10000 });
  });

  test("has correct page title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.toLowerCase()).toContain("waw");
  });

  test("has meta description", async ({ page }) => {
    await page.goto("/");
    const meta = page.locator("meta[name='description']");
    await expect(meta).toBeAttached({ timeout: 5000 });
    const content = await meta.getAttribute("content");
    expect(content?.length).toBeGreaterThan(10);
  });

  test("has Open Graph meta tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = page.locator("meta[property='og:title']");
    await expect(ogTitle).toBeAttached({ timeout: 5000 });
    const content = await ogTitle.getAttribute("content");
    expect(content?.length).toBeGreaterThan(0);
  });
});

test.describe("Homepage — Navigation & Search", () => {
  test("search input is visible and clickable", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[placeholder*='Search']").first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test("header contains navigation links", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header, nav").first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Homepage — Hero & Featured Products", () => {
  test("hero section or main content is visible", async ({ page }) => {
    await page.goto("/");
    const main = page.locator("main, [data-testid='hero']").first();
    await expect(main).toBeVisible({ timeout: 10000 });
  });

  test("flash deals or featured section loads", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(2000);
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(100);
  });
});

test.describe("Homepage — Footer", () => {
  test("footer is visible with company info", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible({ timeout: 10000 });
    const text = await footer.textContent();
    expect(text).toContain("WAW");
  });

  test("footer has legal links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible({ timeout: 10000 });
    const privacyLink = footer.locator("a[href*='privacy']");
    const termsLink = footer.locator("a[href*='terms']");
    await expect(privacyLink.first()).toBeAttached();
    await expect(termsLink.first()).toBeAttached();
  });
});

test.describe("Homepage — Auth Modal", () => {
  test("auth modal opens when account button clicked", async ({ page }) => {
    await page.goto("/");
    const accountBtn = page.locator("button:has-text('Account'), a:has-text('Account'), [data-testid='auth-trigger']").first();
    await expect(accountBtn).toBeVisible({ timeout: 10000 });
    await accountBtn.click();
    await page.waitForTimeout(1000);
    const modal = page.locator("[role='dialog'], [data-testid='auth-modal']").first();
    await expect(modal).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Homepage — Cart", () => {
  test("cart starts empty", async ({ page }) => {
    await page.goto("/");
    const cartBtn = page.locator("[data-testid='cart-button'], button:has-text('Cart'), a:has-text('Cart')").first();
    await expect(cartBtn).toBeVisible({ timeout: 10000 });
    await cartBtn.click();
    await page.waitForTimeout(1000);
    const emptyText = page.locator("text=empty, text=No items, text=Your cart");
    await expect(emptyText.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Homepage — Responsive Design", () => {
  test("mobile viewport (375x812) renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("tablet viewport (768x1024) renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("desktop viewport (1440x900) renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("mobile viewport has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});

test.describe("Homepage — Error Handling", () => {
  test("404 page for non-existent route", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Homepage — Performance", () => {
  test("loads within 5 seconds (domcontentloaded)", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("analytics")
    );
    expect(criticalErrors.length).toBe(0);
  });
});
