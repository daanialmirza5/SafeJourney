# SafeJourney Architecture

## 1. Request Flow (Mutation Lifecycle)

```text
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

Every mutation route follows this consistent lifecycle: **authenticate → authorize → validate (Zod) → delegate to pure service → record audit log → return typed response**.

---

## 2. Rendering Model

- **React Server Components (RSC)**: Public pages (`/`, `/login`) and authenticated layouts (`(app)/layout.tsx`) read the session cookie and query Prisma directly for optimal performance and zero client-fetch waterfall.
- **Client Components**: Interactive elements (forms, action modals, document uploader, AI assistant, QR scanner) interact with typed JSON API endpoints and trigger `router.refresh()` to resynchronize the server-rendered tree.

---

## 3. Operational Status: Computed, Not Cached

`ReferralCase.operationalStatus` exists as a column for indexing and filtering, but every read path computes it dynamically via `decorateOperationalStatus()` using:
- Current wall-clock time (`now`)
- Configured SLA timeout (`REFERRAL_ACK_TIMEOUT_MINUTES`)
- Pending administrative tasks and documents

The **Referral Rescue Engine** requires no background cron worker: a referral is surfaced as `STUCK` instantly when any user accesses a view touching it if `now - statusEnteredAt > threshold`.

---

## 4. Module Boundaries & Pure Logic Engines

- **`lib/referral/stateMachine.ts`**: Pure directed graph of legal `ReferralStatus` transitions.
- **`lib/referral/rescueEngine.ts`**: Pure wall-clock SLA calculation.
- **`lib/referral/adminCompleteness.ts`**: Pure administrative readiness calculation.
- **`lib/benefits/ruleEngine.ts`**: Pure deterministic scheme eligibility engine.
- **`lib/referral/referralService.ts`**: Service facade managing all database mutations.
- **`lib/referral/access.ts`**: Access control matrix defining visibility by role and facility.
- **`lib/ai/safety.ts`**: Hard boundary blocking clinical diagnosis, prescribing, or medical advice.

---

## 5. State Machine Diagram

```text
DRAFT ──► CREATED ──► SENT ──► ACKNOWLEDGED ──► [TRANSPORT_REQUESTED ──► TRANSPORT_ASSIGNED ──► IN_TRANSIT ──►] ARRIVED
  ──► UNDER_CARE ──► DISCHARGED ──► BACK_REFERRED ──► FOLLOW_UP_PENDING ──► FOLLOW_UP_CONFIRMED ──► CLOSED

Any non-terminal status ──► CANCELLED (admin override only, audited with required reason)
```

Transport leg is optional and bypassed when `transportRequired = false`.
