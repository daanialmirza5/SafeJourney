import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: require.resolve("./e2e/global-setup.ts"),
  fullyParallel: false,
  // Force fully sequential execution across every spec file, not just
  // within one: concurrent first-time requests to the same `next dev`
  // server can race on its on-disk build manifest during cold compilation
  // and corrupt it (observed directly: intermittent "Unexpected end of
  // JSON input" from next/dist/server/load-manifest.js). Tests also share
  // one e2e database, so cross-file isolation matters for correctness too.
  workers: 1,
  retries: 1, // absorbs this environment's occasional heavy-load timeout flakiness (see docs/15_LIMITATIONS.md)
  timeout: 90_000,
  // This environment's cold `next dev` first-compile per route can take
  // several seconds even after the server itself is "ready" -- give
  // `expect(...).toBeVisible()`-style assertions room for that instead of
  // failing on Playwright's normal (fast, CI-tuned) 5s default.
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
    // First-compile of a cold .next cache can be slow on this environment's
    // disk; give it plenty of room rather than risk a flaky false failure.
    timeout: 180_000,
    env: {
      DATABASE_URL: "file:./e2e-test.db",
      JWT_SECRET: "e2e-test-secret",
      DEMO_MODE: "true",
      REFERRAL_ACK_TIMEOUT_MINUTES: "10",
    },
  },
});
