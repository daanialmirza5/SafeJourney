# Newborn Continuity Review — 2026-09-12

Inspection of the actual implementation (schema, service layer, API routes, UI, permissions, tests) before
assuming the newborn six-to-eight-month follow-up feature was complete, per the requested Stage 2 process.
Classification below reflects the state found *before* this stage's changes, followed by what was done.

## What existed before this review

- `NewbornCase` (schema): `id`, `familyCaseId`, `name`, `sex`, `birthDate`, `createdAt` — a bare record
  linked to a `FamilyCase`, with no milestone, schedule, or reminder concept at all.
- `FollowUpTask` (schema): a real, generic, well-built task model (`title`, `description`, `assignedToId`,
  `dueDate`, `status`, `source`, audit timestamps) — but `generateAndSendBackReferral` only ever created
  **two** of them, both due **3 days** after back-referral: "Discharge handoff acknowledgement" and
  (conditionally) "Administrative application follow-up."
- Case closure (`completeFollowUpTask`): correctly gated on zero remaining PENDING/DUE/OVERDUE tasks before
  transitioning to `CLOSED` — solid, safe mechanism, just fed by too little to represent a real journey.
- `FollowUpDashboard`: a generic task list (due/overdue/completed counts) with no milestone-type distinction.
- `PatientJourney` (patient/caregiver view): zero visibility into follow-up tasks of any kind.
- No notification template targeted at a caregiver/patient about follow-up milestones (9 templates exist;
  none for this).
- No unit tests for `completeFollowUpTask`, the auto-closure trigger, or any follow-up task behavior.

## Classification

| Requirement | Status (before) | Status (after this stage) |
|---|---|---|
| Configurable newborn follow-up milestones | **Missing** | **Implemented** — `src/lib/referral/newbornContinuity.ts`, one file, one schedule constant |
| Six-to-eight-month continuity journey | **Missing** (only a 3-day window) | **Implemented** — schedule spans 14 to 240 days |
| Scheduled follow-up visits | **Missing** | **Implemented** — home visit + growth check-ins |
| Vaccination reminders | **Missing** | **Implemented** as administrative reminders (never prescribes/schedules doses — see Safety below) |
| Growth-monitoring reminders | **Missing** | **Implemented** |
| Newborn-care milestones | **Missing** | **Partially implemented** — a fixed default schedule, not yet configurable per-region/per-admin (see Limitations) |
| Caregiver reminders | **Missing** (zero visibility) | **Implemented** — `PatientJourney.tsx` now lists upcoming/overdue check-ins |
| Missed-appointment tracking | **Partially implemented** (generic `dueDate < now` → OVERDUE badge, worker-only visibility) | **Unchanged** — still generic, now more meaningful since tasks span realistic time horizons |
| Community healthcare-team follow-up | **Partially implemented** (real assignment/completion flow, but only ever one 3-day task) | **Implemented** — same real flow, now driving a genuine multi-month schedule |
| Authorized role-based actions | **Fully implemented** (`requireRole("FOLLOWUP","COORDINATOR","ADMIN")`, audited) | **Unchanged** — already correct |
| Follow-up status history | **Partially implemented** (generic audit log, no continuity-specific view) | **Unchanged this stage** — still a generic event log, not a dedicated timeline UI (see Limitations) |
| Escalation of overdue coordination tasks | **Incorrectly implemented** — used a 10-minute operational SLA timer against a status meant to last months, so every follow-up referral would falsely show STUCK within minutes | **Fixed** — see "Bug found and fixed" below |
| Final continuity review | **Missing** | **Implemented** — a `CONTINUITY_REVIEW` milestone task at day 240, gating closure |
| Safe case closure | **Fully implemented** (mechanically correct, just under-fed) | **Unchanged and now exercised properly** — closure now genuinely waits for the full journey |

## Bug found and fixed: false STUCK escalation

Investigating "escalation of overdue coordination tasks" surfaced a real, pre-existing correctness bug,
independent of the new feature: `rescueEngine.ts`'s `WAITING_STATUSES` applied the same
`ackTimeoutMinutes` SLA timer (default **10 minutes** — an operational handoff SLA, see `src/lib/config.ts`)
to `FOLLOW_UP_PENDING`. Even under the old 3-day-task design, any referral sitting in follow-up for more
than 10 minutes was already incorrectly flagged `STUCK`. This would have made the Rescue Engine's signal
meaningless the moment a multi-month journey existed -- every newborn referral would show STUCK for its
entire ~8-month window.

**Fix**: removed `FOLLOW_UP_PENDING` from the ack-timeout-driven `WAITING_STATUSES` list. It now has its
own check driven by `hasOverdueFollowUpTask` — true only when an individual follow-up task's own `dueDate`
has passed while still PENDING/DUE/OVERDUE — computed in `decorate.ts` from the referral's actual follow-up
tasks. Covered by two new tests in `rescueEngine.test.ts` (stays ON_TRACK 90 days in absent an overdue
task; flags STUCK when one exists).

## What was implemented this stage

- `prisma/schema.prisma` + migration `20260912180631_add_follow_up_task_category`: added
  `FollowUpTask.category` (`DISCHARGE_HANDOFF | ADMIN_FOLLOW_UP | HOME_VISIT | IMMUNIZATION_REMINDER |
  GROWTH_CHECK | CONTINUITY_REVIEW`).
- `src/lib/referral/newbornContinuity.ts`: the default milestone schedule as a pure, unit-tested,
  single-place-to-edit constant + builder function (`NEWBORN_CONTINUITY_SCHEDULE`,
  `buildNewbornContinuityTasks`), following the same pattern as the existing
  `adminCompleteness.ts::buildDefaultAdminTasks`. 5 new tests, including a regression guard asserting no
  milestone's title/description contains diagnostic, prescriptive, or dosage language.
- `referralService.ts::generateAndSendBackReferral`: when the referral's patient has a linked
  `NewbornCase`, schedules the six milestone tasks alongside the existing two near-term tasks. Referrals
  without a newborn are unaffected.
- `rescueEngine.ts` / `decorate.ts`: the STUCK-escalation fix above.
- `FollowUpDashboard.tsx` / `PatientJourney.tsx`: both now render each task's category label
  (`FOLLOW_UP_TASK_CATEGORY_LABELS`, shared from `newbornContinuity.ts`); `PatientJourney` gained an
  "Upcoming care check-ins" section so caregivers/patients can actually see what's scheduled.
- `prisma/seed.ts`: new `FOLLOW_UP_IN_PROGRESS` demo stage that completes only the near-term tasks and
  leaves the multi-month milestones pending, so the demo actually shows a referral mid-journey rather than
  jumping straight from back-referral to fully closed.

Verified: `npx tsc --noEmit`, `npx vitest run` (78/78, +7 new tests), `npx next lint`, `npx next build` all
clean; a live query against freshly-seeded demo data confirmed a `FOLLOW_UP_IN_PROGRESS` referral has 2
completed + 6 correctly-dated pending milestones and reports `ON_TRACK` (not the pre-fix false `STUCK`).

## Safety note

No clinical content was added. Every milestone is phrased as a coordination/confirmation instruction to the
community follow-up worker ("confirm a visit happened or is scheduled") — never a clinical directive, dose,
or diagnosis. This is enforced by a test (`newbornContinuity.test.ts`) that fails if banned
diagnostic/prescriptive language is ever introduced into a milestone's title or description.

## Update — 2026-09-13 (Stage 4)

Two of the limitations below are resolved:

- **Milestone schedule configurability**: `NewbornMilestoneTemplate` (migration `20260912204848`) replaced
  the fixed `NEWBORN_CONTINUITY_SCHEDULE` constant as the runtime source of truth. An admin can now add,
  edit, or deactivate milestones from the admin panel (`MilestoneTemplatesTable.tsx`); every referral's
  back-referral reads whatever is currently active. Validated (category/title/description/offset bounds),
  audit-logged (`MILESTONE_TEMPLATE_CREATED`/`_UPDATED`), and role-gated (`ADMIN` only, verified live: a
  doctor account gets 403). The schedule constant still exists, but only as the seed default now.
- **Continuity timeline UI**: `FollowUpPanel.tsx` is now a connected vertical timeline (not a flat card
  list), with an explicit completed/upcoming/overdue/skipped state per milestone
  (`deriveFollowUpTaskState()`, pure and unit-tested) and a new "Skip" action
  (`COORDINATOR`/`ADMIN` only, reason required, audit-logged as `FOLLOW_UP_SKIPPED`) for when a milestone
  genuinely doesn't apply.

Also found and fixed, while wiring the above: `completeFollowUpTask()` never actually enforced
`canCompleteFollowUpTask()` server-side before this stage -- only the route's `requireRole()` ran, and the
UI's own button-visibility check was the only thing stopping a FOLLOWUP worker from completing a task
assigned to someone else via a direct API call. Now enforced inside the service function itself.

## Remaining limitations (tracked, not addressed this stage)

- `missed-appointment tracking` is still a generic due-date comparison, not appointment-type-aware (e.g. no
  distinct handling for a missed immunization reminder vs. a missed growth check).
- Caregiver reminders are shown in-app only; no push/SMS/WhatsApp reminder is sent when a milestone becomes
  due (matches the rest of the app's "demo-adapter-only" notification scope — see `docs/15_LIMITATIONS.md`).
