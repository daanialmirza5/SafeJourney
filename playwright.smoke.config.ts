import { defineConfig, devices } from "@playwright/test";

const PORT = 3101; // distinct from playwright.config.ts's 3100 so a smoke run can't collide with a full-suite run
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Focused smoke suite (see docs/E2E_EXECUTION_PLAN.md for the full
 * investigation this came out of). Runs only closed-loop-referral.spec.ts
 * -- the one file that already exercises the entire core journey in a
 * single test.describe.serial block (create -> accept -> transport ->
 * arrival -> discharge -> back-referral -> follow-up -> auto-close) -- so
 * a single, fast, representative pass stands in for "is the app
 * fundamentally working end to end" without paying for the other five
 * spec files' setup and page-load cost too.
 *
 * Everything else (workers, retries, timeouts, the shared e2e database via
 * global-setup.ts) mirrors playwright.config.ts exactly -- this is a
 * narrower *selection* of tests, not a different test environment, so a
 * green smoke run means what it looks like it means.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /closed-loop-referral\.spec\.ts/,
  globalSetup: require.resolve("./e2e/global-setup.ts"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: "file:./e2e-test.db",
      JWT_SECRET: "e2e-test-secret",
      DEMO_MODE: "true",
      REFERRAL_ACK_TIMEOUT_MINUTES: "10",
    },
  },
});
