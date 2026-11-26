import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "3001";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "node scripts/start-e2e-server.mjs",
    url: `${baseURL}/api/health/live`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgres://forma:forma-local-only@localhost:5432/forma_e2e",
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        "forma-playwright-only-secret-not-for-production",
      BETTER_AUTH_SIGNUP_RATE_LIMIT_MAX: "100",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      HOSTNAME: "127.0.0.1",
      PORT: port,
    },
  },
});
