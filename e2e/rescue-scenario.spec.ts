import { test, expect } from "@playwright/test";
import { loginAs, DEMO_USER_EMAILS } from "./helpers";

/**
 * Verifies the Referral Rescue Engine (spec section 13) triggers
 * immediately -- no cron/background job/manual "tick" required, because
 * operational status is computed fresh on every read (see
 * docs/04_ARCHITECTURE.md). Also asserts the escalation is framed as
 * operational, never clinical (spec section 13's core safety constraint).
 */
test("Demo Rescue Scenario immediately flags a referral as STUCK with an operational (non-clinical) reason", async ({
  browser,
}) => {
  const { context, page } = await loginAs(browser, DEMO_USER_EMAILS.doctor);

  const response = await context.request.post("/api/demo/rescue-scenario");
  expect(response.ok()).toBeTruthy();
  const { referral } = await response.json();
  expect(referral.status).toBe("SENT");

  await page.goto(`/referrals/${referral.id}`);

  await expect(page.getByText("Referral Rescue: this case needs attention")).toBeVisible();
  await expect(page.getByText(/not been acknowledged/i)).toBeVisible();
  await expect(page.getByText(/operational flag only, not a clinical assessment/i)).toBeVisible();

  const detail = await (await context.request.get(`/api/referrals/${referral.id}`)).json();
  expect(detail.referral.operationalStatus).toBe("STUCK");
});
