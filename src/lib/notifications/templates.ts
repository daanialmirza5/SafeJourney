import { db } from "@/lib/db";
import type { NotificationCategory } from "@/lib/types/enums";

/**
 * Editable notification copy (spec section 56 admin panel: "Notification
 * Templates"). Every notification send site references a fixed `key` from
 * this file's defaults; an admin can override the `title`/`body` at
 * runtime via the `NotificationTemplate` table without a deploy. If no
 * override row exists, the hard-coded default here is used -- the app
 * never depends on the table being seeded.
 *
 * `{{placeholder}}` tokens in a template are filled from the `vars` object
 * passed at send time; an admin editing a template can reuse or drop any
 * of the placeholders documented per key below.
 */

export interface NotificationTemplateDefault {
  key: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Documents which {{placeholders}} this template's body may reference. */
  placeholders: string[];
}

export const NOTIFICATION_TEMPLATE_DEFAULTS: NotificationTemplateDefault[] = [
  {
    key: "REFERRAL_CREATED_COORDINATOR",
    category: "REFERRAL",
    title: "New incoming referral",
    body: "Referral {{referralCode}} has been sent to your facility.",
    placeholders: ["referralCode"],
  },
  {
    key: "REFERRAL_ACCEPTED_DOCTOR",
    category: "REFERRAL",
    title: "Referral accepted",
    body: "{{facilityName}} accepted referral {{referralCode}}.",
    placeholders: ["facilityName", "referralCode"],
  },
  {
    key: "CLARIFICATION_REQUESTED_DOCTOR",
    category: "REFERRAL",
    title: "Clarification requested",
    body: "{{facilityName}} needs clarification on referral {{referralCode}}: {{note}}",
    placeholders: ["facilityName", "referralCode", "note"],
  },
  {
    key: "REFERRAL_DECLINED_DOCTOR",
    category: "REFERRAL",
    title: "Referral declined",
    body: "{{facilityName}} could not accept referral {{referralCode}}: {{reason}}. Please choose an alternate facility.",
    placeholders: ["facilityName", "referralCode", "reason"],
  },
  {
    key: "TRANSPORT_ASSIGNED_DOCTOR",
    category: "TRANSPORT",
    title: "Transport assigned",
    body: "Transport (demo mode) assigned for {{patientPseudonym}}, referral {{referralCode}}.",
    placeholders: ["patientPseudonym", "referralCode"],
  },
  {
    key: "PATIENT_ARRIVED_DOCTOR",
    category: "REFERRAL",
    title: "Patient arrived",
    body: "Patient has arrived at {{facilityName}} for referral {{referralCode}}.",
    placeholders: ["facilityName", "referralCode"],
  },
  {
    key: "PATIENT_DISCHARGED_DOCTOR",
    category: "REFERRAL",
    title: "Patient discharged",
    body: "Referral {{referralCode}} has been discharged from {{facilityName}}. Destination: {{destination}}.",
    placeholders: ["referralCode", "facilityName", "destination"],
  },
  {
    key: "BACK_REFERRAL_COMPLETED_DOCTOR",
    category: "FOLLOW_UP",
    title: "Back-referral received -- please acknowledge",
    body: "Referral {{referralCode}} has been back-referred to your facility. Please acknowledge receipt so follow-up can be assigned.",
    placeholders: ["referralCode"],
  },
  {
    key: "BACK_REFERRAL_FAMILY_NOTICE",
    category: "FOLLOW_UP",
    title: "Discharge and follow-up information ready",
    body: "Discharge and follow-up information for referral {{referralCode}} is now available.",
    placeholders: ["referralCode"],
  },
  {
    key: "BACK_REFERRAL_ACKNOWLEDGED_COORDINATOR",
    category: "FOLLOW_UP",
    title: "Back-referral acknowledged",
    body: "The origin facility has acknowledged the back-referral for {{referralCode}} and follow-up has been assigned.",
    placeholders: ["referralCode"],
  },
  {
    key: "FOLLOW_UP_ASSIGNED_WORKER",
    category: "FOLLOW_UP",
    title: "New follow-up assigned",
    body: "You have a new follow-up handoff for referral {{referralCode}}.",
    placeholders: ["referralCode"],
  },
  {
    key: "REFERRAL_CLOSED_DOCTOR",
    category: "FOLLOW_UP",
    title: "Referral closed",
    body: "Referral {{referralCode}} is now closed. The closed-loop journey is complete.",
    placeholders: ["referralCode"],
  },
  {
    key: "RESCUE_ESCALATION_COORDINATOR",
    category: "REFERRAL",
    title: "Referral needs attention",
    body: "Referral {{referralCode}} has been flagged by the Referral Rescue Engine and needs your attention: {{reason}}",
    placeholders: ["referralCode", "reason"],
  },
  {
    key: "CAREGIVER_ADDED",
    category: "SYSTEM",
    title: "You've been added as a caregiver",
    body: "You now have {{permission}} access to a SafeJourney case.",
    placeholders: ["permission"],
  },
];

const DEFAULTS_BY_KEY = new Map(NOTIFICATION_TEMPLATE_DEFAULTS.map((d) => [d.key, d]));

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => vars[name] ?? match);
}

/** Resolves a notification's title/body for sending: DB override if one
 * exists for `key`, otherwise the compiled-in default. Always
 * placeholder-interpolated with `vars`. */
export async function renderNotificationTemplate(
  key: string,
  vars: Record<string, string>
): Promise<{ title: string; body: string; category: NotificationCategory }> {
  const fallback = DEFAULTS_BY_KEY.get(key);
  if (!fallback) {
    throw new Error(`Unknown notification template key: ${key}`);
  }
  const override = await db.notificationTemplate.findUnique({ where: { key } });
  const title = override?.title ?? fallback.title;
  const body = override?.body ?? fallback.body;
  return {
    title: interpolate(title, vars),
    body: interpolate(body, vars),
    category: (override?.category as NotificationCategory | undefined) ?? fallback.category,
  };
}
