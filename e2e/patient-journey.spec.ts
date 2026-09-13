import { test, expect } from "@playwright/test";
import { loginAs, DEMO_USER_EMAILS } from "./helpers";

/**
 * Verifies the patient-facing experience (spec section 25) against the
 * seeded flagship case (patient@demo.local's own linked referral, created
 * by prisma/seed.ts). This is deliberately a separate scenario from
 * closed-loop-referral.spec.ts: a referral created via the API during a
 * test has no linked portal account (by design -- see docs/06_DATABASE_SCHEMA.md
 * on Patient.userId), so only the seeded flagship case can exercise the
 * logged-in patient view end-to-end.
 */
test("patient sees a plain-language journey, next action, and Referral Passport", async ({ browser }) => {
  const { page } = await loginAs(browser, DEMO_USER_EMAILS.patient);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "My Journey" })).toBeVisible();
  await expect(page.getByText("What happens next?")).toBeVisible();

  // No raw status codes/jargon should leak into the patient's primary view.
  await expect(page.getByText("ACKNOWLEDGED", { exact: true })).toHaveCount(0);
  await expect(page.getByText("TRANSPORT_REQUESTED", { exact: true })).toHaveCount(0);

  await page.getByRole("link", { name: /View full details/i }).click();
  await page.waitForURL(/\/referrals\/c[a-z0-9]{20,}$/);

  await expect(page.getByText("Referral Passport")).toBeVisible();
  await expect(page.locator("img[alt='Referral Passport QR code']")).toBeVisible();
  await expect(page.getByText("Benefit Radar")).toBeVisible();
});

test("patient cannot open a referral they have no relationship to", async ({ browser }) => {
  // Search is role-scoped (spec sections 29, 48): a PATIENT's search only
  // ever returns their own referral(s), an ADMIN's returns everything.
  // Diffing the two gives us a real referral id this patient has no
  // relationship to, without hard-coding any seed data.
  const { context: patientContext } = await loginAs(browser, DEMO_USER_EMAILS.patient);
  const ownResults = (await (await patientContext.request.get("/api/search?q=MR-2")).json()).results as { id: string }[];
  expect(ownResults.length).toBeGreaterThan(0);
  const ownIds = new Set(ownResults.map((r) => r.id));

  const { context: adminContext } = await loginAs(browser, DEMO_USER_EMAILS.admin);
  const allResults = (await (await adminContext.request.get("/api/search?q=MR-2")).json()).results as { id: string }[];
  const someOtherReferralId = allResults.find((r) => !ownIds.has(r.id))?.id;
  expect(someOtherReferralId, "expected at least one seeded referral outside the patient's own scope").toBeTruthy();

  const { page } = await loginAs(browser, DEMO_USER_EMAILS.patient);
  const response = await page.goto(`/referrals/${someOtherReferralId}`);
  // Server-rendered error boundary (src/app/(app)/error.tsx) surfaces the
  // ForbiddenError thrown by canAccessReferral() -- never silently shows
  // someone else's case.
  expect(response?.status()).toBeGreaterThanOrEqual(400);
  await expect(page.getByText(/do not have access/i)).toBeVisible();
});
