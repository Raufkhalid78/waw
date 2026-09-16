import { test } from "@playwright/test";

test("debug: capture failing requests on homepage", async ({ page }) => {
  const failures: string[] = [];
  page.on("response", (res) => {
    if (res.status() >= 400) {
      failures.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });
  page.on("requestfailed", (req) => {
    failures.push(`FAILED ${req.method()} ${req.url()} :: ${req.failure()?.errorText}`);
  });
  await page.goto("/");
  await page.waitForTimeout(2500);
  console.log("=== FAILING REQUESTS (" + failures.length + ") ===");
  failures.forEach((f, i) => console.log(`[${i}] ${f}`));
});
