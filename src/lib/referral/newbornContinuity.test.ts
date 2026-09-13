import { describe, it, expect } from "vitest";
import {
  buildNewbornContinuityTasks,
  canCompleteFollowUpTask,
  canSkipFollowUpTask,
  deriveFollowUpTaskState,
  validateMilestoneTemplateInput,
  CONFIGURABLE_MILESTONE_CATEGORIES,
  NEWBORN_CONTINUITY_SCHEDULE,
} from "./newbornContinuity";

describe("newborn continuity schedule", () => {
  it("spans roughly six to eight months from the base date", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const tasks = buildNewbornContinuityTasks(base);
    const lastDueDate = tasks[tasks.length - 1].dueDate;
    const daySpan = (lastDueDate.getTime() - base.getTime()) / (24 * 60 * 60 * 1000);
    expect(daySpan).toBeGreaterThanOrEqual(180);
    expect(daySpan).toBeLessThanOrEqual(244);
  });

  it("produces one task per schedule entry, each due after the base date", () => {
    const base = new Date("2026-03-15T00:00:00Z");
    const tasks = buildNewbornContinuityTasks(base);
    expect(tasks).toHaveLength(NEWBORN_CONTINUITY_SCHEDULE.length);
    for (const task of tasks) {
      expect(task.dueDate.getTime()).toBeGreaterThan(base.getTime());
    }
  });

  it("is deterministic -- same base date always yields the same due dates", () => {
    const base = new Date("2026-06-01T00:00:00Z");
    const a = buildNewbornContinuityTasks(base);
    const b = buildNewbornContinuityTasks(base);
    expect(a.map((t) => t.dueDate.getTime())).toEqual(b.map((t) => t.dueDate.getTime()));
  });

  it("includes a final continuity review milestone that is the last task due", () => {
    const tasks = buildNewbornContinuityTasks(new Date("2026-01-01T00:00:00Z"));
    const review = tasks.find((t) => t.category === "CONTINUITY_REVIEW");
    expect(review).toBeDefined();
    const maxDueTime = Math.max(...tasks.map((t) => t.dueDate.getTime()));
    expect(review!.dueDate.getTime()).toBe(maxDueTime);
  });

  it("covers immunization reminders and growth checks without any clinical scoring", () => {
    const categories = NEWBORN_CONTINUITY_SCHEDULE.map((m) => m.category);
    expect(categories).toContain("IMMUNIZATION_REMINDER");
    expect(categories).toContain("GROWTH_CHECK");
    expect(categories).toContain("HOME_VISIT");
    // Every description is a coordination/confirmation instruction, never a
    // clinical directive -- guard against regressions that slip in
    // diagnostic or prescriptive language.
    const bannedWords = /diagnos|prescri|dosage|treatment recommendation/i;
    for (const milestone of NEWBORN_CONTINUITY_SCHEDULE) {
      expect(milestone.description).not.toMatch(bannedWords);
      expect(milestone.title).not.toMatch(bannedWords);
    }
  });
});

describe("canCompleteFollowUpTask (role-based visibility/actions)", () => {
  const openTask = { status: "PENDING", assignedToId: "worker-1" };
  const unassignedOpenTask = { status: "PENDING", assignedToId: null };
  const completedTask = { status: "COMPLETED", assignedToId: "worker-1" };

  it("lets a COORDINATOR complete any open task, assigned or not", () => {
    expect(canCompleteFollowUpTask(openTask, "COORDINATOR", "someone-else")).toBe(true);
    expect(canCompleteFollowUpTask(unassignedOpenTask, "COORDINATOR", "someone-else")).toBe(true);
  });

  it("lets an ADMIN complete any open task", () => {
    expect(canCompleteFollowUpTask(openTask, "ADMIN", "someone-else")).toBe(true);
  });

  it("lets a FOLLOWUP worker complete only their own assigned task", () => {
    expect(canCompleteFollowUpTask(openTask, "FOLLOWUP", "worker-1")).toBe(true);
    expect(canCompleteFollowUpTask(openTask, "FOLLOWUP", "worker-2")).toBe(false);
    expect(canCompleteFollowUpTask(unassignedOpenTask, "FOLLOWUP", "worker-1")).toBe(false);
  });

  it("refuses every other role (DOCTOR, PATIENT, CAREGIVER)", () => {
    expect(canCompleteFollowUpTask(openTask, "DOCTOR", "worker-1")).toBe(false);
    expect(canCompleteFollowUpTask(openTask, "PATIENT", "worker-1")).toBe(false);
    expect(canCompleteFollowUpTask(openTask, "CAREGIVER", "worker-1")).toBe(false);
  });

  it("refuses to complete a task that is already COMPLETED or CANCELLED, regardless of role", () => {
    expect(canCompleteFollowUpTask(completedTask, "ADMIN", "worker-1")).toBe(false);
    expect(canCompleteFollowUpTask({ status: "CANCELLED", assignedToId: "worker-1" }, "COORDINATOR", "worker-1")).toBe(false);
  });
});

describe("canSkipFollowUpTask (narrower than completion)", () => {
  it("lets COORDINATOR and ADMIN skip an open task", () => {
    expect(canSkipFollowUpTask({ status: "PENDING" }, "COORDINATOR")).toBe(true);
    expect(canSkipFollowUpTask({ status: "OVERDUE" }, "ADMIN")).toBe(true);
  });

  it("does not let a FOLLOWUP worker skip a task, even one assigned to them", () => {
    expect(canSkipFollowUpTask({ status: "PENDING" }, "FOLLOWUP")).toBe(false);
  });

  it("refuses every other role", () => {
    expect(canSkipFollowUpTask({ status: "PENDING" }, "DOCTOR")).toBe(false);
    expect(canSkipFollowUpTask({ status: "PENDING" }, "PATIENT")).toBe(false);
  });

  it("refuses to skip a task that is already COMPLETED or CANCELLED", () => {
    expect(canSkipFollowUpTask({ status: "COMPLETED" }, "ADMIN")).toBe(false);
    expect(canSkipFollowUpTask({ status: "CANCELLED" }, "ADMIN")).toBe(false);
  });
});

describe("validateMilestoneTemplateInput (safe validation for milestone dates/categories)", () => {
  const valid = { category: "HOME_VISIT", title: "Visit", description: "Confirm a home visit took place.", offsetDays: 30 };

  it("accepts a well-formed milestone", () => {
    expect(validateMilestoneTemplateInput(valid).valid).toBe(true);
  });

  it("rejects a category outside the four configurable ones -- DISCHARGE_HANDOFF/ADMIN_FOLLOW_UP are system-only", () => {
    expect(validateMilestoneTemplateInput({ ...valid, category: "DISCHARGE_HANDOFF" }).valid).toBe(false);
    expect(validateMilestoneTemplateInput({ ...valid, category: "NOT_A_REAL_CATEGORY" }).valid).toBe(false);
  });

  it("accepts every category in CONFIGURABLE_MILESTONE_CATEGORIES", () => {
    for (const category of CONFIGURABLE_MILESTONE_CATEGORIES) {
      expect(validateMilestoneTemplateInput({ ...valid, category }).valid).toBe(true);
    }
  });

  it("rejects an empty title or description", () => {
    expect(validateMilestoneTemplateInput({ ...valid, title: "" }).valid).toBe(false);
    expect(validateMilestoneTemplateInput({ ...valid, description: "" }).valid).toBe(false);
  });

  it("rejects an offset that is zero, negative, non-integer, or absurdly large", () => {
    expect(validateMilestoneTemplateInput({ ...valid, offsetDays: 0 }).valid).toBe(false);
    expect(validateMilestoneTemplateInput({ ...valid, offsetDays: -5 }).valid).toBe(false);
    expect(validateMilestoneTemplateInput({ ...valid, offsetDays: 30.5 }).valid).toBe(false);
    expect(validateMilestoneTemplateInput({ ...valid, offsetDays: 100000 }).valid).toBe(false);
  });

  it("accepts the boundary values 1 and 1000 days", () => {
    expect(validateMilestoneTemplateInput({ ...valid, offsetDays: 1 }).valid).toBe(true);
    expect(validateMilestoneTemplateInput({ ...valid, offsetDays: 1000 }).valid).toBe(true);
  });

  it("returns a human-readable error message for each violation", () => {
    const result = validateMilestoneTemplateInput({ category: "BAD", title: "", description: "", offsetDays: -1 });
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.every((e) => typeof e === "string" && e.length > 0)).toBe(true);
  });
});

describe("deriveFollowUpTaskState (completed/upcoming/overdue/skipped)", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const future = new Date("2026-07-01T00:00:00Z");
  const past = new Date("2026-05-01T00:00:00Z");

  it("is COMPLETED whenever status is COMPLETED, regardless of due date", () => {
    expect(deriveFollowUpTaskState({ status: "COMPLETED", dueDate: past }, now)).toBe("COMPLETED");
    expect(deriveFollowUpTaskState({ status: "COMPLETED", dueDate: future }, now)).toBe("COMPLETED");
  });

  it("is SKIPPED whenever status is CANCELLED, regardless of due date", () => {
    expect(deriveFollowUpTaskState({ status: "CANCELLED", dueDate: past }, now)).toBe("SKIPPED");
    expect(deriveFollowUpTaskState({ status: "CANCELLED", dueDate: future }, now)).toBe("SKIPPED");
  });

  it("is OVERDUE when still open and the due date has passed", () => {
    expect(deriveFollowUpTaskState({ status: "PENDING", dueDate: past }, now)).toBe("OVERDUE");
    expect(deriveFollowUpTaskState({ status: "OVERDUE", dueDate: past }, now)).toBe("OVERDUE");
  });

  it("is UPCOMING when still open and the due date has not yet passed", () => {
    expect(deriveFollowUpTaskState({ status: "PENDING", dueDate: future }, now)).toBe("UPCOMING");
  });

  it("defaults `now` to the current time when not passed", () => {
    const state = deriveFollowUpTaskState({ status: "PENDING", dueDate: new Date(Date.now() + 100000) });
    expect(state).toBe("UPCOMING");
  });

  it("same-day due dates: a task due earlier today is OVERDUE, one due later today is UPCOMING", () => {
    const nowMidday = new Date("2026-06-01T12:00:00Z");
    const earlierToday = new Date("2026-06-01T06:00:00Z");
    const laterToday = new Date("2026-06-01T18:00:00Z");
    expect(deriveFollowUpTaskState({ status: "PENDING", dueDate: earlierToday }, nowMidday)).toBe("OVERDUE");
    expect(deriveFollowUpTaskState({ status: "PENDING", dueDate: laterToday }, nowMidday)).toBe("UPCOMING");
  });

  it("a due date exactly equal to now is not yet overdue (strict less-than)", () => {
    const instant = new Date("2026-06-01T12:00:00Z");
    expect(deriveFollowUpTaskState({ status: "PENDING", dueDate: instant }, instant)).toBe("UPCOMING");
  });

  it("timezone boundary: comparisons use absolute instants, not local calendar days", () => {
    // 23:30 UTC on May 31 is already "tomorrow" in UTC+1 but still "today"
    // in UTC-5 -- deriveFollowUpTaskState must not care about either local
    // interpretation, only the absolute instant ordering against `now`.
    const dueLateMay31Utc = new Date("2026-05-31T23:30:00Z");
    const nowJustAfterMidnightJune1Utc = new Date("2026-06-01T00:15:00Z");
    expect(deriveFollowUpTaskState({ status: "PENDING", dueDate: dueLateMay31Utc }, nowJustAfterMidnightJune1Utc)).toBe("OVERDUE");
  });

  it("an invalid due date (NaN) never claims OVERDUE, since the comparison can't be trusted", () => {
    const invalidDate = new Date("not-a-real-date");
    expect(invalidDate.getTime()).toBeNaN();
    expect(deriveFollowUpTaskState({ status: "PENDING", dueDate: invalidDate }, now)).toBe("UPCOMING");
  });

  it("a far-future due date always reads UPCOMING regardless of status flapping between PENDING/OVERDUE storage values", () => {
    expect(deriveFollowUpTaskState({ status: "OVERDUE", dueDate: future }, now)).toBe("UPCOMING");
  });

  it("caregiver visibility contract: PatientJourney shows only UPCOMING/OVERDUE, never COMPLETED or SKIPPED", () => {
    // PatientJourney.tsx filters with `["UPCOMING", "OVERDUE"].includes(...)`
    // -- this pins that contract so a change to deriveFollowUpTaskState's
    // possible return values can't silently start leaking a completed or
    // skipped (internal coordination decision) task into the caregiver view.
    const now = new Date("2026-06-01T00:00:00Z");
    const cases = [
      { status: "PENDING", dueDate: new Date("2026-07-01T00:00:00Z"), expectVisible: true },
      { status: "PENDING", dueDate: new Date("2026-05-01T00:00:00Z"), expectVisible: true }, // overdue
      { status: "COMPLETED", dueDate: new Date("2026-05-01T00:00:00Z"), expectVisible: false },
      { status: "CANCELLED", dueDate: new Date("2026-07-01T00:00:00Z"), expectVisible: false },
    ];
    for (const c of cases) {
      const visible = ["UPCOMING", "OVERDUE"].includes(deriveFollowUpTaskState(c, now));
      expect(visible).toBe(c.expectVisible);
    }
  });
});

describe("buildNewbornContinuityTasks with admin-configured templates", () => {
  it("orders tasks by offsetDays even when the input array is out of order", () => {
    const outOfOrder = [
      { offsetDays: 90, category: "GROWTH_CHECK", title: "Later", description: "d" },
      { offsetDays: 14, category: "HOME_VISIT", title: "Earlier", description: "d" },
    ];
    const tasks = buildNewbornContinuityTasks(new Date("2026-01-01T00:00:00Z"), outOfOrder);
    expect(tasks.map((t) => t.title)).toEqual(["Earlier", "Later"]);
  });

  it("reflects a shorter or longer admin-edited schedule, not just the shipped default", () => {
    const custom = [{ offsetDays: 21, category: "HOME_VISIT", title: "Custom-only milestone", description: "d" }];
    const tasks = buildNewbornContinuityTasks(new Date("2026-01-01T00:00:00Z"), custom);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Custom-only milestone");
  });
});
