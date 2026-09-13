# Analytics & Judge Demo Audit — 2026-09-13

Inspected before making changes, per the requested Stage 5 process. Findings below, classified by what
already exists vs. what's missing or inaccurate.

## Analytics (`computeAnalytics.ts` / `/analytics`)

**Already implemented:** total referrals, completed (closed) count, closed-loop referral rate, a referral
funnel by lifecycle stage, average acknowledgment time (`averageHandoffMinutes`, despite the name — it's
`sentAt` → `acknowledgedAt`), a "stuck now" count with average wait, admin-task readiness average, document
confirmation rate, and a single blended follow-up completion rate.

**Missing, against the requested metric list:**
- Pending / acknowledged / active vs. closed counts — the referral list page (`listView.ts`,
  `summarizeReferralCounts`, added Stage 3) already computes exactly these, but `computeAnalytics.ts` never
  reuses it — a second, undefined notion of "pending"/"acknowledged" would have to be invented if built
  independently.
- Transport-pending cases — no metric.
- Rescued referrals — `summarizeReferralCounts` already defines this (an `ADMIN_OVERRIDE` event in a
  referral's history); analytics doesn't surface it.
- Administrative-**benefit** checklist completion specifically — `averageAdminCompleteness` blends every
  admin-task category (referral/transport/identity/**financial**/birth/discharge/follow-up) into one number;
  there's no isolated view of the financial/benefit tasks specifically.
- Back-referral completion — no metric (e.g. among discharged referrals, how many actually got a
  back-referral generated).
- Maternal vs. newborn follow-up completion, and overdue follow-up count — the single blended
  `followUpCompletionRate` doesn't distinguish `DISCHARGE_HANDOFF`/`ADMIN_FOLLOW_UP` (maternal/administrative)
  from `HOME_VISIT`/`IMMUNIZATION_REMINDER`/`GROWTH_CHECK`/`CONTINUITY_REVIEW` (newborn continuity) — added
  Stage 2, but analytics was never updated to reflect the new categories.

**Role visibility gap**: `/analytics` has no role check at all — a PATIENT or CAREGIVER hitting the URL
directly sees the same operational-KPI page (Closed-Loop Referral Rate, STUCK counts) as staff. Not a data
leak (`referralScopeFor` already scopes every query to the caller), but the content is operational tooling
that doesn't belong in a patient/caregiver's surface (they aren't even given a nav link to it) and reads as
confusing rather than useful for them.

## Judge demo (`demoService.ts`, `/api/demo/*`, `docs/13_DEMO_GUIDE.md`)

**Real functional gap**: `RESCUE_ACTIONS` (`rescueEngine.ts`) — `CONTACT_FACILITY`, `ESCALATE_COORDINATOR`,
`ALTERNATE_FACILITY`, `RETRY_NOTIFICATION` — is defined but referenced **nowhere else in the codebase**. There
is no UI that lets a care-team member act on a STUCK referral beyond the generic Admin Override (which
changes status directly, not a "rescue" action). The requested demo flow's step 8, "A care-team action
resolving the issue," currently has nothing to click.

**Real functional gap**: `launchJudgeDemoScenario()` creates its referral with `includeNewborn: undefined` --
the flagship "Launch Judge Demo" referral never has a linked newborn case, so a judge walking through it end
to end never sees the newborn continuity milestones (Stages 2-4's largest feature addition). The demo guide's
walkthrough doesn't mention it either.

**Fabricated/inaccurate claims in `docs/13_DEMO_GUIDE.md`** (same pattern as the Stage 1 audit, in a file that
audit didn't touch):
- "encrypted, privacy-safe QR token" — the passport token is an opaque random hex string
  (`crypto.getRandomValues`), never encrypted (see `referralCode.ts`).
- "immutable, append-only audit trail capturing all lifecycle events with actor identity and **cryptographic
  timestamps**" — `AuditLog.createdAt` is a plain `DateTime @default(now())`; there is no hashing, signing, or
  chaining of any kind.
- "System Health (live SQLite/Postgres connection **latency** and uptime)" — `checkDatabaseHealth()` runs
  `SELECT 1` and reports connected/unreachable plus `process.uptime()`; no latency is measured or displayed.
- "Notification Template Engine ... hot-editable **SMS/WhatsApp** message templates" — these are in-app
  `Notification` row templates; no SMS or WhatsApp provider is wired (confirmed in the Stage 1 audit; still
  true).
- "Two post-discharge home-visit tasks (**Maternal Check & Neonatal Vitals**) are automatically spawned" --
  the real, code-generated task titles are "Discharge handoff acknowledgement" and "Administrative
  application follow-up." Those specific names don't exist anywhere in the codebase.
- "triggering an automated operational alert and immediate **fallback rerouting prompt**" — no such prompt
  exists; matches the `RESCUE_ACTIONS` dead-code gap above.

## What this stage does about it

1. Extend `computeAnalytics.ts` to reuse `summarizeReferralCounts` and add the missing metrics
   (transport-pending, benefit-checklist completion, back-referral completion, maternal/newborn follow-up
   split, overdue follow-up count) — all from real seeded data, clearly labeled as demo data (already the
   case on the page).
2. Gate `/analytics` to the roles that actually have it in their nav (`DOCTOR`, `COORDINATOR`, `ADMIN`).
3. Build a real "Rescue actions" panel on the referral detail page using the previously-dead
   `RESCUE_ACTIONS`, so there's an actual care-team action to take on a STUCK referral.
4. Add a newborn case to `launchJudgeDemoScenario()`.
5. Rewrite the affected sections of `docs/13_DEMO_GUIDE.md` to describe only real, verified behavior.

Non-clinical scope preserved throughout: every new metric and action is operational/administrative (counts,
completion rates, coordination nudges), never a clinical risk score or diagnostic signal.
