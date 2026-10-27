import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

const PORT = 3102; // distinct from the full suite (3100) and smoke suite (3101)
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Regenerates docs/screenshots/ from capture-all-screenshots.spec.ts, which
 * the main config ignores so routine E2E runs never rewrite committed
 * images. Everything else mirrors playwright.config.ts.
 */
export default defineConfig({
  ...baseConfig,
  testIgnore: undefined,
  testMatch: /capture-all-screenshots\.spec\.ts/,
  retries: 0,
  use: { ...baseConfig.use, baseURL: BASE_URL },
  webServer: {
    ...(baseConfig.webServer as object),
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
  },
});
