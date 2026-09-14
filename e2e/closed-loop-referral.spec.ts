import { test, expect, type APIRequestContext } from "@playwright/test";
import path from "path";
import { loginAs, DEMO_USER_EMAILS } from "./helpers";

/**
 * Codifies the acceptance-test scenario from spec section 70: a doctor
 * creates a referral, a coordinator accepts it, assigns and progresses
 * transport, confirms arrival, discharges, and sends a back-referral (which
 * stays unacknowledged and with no follow-up tasks yet); the referring
 * doctor then acknowledges it and assigns a follow-up worker, who completes
 * every task, closing the referral automatically -- driven through the
 * real running app in a real browser, not mocked.
 *
 * State is threaded between steps via the shared `referralId`; each step
 * both performs the real UI interaction AND asserts the resulting
 * canonical state via the JSON API (more reliable than scraping badge
 * text for every intermediate state, while still real UI clicks drive
 * every transition).
 */

let referralId: string;

async function getReferral(request: APIRequestContext, id: string) {
  const res = await request.get(`/api/referrals/${id}`);
  expect(res.ok(), `GET /api/referrals/${id} failed: ${res.status()}`).toBeTruthy();
  return (await res.json()).referral;
}

test.describe.serial("closed-loop referral journey", () => {
  test("doctor creates a referral with transport required", async ({ browser }) => {
    const { context, page } = await loginAs(browser, DEMO_USER_EMAILS.doctor);

    await page.goto("/referrals/new");
    await page.getByTestId("patient-name").fill("Ananya E2E Patil");
    await page
      .getByTestId("receiving-facility")
      .selectOption({ label: "Riverbend Women & Newborn Hospital (Mumbai, Maharashtra)" });
    await page.getByTestId("transport-required").check();
    await page.getByTestId("doctor-note").fill("E2E test referral -- administrative note only, no clinical content.");
    await page.getByTestId("submit-referral").click();

    // Referral (cuid) ids are long alphanumeric strings starting with "c" --
    // the pattern is deliberately strict enough to never match the static
    // "/referrals/new" route we're navigating away from.
    await page.waitForURL(/\/referrals\/c[a-z0-9]{20,}$/);
    referralId = page.url().split("/referrals/")[1];
    expect(referralId).toBeTruthy();

    const referral = await getReferral(context.request, referralId);
    expect(referral.status).toBe("SENT");
    expect(referral.transportRequired).toBe(true);
    await expect(page.getByRole("heading", { name: referral.referralCode })).toBeVisible();

    await context.close();
  });

  test("doctor attaches and confirms a referral document", async ({ browser }) => {
    const { context, page } = await loginAs(browser, DEMO_USER_EMAILS.doctor);
    await page.goto(`/referrals/${referralId}`);

    const fixture = path.join(__dirname, "fixtures", "referral-note.pdf");
    await page.getByTestId("document-file-input").setInputFiles(fixture);
    await page.getByTestId("upload-document").click();
    await expect(page.getByText("referral-note.pdf")).toBeVisible();

    await page.getByTestId("extract-document").click();
    await expect(page.getByText("Review extracted information")).toBeVisible();

    await page.getByTestId("confirm-document").click();
    // The extracted-review panel (Confirm/Reject buttons) unmounts once the
    // document leaves EXTRACTED status -- an unambiguous signal the confirm
    // actually completed (unlike text-matching "confirmed" nearby, which
    // also substring-matches the passport card's unrelated "N confirmed"
    // document count and would let this race ahead of the real mutation).
    await expect(page.getByTestId("confirm-document")).not.toBeVisible();

    const referral = await getReferral(context.request, referralId);
    expect(referral.documents).toHaveLength(1);
    expect(referral.documents[0].status).toBe("CONFIRMED");

    await context.close();
  });

  test("coordinator accepts and progresses transport through to arrival", async ({ browser }) => {
    const { context, page } = await loginAs(browser, DEMO_USER_EMAILS.coordinator);
    await page.goto(`/referrals/${referralId}`);

    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByRole("button", { name: "Request transport" })).toBeVisible();
    expect((await getReferral(context.request, referralId)).status).toBe("ACKNOWLEDGED");

    await page.getByRole("button", { name: "Request transport" }).click();
    await expect(page.getByRole("button", { name: "Assign transport" })).toBeVisible();
    expect((await getReferral(context.request, referralId)).status).toBe("TRANSPORT_REQUESTED");

    await page.getByRole("button", { name: "Assign transport" }).click();
    await page.getByLabel("Vehicle pseudonym").fill("DEMO-AMB-E2E");
    await page.getByLabel("ETA (minutes)").fill("20");
    await page.getByRole("button", { name: "Confirm assignment" }).click();
    await expect(page.getByRole("button", { name: "Mark en route to pickup" })).toBeVisible();
    expect((await getReferral(context.request, referralId)).status).toBe("TRANSPORT_ASSIGNED");

    await page.getByRole("button", { name: "Mark en route to pickup" }).click();
    await expect(page.getByRole("button", { name: "Mark picked up" })).toBeVisible();

    await page.getByRole("button", { name: "Mark picked up" }).click();
    await expect(page.getByRole("button", { name: "Mark in transit" })).toBeVisible();

    await page.getByRole("button", { name: "Mark in transit" }).click();
    await expect(page.getByRole("button", { name: "Mark arrived" })).toBeVisible();
    expect((await getReferral(context.request, referralId)).status).toBe("IN_TRANSIT");

    await page.getByRole("button", { name: "Mark arrived" }).click();
    await expect(page.getByRole("button", { name: "Discharge" })).toBeVisible();
    expect((await getReferral(context.request, referralId)).status).toBe("UNDER_CARE");

    await context.close();
  });

  test("coordinator discharges and sends a back-referral, which stays unacknowledged", async ({ browser }) => {
    const { context, page } = await loginAs(browser, DEMO_USER_EMAILS.coordinator);
    await page.goto(`/referrals/${referralId}`);

    await page.getByRole("button", { name: "Discharge" }).click();
    await page.getByLabel("Discharge destination / next care location").fill("Home");
    await page.getByRole("button", { name: "Confirm discharge" }).click();
    await expect(page.getByRole("button", { name: "Generate back-referral" })).toBeVisible();
    const discharged = await getReferral(context.request, referralId);
    expect(discharged.status).toBe("DISCHARGED");
    expect(discharged.dischargeDestination).toBe("Home");

    await page.getByRole("button", { name: "Generate back-referral" }).click();
    // The AI-drafted summary loads asynchronously into the textarea.
    await expect(page.locator("textarea").last()).not.toHaveValue("");
    await page.getByRole("button", { name: "Confirm & send" }).click();

    await expect(page.getByText("awaiting acknowledgment", { exact: false })).toBeVisible();
    const referral = await getReferral(context.request, referralId);
    expect(referral.status).toBe("BACK_REFERRED");
    expect(referral.backReferral.acknowledgedAt).toBeFalsy();
    // Follow-up tasks are only created once the origin facility
    // acknowledges (see the next test) -- the closed-loop point being
    // tested here is that they do NOT exist yet.
    expect(referral.followUpTasks.length).toBe(0);

    await context.close();
  });

  test("referring doctor acknowledges the back-referral and assigns follow-up", async ({ browser }) => {
    const { context, page } = await loginAs(browser, DEMO_USER_EMAILS.doctor);
    await page.goto(`/referrals/${referralId}`);

    await page.getByRole("button", { name: "Acknowledge back-referral" }).click();
    await page.getByTestId("follow-up-assignee").selectOption({ label: "Sangeeta ASHA Worker" });
    await page.getByTestId("acknowledge-back-referral").click();

    await expect(page.getByText("Follow-up & newborn continuity")).toBeVisible();
    const referral = await getReferral(context.request, referralId);
    expect(referral.status).toBe("FOLLOW_UP_PENDING");
    expect(referral.backReferral.acknowledgedAt).toBeTruthy();
    expect(referral.followUpTasks.length).toBeGreaterThanOrEqual(1);
    expect(referral.followUpTasks.every((t: { status: string }) => t.status === "PENDING")).toBe(true);

    await context.close();
  });

  test("follow-up worker completes every task and the referral auto-closes", async ({ browser }) => {
    const { context, page } = await loginAs(browser, DEMO_USER_EMAILS.worker);

    const countPending = async () =>
      (await getReferral(context.request, referralId)).followUpTasks.filter(
        (t: { status: string }) => t.status !== "COMPLETED"
      ).length;

    let pending = await countPending();
    expect(pending).toBeGreaterThan(0);

    while (pending > 0) {
      await page.goto(`/referrals/${referralId}`);
      await page.getByRole("button", { name: "Mark complete" }).first().click();
      await expect(page.getByText("Follow-up marked complete.")).toBeVisible();
      pending = await countPending();
    }

    const referral = await getReferral(context.request, referralId);
    expect(referral.status).toBe("CLOSED");
    expect(referral.operationalStatus).toBe("CLOSED");

    await context.close();
  });
});
