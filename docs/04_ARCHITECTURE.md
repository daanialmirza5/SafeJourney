# 04. Architecture

## Request flow (mutation example: coordinator accepts a referral)

```
Browser (ReferralActions.tsx, "Accept" button)
  -> fetch POST /api/referrals/{id}/accept
       -> requireRole("COORDINATOR", "ADMIN")        [src/lib/auth.ts]
       -> acceptReferral(id, actor)                   [src/lib/referral/referralService.ts]
            -> transition(status, "ACKNOWLEDGED")     [state machine validates the move]
            -> db.referralCase.update(...)
            -> db.administrativeTask.updateMany(...)  [marks "Receiving facility acknowledgment" COMPLETE]
            -> logEvent(...)                          [ReferralEvent -> timeline]
            -> recordAuditEvent(...)                  [AuditLog -> /admin]
            -> notify(...)                            [Notification row + demo email/WhatsApp adapters]
       <- { referral }
  <- router.refresh()   [re-fetches the Server Component tree, no full reload]
```

Every mutation route follows this same shape: authenticate → authorize → validate → delegate to a `lib/`
service → respond with structured JSON or a structured error (`src/lib/apiError.ts`).

## Rendering model

- Public pages (`/`, `/login`) and the authenticated shell (`(app)/layout.tsx`) are React Server Components
  that read the session cookie and query Prisma directly — no client-side fetch needed for the initial
  render of a dashboard or referral detail page.
- Interactive pieces (forms, action buttons, the document uploader, the AI copilot, search, notifications
  bell, QR scan) are Client Components that call the JSON API and then call `router.refresh()` to resync the
  server-rendered tree, rather than maintaining a separate client-side store.

## Operational status: computed, not cached

`ReferralCase.operationalStatus` exists as a column (for indexing/analytics convenience) but every read path
recomputes it fresh via `decorateOperationalStatus()` using the current wall-clock time, the configured ack
timeout, and the referral's admin tasks/documents. This means the Referral Rescue Engine needs no background
job or cron — a referral becomes visibly "STUCK" the moment someone loads a page that touches it, purely as
a function of `now - statusEnteredAt`.

## Module boundaries

- **`lib/referral/stateMachine.ts`** — pure, no I/O. The only place that knows which status transitions are
  legal.
- **`lib/referral/rescueEngine.ts`** — pure, no I/O. Operational status computation.
- **`lib/referral/adminCompleteness.ts`** — pure, no I/O. Readiness percentage + default checklist template.
- **`lib/benefits/ruleEngine.ts`** — pure, no I/O, no LLM. Deterministic benefit evaluation.
- **`lib/referral/referralService.ts`** — the only place allowed to write to `ReferralCase` and its related
  tables; every API route that mutates a referral goes through here.
- **`lib/referral/access.ts` / `queries.ts`** — the only place that decides who can see what.
- **`lib/ai/*`, `lib/ocr/*`** — provider-abstracted, demo-mode-by-default, safety-gated.

This separation is what made it possible to seed ~55 referral cases across every lifecycle stage by calling
the exact same service functions the UI calls (see `prisma/seed.ts`) — there is no parallel "seed-only" code
path that could drift from production logic.

## Closed-Loop Referral Lifecycle

> Corrected 2026-09-14 (Stage 10 readiness review): this section previously described "risk-scoring,"
> "ambulance dispatch," "bed assignment," "clinical course documentation," "warning sign tracking," and
> "clinical outcome validation" — none of which exist in this codebase, and the first and last directly
> contradict this project's core non-clinical rule. The stage names below match `stateMachine.ts`'s actual
> `ReferralStatus` values and `referralService.ts`'s actual behavior, not an earlier planning draft.

```
REFER (Referring facility)
  └─ Doctor creates the case, selects a receiving facility; deterministic scheme-eligibility check runs
       (Benefit Radar) and a Referral Passport (opaque QR lookup token) is generated
       ↓
RELAY (Acknowledgment, transport, arrival)
  └─ Receiving facility accepts/declines/requests clarification; an SLA timer flags the referral STUCK if
     acknowledgment is late (Referral Rescue Engine — a deterministic timeout check, not a risk score);
     manual, demo-mode transport request/assign/progress tracking; passport scan confirms arrival
       ↓
DISCHARGE (Receiving facility)
  └─ Coordinator records a discharge destination and an editable summary — administrative coordination
     bookkeeping only, never a medical-fitness determination
       ↓
RETURN (Back-referral, sent then acknowledged)
  └─ An AI-drafted (deterministic, editable, demo-mode), coordinator-reviewed back-referral summary is sent
     to the referring facility; the loop only actually closes once that facility explicitly acknowledges
     receipt and assigns a follow-up worker
       ↓
FOLLOW (Community follow-up)
  └─ Near-term administrative handoff tasks, and — for cases with a linked newborn — a configurable schedule
     of coordination/reminder milestones (home visit, immunization reminder, growth check-in). These are
     scheduling reminders for a community worker to confirm a visit happened, never a monitoring or
     diagnostic system
       ↓
CLOSE (Case closure)
  └─ Once every follow-up task is completed or explicitly skipped (with a reason), or an authorized
     coordinator/doctor/admin closes the case with an explicit reason after reviewing what's still
     outstanding, the referral closes — recorded, audited, and (for a forced override) reversible via an
     explicit, logged reopening
```

## Core Operating Principle

> **AI explains. Rules verify. Humans decide.**

1. **AI explains**: a deterministic, demo-mode adapter drafts an editable back-referral summary and answers
   plain-language questions about documents/status/benefits — it explains and summarizes, it does not
   diagnose, prescribe, or decide anything.
2. **Rules verify**: deterministic state machines, SLA-timeout checks, and rule-based scheme-eligibility
   evaluation are the only things that ever change a referral's workflow status or benefit-eligibility
   result. Nothing here is a clinical risk score.
3. **Humans decide**: every workflow transition (accepting, discharging, closing, and any administrative
   override) requires an explicit, role- and facility-authorized action, and is logged to both the referral
   timeline and the admin audit trail.

## Diagram: referral state machine

```
DRAFT -> CREATED -> SENT -> ACKNOWLEDGED -> [TRANSPORT_REQUESTED -> TRANSPORT_ASSIGNED -> IN_TRANSIT ->] ARRIVED
  -> UNDER_CARE -> DISCHARGED -> BACK_REFERRED -> FOLLOW_UP_PENDING -> FOLLOW_UP_CONFIRMED -> CLOSED

Any non-terminal status -> CANCELLED   (admin override only, reason required, fully audited)
```

ACKNOWLEDGED → ARRIVED is a direct legal transition (transport is optional); the bracketed transport leg is
skipped for referrals with `transportRequired = false`.

