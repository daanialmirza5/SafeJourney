# 02. Product Requirements Document

## Executive summary

A maternal or newborn referral between facilities creates a chain of operational dependencies — the
receiving facility must know and acknowledge, transport may need coordinating, documents must travel with
the patient, administrative/financial information must not be lost, and follow-up must stay connected after
discharge. Today this chain runs on phone calls and paper. SafeJourney is a coordination layer that keeps
one referral case connected end-to-end, with a doctor, a coordinator, a patient/caregiver and a follow-up
worker all seeing the same live state.

## Problem statement

Not "pregnancy tracking." Not "medicine reminders." Not "AI doctor." The problem is operational: a referral
becomes an administrative dead end when no single system tracks whether it was received, whether transport
happened, whether documents arrived, whether the family got administrative/financial support, and whether
the case was ever formally closed.

## Target users & personas

- **Dr. Ananya Rao** (Doctor, referring facility) — needs to hand off a patient without losing visibility.
- **Suresh Patil** (Coordinator, receiving facility) — needs a clear inbox of incoming referrals and one place
  to act (accept/clarify/decline, transport, arrival, discharge, back-referral).
- **Ananya Patil** (Patient) — needs to know, in plain language, what is happening and what to do next.
- **Rakesh Patil** (Caregiver) — supports the patient; needs scoped, revocable access.
- **Sangeeta** (Follow-up worker / ASHA) — needs a due/overdue task list, not a clinical record.
- **Admin** — needs configuration, audit visibility and demo tooling.

## Goals

- Make a referral a persistent, shared record instead of a phone call.
- Make the operational state (stuck / on track / action required / closed) visible to every stakeholder.
- Keep the loop closed: discharge → back-referral → follow-up → confirmed closure.
- Surface potentially-relevant administrative/financial pathways without ever asserting eligibility.
- Never cross into clinical decision-making, at the architecture level, not just the UI copy level.

## Non-goals

- Not a diagnostic, triage, or treatment-recommendation tool.
- Not a replacement for doctors, hospitals, ambulances, ASHAs, or government benefit systems.
- Not a real-time ambulance dispatch or payments product in this MVP (both are simulated, clearly labeled).
- Not a general-purpose chat/pregnancy-tracking app.

## MVP definition (implemented)

Referral state machine, RBAC across 6 roles, referral creation/accept/clarify/decline, transport request →
assign → progress → arrival, document upload → extract → confirm/reject, deterministic benefit rule engine
+ Benefit Radar UI, administrative completeness engine, Referral Rescue Engine (configurable timeout),
discharge → back-referral → auto-created follow-up tasks → completion → auto-close, mother/newborn linked
family case, Referral Passport with QR + camera scan + manual fallback, in-app notifications (+ demo
email/WhatsApp provider stubs), global search, full audit trail, admin panel (users/facilities/benefit
rules/settings/audit/demo data), analytics (closed-loop rate + funnel + secondary KPIs), a judge-facing
one-click demo scenario and a one-click rescue-scenario demo, and a resettable synthetic dataset.

## Success metrics / operational KPIs

- **Primary: Closed-Loop Referral Rate** — closed referrals ÷ initiated referrals × 100 (`/analytics`).
- Secondary: referral handoff time (sent → acknowledged), administrative completeness, document
  completeness, follow-up completion rate, average time stuck.
- All figures are computed live from the current database (demo or real) — never hard-coded.

## Acceptance criteria

See spec section 69/70 style acceptance criteria satisfied end-to-end and verified via scripted HTTP calls
against the running app (not just unit tests) — documented in `11_TESTING_STRATEGY.md`.

## Safety boundaries

See `01_PRODUCT_OVERVIEW.md` and `10_SECURITY_PRIVACY.md`. Enforced in `src/lib/ai/safety.ts` and by the
deterministic (non-LLM) rule engine in `src/lib/benefits/ruleEngine.ts`.

## Pilot plan

See `14_PILOT_PLAN.md`.

## Roadmap

See `16_FUTURE_ROADMAP.md`.
