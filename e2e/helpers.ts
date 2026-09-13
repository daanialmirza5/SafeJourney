import type { Browser, BrowserContext, Page } from "@playwright/test";
import { DEMO_USER_EMAILS, DEMO_PASSWORD } from "../src/lib/demoAccounts";

export { DEMO_USER_EMAILS, DEMO_PASSWORD };

/** Logs in as a demo account via the real API (fast, reliable) and returns
 * an isolated browser context + page sharing that session -- simulating a
 * distinct device/person, the way multiple real actors would use the app
 * concurrently during one referral's journey. */
export async function loginAs(
  browser: Browser,
  email: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const response = await context.request.post("/api/auth/login", {
    data: { email, password: DEMO_PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${await response.text()}`);
  }
  const page = await context.newPage();
  return { context, page };
}
