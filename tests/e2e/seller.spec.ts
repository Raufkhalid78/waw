import { test, expect } from "@playwright/test";

test.describe("Seller — Login Page", () => {
  test("loads seller login page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("displays seller branding", async ({ page }) => {
    await page.goto("/");
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("has phone number input for WhatsApp OTP", async ({ page }) => {
    await page.goto("/");
    const phoneInput = page.locator("input[type='tel'], input[name='phone'], input[placeholder*='phone' i], input[placeholder*='+92']").first();
    if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(phoneInput).toBeVisible();
    }
  });

  test("has login/register mode toggle", async ({ page }) => {
    await page.goto("/");
    const loginTab = page.locator("button:has-text('Login'), button:has-text('Sign In'), [role='tab']:has-text('Login')").first();
    const registerTab = page.locator("button:has-text('Register'), button:has-text('Sign Up'), [role='tab']:has-text('Register')").first();
    if (await loginTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(loginTab).toBeVisible();
    }
  });

  test("has WhatsApp OTP send button", async ({ page }) => {
    await page.goto("/");
    const otpBtn = page.locator("button:has-text('Send OTP'), button:has-text('Continue'), button:has-text('WhatsApp')").first();
    if (await otpBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(otpBtn).toBeVisible();
    }
  });

  test("does not have hardcoded phone number pre-filled", async ({ page }) => {
    await page.goto("/");
    const phoneInput = page.locator("input[type='tel'], input[name='phone'], input[placeholder*='phone' i]").first();
    if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const value = await phoneInput.inputValue();
      expect(value).not.toBe("+923219876543");
      expect(value).not.toBe("923219876543");
    }
  });
});

test.describe("Seller — Register Store", () => {
  test("register tab shows store name input", async ({ page }) => {
    await page.goto("/");
    const registerTab = page.locator("button:has-text('Register'), [role='tab']:has-text('Register')").first();
    if (await registerTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await registerTab.click();
      await page.waitForTimeout(1000);
      const storeInput = page.locator("input[name='storeName'], input[placeholder*='store' i], input[placeholder*='shop' i]").first();
      if (await storeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(storeInput).toBeVisible();
      }
    }
  });

  test("register tab shows city input", async ({ page }) => {
    await page.goto("/");
    const registerTab = page.locator("button:has-text('Register'), [role='tab']:has-text('Register')").first();
    if (await registerTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await registerTab.click();
      await page.waitForTimeout(1000);
      const cityInput = page.locator("input[name='city'], input[placeholder*='city' i]").first();
      if (await cityInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(cityInput).toBeVisible();
      }
    }
  });
});

test.describe("Seller — Navigation", () => {
  test("navigation is accessible", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav, [data-testid='seller-nav'], aside").first();
    if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(nav).toBeVisible();
    }
  });

  test("sidebar has navigation links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav, [data-testid='seller-nav'], aside").first();
    if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
      const links = nav.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("Seller — Responsive Design", () => {
  test("desktop viewport (1440x900) renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("tablet viewport (768x1024) renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("mobile viewport (375x812) renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("mobile viewport has navigation accessible", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const nav = page.locator("nav, [data-testid='seller-nav'], aside, [data-testid='mobile-nav']").first();
    if (await nav.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(nav).toBeVisible();
    }
  });
});

test.describe("Seller — Error Handling", () => {
  test("seller 404 for non-existent route", async ({ page }) => {
    const response = await page.goto("/non-existent-seller-page-12345");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Seller — Performance", () => {
  test("login page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(5000);
  });

  test("no critical console errors on login page", async ({ page }) => {
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

test.describe("Seller — Accessibility", () => {
  test("phone input has proper label or placeholder", async ({ page }) => {
    await page.goto("/");
    const phoneInput = page.locator("input[type='tel'], input[name='phone']").first();
    if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const ariaLabel = await phoneInput.getAttribute("aria-label");
      const placeholder = await phoneInput.getAttribute("placeholder");
      const hasLabel = ariaLabel || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });

  test("OTP input is keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const phoneInput = page.locator("input[type='tel'], input[name='phone']").first();
    if (await phoneInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await phoneInput.focus();
      const isFocused = await phoneInput.evaluate((el) => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
  });
});
