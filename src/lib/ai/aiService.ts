import { isClinicalQuestion, CLINICAL_REFUSAL_MESSAGE } from "@/lib/ai/safety";
import { searchKnowledgeBase, type KnowledgeDoc } from "@/lib/ai/knowledgeBase";

/**
 * AI provider abstraction (spec sections 41-42). The app must run fully
 * without any paid AI credentials -- AI_PROVIDER=demo (the default) uses a
 * deterministic, offline implementation for every method below. When
 * AI_API_KEY is configured for a real provider, swap the `demo` adapter for
 * a real one behind this same interface; no call site changes.
 */

export interface DocumentExtractionResult {
  documentType: string;
  fields: Record<string, string>;
  confidence: number;
  warnings: string[];
}

export interface AdminAnswer {
  answer: string;
  citations: { title: string; source: string; sourceUrl: string; lastVerified: string }[];
  refused: boolean;
}

function isDemoMode(): boolean {
  return (process.env.AI_PROVIDER ?? "demo") === "demo" || !process.env.AI_API_KEY;
}

export const aiService = {
  isDemoMode,

  /** Answers an administrative/coordination question. Refuses clinical
   * questions per the safety boundary, and always cites configured
   * internal sources for benefit-related answers. */
  async answerAdminQuestion(question: string): Promise<AdminAnswer> {
    if (isClinicalQuestion(question)) {
      return { answer: CLINICAL_REFUSAL_MESSAGE, citations: [], refused: true };
    }

    const docs = searchKnowledgeBase(question);
    if (docs.length === 0) {
      return {
        answer:
          "I can help with referral status, documents, transport, administrative tasks and benefit pathways. Could you rephrase your question around one of those topics?",
        citations: [],
        refused: false,
      };
    }

    const summary = docs.map((d: KnowledgeDoc) => d.content).join(" ");
    return {
      answer: `${summary} Please verify current details with the relevant facility or authority before relying on this.`,
      citations: docs.map((d) => ({
        title: d.title,
        source: d.source,
        sourceUrl: d.sourceUrl,
        lastVerified: d.lastVerified,
      })),
      refused: false,
    };
  },

  /** Generates the standard set of billing-desk questions a family can ask
   * (spec section 20). Never accuses a facility of wrongdoing. */
  generateAdminQuestions(): string[] {
    return [
      "Is this expense covered under an applicable government scheme or insurance?",
      "Is an itemized receipt available for this bill?",
      "What supporting documents are required for reimbursement?",
      "Is there a government entitlement that may apply to this admission?",
      "What documentation should our family retain going forward?",
    ];
  },

  /** Produces a plain-language, editable back-referral summary from
   * structured referral data. Deterministic by design -- never silently
   * alters canonical data; the coordinator must confirm before sending. */
  generateHandoffSummary(input: {
    referralCode: string;
    patientPseudonym: string;
    referringFacility: string;
    receivingFacility: string;
    dischargedAt: string;
    pendingAdminItems: string[];
  }): string {
    const pending =
      input.pendingAdminItems.length > 0
        ? `Pending administrative items: ${input.pendingAdminItems.join(", ")}.`
        : "No pending administrative items.";
    return [
      `Referral ${input.referralCode} for ${input.patientPseudonym} is being handed back from ${input.receivingFacility} to ${input.referringFacility}.`,
      `Discharge recorded on ${input.dischargedAt}.`,
      pending,
      "This summary is administrative only and does not contain clinical recommendations. Please review and edit before sending.",
    ].join(" ");
  },

  /** Demo-mode translation: returns the source text with a clear label.
   * Static UI strings are localized via i18n dictionaries, not this
   * function -- this is only for ad hoc conversational content. */
  async translate(text: string, targetLanguage: string): Promise<string> {
    if (targetLanguage === "en") return text;
    return `${text} \n\n[Demo mode: live translation requires a configured AI provider. Showing original text.]`;
  },

  /** Summarizes free-text administrative content (e.g. an uploaded form's
   * extracted text) into a short plain-language explanation. */
  summarizeAdminContent(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length <= 220) return trimmed;
    return `${trimmed.slice(0, 217)}...`;
  },
};
