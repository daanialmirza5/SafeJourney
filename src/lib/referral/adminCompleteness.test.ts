import { describe, it, expect } from "vitest";
import { computeAdministrativeReadiness, buildDefaultAdminTasks, getIncompleteAdminTasks } from "./adminCompleteness";

describe("Administrative Continuity Engine", () => {
  it("returns 100% when there are no applicable tasks", () => {
    expect(computeAdministrativeReadiness([])).toBe(100);
    expect(computeAdministrativeReadiness([{ status: "NOT_APPLICABLE" }])).toBe(100);
  });

  it("excludes NOT_APPLICABLE tasks from the denominator", () => {
    const readiness = computeAdministrativeReadiness([
      { status: "COMPLETE" },
      { status: "NOT_APPLICABLE" },
      { status: "NOT_APPLICABLE" },
    ]);
    expect(readiness).toBe(100);
  });

  it("computes the correct percentage for a mix of statuses", () => {
    const readiness = computeAdministrativeReadiness([
      { status: "COMPLETE" },
      { status: "COMPLETE" },
      { status: "PENDING" },
      { status: "NEEDS_REVIEW" },
    ]);
    expect(readiness).toBe(50);
  });

  it("seeds transport and birth tasks as NOT_APPLICABLE when not relevant", () => {
    const tasks = buildDefaultAdminTasks({ transportRequired: false, hasNewbornCase: false });
    expect(tasks.find((t) => t.title === "Transport documentation")?.status).toBe("NOT_APPLICABLE");
    expect(tasks.find((t) => t.title === "Birth documentation")?.status).toBe("NOT_APPLICABLE");
  });

  it("seeds transport and birth tasks as PENDING when relevant", () => {
    const tasks = buildDefaultAdminTasks({ transportRequired: true, hasNewbornCase: true });
    expect(tasks.find((t) => t.title === "Transport documentation")?.status).toBe("PENDING");
    expect(tasks.find((t) => t.title === "Birth documentation")?.status).toBe("PENDING");
  });
});

describe("getIncompleteAdminTasks (discharge-time visibility, not a blocker)", () => {
  it("returns only PENDING/NEEDS_REVIEW tasks, excluding COMPLETE and NOT_APPLICABLE", () => {
    const tasks = [
      { title: "a", status: "COMPLETE" as const },
      { title: "b", status: "PENDING" as const },
      { title: "c", status: "NEEDS_REVIEW" as const },
      { title: "d", status: "NOT_APPLICABLE" as const },
    ];
    expect(getIncompleteAdminTasks(tasks).map((t) => t.title)).toEqual(["b", "c"]);
  });

  it("returns an empty array when every applicable task is complete", () => {
    const tasks = [
      { status: "COMPLETE" as const },
      { status: "NOT_APPLICABLE" as const },
    ];
    expect(getIncompleteAdminTasks(tasks)).toEqual([]);
  });
});
