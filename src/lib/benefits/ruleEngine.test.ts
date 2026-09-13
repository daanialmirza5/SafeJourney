import { describe, it, expect } from "vitest";
import { evaluateBenefit } from "./ruleEngine";

const baseContext = {
  state: "Maharashtra",
  transportRequired: true,
  hasNewbornCase: true,
  confirmedDocumentTypes: [] as string[],
};

describe("deterministic benefit rule engine", () => {
  it("never returns a confirmed/approved result -- only the three safe outcomes", () => {
    const result = evaluateBenefit(baseContext, "ACTIVE", {}, []);
    expect(["POTENTIALLY_APPLICABLE", "NOT_APPLICABLE", "NEEDS_VERIFICATION"]).toContain(result.result);
  });

  it("marks NOT_APPLICABLE when the rule is inactive", () => {
    const result = evaluateBenefit(baseContext, "INACTIVE", {}, []);
    expect(result.result).toBe("NOT_APPLICABLE");
  });

  it("marks NOT_APPLICABLE when the state doesn't match configured states", () => {
    const result = evaluateBenefit(baseContext, "ACTIVE", { applicableStates: ["Kerala"] }, []);
    expect(result.result).toBe("NOT_APPLICABLE");
  });

  it("marks NOT_APPLICABLE when a newborn case is required but absent", () => {
    const result = evaluateBenefit(
      { ...baseContext, hasNewbornCase: false },
      "ACTIVE",
      { requiresNewbornCase: true },
      []
    );
    expect(result.result).toBe("NOT_APPLICABLE");
  });

  it("marks NOT_APPLICABLE when transport is required but not present", () => {
    const result = evaluateBenefit(
      { ...baseContext, transportRequired: false },
      "ACTIVE",
      { requiresTransport: true },
      []
    );
    expect(result.result).toBe("NOT_APPLICABLE");
  });

  it("is POTENTIALLY_APPLICABLE with missing documents listed when conditions match", () => {
    const result = evaluateBenefit(baseContext, "ACTIVE", { applicableStates: ["Maharashtra"] }, [
      "Identity proof",
      "Discharge summary",
    ]);
    expect(result.result).toBe("POTENTIALLY_APPLICABLE");
    expect(result.requiredDocuments).toEqual(["Identity proof", "Discharge summary"]);
    expect(result.nextActions.some((a) => /verify current eligibility/i.test(a))).toBe(true);
  });

  it("excludes already-confirmed documents from the missing list", () => {
    const result = evaluateBenefit(
      { ...baseContext, confirmedDocumentTypes: ["Identity proof"] },
      "ACTIVE",
      {},
      ["Identity proof", "Discharge summary"]
    );
    expect(result.requiredDocuments).toEqual(["Discharge summary"]);
  });

  it("always requires verification language even when all documents are present", () => {
    const result = evaluateBenefit(
      { ...baseContext, confirmedDocumentTypes: ["Identity proof"] },
      "ACTIVE",
      {},
      ["Identity proof"]
    );
    expect(result.result).toBe("POTENTIALLY_APPLICABLE");
    expect(result.reason).toMatch(/review is required/i);
  });
});
