# Stage 9 Audit — Discharge, Back-Referral, and Follow-up Lifecycle

Evidence-based inspection performed 2026-09-14 before any implementation, per the requested process. Every
claim below was verified by reading the actual current source (`src/lib/referral/referralService.ts`,
`stateMachine.ts`, `access.ts`, `newbornContinuity.ts`, the relevant API routes, and `prisma/schema.prisma`)
and, where noted, by a live HTTP request against the running app — not assumed from prior-stage memory or
documentation claims.

## Already implemented (verified, working)

- **Full state machine** `SENT → ACKNOWLEDGED → ... → DISCHARGED → BACK_REFERRED → FOLLOW_UP_PENDING →
  FOLLOW_UP_CONFIRMED → CLOSED`, with `CANCELLED` reachable from any non-terminal state only via an
  audited override requiring a non-empty reason (`stateMachine.ts`).
- **Follow-up completion and skip**, built in Stages 2-4: `completeFollowUpTask`/`skipFollowUpTask` both
  enforce their role rules *in the service layer* (`canCompleteFollowUpTask`/`canSkipFollowUpTask`), not
  only at the route, audit-log every action, and share one closure-check helper
  (`closeReferralIfFollowUpComplete`).
- **Overdue detection is already task-level, not referral-SLA-level** — `deriveFollowUpTaskState` (added
  Stage 3-4 specifically to fix this) derives COMPLETED/SKIPPED/OVERDUE/UPCOMING from each task's own
  `status`/`dueDate`, independent of the referral's ack-timeout SLA. Phase 5's concern ("follow-up
  categories do not accidentally inherit unrelated referral SLAs") is **already resolved**, not a gap.
- **Maternal vs. newborn distinction**: `FollowUpTask.category` (`DISCHARGE_HANDOFF`/`ADMIN_FOLLOW_UP` vs.
  `HOME_VISIT`/`IMMUNIZATION_REMINDER`/`GROWTH_CHECK`/`CONTINUITY_REVIEW`), the admin-configurable
  `NewbornMilestoneTemplate` schedule, the `FollowUpPanel` timeline, and the analytics split
  (`maternalFollowUpCompletionRate`/`newbornFollowUpCompletionRate`) are all real and already built.
- **Audit logging and notifications** are comprehensive on every transition in this lifecycle (create,
  accept, decline, clarify, transport steps, arrival, discharge, back-referral, follow-up complete/skip,
  rescue action, override) — every one calls both `logEvent` (referral timeline) and `recordAuditEvent`
  (audit log), and sends a template-based notification to the relevant party.
- **Role gating exists at the API route layer** for every mutation in this lifecycle (`requireRole(...)`
  on every route file checked).

## Unsafe or inconsistent (verified, real bugs)

1. **ADMIN is blocked from accept/decline/clarify/arrival/discharge/back-referral despite every route
   explicitly allowing it.** `acceptReferral`, `requestClarification`, `declineReferral`, `confirmArrival`,
   `dischargeCase`, and `generateAndSendBackReferral` all gate with
   `if (actor.facilityId !== referral.receivingFacilityId) throw new ForbiddenError()` -- with no ADMIN
   exemption, unlike `canAccessReferral` (`access.ts`) and `referralScopeFor` (`queries.ts`), which both
   correctly special-case `ADMIN` to bypass facility scoping. The seeded demo admin account has
   `facilityId: null` (confirmed by reading `prisma/seed.ts`'s admin creation call, which sets no
   `facilityId`). **Live-verified**: logging in as `admin@demo.local` and calling
   `POST /api/referrals/{id}/accept` on a real `SENT` referral returns `403 FORBIDDEN` --
   `"You do not have permission to perform this action."` -- despite the route's own
   `requireRole("COORDINATOR", "ADMIN")` explicitly naming ADMIN as allowed. This is a genuine,
   reproducible defect, not a hypothetical.
2. **`BackReferral.familyNotified` is hardcoded `true`** in `generateAndSendBackReferral`, regardless of
   whether any notification actually succeeded or whether a family-facing notification was even sent (the
   notifications that function actually sends go to the referring *doctor* and the assigned follow-up
   *worker* -- neither is "the family"). This field currently records a claim the code never verifies.
3. **`adminOverrideStatus` can force a referral straight to `CLOSED` from any non-terminal status**,
   completely bypassing every safeguard the normal auto-close path enforces (`closeReferralIfFollowUpComplete`
   requires zero remaining open follow-up tasks and a `FOLLOW_UP_PENDING` starting status).
   `overrideTransition` only requires a non-empty reason string and a target status different from the
   current one -- it does not check follow-up completeness, back-referral existence, or anything else about
   coordination state. This is exactly the gap Phase 6 asks about: closure has no visibility into what's
   still outstanding when it happens via override.

## Missing

- **Origin-facility acknowledgment of a back-referral.** Neither the `BackReferral` model nor any API route
  has a concept of the origin (referring) facility acknowledging receipt. The flow today is
  `BACK_REFERRED` → (same function call, no intermediate step) → `FOLLOW_UP_PENDING`. Phase 3's requested
  sequence (`Back-referral created → Origin facility notified → Origin facility acknowledged → Follow-up
  assigned...`) has no "acknowledged" step at all right now -- it's notified and then immediately
  considered fully handed off.
- **Discharge destination / next-care-location.** `ReferralCase.dischargedAt` records *when*, but nothing
  records *where to* or *what's next*. `dischargeCase`'s only optional input is a free-text `note`.
- **Explicit discharge coordination checklist beyond one task.** `dischargeCase` marks exactly one
  `AdministrativeTask` ("Discharge documentation") complete; it doesn't check or surface whether *other*
  outstanding admin tasks exist before/at discharge.
- **A human-triggered "close this case" action with a confirmation summary.** The only ways a referral
  reaches `CLOSED` are (a) the last follow-up task being completed/skipped (automatic, no confirmation
  step), or (b) an ADMIN override (bypasses all coordination-state checks, per the bug above). There is no
  UI or endpoint that shows "here's what's still outstanding, confirm you want to close anyway."
- **Missed-appointment-specific queue/ownership/escalation fields** (Phase 5's "needs coordination queue,"
  "last contact attempt," "escalation note"). Overdue detection itself is solid (see above); a dedicated
  queue view and per-task escalation metadata don't exist. This matches what
  `docs/newborn-continuity-review.md` already documented as a known limitation, not a new finding.

## Deferred intentionally (already documented in prior stages, not re-litigated here)

- No SMS/WhatsApp/push notification delivery -- in-app only, by design (`docs/15_LIMITATIONS.md`).
- No real OCR/AI provider -- demo adapters only, by design.
- Milestone schedule is a fixed offset-day model, not a per-facility/per-region calendar.

## What this stage does about it

Phases 2-6 below address, in order: the ADMIN-facility bug (affects almost every phase, fixed once as a
shared pure-function extraction rather than duplicated per call site), discharge coordination depth
(destination + checklist visibility), the origin-acknowledgment step (new, real closed-loop gap), the
override-bypasses-safeguards gap (Phase 6), and the `familyNotified` inconsistency. No clinical criteria,
medical fitness claims, or risk scoring are introduced anywhere -- every new field and action is
administrative/coordination language, matching the rest of this codebase's established convention.

Testing approach: this codebase's dominant, consistent pattern is extracting pure, DB-free logic for
anything with a business rule (`canCompleteFollowUpTask`, `validateMilestoneTemplateInput`,
`deriveFollowUpTaskState`, etc.) and unit-testing that directly, rather than mocking the full Prisma client
per service function (that heavier style exists exactly once, in `access.test.ts`, for one branch that
genuinely needs a DB lookup). New role/validation logic this stage follows the dominant pattern; full
service-function behavior is verified live against the running app with real HTTP requests, consistent with
how discharge/back-referral have always been verified in this project (no `referralService.test.ts` exists
today, and this stage does not introduce a DB-mocking harness to create one solely for these functions).

## Execution summary (added after implementation -- what was actually done)

Every item above was addressed; nothing in "Missing" was left unimplemented without being explicitly
re-classified below.

- **ADMIN-facility bug**: fixed with two new shared predicates, `canActOnReceivingFacility` /
  `canActOnReferringFacility` (`access.ts`), replacing six inline inconsistent checks in
  `referralService.ts`. Unit-tested (`access.test.ts`); live-verified before/after with the same
  `admin@demo.local` → `POST /accept` reproduction the audit used.
- **Discharge destination**: `dischargeCase` now requires `{ destination, note? }`; the UI's confirm button
  stays disabled until a destination is entered. Incomplete admin/document tasks are surfaced in the
  discharge audit-log metadata (display only, never a blocking clinical criterion).
- **Origin-facility acknowledgment**: implemented as a genuinely separate step. `generateAndSendBackReferral`
  now only sends the summary (`BACK_REFERRED`, no follow-up tasks). A new `acknowledgeBackReferral`
  (origin-facility-only, rejects a duplicate ack) is the step that assigns the follow-up worker and creates
  the near-term admin tasks + newborn milestones, transitioning to `FOLLOW_UP_PENDING`. This is the real
  sequence the audit asked for: `Created → notified → acknowledged → follow-up assigned → completed/overdue`.
- **`familyNotified`**: now reflects whether a real patient/caregiver account was actually notified, instead
  of being hardcoded `true`.
- **Override-bypasses-safeguards bug**: fixed with a new pure `getClosureBlockers` check
  (`closureSafeguards.ts`) that `adminOverrideStatus` now runs before forcing `CLOSED`, requiring an explicit
  `confirmOutstanding` flag if anything is unresolved. Moving off a terminal status is now logged as
  `REFERRAL_REOPENED`, distinct from a normal override.
- **Human-triggered close-with-confirmation**: added as a new `closeCase` service function + `POST
  /api/referrals/[id]/close`, available to the referring doctor or a coordinator at either facility (not
  ADMIN-only), running the same `getClosureBlockers` check, refusing duplicate closure on an already-terminal
  referral, and surfacing the blocker summary in the UI with an explicit "Close anyway" confirmation.
- **Missed-appointment queue/escalation fields** (dedicated queue view, last-contact-attempt, escalation
  note): **deliberately not built** this stage, re-confirming the audit's own classification rather than
  reversing it. The follow-up dashboard's existing "Pending handoffs" list, now correctly computing overdue
  from the same shared `deriveFollowUpTaskState` used everywhere else (previously it used a separate,
  coarser day-level cutoff than the per-task badge -- a real, if minor, inconsistency fixed this stage), is
  judged sufficient for this stage's scope; a dedicated queue/escalation-metadata model remains future work,
  same as prior-stage documentation already said.
- **Overdue/timezone edge cases**: added dedicated unit tests for same-day due dates, exact
  due-date-equals-now boundaries, a UTC day-boundary case, and an invalid (`NaN`) due date, pinning
  `deriveFollowUpTaskState`'s exact behavior at each boundary rather than leaving it implicit.

See `docs/changelog.md`'s 2026-09-13 (4) entry for the full commit list, test counts, and live-verification
detail, and `docs/13_DEMO_GUIDE.md` / `docs/07_API_SPECIFICATION.md` for the updated user-facing and API-level
descriptions of this flow.
