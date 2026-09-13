# Stage 11 — Document Confirm/Reject Permission Decision

Evidence-based review performed 2026-09-14, following directly from the open item recorded in
`docs/TECHNICAL_DEBT.md` during the Stage 10 readiness review. This document inspects the current
implementation in full, compares three options, states which one was selected and why, and records what was
(and wasn't) changed as a result.

## Phase 1 — Current implementation, as verified by reading the actual code

**Document model** (`prisma/schema.prisma`, `Document`): `status` is one of `UPLOADED → EXTRACTED →
CONFIRMED | REJECTED`. There is no `uploadedById`-based ownership check anywhere in the confirm/reject path —
any document on a referral the caller can access is fair game, regardless of who uploaded it.

**Server actions** (`src/lib/documents/documentService.ts`):
- `uploadDocument` — no role check beyond what the route enforces.
- `extractDocument` — runs OCR/classification, moves `UPLOADED → EXTRACTED`. No role check.
- `confirmDocument` — moves the document to `CONFIRMED`, optionally overwriting `extraction.fields` with
  caller-supplied `confirmedFields`. No role check.
- `rejectDocument` — moves the document to `REJECTED`, requires a `reason` string. No role check.

**APIs** (`src/app/api/documents/**`): every one of the four routes (`POST /api/documents`,
`POST /api/documents/[id]/extract`, `/confirm`, `/reject`) does the same thing: `requireUser()` (any
authenticated role, no `requireRole(...)` at all), fetch the document, resolve its referral, and check
`canAccessReferral(user, referral)`. **The API enforces exactly what the UI shows — no more, no less** —
this is not a "hidden but callable" bug like Stage 10's transport/follow-up finding; it is a case of the
*visible, working* permission model being wider than this platform's own stated non-clinical, coordination
scope calls for.

**Which roles can currently confirm/reject:** because `canAccessReferral` grants PATIENT access when
`referral.patient.userId === user.id` and CAREGIVER access via an active `CaregiverAccess` grant, in addition
to DOCTOR/COORDINATOR (own facility) and ADMIN (unrestricted), **every one of these five roles can currently
confirm or reject any document on a referral they can view** — including a document a different party
uploaded (e.g. a patient rejecting the hospital's own discharge document, or a caregiver confirming an
identity document they never saw in person).

**Patient-facing UI**: `DocumentsPanel` (`src/components/referral/DocumentsPanel.tsx`) is rendered
unconditionally on the referral detail page (`src/app/(app)/referrals/[id]/page.tsx:143-148`) — it is *not*
inside the page's `isPatientFacing` conditional the way the Actions card and Rescue panel are. Confirm/Reject
render identically for every role that can see the page.

**Does the action change workflow state?** Yes, in three real ways, all verified by reading the call sites:
1. `documentCompleteness` in `src/lib/analytics/computeAnalytics.ts:70-71` — an analytics KPI, computed as
   `% of documents with status CONFIRMED`.
2. `PassportCard.tsx:28` — the Referral Passport card displays "`N` confirmed" documents.
3. **`generateAndSendBackReferral` in `referralService.ts:487`** — `documentPackage` (the list of document
   *types* attached to the outgoing back-referral summary) is built from `referral.documents.filter(d =>
   d.status === "CONFIRMED")`. A confirm/reject decision literally determines what paperwork the referring
   facility is told travelled with the back-referral. This is the most concrete reason this isn't merely
   cosmetic: whoever can confirm/reject is deciding what counts as "administratively complete" for a handoff
   between two facilities.

**Audit events**: yes, both actions call `recordAuditEvent` (`DOCUMENT_CONFIRMED`, `DOCUMENT_REJECTED` with
the reason in `metadata`) — this part is already correct and unaffected by the role question.

**Notifications**: no. Neither `confirmDocument` nor `rejectDocument` calls `notifyFromTemplate`. Nobody is
told a document was rejected today, regardless of who rejects it.

**Existing tests**: none. No `documentService.test.ts` exists, `validation.test.ts` does not cover
`documentConfirmSchema`/`documentRejectSchema`, and the one E2E reference
(`e2e/closed-loop-referral.spec.ts:57-82`) has the **doctor** upload and confirm their own document — the
tested, demo-guide golden path is staff reviewing their own upload, never a patient reviewing someone else's.

**Demo behavior**: `prisma/seed.ts` and `launchJudgeDemoScenario`/`launchRescueScenario`
(`src/lib/demo/demoService.ts`) only ever call `confirmDocument` as the doctor who uploaded the document —
the same staff-reviews-own-upload pattern.

**Is this appropriate for a coordination-only platform, and could it create ambiguity?** The toast copy itself
("Document confirmed and attached to the Referral Passport") already frames this correctly as an
administrative-completeness action, not a clinical one — no clinical-validation wording exists anywhere in
this flow today. The ambiguity isn't in the *wording*, it's in *who* is allowed to make an administrative
completeness call about a hospital-issued document. A patient rejecting their own referring doctor's referral
note, and having that exclude it from the document package attached to the eventual back-referral, is a real
coordination-workflow risk (documents silently missing from a handoff), not a clinical-safety risk (no
diagnosis, prescription, or clinical decision is involved either way).

## Option comparison

### Option A — Keep patient-facing confirmation/rejection
- **User value**: lets a patient acknowledge they've seen/verified their own uploaded documents (e.g. "yes,
  this is my correct ID"). Real, but narrow.
- **Security implications**: none in the sense of data exposure (patients already have read access to their
  own documents) — the risk is entirely about who gets to decide what counts as "administratively complete"
  paperwork on a case that involves two facilities' record-keeping, not the patient's alone.
- **"I reviewed this" vs "this is medically valid"**: correctly the former today in wording, but the
  *downstream effect* (`documentPackage` on the back-referral) makes it functionally closer to "this
  paperwork is complete and can travel with the handoff" — a coordination decision that, per this platform's
  own established convention (discharge, back-referral, closure are all staff/facility actions), belongs to
  the people managing the referral, not the family.
- **Required changes to keep this option**: role-check nothing (as today), but rename the wording to be
  explicit that a patient's confirm only means "I've reviewed this" and does **not** change the
  `documentPackage`/analytics computation the same way a staff confirmation does -- which would require a
  second document status or a `confirmedBy`-role-aware read in three separate call sites
  (`computeAnalytics.ts`, `PassportCard.tsx`, `generateAndSendBackReferral`). More invasive than the problem
  warrants.

### Option B — Restrict confirmation/rejection to authorized staff
- **Matches coordination-only scope**: yes, directly — confirm/reject already is an administrative-
  completeness decision with a real downstream effect on inter-facility paperwork; every other action with
  that shape in this codebase (discharge, back-referral, follow-up completion for COORDINATOR/ADMIN, case
  closure) is already staff/facility-scoped. This makes document review consistent with the rest of the
  platform's authorization model instead of being the one outlier.
- **Do patients still need a way to report an incorrect/missing document?** Not today -- there is no
  "flag/report an issue" action anywhere in this codebase for anything (referrals, follow-up tasks, or
  documents). Building one now would be new schema, a new notification path, and new UI for a need that
  hasn't been requested and has an existing, low-friction substitute: a patient can already see every
  document (`View file` link) and, per the rest of this platform's design (family observes, staff acts on
  their behalf), can raise a concern with their care team the same out-of-band way they would raise any other
  concern about their case. Documented as a reasonable future idea below, not built -- adding it now would be
  exactly the kind of unrequested complexity this project's working rules ask to avoid.
- **Required UI/API changes**: add a role check (`DOCTOR`, `COORDINATOR`, `ADMIN`) to the confirm/reject
  routes and the two buttons in `DocumentsPanel`, matching the pattern already used for discharge/back-
  referral/closure elsewhere in this codebase. Upload and extraction are unaffected — a patient can still add
  their own documents; a staff member decides whether they're administratively complete.
- **Required documentation**: this file, plus `TECHNICAL_DEBT.md` (remove the now-resolved item),
  `docs/13_DEMO_GUIDE.md` (documents section should say who can confirm/reject and why).

### Option C — Rename the action and narrow its meaning (patient acknowledgment vs. staff confirmation vs. clinical validation)
- Conceptually the most precise, but the "clinical validation" tier does not exist in this platform at all and
  must never be implemented here (a document's medical content is never verified by this software; only a
  real clinician or external record system could do that, and this platform would only ever *record* that it
  happened, never perform it). Building even the two-tier "patient acknowledgment vs. staff confirmation"
  split requires a genuinely new concept (a second document-review status, or a role-aware read at the three
  call sites listed above) for a distinction the current codebase has no other precedent for (nothing else
  splits "viewed by family" from "administratively confirmed"). This is real design work, not a permissions
  fix, and is disproportionate to the actual problem found (over-broad authorization on an otherwise
  correctly-worded, correctly-audited action).

## Decision: **Option B** — restrict confirm/reject to `DOCTOR`, `COORDINATOR`, `ADMIN`

Selected because it is the smallest, safest change that directly closes the real gap found (an
administrative-completeness decision with a genuine downstream effect on inter-facility paperwork, currently
reachable by every role including patients/caregivers reviewing documents they may not have uploaded), it
brings this one action in line with every other action of the same shape already in this codebase, and it
does not require inventing a new document-status concept, a new notification, or a new "report an issue"
feature that hasn't been asked for. Upload and extraction remain open to every role that can already view the
referral, since neither of those two actions decides anything -- they only add or prepare a document for
review. No clinical-validation wording is introduced or implied anywhere; the existing correct framing
("administratively complete," "attached to the Referral Passport") is preserved and reinforced with an
explicit UI note.

See the implementation, tests, and documentation sections below for what changed as a direct result of this
decision.

## Phase 2 — What was implemented

- `src/app/api/documents/[id]/confirm/route.ts` and `.../reject/route.ts`: added
  `requireRole("DOCTOR", "COORDINATOR", "ADMIN")` before the existing `canAccessReferral` check (both checks
  now run -- role first, then facility/case scope, matching the pattern used by `dischargeCase` and
  `closeCase`).
- `src/components/referral/DocumentsPanel.tsx`: the panel now accepts a `canReview` prop; the referral detail
  page computes `canReviewDocuments = role === "DOCTOR" || role === "COORDINATOR" || role === "ADMIN"` --
  deliberately *not* a reuse of the existing `!isPatientFacing` flag, since FOLLOWUP is neither patient-facing
  nor one of the three roles the API now authorizes, and reusing `!isPatientFacing` would have shown a
  FOLLOWUP worker a Confirm/Reject button that 403s on click (exactly the UI/API mismatch this decision is
  trying to avoid). When `canReview` is `false`, the Confirm/Reject buttons are replaced with a plain
  "Awaiting review by the care team" note -- a patient/caregiver/follow-up-worker still sees every document,
  its status, the extracted fields (read-only), and the `View file` link, just not the decision controls.
- No new document status, no new notification, no new external service. `recordAuditEvent` on both actions is
  unchanged (already correct).
- `docs/TECHNICAL_DEBT.md`: the now-resolved item is removed (see that file's history note).

## Phase 3 — Tests

This codebase's established convention (confirmed across Stages 9 and 10) is: pure, DB-free business logic
gets a dedicated unit test file; full service-function behavior for anything touching Prisma is verified live
against the running app over real HTTP, because no `referralService.test.ts` or `documentService.test.ts`
exists anywhere in this codebase to extend. The role check added here (`requireRole(...)` at the route layer)
is not a new pure function -- it's the same `requireRole` helper (`src/lib/auth.ts`) already used and tested
implicitly by every other role-gated route in this codebase -- so this stage follows the same convention:
live HTTP verification, not a new DB-mocking harness built solely for this. See the Phase 5 results below for
the exact requests made and their results (authorized role succeeds, patient/caregiver rejected with 403,
duplicate confirm/reject on an already-resolved document rejected, invalid document id returns 404).
