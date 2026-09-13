# 09. Rule Engine(s)

SafeJourney has three independent, pure (no I/O, no LLM), fully unit-tested rule engines. Keeping them pure
functions in their own modules (rather than inline in API routes) is what made thorough unit testing cheap.

## 1. Referral state machine — `src/lib/referral/stateMachine.ts`

A fixed directed graph (`FORWARD_TRANSITIONS`) of legal `ReferralStatus` moves. `canTransition(from, to)` /
`transition(from, to)` (throws `InvalidTransitionError` on an illegal move) / `overrideTransition(from, to,
reason)` (the only way to reach `CANCELLED`, and the only way to move status without following the graph —
requires a non-empty reason, used by the ADMIN override route). `STATUS_ORDER` + `statusIndex()` give a
linear progress ordering used by the patient-facing journey checklist. 11 unit tests cover the full
happy-path sequence, the "skip transport" branch, every explicitly-forbidden jump from spec section 51, and
every override rule.

## 2. Referral Rescue Engine / operational status — `src/lib/referral/rescueEngine.ts`

`computeOperationalStatus({ status, statusEnteredAt, now, ackTimeoutMinutes, hasNeedsReviewAdminTask,
hasUnconfirmedDocuments })` returns one of `ON_TRACK | ACTION_REQUIRED | STUCK | CLOSED` plus a human-
readable reason and minutes-waiting. A referral is `STUCK` only while it sits in a small set of
"waiting-on-another-party" statuses (`SENT`, `TRANSPORT_REQUESTED`, `TRANSPORT_ASSIGNED`, `IN_TRANSIT`,
`DISCHARGED`, `BACK_REFERRED`, `FOLLOW_UP_PENDING`) longer than the configured timeout. This is deliberately
an **operational**, not clinical, signal — the reason strings are all phrased as workflow facts ("Referral
has not been acknowledged by the receiving facility") and the docstring at the top of the file states the
constraint explicitly. 7 unit tests cover on-track, each STUCK trigger, ACTION_REQUIRED from both admin
tasks and unconfirmed documents, terminal-status short-circuiting, and a non-default configured timeout.

## 3. Administrative Continuity Engine — `src/lib/referral/adminCompleteness.ts`

`computeAdministrativeReadiness(tasks)` = complete ÷ applicable × 100, where "applicable" excludes
`NOT_APPLICABLE` tasks entirely from the denominator (a referral with no newborn case isn't penalized for
not having birth documentation). `buildDefaultAdminTasks({ transportRequired, hasNewbornCase })` seeds the
standard 9-item checklist per spec section 17, marking transport/birth documentation `NOT_APPLICABLE` when
irrelevant to the specific case. 5 unit tests.

## 4. Deterministic Benefit Rule Engine — `src/lib/benefits/ruleEngine.ts`

**Never an LLM.** `evaluateBenefit(context, ruleStatus, conditions, documentRequirements)` returns exactly one
of `POTENTIALLY_APPLICABLE | NOT_APPLICABLE | NEEDS_VERIFICATION` — it can never return a confirmed/approved
state (this is asserted directly in a unit test). Conditions checked, in order: rule inactive → state
mismatch → newborn-case requirement → transport requirement → missing documents. Even when every condition
matches and every document is present, the result is still `POTENTIALLY_APPLICABLE` with a mandatory
`nextActions` entry: "Verify current eligibility with the relevant facility administration or authority." —
the engine never tells a family they are approved. 8 unit tests, including one that asserts this
never-fully-confirmed invariant.

Seeded rules (JSSK, PMMVY, JSY) live in `prisma/seed.ts` with real-looking but clearly-labeled-as-configured
`conditions` JSON, a `sourceUrl`, and a `lastVerified` date — every evaluation shown in the Benefit Radar UI
carries that source and date (`src/components/referral/BenefitRadar.tsx`).

## Where the engines are invoked

`createReferral()` in `referralService.ts` runs the benefit engine once at creation time against every
`ACTIVE` `BenefitRule`, storing one `BenefitEvaluation` row per rule. Operational status and administrative
readiness are **not** stored as the source of truth — they're recomputed on every read via
`decorateOperationalStatus()` (see `04_ARCHITECTURE.md`), so admins changing the ack timeout in
`/admin` takes effect immediately across every open dashboard, with no cache to invalidate.
