export type AdminTaskStatus = "COMPLETE" | "PENDING" | "NEEDS_REVIEW" | "NOT_APPLICABLE";

/** `status` is a plain `string` (not the narrower `AdminTaskStatus` union)
 * because Prisma's `AdministrativeTask.status` column is a plain string --
 * SQLite has no native enum type, same convention used throughout this
 * codebase (see e.g. `NewbornMilestoneRow` in newbornContinuity.ts). The
 * literal union above is the source of truth for authoring/tests. */
export interface AdminTaskLike {
  status: string;
}

/** Administrative Continuity Engine (spec section 17).
 * Readiness = complete tasks / applicable tasks. Tasks marked NOT_APPLICABLE
 * are excluded from the denominator entirely. */
export function computeAdministrativeReadiness(tasks: AdminTaskLike[]): number {
  const applicable = tasks.filter((t) => t.status !== "NOT_APPLICABLE");
  if (applicable.length === 0) return 100;
  const complete = applicable.filter((t) => t.status === "COMPLETE").length;
  return Math.round((complete / applicable.length) * 100);
}

/** Administrative tasks still open (not COMPLETE, not NOT_APPLICABLE) --
 * used to surface "incomplete administrative requirements" at discharge
 * time (spec: "Clear display of incomplete administrative requirements").
 * Display only -- this never blocks discharge, since that would require
 * inventing a clinical discharge criterion this platform doesn't have. */
export function getIncompleteAdminTasks<T extends AdminTaskLike>(tasks: T[]): T[] {
  return tasks.filter((t) => t.status !== "COMPLETE" && t.status !== "NOT_APPLICABLE");
}

export interface DefaultAdminTaskInput {
  transportRequired: boolean;
  hasNewbornCase: boolean;
}

/** The standard administrative checklist seeded onto every new referral
 * case. Categories mirror spec section 17. */
export function buildDefaultAdminTasks(input: DefaultAdminTaskInput): { title: string; category: string; status: AdminTaskStatus }[] {
  return [
    { title: "Referral documentation", category: "referral", status: "PENDING" },
    {
      title: "Transport documentation",
      category: "transport",
      status: input.transportRequired ? "PENDING" : "NOT_APPLICABLE",
    },
    { title: "Receiving facility acknowledgment", category: "referral", status: "PENDING" },
    { title: "Identity / admin documentation", category: "identity", status: "PENDING" },
    { title: "Financial / entitlement verification", category: "financial", status: "PENDING" },
    { title: "Benefit / claim application", category: "financial", status: "PENDING" },
    {
      title: "Birth documentation",
      category: "birth",
      status: input.hasNewbornCase ? "PENDING" : "NOT_APPLICABLE",
    },
    { title: "Discharge documentation", category: "discharge", status: "PENDING" },
    { title: "Follow-up handoff", category: "follow_up", status: "PENDING" },
  ];
}
