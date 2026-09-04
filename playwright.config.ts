import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
      testMatch: /admin/,
    },
    {
      name: "seller",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3003",
      },
      testMatch: /seller/,
    },
    {
      name: "api",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4000",
      },
      testMatch: /api\.spec/,
    },
  ],
  webServer: [
    {
      command: "npm run dev --workspace=@waw/web",
      port: 3000,
      timeout: 120000,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev --workspace=@waw/admin",
      port: 3001,
      timeout: 120000,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev --workspace=@waw/seller",
      port: 3003,
      timeout: 120000,
      reuseExistingServer: true,
    },
    {
      command: "npm run dev --workspace=@waw/api",
      port: 4000,
      timeout: 120000,
      reuseExistingServer: true,
    },
  ],
});
