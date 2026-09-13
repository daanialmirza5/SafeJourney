/**
 * Deterministic Benefit / Entitlement Rule Engine (spec sections 18-19).
 *
 * This engine NEVER relies on an LLM to determine eligibility. It only
 * evaluates configured, structured rules against structured case context.
 * The result is always framed as "potentially applicable" / "needs
 * verification" / "not applicable" -- never a legal or financial
 * confirmation of eligibility. Every result must be reviewed by the family
 * or facility staff against the authoritative source.
 */

export type BenefitResult = "POTENTIALLY_APPLICABLE" | "NOT_APPLICABLE" | "NEEDS_VERIFICATION";

export interface BenefitConditions {
  /** Empty/undefined = applies in any state. */
  applicableStates?: string[];
  requiresNewbornCase?: boolean;
  requiresTransport?: boolean;
}

export interface BenefitCaseContext {
  state: string;
  transportRequired: boolean;
  hasNewbornCase: boolean;
  confirmedDocumentTypes: string[];
}

export interface BenefitEvaluationResult {
  result: BenefitResult;
  reason: string;
  requiredDocuments: string[];
  nextActions: string[];
}

export function evaluateBenefit(
  context: BenefitCaseContext,
  ruleStatus: "ACTIVE" | "INACTIVE",
  conditions: BenefitConditions,
  documentRequirements: string[]
): BenefitEvaluationResult {
  if (ruleStatus === "INACTIVE") {
    return {
      result: "NOT_APPLICABLE",
      reason: "This pathway is not currently enabled in the configured rule set.",
      requiredDocuments: documentRequirements,
      nextActions: [],
    };
  }

  if (conditions.applicableStates && conditions.applicableStates.length > 0) {
    if (!conditions.applicableStates.includes(context.state)) {
      return {
        result: "NOT_APPLICABLE",
        reason: `Based on configured rules, this pathway applies in ${conditions.applicableStates.join(", ")}, not ${context.state}.`,
        requiredDocuments: documentRequirements,
        nextActions: [],
      };
    }
  }

  if (conditions.requiresNewbornCase && !context.hasNewbornCase) {
    return {
      result: "NOT_APPLICABLE",
      reason: "Based on configured rules, this pathway requires a linked newborn case.",
      requiredDocuments: documentRequirements,
      nextActions: [],
    };
  }

  if (conditions.requiresTransport && !context.transportRequired) {
    return {
      result: "NOT_APPLICABLE",
      reason: "Based on configured rules, this pathway requires a transport-linked referral.",
      requiredDocuments: documentRequirements,
      nextActions: [],
    };
  }

  const missingDocuments = documentRequirements.filter(
    (doc) => !context.confirmedDocumentTypes.includes(doc)
  );

  const nextActions: string[] = missingDocuments.map((doc) => `Provide and confirm: ${doc}`);
  nextActions.push("Verify current eligibility with the relevant facility administration or authority.");

  return {
    result: "POTENTIALLY_APPLICABLE",
    reason: "Based on configured facility and journey information, this pathway may be relevant. Review is required before relying on it.",
    requiredDocuments: missingDocuments,
    nextActions,
  };
}
