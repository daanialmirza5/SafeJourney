# 01. Product Overview

## Product

**SafeJourney** — Closed-Loop Maternal & Newborn Referral + Administrative Continuity Platform

**Tagline:** "Don't let a referral end with a piece of paper."

## Core promise

When a pregnant woman or newborn is referred from one facility to another, SafeJourney ensures the referral
does not disappear into fragmented phone calls, paperwork and disconnected workflows. It connects:

```
Doctor → Referral → Receiving Facility → Transport → Documents →
Administrative/Financial Support → Arrival Confirmation → Discharge →
Back-Referral → Community/Follow-up → Case Closure
```

## Core principle

**"AI explains. Rules verify. Humans decide."**

SafeJourney is **not** a diagnostic application. It never diagnoses, recommends treatment, prescribes
medication, calculates clinical risk, interprets test results for medical decisions, or decides that a
referral is needed. The doctor makes every clinical decision; SafeJourney coordinates the operational
journey around that decision. This boundary is enforced in code (see `src/lib/ai/safety.ts`), not just in
policy — every AI-facing route runs user input through `isClinicalQuestion()` before generating a response,
and refuses with a fixed, non-negotiable message if it looks clinical.

## The eight MVP capabilities (all implemented)

1. **Closed-loop referral creation** — doctor creates a referral; it is immediately sent to a receiving facility.
2. **Receiving-facility acknowledgment** — accept, request clarification, or decline/unavailable.
3. **Referral Passport** — a QR-backed, opaque-token secure record of the journey.
4. **Transport workflow** — simulated, clearly-labeled coordination from request to arrival.
5. **Administrative / financial continuity** — a live readiness checklist plus a deterministic Benefit Radar.
6. **Referral Rescue Engine** — detects stalled handoffs and surfaces an operational (never clinical) escalation.
7. **Back-referral after discharge** — AI-drafted, human-confirmed handoff summary plus auto-created follow-up tasks.
8. **Mother + newborn follow-up continuity** — a linked family case, and a follow-up worker dashboard.

Plus baseline product functionality: authentication, RBAC, notifications, global search, role-specific
dashboards, document upload/extraction/confirmation, settings, language selection, consent records, a full
audit trail, resettable demo data, responsive mobile UX, and empty/loading/error states throughout.

## Roles

| Role | Priority | Status |
|---|---|---|
| Doctor (referring facility) | MVP priority | Fully implemented |
| Receiving Coordinator | MVP priority | Fully implemented |
| Patient / Caregiver | MVP priority | Fully implemented |
| Follow-up Worker (ASHA/ANM) | Enabled | Fully implemented |
| Admin | Enabled | Fully implemented |

The `role` column is a plain string (not a DB enum — SQLite has no enum type), validated against the
`RoleName` union in `src/lib/types/enums.ts`. Adding a new role means adding one value there plus a nav
entry in `src/lib/nav.ts` — no architectural rewrite required.

## What this document set covers

Each file in `/docs` describes what is **actually implemented** in this repository, not an aspirational
spec. See `15_LIMITATIONS.md` for an explicit list of what was deliberately cut or simulated for the
hackathon MVP, and `16_FUTURE_ROADMAP.md` for what a pilot would add next.
