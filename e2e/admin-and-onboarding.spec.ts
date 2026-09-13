import { test, expect } from "@playwright/test";
import { loginAs, DEMO_USER_EMAILS } from "./helpers";

/**
 * Covers the three flows added after the original closed-loop suite that
 * were, until now, only verified manually over HTTP (see
 * docs/11_TESTING_STRATEGY.md / docs/15_LIMITATIONS.md): editing a
 * notification template, deactivating/reactivating a facility, and the
 * full deactivate -> blocked-login -> reactivate -> first-time-onboarding
 * path for a freshly created user account.
 */

test("admin can edit a notification template's copy and revert it", async ({ browser }) => {
  const { page } = await loginAs(browser, DEMO_USER_EMAILS.admin);
  await page.goto("/admin");

  const row = page.locator("li", { hasText: "REFERRAL_CREATED_COORDINATOR" });
  await row.getByRole("button", { name: "Edit template" }).click();
  await row.locator("input").fill("E2E custom title");
  await row.locator("textarea").fill("E2E custom body for {{referralCode}}.");
  await row.getByRole("button", { name: "Save" }).click();

  await expect(row.getByText("E2E custom title")).toBeVisible();
  await expect(row.getByRole("button", { name: "Revert to default" })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Revert to default" }).click();
  await expect(row.getByText("E2E custom title")).toHaveCount(0);
  await expect(row.getByText("New incoming referral")).toBeVisible();
});

test("admin can create, deactivate and reactivate a facility", async ({ browser }) => {
  const { page } = await loginAs(browser, DEMO_USER_EMAILS.admin);
  await page.goto("/admin");

  await page.getByRole("button", { name: "Add facility" }).click();
  await page.getByLabel("Facility name").fill("E2E Test Facility");
  await page.getByLabel("District").fill("E2E District");
  await page.getByLabel("State").fill("E2E State");
  await page.getByRole("button", { name: "Create" }).click();

  const row = page.locator("tr", { hasText: "E2E Test Facility" });
  await expect(row.getByText("Active", { exact: true })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(row.getByText("Deactivated", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Reactivate" }).click();
  await expect(row.getByText("Active", { exact: true })).toBeVisible();
});

test("deactivating a user blocks login immediately, and reactivating restores it -- then first-time onboarding runs for that fresh account", async ({
  browser,
}) => {
  const testEmail = `e2e-onboarding-${Date.now()}@demo.local`;

  // Create a fresh caregiver account via the patient's own "add caregiver" flow.
  const { context: patientContext } = await loginAs(browser, DEMO_USER_EMAILS.patient);
  const ownResults = (await (await patientContext.request.get("/api/search?q=MR-2")).json()).results as { id: string }[];
  const referral = await (await patientContext.request.get(`/api/referrals/${ownResults[0].id}`)).json();
  const patientId = referral.referral.patientId;
  await patientContext.request.post(`/api/patients/${patientId}/caregivers`, {
    data: { email: testEmail, name: "E2E Onboarding Caregiver", permission: "VIEW_ONLY" },
  });

  // Admin deactivates it.
  const { page: adminPage, context: adminContext } = await loginAs(browser, DEMO_USER_EMAILS.admin);
  await adminPage.goto("/admin");
  const userRow = adminPage.locator("tr", { hasText: testEmail });
  await expect(userRow).toBeVisible();
  adminPage.once("dialog", (d) => d.accept());
  await userRow.getByRole("button", { name: "Deactivate" }).click();
  await expect(userRow.getByText("Deactivated", { exact: true })).toBeVisible();

  // A fresh login attempt is blocked.
  const blockedLogin = await adminContext.request.post("/api/auth/login", {
    data: { email: testEmail, password: "demo1234" },
  });
  expect(blockedLogin.status()).toBe(403);

  // Reactivate.
  await userRow.getByRole("button", { name: "Reactivate" }).click();
  await expect(userRow.getByText("Active", { exact: true })).toBeVisible();

  // Now log in as that fresh account through the real UI and walk the
  // first-time onboarding wizard (Welcome -> Language -> Consent).
  const { page } = await loginAs(browser, testEmail);
  await page.goto("/dashboard");
  await page.waitForURL(/\/onboarding$/);

  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "मराठी (Marathi)" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "I understand -- go to my dashboard" }).click();

  await page.waitForURL(/\/dashboard$/);
  // The dashboard should now render in the language just chosen. The nav
  // renders the same translated label twice (desktop sidebar + mobile
  // bottom nav), so scope to the page heading, which is singular.
  await expect(page.getByRole("heading", { name: "जोडलेली प्रकरणे" })).toBeVisible(); // "Linked cases" in Marathi
});
