export type FollowUpTaskCategory =
  | "DISCHARGE_HANDOFF"
  | "ADMIN_FOLLOW_UP"
  | "HOME_VISIT"
  | "IMMUNIZATION_REMINDER"
  | "GROWTH_CHECK"
  | "CONTINUITY_REVIEW";

/** The categories an admin may assign to a configurable milestone.
 * DISCHARGE_HANDOFF and ADMIN_FOLLOW_UP are excluded -- those two are
 * always system-generated at back-referral time (see
 * referralService.ts::generateAndSendBackReferral), never part of the
 * admin-configurable newborn schedule. */
export const CONFIGURABLE_MILESTONE_CATEGORIES: FollowUpTaskCategory[] = [
  "HOME_VISIT",
  "IMMUNIZATION_REMINDER",
  "GROWTH_CHECK",
  "CONTINUITY_REVIEW",
];

export interface NewbornMilestoneInput {
  offsetDays: number;
  category: FollowUpTaskCategory;
  title: string;
  description: string;
}

/**
 * Newborn continuity journey (spec section "newborn six-to-eight-month
 * continuity"). This is a coordination/reminder schedule for the community
 * follow-up worker -- it tells them WHEN to check in with the family and
 * confirm a scheduled visit happened, never WHAT clinical care to give.
 * Nothing here diagnoses, prescribes, or scores risk.
 *
 * This constant is the shipped *default* schedule, used only to seed the
 * NewbornMilestoneTemplate table's initial rows (see prisma/seed.ts). Once
 * seeded, the database is the source of truth: an admin can add, edit, or
 * deactivate milestones through the admin panel, and every referral picks
 * up whatever is active in the table at the time of its back-referral --
 * this constant is never read again at runtime.
 */
export const NEWBORN_CONTINUITY_SCHEDULE: NewbornMilestoneInput[] = [
  {
    offsetDays: 14,
    category: "HOME_VISIT",
    title: "Newborn home visit (2 weeks)",
    description: "Confirm the newborn has been seen for a routine home visit and the caregiver has no unresolved coordination needs.",
  },
  {
    offsetDays: 45,
    category: "IMMUNIZATION_REMINDER",
    title: "Immunization schedule reminder (~6 weeks)",
    description: "Confirm the caregiver has attended, or has a scheduled appointment for, the child's next visit on the national immunization schedule.",
  },
  {
    offsetDays: 90,
    category: "GROWTH_CHECK",
    title: "Growth monitoring check-in (~3 months)",
    description: "Confirm a routine growth-monitoring visit has taken place or is scheduled.",
  },
  {
    offsetDays: 180,
    category: "IMMUNIZATION_REMINDER",
    title: "Immunization schedule reminder (~6 months)",
    description: "Confirm the caregiver has attended, or has a scheduled appointment for, the child's next visit on the national immunization schedule.",
  },
  {
    offsetDays: 240,
    category: "GROWTH_CHECK",
    title: "Growth & development check-in (~8 months)",
    description: "Confirm a routine growth-monitoring visit has taken place or is scheduled.",
  },
  {
    offsetDays: 240,
    category: "CONTINUITY_REVIEW",
    title: "Final continuity review & case closure readiness",
    description: "Review the referral and follow-up history with the family before the case is eligible to close. Confirm no coordination task -- administrative, transport, or follow-up -- remains outstanding.",
  },
];

/** Human-readable labels for every FollowUpTask.category value, including
 * the two non-newborn categories created at every back-referral
 * (DISCHARGE_HANDOFF, ADMIN_FOLLOW_UP) -- shared by any UI that lists
 * follow-up tasks, so the labels can't drift between screens. */
export const FOLLOW_UP_TASK_CATEGORY_LABELS: Record<string, string> = {
  DISCHARGE_HANDOFF: "Discharge handoff",
  ADMIN_FOLLOW_UP: "Administrative follow-up",
  HOME_VISIT: "Home visit",
  IMMUNIZATION_REMINDER: "Immunization reminder",
  GROWTH_CHECK: "Growth check-in",
  CONTINUITY_REVIEW: "Continuity review",
};

/** Whether a given user is permitted to complete a follow-up task from the
 * referral detail page's Follow-up & newborn continuity panel. Extracted
 * as a pure function so the role-based visibility rule is unit-testable
 * without rendering a component: COORDINATOR and ADMIN may complete any
 * open task; a FOLLOWUP worker may only complete tasks assigned to them;
 * every other role, and every already-closed task, is refused regardless
 * of who's asking. */
export function canCompleteFollowUpTask(
  task: { status: string; assignedToId: string | null },
  role: string,
  userId: string
): boolean {
  const isOpen = ["PENDING", "DUE", "OVERDUE"].includes(task.status);
  if (!isOpen) return false;
  if (role === "COORDINATOR" || role === "ADMIN") return true;
  if (role === "FOLLOWUP") return task.assignedToId === userId;
  return false;
}

/** Whether a given user may mark a follow-up task "skipped" (status
 * CANCELLED, e.g. the family moved away, or a milestone genuinely doesn't
 * apply). Deliberately narrower than completion: only COORDINATOR/ADMIN
 * can skip a task -- a FOLLOWUP worker completes their own assignments but
 * does not get to unilaterally decide one no longer applies. */
export function canSkipFollowUpTask(task: { status: string }, role: string): boolean {
  const isOpen = ["PENDING", "DUE", "OVERDUE"].includes(task.status);
  if (!isOpen) return false;
  return role === "COORDINATOR" || role === "ADMIN";
}

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 1000;
const MIN_OFFSET_DAYS = 1;
const MAX_OFFSET_DAYS = 1000;

export interface MilestoneTemplateValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validates admin-submitted milestone template input before it's
 * persisted. Pure and side-effect-free so it can run both in the API
 * route (server-authoritative) and, if useful later, in a client form.
 * This only validates shape/bounds -- category, title length, description
 * length, and a sane offset-day range -- never clinical content; there is
 * no such thing as a "medically valid" offset here, only an
 * administratively sane one. */
export function validateMilestoneTemplateInput(input: {
  category: string;
  title: string;
  description: string;
  offsetDays: number;
}): MilestoneTemplateValidationResult {
  const errors: string[] = [];

  if (!CONFIGURABLE_MILESTONE_CATEGORIES.includes(input.category as FollowUpTaskCategory)) {
    errors.push(`Category must be one of: ${CONFIGURABLE_MILESTONE_CATEGORIES.join(", ")}.`);
  }
  if (!input.title || input.title.trim().length === 0) {
    errors.push("Title is required.");
  } else if (input.title.length > TITLE_MAX_LENGTH) {
    errors.push(`Title must be ${TITLE_MAX_LENGTH} characters or fewer.`);
  }
  if (!input.description || input.description.trim().length === 0) {
    errors.push("Description is required.");
  } else if (input.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.push(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`);
  }
  if (!Number.isInteger(input.offsetDays) || input.offsetDays < MIN_OFFSET_DAYS || input.offsetDays > MAX_OFFSET_DAYS) {
    errors.push(`Offset must be a whole number of days between ${MIN_OFFSET_DAYS} and ${MAX_OFFSET_DAYS}.`);
  }

  return { valid: errors.length === 0, errors };
}

export type FollowUpTaskDisplayState = "COMPLETED" | "SKIPPED" | "OVERDUE" | "UPCOMING";

/** Derives the one state a follow-up task shows as in the UI (spec
 * section 30: completed/upcoming/overdue/skipped), from its stored status
 * and due date. Pure and deterministic given `now` so it's testable
 * without a clock or a component -- both FollowUpPanel and PatientJourney
 * use it so the two views can never disagree about what "overdue" means. */
export function deriveFollowUpTaskState(task: { status: string; dueDate: Date }, now: Date = new Date()): FollowUpTaskDisplayState {
  if (task.status === "COMPLETED") return "COMPLETED";
  if (task.status === "CANCELLED") return "SKIPPED";
  if (task.dueDate < now) return "OVERDUE";
  return "UPCOMING";
}

/** A milestone template as read back from the database: same shape as
 * NewbornMilestoneInput, but `category` widens to `string` since that's
 * what a Prisma row actually gives us (SQLite has no native enum -- see
 * the schema's category comment) rather than the narrower literal union. */
export interface NewbornMilestoneRow {
  offsetDays: number;
  category: string;
  title: string;
  description: string;
}

export interface NewbornMilestoneTask extends NewbornMilestoneRow {
  dueDate: Date;
}

/** Instantiates a milestone schedule against a base date (normally the
 * referral's back-referral / discharge-handoff timestamp). Pure and
 * deterministic -- no randomness, no I/O -- so the caller (normally
 * referralService.ts, passing whatever is currently active in the
 * NewbornMilestoneTemplate table) just persists what this returns. Sorts
 * by offsetDays first since admin-edited templates aren't guaranteed to
 * come back from the database in schedule order. Defaults to the shipped
 * NEWBORN_CONTINUITY_SCHEDULE only so this function (and its tests) work
 * standalone without a database. */
export function buildNewbornContinuityTasks(
  baseDate: Date,
  templates: NewbornMilestoneRow[] = NEWBORN_CONTINUITY_SCHEDULE
): NewbornMilestoneTask[] {
  return [...templates]
    .sort((a, b) => a.offsetDays - b.offsetDays)
    .map((milestone) => ({
      ...milestone,
      dueDate: new Date(baseDate.getTime() + milestone.offsetDays * 24 * 60 * 60 * 1000),
    }));
}
