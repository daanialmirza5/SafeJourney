/**
 * AI safety boundary (spec sections 16 & 28). SafeJourney's AI copilot is
 * assistive and administrative-only. It must never diagnose, interpret
 * clinical findings, recommend treatment, prescribe, calculate risk, or
 * make/imply a referral decision. This module is the single choke point
 * every AI-facing route must pass user text through before generating a
 * response.
 */

const CLINICAL_PATTERNS: RegExp[] = [
  /\bdiagnos/i,
  /\btreat(ment|ing)?\b/i,
  /\bprescri/i,
  /\bmedicin|medication|drug dose|dosage\b/i,
  /\bhigh.?risk\b/i,
  /\brisk (score|level|of)\b/i,
  /\bsymptom/i,
  /\binfection\b/i,
  /\bshould (i|we|she) (take|get|do)\b/i,
  /\bis (it|this) (safe|dangerous|normal|serious)\b/i,
  /\bwhat.*(disease|condition|illness)\b/i,
  /\bblood pressure|bp reading|fetal heart|hemoglobin level\b/i,
];

export function isClinicalQuestion(text: string): boolean {
  return CLINICAL_PATTERNS.some((pattern) => pattern.test(text));
}

export const CLINICAL_REFUSAL_MESSAGE =
  "I can help with administrative coordination, documents and referral information, but I cannot provide medical advice. Please speak with your doctor or care team about clinical questions.";

export const CLINICAL_DOCUMENT_NOTICE =
  "This document contains clinical information. SafeJourney does not interpret or provide medical advice. I can help organize the document or identify administrative information within it.";
