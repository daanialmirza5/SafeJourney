import { db } from "@/lib/db";
export { DEMO_USER_EMAILS, DEMO_PASSWORD } from "@/lib/demoAccounts";

/** System configuration (spec sections 13, 56, 57). Admins can override
 * select settings at runtime via SystemSetting rows; otherwise the
 * environment-variable default applies. */

export async function getAckTimeoutMinutes(): Promise<number> {
  const row = await db.systemSetting.findUnique({ where: { key: "REFERRAL_ACK_TIMEOUT_MINUTES" } });
  const value = row?.value ?? process.env.REFERRAL_ACK_TIMEOUT_MINUTES ?? "10";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

/** How many days after back-referral acknowledgment the near-term
 * maternal/administrative follow-up tasks (discharge handoff, admin
 * follow-up) fall due. This used to be hardcoded to 3 -- a single
 * universal schedule, unlike the newborn continuity milestones, which
 * have been admin-configurable since Stage 9's audit flagged the
 * inconsistency. Configurable the same way as the ack timeout. */
export async function getMaternalFollowUpDueDays(): Promise<number> {
  const row = await db.systemSetting.findUnique({ where: { key: "MATERNAL_FOLLOWUP_DUE_DAYS" } });
  const value = row?.value ?? process.env.MATERNAL_FOLLOWUP_DUE_DAYS ?? "3";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export function isDemoMode(): boolean {
  return (process.env.DEMO_MODE ?? "true") === "true";
}
