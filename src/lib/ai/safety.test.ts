import { describe, it, expect } from "vitest";
import { isClinicalQuestion } from "./safety";

describe("AI safety boundary", () => {
  it("flags clinical questions the copilot must refuse", () => {
    const clinicalQuestions = [
      "Does my baby have an infection?",
      "Is this pregnancy high risk?",
      "Which medicine should I take for the pain?",
      "What treatment should I get for this condition?",
      "Should I take this medication now?",
      "Is it safe to travel at 8 months?",
    ];
    for (const q of clinicalQuestions) {
      expect(isClinicalQuestion(q)).toBe(true);
    }
  });

  it("allows administrative/coordination questions through", () => {
    const adminQuestions = [
      "What is my referral status?",
      "What documents are missing?",
      "What do I need to take with me?",
      "What does this administrative form mean?",
      "What should I ask the hospital billing desk?",
      "Is JSSK applicable to my case?",
    ];
    for (const q of adminQuestions) {
      expect(isClinicalQuestion(q)).toBe(false);
    }
  });
});
