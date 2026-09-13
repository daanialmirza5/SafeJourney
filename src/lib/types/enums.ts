/**
 * SQLite has no native enum type, so Prisma models store these as plain
 * String columns (see prisma/schema.prisma comments). These literal union
 * types are the single source of truth for allowed values everywhere else
 * in the app (zod schemas, UI, services). Keep in sync with the schema.
 */

export type RoleName = "DOCTOR" | "COORDINATOR" | "PATIENT" | "CAREGIVER" | "FOLLOWUP" | "ADMIN";
export const ROLE_NAMES: RoleName[] = ["DOCTOR", "COORDINATOR", "PATIENT", "CAREGIVER", "FOLLOWUP", "ADMIN"];

export type FacilityType = "REFERRING" | "RECEIVING" | "BOTH";

export type ReferralPriority = "ROUTINE" | "URGENT" | "EMERGENCY";

export type TransportStatus =
  | "NOT_REQUESTED"
  | "REQUESTED"
  | "ASSIGNED"
  | "EN_ROUTE_TO_PICKUP"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "CANCELLED";

export type DocumentType =
  | "REFERRAL_NOTE"
  | "IDENTITY_DOCUMENT"
  | "HOSPITAL_DOCUMENT"
  | "ADMINISTRATIVE_FORM"
  | "TRANSPORT_DOCUMENT"
  | "DISCHARGE_DOCUMENT"
  | "BIRTH_DOCUMENT"
  | "BILL_RECEIPT"
  | "ENTITLEMENT_APPLICATION"
  | "UNKNOWN";

export type DocumentStatus = "UPLOADED" | "EXTRACTED" | "CONFIRMED" | "REJECTED";

export type BenefitResult = "POTENTIALLY_APPLICABLE" | "NOT_APPLICABLE" | "NEEDS_VERIFICATION";

export type BenefitRuleStatus = "ACTIVE" | "INACTIVE";

export type AdminTaskStatus = "COMPLETE" | "PENDING" | "NEEDS_REVIEW" | "NOT_APPLICABLE";

export type FollowUpStatus = "PENDING" | "DUE" | "OVERDUE" | "COMPLETED" | "CANCELLED";

export type NotificationCategory = "REFERRAL" | "TRANSPORT" | "DOCUMENT" | "ADMINISTRATIVE" | "FOLLOW_UP" | "SYSTEM";

export type CaregiverPermission = "VIEW_ONLY" | "DOCUMENT_HELP" | "FULL_ADMINISTRATIVE_ASSISTANCE";

export type ConsentScope = "RECEIVING_FACILITY" | "CAREGIVER" | "FOLLOW_UP_WORKER" | "COORDINATOR";

export const RESCUE_STATUS_LABELS: Record<string, string> = {
  ON_TRACK: "On track",
  ACTION_REQUIRED: "Action required",
  STUCK: "Stuck",
  CLOSED: "Closed",
};
