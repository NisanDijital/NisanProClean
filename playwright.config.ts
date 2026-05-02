import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "https://nisankoltukyikama.com";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  },
});
