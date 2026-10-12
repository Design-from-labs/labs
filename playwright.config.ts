import { defineConfig, devices } from "@playwright/test";

// Smoke tests against the built static site (pnpm build:site first).
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /layout\.spec\.ts/,
    },
  ],
  webServer: {
    command: "pnpm exec astro preview --port 4321",
    url: "http://localhost:4321/ui",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
