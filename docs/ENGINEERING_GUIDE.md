# SafeJourney — Engineering Guide

> Corrected 2026-09-12: an earlier revision of this file described a clinical "Obstetric Early Warning
> Score" calculator, ambulance GPS telemetry, and encrypted on-device vitals/allergy storage. None of that
> exists in this codebase, and the first would have broken this project's core rule that the platform never
> calculates clinical risk. This revision describes only what is actually implemented. See
> `docs/development-audit.md` for the full audit that caught this.

## 1. What is this platform?

A **closed-loop maternal and newborn referral and administrative-continuity coordinator**. It tracks a
referral from a referring doctor's decision through receiving-facility acknowledgment, transport
coordination, arrival, discharge, back-referral, and community follow-up — and it never diagnoses,
prescribes, recommends treatment, or scores clinical risk. See `docs/01_PRODUCT_OVERVIEW.md` for the full
non-clinical scope statement.

## 2. Problem framing

Referrals between primary and tertiary facilities routinely lose continuity: paperwork doesn't travel with
the patient, receiving facilities don't know a referral is coming until the patient arrives, administrative
benefit paperwork gets missed under time pressure, and post-discharge follow-up has no forcing function.
This is a coordination and accountability gap, not a clinical-decision gap — which is why every rule in this
system is deterministic and administrative, never diagnostic.

## 3. Architecture

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS v4.
- **Backend & data**: Prisma ORM 5 over SQLite (enum fields are `String` columns with TS literal unions as
  the source of truth — see `src/lib/types/enums.ts`); REST route handlers under `src/app/api/**`.
- **Core domain modules** (`src/lib/referral/`):
  - `referralService.ts` — the referral lifecycle: create, accept/decline, request clarification, transport
    request/assign/progress, confirm arrival, discharge, generate + send back-referral, acknowledge
    back-referral (origin facility only — the step that actually assigns follow-up and closes the loop),
    complete/skip follow-up tasks, explicit case closure (`closeCase`), admin override.
  - `stateMachine.ts` — the `ReferralStatus` workflow graph (`DRAFT → CREATED → SENT → ACKNOWLEDGED → ... →
    CLOSED`, with `CANCELLED` reachable only via an audited override) plus idempotent-transition and
    audit-checksum helpers (see `TECHNICAL_DEBT.md` for their current integration status).
  - `closureSafeguards.ts` — `getClosureBlockers`, a pure check for what's still outstanding before a
    referral can safely close (incomplete follow-up tasks, incomplete admin/document tasks, an
    unacknowledged back-referral). Shared by `closeCase` and by `adminOverrideStatus` when forcing `CLOSED`,
    so neither path can silently close over unresolved coordination work.
  - `newbornContinuity.ts` — `deriveFollowUpTaskState`, the single source of truth for whether a follow-up
    task reads as completed/skipped/overdue/upcoming, shared by the referral detail follow-up panel and the
    follow-up dashboard so the two views can never disagree about what counts as overdue.
  - `rescueEngine.ts` — computes `operationalStatus` (ON_TRACK / ACTION_REQUIRED / STUCK / CLOSED) as a
    read-time overlay on top of `status`, based on configurable SLA timers (e.g. acknowledgment timeout) —
    deterministic threshold checks, not a risk score.
  - `access.ts` — role/facility-scoped authorization for who can view or act on a given referral.
- **Benefit rule engine** (`src/lib/benefits/ruleEngine.ts`) — deterministic eligibility checks against
  seeded scheme rules (JSSK/PMMVY/JSY); it never returns a "confirmed" state, only "likely eligible, pending
  human verification."
- **Provider abstractions** (AI/OCR/storage/notifications) — each has exactly one real adapter (`demo`) plus
  interface-complete adapters ready for a real provider; see `docs/08_AI_ARCHITECTURE.md` and
  `docs/15_LIMITATIONS.md` for exactly what is and isn't wired to a real external service.
- **Testing**: Vitest unit tests (`src/**/*.test.ts`) and a Playwright E2E suite (`e2e/`).

## 4. Security & access

- Custom JWT-in-httpOnly-cookie session auth (`src/lib/auth.ts`), bcrypt password hashing.
- Role-based access control enforced per-route and per-referral (`access.ts`), not just hidden in the UI --
  every referral-mutating function in `referralService.ts` re-checks facility scope (`canActOnReceivingFacility`
  / `canActOnReferringFacility`) server-side, not only the route's role gate (a real gap here, where six
  functions had role checks but no facility check, was found and fixed in Stage 10 -- see
  `docs/stage-10-final-readiness-audit.md`).
- Soft-delete (`deactivatedAt`) for `User`/`Facility` — reversible, blocks login, preserves history.
- Referral/Patient records are never soft-deleted (audit-trail preservation) — see `docs/15_LIMITATIONS.md`.
- Document confirm/reject (`src/lib/documents/documentService.ts`) is restricted to `DOCTOR`/`COORDINATOR`/
  `ADMIN` -- a Stage 11 decision, since a confirmed document feeds the outgoing back-referral's document
  package and the analytics document-completeness KPI, making it a real coordination decision rather than a
  cosmetic status flag. See `docs/stage-11-document-permission-decision.md`.
