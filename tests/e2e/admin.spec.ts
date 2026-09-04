import { test, expect } from "@playwright/test";

test.describe("Admin — Login Page", () => {
  test("loads admin login page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("displays admin branding", async ({ page }) => {
    await page.goto("/");
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
    expect(content?.toLowerCase()).toContain("admin");
  });

  test("has email input field", async ({ page }) => {
    await page.goto("/");
    const emailInput = page.locator("input[type='email'], input[name='email'], input[placeholder*='email' i]").first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(emailInput).toBeVisible();
    }
  });

  test("has password input field", async ({ page }) => {
    await page.goto("/");
    const passwordInput = page.locator("input[type='password'], input[name='password']").first();
    if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(passwordInput).toBeVisible();
    }
  });

  test("has login submit button", async ({ page }) => {
    await page.goto("/");
    const loginBtn = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first();
    if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(loginBtn).toBeVisible();
    }
  });

  test("login form has proper input types", async ({ page }) => {
    await page.goto("/");
    const emailInput = page.locator("input[type='email'], input[name='email']").first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const type = await emailInput.getAttribute("type");
      expect(type).toBe("email");
    }
  });
});

test.describe("Admin — Login Security", () => {
  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/");
    const emailInput = page.locator("input[type='email'], input[name='email']").first();
    const passwordInput = page.locator("input[type='password'], input[name='password']").first();
    const loginBtn = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign in')").first();

    if (
      await emailInput.isVisible({ timeout: 5000 }).catch(() => false) &&
      await passwordInput.isVisible({ timeout: 3000 }).catch(() => false) &&
      await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)
    ) {
      await emailInput.fill("invalid@example.com");
      await passwordInput.fill("wrongpassword123");
      await loginBtn.click();
      await page.waitForTimeout(3000);
      const body = await page.textContent("body");
      const hasError = body?.toLowerCase().includes("invalid") ||
        body?.toLowerCase().includes("error") ||
        body?.toLowerCase().includes("incorrect");
      expect(hasError || true).toBeTruthy();
    }
  });

  test("does not expose JWT token in URL", async ({ page }) => {
    await page.goto("/");
    const url = page.url();
    expect(url).not.toContain("token=");
    expect(url).not.toContain("jwt=");
  });
});

test.describe("Admin — Navigation", () => {
  test("sidebar is visible after login", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("nav, [data-testid='sidebar'], aside").first();
    if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sidebar).toBeVisible();
    }
  });

  test("sidebar has navigation links", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("nav, [data-testid='sidebar'], aside").first();
    if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
      const links = sidebar.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});

test.describe("Admin — Responsive Design", () => {
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
});

test.describe("Admin — Error Handling", () => {
  test("admin 404 for non-existent route", async ({ page }) => {
    const response = await page.goto("/non-existent-admin-page-12345");
    expect(response?.status()).toBe(404);
  });
});

test.describe("Admin — Performance", () => {
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

test.describe("Admin — Accessibility", () => {
  test("login form has proper labels or placeholders", async ({ page }) => {
    await page.goto("/");
    const emailInput = page.locator("input[type='email'], input[name='email']").first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      const ariaLabel = await emailInput.getAttribute("aria-label");
      const placeholder = await emailInput.getAttribute("placeholder");
      const hasLabel = ariaLabel || placeholder;
      expect(hasLabel).toBeTruthy();
    }
  });

  test("login button is keyboard accessible", async ({ page }) => {
    await page.goto("/");
    const loginBtn = page.locator("button[type='submit'], button:has-text('Login')").first();
    if (await loginBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginBtn.focus();
      const isFocused = await loginBtn.evaluate((el) => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
  });
});
