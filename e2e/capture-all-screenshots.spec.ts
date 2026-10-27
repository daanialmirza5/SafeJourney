import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import type { Page } from "@playwright/test";
import { DEMO_USER_EMAILS, DEMO_PASSWORD } from "./helpers";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots");

// Signs in through the real login API (the login page's per-role buttons are
// not stable selectors), then opens the role's home page like a UI login would.
async function signInAs(page: Page, email: string) {
  const res = await page.request.post("/api/auth/login", { data: { email, password: DEMO_PASSWORD } });
  expect(res.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
}

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test.describe.serial("Demo Screenshots Capture", () => {
  test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

  test("01 - Landing Page Hero", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01-landing-hero.png"),
      fullPage: false,
    });
  });

  test("02 - Quick Role Switcher Login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-quick-login-roles.png"),
      fullPage: false,
    });
  });

  test("03 - Doctor Dashboard & Referrals", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.doctor);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03-doctor-dashboard.png"),
      fullPage: false,
    });
  });

  test("04 - Create Referral & Smart Matching", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.doctor);
    await page.goto("/referrals/new");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "04-create-referral.png"),
      fullPage: false,
    });
  });

  test("05 - Referral Passport & Benefit Radar", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.doctor);
    await page.waitForLoadState("networkidle");

    const judgeBtn = page.locator("button:has-text('Launch Judge Demo')");
    if (await judgeBtn.isVisible()) {
      await judgeBtn.click();
      await page.waitForURL(/\/referrals\/.+/);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    } else {
      const referralLink = page.locator("a[href^='/referrals/']").first();
      await referralLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05-referral-passport-detail.png"),
      fullPage: false,
    });
  });

  test("06 - Coordinator Triage & Bed Management", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.coordinator);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-coordinator-triage.png"),
      fullPage: false,
    });
  });

  test("07 - Patient Live Journey & Multilingual Portal", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.patient);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07-patient-journey.png"),
      fullPage: false,
    });
  });

  test("08 - Referral Rescue Engine & SLA Escalation", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.doctor);
    await page.waitForLoadState("networkidle");

    const rescueBtn = page.locator("button:has-text('Demo Rescue Scenario')");
    if (await rescueBtn.isVisible()) {
      await rescueBtn.click();
      await page.waitForURL(/\/referrals\/.+/);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08-referral-rescue-engine.png"),
      fullPage: false,
    });
  });

  test("09 - ASHA / Follow-Up Worker Dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator("button", { hasText: "Follow-up worker" }).click();
    await page.waitForURL("**/dashboard");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "09-followup-worker-dashboard.png"),
      fullPage: false,
    });
  });

  test("10 - Admin Governance & Audit Trail", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.admin);
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "10-admin-panel.png"),
      fullPage: false,
    });
  });

  test("11 - Analytics & Performance Metrics", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await signInAs(page, DEMO_USER_EMAILS.admin);
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "11-analytics-metrics.png"),
      fullPage: false,
    });
  });
});
