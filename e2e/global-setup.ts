import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Runs once before the whole Playwright suite. Migrates and seeds a
 * dedicated e2e SQLite database (never the developer's demo `dev.db`) so
 * the suite is fully repeatable and never clobbers a demo you're mid-way
 * through showing someone. See playwright.config.ts for the matching
 * DATABASE_URL passed to the dev server it starts.
 */
export default async function globalSetup() {
  const cwd = path.resolve(__dirname, "..");
  const env = {
    ...process.env,
    DATABASE_URL: "file:./e2e-test.db",
    JWT_SECRET: "e2e-test-secret",
  };

  console.log("[e2e] applying migrations to the e2e test database...");
  await execFileAsync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"], {
    cwd,
    env,
    shell: process.platform === "win32",
  });

  console.log("[e2e] seeding the e2e test database...");
  await execFileAsync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "prisma/seed.ts"], {
    cwd,
    env,
    shell: process.platform === "win32",
  });

  console.log("[e2e] database ready.");
}
