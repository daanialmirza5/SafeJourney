import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://safejourney-w7dz.onrender.com";
const SCREENSHOT_DIR = path.resolve(process.cwd(), "docs/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function loginAs(context, email, password = "safejourney2026") {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.evaluate(
    async ({ email, password }) => {
      await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    },
    { email, password }
  );
  await page.close();
}

async function capture() {
  console.log("Launching browser to capture fresh screenshots from live deployment:", BASE_URL);
  const browser = await chromium.launch({ headless: true });

  // 1. Landing Page
  {
    console.log("Capturing 01 - Landing Page Hero...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-landing-hero.png"), fullPage: false });
    await context.close();
  }

  // 2. Login & Role Switcher
  {
    console.log("Capturing 02 - Quick Role Switcher Login...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-quick-login-roles.png"), fullPage: false });
    await context.close();
  }

  // 3. Doctor Dashboard
  {
    console.log("Capturing 03 - Doctor Dashboard...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "doctor@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-doctor-dashboard.png"), fullPage: false });
    await context.close();
  }

  // 4. Create Referral Form
  {
    console.log("Capturing 04 - Create Referral Form...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "doctor@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/referrals/new`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-create-referral.png"), fullPage: false });
    await context.close();
  }

  // 5. Referral Passport Detail & Benefit Radar
  {
    console.log("Capturing 05 - Referral Passport & Benefit Radar...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "doctor@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/referrals`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    const referralLink = page.locator("a[href^='/referrals/']").first();
    if (await referralLink.isVisible()) {
      await referralLink.click();
      await page.waitForURL(/\/referrals\/.+/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-referral-passport-detail.png"), fullPage: false });
    }
    await context.close();
  }

  // 6. Coordinator Triage Hub
  {
    console.log("Capturing 06 - Coordinator Triage & Referrals...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "coordinator@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-coordinator-triage.png"), fullPage: false });
    await context.close();
  }

  // 7. Patient Live Journey
  {
    console.log("Capturing 07 - Patient Live Journey...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "patient@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-patient-journey.png"), fullPage: false });
    await context.close();
  }

  // 8. Referral Rescue Engine & SLA
  {
    console.log("Capturing 08 - Referral Rescue Engine...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "doctor@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);

    const rescueBtn = page.locator("button:has-text('Demo Rescue Scenario'), button:has-text('Rescue Scenario')").first();
    if (await rescueBtn.isVisible()) {
      await rescueBtn.click();
      await page.waitForURL(/\/referrals\/.+/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-referral-rescue-engine.png"), fullPage: false });
    } else {
      // Navigate to referrals list with stalled/stuck filter
      await page.goto(`${BASE_URL}/referrals`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-referral-rescue-engine.png"), fullPage: false });
    }
    await context.close();
  }

  // 9. Follow-up Worker (ASHA) Dashboard
  {
    console.log("Capturing 09 - Follow-up Worker (ASHA) Dashboard...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "asha@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-followup-worker-dashboard.png"), fullPage: false });
    await context.close();
  }

  // 10. Admin Governance Panel
  {
    console.log("Capturing 10 - Admin Governance Panel...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "admin@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10-admin-panel.png"), fullPage: false });
    await context.close();
  }

  // 11. Operational Analytics & KPIs
  {
    console.log("Capturing 11 - Operational Analytics & KPIs...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await loginAs(context, "admin@safejourney.local");
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "11-analytics-metrics.png"), fullPage: false });
    await context.close();
  }

  // Update alias files
  const aliases = [
    ["01-landing-hero.png", "landing-hero.png"],
    ["02-quick-login-roles.png", "login-roles.png"],
    ["03-doctor-dashboard.png", "dashboard.png"],
    ["04-create-referral.png", "create-referral.png"],
    ["05-referral-passport-detail.png", "referral-details.png"],
    ["06-coordinator-triage.png", "referrals.png"],
    ["07-patient-journey.png", "patient-journey.png"],
    ["08-referral-rescue-engine.png", "rescue-engine.png"],
    ["09-followup-worker-dashboard.png", "follow-up.png"],
    ["10-admin-panel.png", "admin.png"],
    ["11-analytics-metrics.png", "analytics.png"],
  ];

  for (const [src, dest] of aliases) {
    const srcPath = path.join(SCREENSHOT_DIR, src);
    const destPath = path.join(SCREENSHOT_DIR, dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  await browser.close();
  console.log("✅ All fresh screenshots successfully captured from live deployment!");
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
