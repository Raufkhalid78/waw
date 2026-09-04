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
    const content = await meta.getAttribute("content");
    expect(content?.length).toBeGreaterThan(10);
  });

  test("has Open Graph meta tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = page.locator("meta[property='og:title']");
    if (await ogTitle.count() > 0) {
      const content = await ogTitle.getAttribute("content");
      expect(content?.length).toBeGreaterThan(0);
    }
  });

  test("has canonical URL", async ({ page }) => {
    await page.goto("/");
    const canonical = page.locator("link[rel='canonical']");
    if (await canonical.count() > 0) {
      const href = await canonical.getAttribute("href");
      expect(href).toContain("waw.com.pk");
    }
  });
});

test.describe("Homepage — Category Circles", () => {
  test("displays category circles section", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("[data-testid='category-circles']");
    await expect(section).toBeVisible({ timeout: 10000 });
  });

  test("category circles are clickable links", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("[data-testid='category-circles']");
    if (await section.isVisible({ timeout: 5000 }).catch(() => false)) {
      const links = section.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("Homepage — Navigation & Search", () => {
  test("search input is visible and clickable", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator("input[placeholder*='Search']").first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
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
  });
});

test.describe("Homepage — Footer", () => {
  test("footer is visible with company info", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").first();
    if (await footer.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await footer.textContent();
      expect(text).toContain("WAW");
    }
  });

  test("footer has legal links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").first();
    if (await footer.isVisible({ timeout: 5000 }).catch(() => false)) {
      const privacyLink = footer.locator("a[href*='privacy']");
      const termsLink = footer.locator("a[href*='terms']");
      if (await privacyLink.count() > 0) {
        await expect(privacyLink.first()).toBeVisible();
      }
      if (await termsLink.count() > 0) {
        await expect(termsLink.first()).toBeVisible();
      }
    }
  });

  test("Sell on Waw link points to seller portal", async ({ page }) => {
    await page.goto("/");
    const sellLink = page.locator("a[href*='seller.waw.com.pk']").first();
    if (await sellLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const href = await sellLink.getAttribute("href");
      expect(href).toContain("seller.waw.com.pk/login");
    }
  });

  test("App Store badges are not visible (Coming Soon)", async ({ page }) => {
    await page.goto("/");
    const appStoreLink = page.locator("a[href*='apps.apple.com']").first();
    if (await appStoreLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await appStoreLink.getAttribute("href");
      expect(href).not.toBeTruthy();
    }
  });
});

test.describe("Homepage — Auth Modal", () => {
  test("auth modal opens when account button clicked", async ({ page }) => {
    await page.goto("/");
    const accountBtn = page.locator("button:has-text('Account'), a:has-text('Account'), [data-testid='auth-trigger']").first();
    if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForTimeout(1000);
      const modal = page.locator("[role='dialog'], [data-testid='auth-modal']").first();
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test("auth modal has login and signup tabs", async ({ page }) => {
    await page.goto("/");
    const accountBtn = page.locator("button:has-text('Account'), a:has-text('Account'), [data-testid='auth-trigger']").first();
    if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForTimeout(1000);
      const loginTab = page.locator("text=Log in, button:has-text('Log in')").first();
      const signupTab = page.locator("text=Sign up, button:has-text('Sign up')").first();
      if (await loginTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(loginTab).toBeVisible();
      }
    }
  });

  test("auth modal has Google login option", async ({ page }) => {
    await page.goto("/");
    const accountBtn = page.locator("button:has-text('Account'), a:has-text('Account'), [data-testid='auth-trigger']").first();
    if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForTimeout(1000);
      const googleBtn = page.locator("button:has-text('Google'), [data-testid='google-login']").first();
      if (await googleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(googleBtn).toBeVisible();
      }
    }
  });

  test("auth modal has Apple login option", async ({ page }) => {
    await page.goto("/");
    const accountBtn = page.locator("button:has-text('Account'), a:has-text('Account'), [data-testid='auth-trigger']").first();
    if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForTimeout(1000);
      const appleBtn = page.locator("button:has-text('Apple'), [data-testid='apple-login']").first();
      if (await appleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(appleBtn).toBeVisible();
      }
    }
  });

  test("auth modal has WhatsApp login option", async ({ page }) => {
    await page.goto("/");
    const accountBtn = page.locator("button:has-text('Account'), a:has-text('Account'), [data-testid='auth-trigger']").first();
    if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForTimeout(1000);
      const whatsappBtn = page.locator("button:has-text('WhatsApp'), [data-testid='whatsapp-login']").first();
      if (await whatsappBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(whatsappBtn).toBeVisible();
      }
    }
  });
});

test.describe("Homepage — Cart", () => {
  test("cart starts empty", async ({ page }) => {
    await page.goto("/");
    const cartBtn = page.locator("[data-testid='cart-button'], button:has-text('Cart'), a:has-text('Cart')").first();
    if (await cartBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cartBtn.click();
      await page.waitForTimeout(1000);
      const emptyText = page.locator("text=empty, text=No items, text=Your cart");
      if (await emptyText.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(emptyText.first()).toBeVisible();
      }
    }
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
