# 08. AI Architecture

## Provider abstraction

`src/lib/ai/aiService.ts` exposes a fixed set of methods (`answerAdminQuestion`, `generateAdminQuestions`,
`generateHandoffSummary`, `translate`, `summarizeAdminContent`) behind a single object, `aiService`. Every
route and component calls this object — none of them know whether a real LLM is configured.
`aiService.isDemoMode()` is true whenever `AI_PROVIDER=demo` (the default) or no `AI_API_KEY` is set. In
demo mode, every method is a deterministic, offline implementation — the app never depends on a paid API key
to function. Wiring a real provider means implementing the same five methods against a real API and
swapping the export; no call site changes.

The same pattern applies to OCR (`src/lib/ocr/ocrService.ts`, `OCR_PROVIDER`), notifications
(`src/lib/notifications/providers.ts`, `EMAIL_PROVIDER`/`WHATSAPP_PROVIDER`) and storage
(`src/lib/storage/storageService.ts`, `STORAGE_PROVIDER`).

## Safety boundary (the part that actually matters)

`src/lib/ai/safety.ts` is the single choke point every AI-facing code path must pass through:

```ts
export function isClinicalQuestion(text: string): boolean; // regex bank: diagnos*, treat*, prescri*,
                                                             // medication/dosage, "high risk", "is it safe",
                                                             // symptom, infection, blood pressure, etc.
export const CLINICAL_REFUSAL_MESSAGE = "I can help with administrative coordination, ... but I cannot
  provide medical advice. Please speak with your doctor or care team about clinical questions.";
```

`aiService.answerAdminQuestion()` checks this **before** doing anything else. If a question looks clinical,
the fixed refusal message is returned immediately — no knowledge-base lookup, no generation. This is
unit-tested in `src/lib/ai/safety.test.ts` against both clinical and administrative sample questions.

The AI copilot (floating widget, `src/components/layout/AiCopilot.tsx`) is explicitly scoped in its own
opening message: "I can help with referral status, documents, transport and benefit pathways -- I can't
give medical advice." It can never write to canonical data; it only answers questions and drafts editable
text (like the back-referral summary), which a human must confirm before it is saved.

## Document extraction safety

Document extraction (`ocrService.extractDocument`) never modifies canonical patient data directly — every
extraction is stored in `DocumentExtraction` as a *proposal*, and the document stays in `EXTRACTED` status
(not `CONFIRMED`) until a human reviews the fields in `DocumentsPanel.tsx` and clicks Confirm. A reject path
exists too, with a required reason, fully audited.

## Internal knowledge layer ("RAG", simplified)

`src/lib/ai/knowledgeBase.ts` holds a small, hand-curated set of structured summaries (JSSK, PMMVY, JSY,
"what is a Referral Passport") — concise, non-verbatim, each carrying `source`, `sourceUrl`,
`lastVerified`. `searchKnowledgeBase()` does simple keyword-overlap scoring, not vector search — this
stands in for a future pgvector-backed embedding index (see `16_FUTURE_ROADMAP.md`) behind the exact same
`searchKnowledgeBase(query, limit)` signature, so upgrading it later doesn't touch call sites.
`answerAdminQuestion()` always returns the matched documents as `citations` alongside the answer; the AI
copilot UI renders them under the message. The model never invents a benefit rule's conditions — those come
only from `BenefitRule` rows evaluated by the deterministic engine in `09_RULE_ENGINE.md`.

## What "AI" actually means in this MVP

Concretely, in demo mode, "AI" output the user sees is: a keyword-matched knowledge-base answer with
citations, a template-filled discharge/back-referral summary, a canned list of billing-desk questions, and a
seeded-but-deterministic document field extraction. None of it is a live LLM call. This is intentional per
spec section 41 ("the application must still run in DEMO_MODE without paid API credentials") and is called
out explicitly in the UI ("Demo mode: live translation requires a configured AI provider...") wherever a
real provider would change the output.
