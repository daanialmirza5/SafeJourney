import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Screenshot capture asserts nothing and overwrites docs/screenshots/;
  // it runs on its own via `npm run test:e2e:screenshots`.
  testIgnore: /capture-all-screenshots\.spec\.ts/,
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
    // CI serves a production build: `next dev` compiles routes on demand and
    // intermittently corrupts its manifest under test load ("Unexpected end
    // of JSON input"), which made CI failures depend on timing.
    command: process.env.CI ? `npx next build && npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    // First-compile of a cold .next cache can be slow on this environment's
    // disk, and CI also builds first; give it plenty of room.
    timeout: 300_000,
    env: {
      DATABASE_URL: "file:./e2e-test.db",
      JWT_SECRET: "e2e-test-secret",
      DEMO_MODE: "true",
      REFERRAL_ACK_TIMEOUT_MINUTES: "10",
      // Every test logs in from the same host; lift the per-IP login limit.
      LOGIN_RATE_LIMIT_PER_MINUTE: "1000",
    },
  },
});
