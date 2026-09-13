# Changelog

Dated entries for each meaningful development stage. Architecture and demo-walkthrough documentation
already exist as `docs/04_ARCHITECTURE.md` and `docs/13_DEMO_GUIDE.md` (an earlier numbered-doc convention
established before this changelog existed) — kept as the source of truth rather than duplicated under new
filenames, to avoid two documents drifting out of sync.

## 2026-09-14 (2) — Document confirm/reject permission decision

**What changed:**
- Resolved the open product question flagged in Stage 10's `TECHNICAL_DEBT.md`: document confirm/reject was
  reachable by every role that could view a referral, including patients and caregivers, on documents they
  may not have uploaded themselves. Full investigation and three-option comparison in
  `docs/stage-11-document-permission-decision.md`.
- Investigation found this was not cosmetic: `document.status === "CONFIRMED"` feeds
  `generateAndSendBackReferral`'s outgoing `documentPackage`, the Referral Passport's confirmed-count
  display, and the analytics `documentCompleteness` KPI -- a real coordination decision about what paperwork
  travels with a handoff between two facilities, not a passive status flag.
- **Decision: restrict confirm/reject to `DOCTOR`/`COORDINATOR`/`ADMIN`** (Option B), matching every other
  action of the same shape already in this codebase (discharge, back-referral, closure). Upload and OCR
  extraction remain open to any role that can view the referral, since neither decides anything.
  Deliberately did not build a new "report an issue" feature or a three-tier
  patient-acknowledgment/staff-confirmation/clinical-validation status model -- both would have been new
  complexity solving a problem this stage's evidence didn't show a need for.
- `POST /api/documents/[id]/confirm` and `/reject` now require `requireRole("DOCTOR","COORDINATOR","ADMIN")`
  before the existing `canAccessReferral` facility-scope check. `DocumentsPanel` takes a new `canReview`
  prop, computed on the referral detail page as an explicit role check (not a reuse of the existing
  `!isPatientFacing` flag, since FOLLOWUP is neither patient-facing nor authorized here -- reusing that flag
  would have shown a FOLLOWUP worker a button that 403s on click). When `false`, Confirm/Reject are replaced
  with "Awaiting review by the care team"; the document, its status, extracted fields, and file link remain
  visible to every role.
- No new document status, notification, or external service introduced. Audit logging
  (`DOCUMENT_CONFIRMED`/`DOCUMENT_REJECTED`) was already correct and is unchanged.
- Updated `docs/13_DEMO_GUIDE.md` (a documents-review step and the patient/staff contrast were missing from
  the walkthrough entirely -- added), `TECHNICAL_DEBT.md` (item resolved), `ENGINEERING_GUIDE.md` and
  `INTERVIEW_GUIDE.md` (one line and one Q&A respectively), and `README.md` (corrected the demo guide's
  sitemap description from a stale "5-minute" to the actual "~8-minute" walkthrough length).

**Why it changed:** Requested Stage 11 (document permissions decision and final submission readiness).

**How it was tested:** `npx tsc --noEmit`, `npx vitest run` (172/172, unchanged -- the added `requireRole`
call reuses the same helper already used and exercised by every other role-gated route in this codebase, so
no new unit test harness was introduced, consistent with this codebase's established convention of live HTTP
verification for anything touching `documentService.ts`/`referralService.ts`), `npx next lint`, `npx next
build` all clean. Live-verified: a patient's confirm/reject attempt on an already-confirmed document now
returns 403 (both actions); a legitimate coordinator's confirm (duplicate/idempotent -- re-confirming an
already-confirmed document) and reject (with a reason) both succeed; rejecting a nonexistent document id
returns 404. All five key pages returned 200 after a fresh seed. **Playwright**: one attempt,
`e2e/closed-loop-referral.spec.ts` -- **6/6 passed in 5.0 minutes** (slower than Stage 10's 2.1-minute clean
run, reflecting free memory of well under 1GB throughout this attempt vs. ~1.7GB in Stage 10, but still a
clean pass, not a retry).

**Commits:** `164cd3a`, and this documentation commit.

**Known limitations carried forward:** none new. The P1 (`stateMachine.ts` helpers unintegrated) and P3
(in-memory rate limiter) items from prior stages remain unchanged.

## 2026-09-14 — Final readiness review: cross-facility authorization fix, polish, docs

**What changed:**
- Full evidence-based readiness review (`docs/stage-10-final-readiness-audit.md`) of the referral lifecycle,
  discharge/back-referral/follow-up/closure, Rescue Engine, analytics, judge demo, permissions, audit events,
  notifications, error/loading/empty states, mobile layouts, accessibility, and documentation accuracy.
- **Security fix (the headline finding)**: `requestTransport`, `assignTransport`, `updateTransportProgress`,
  `completeFollowUpTask` (for COORDINATOR/ADMIN), `skipFollowUpTask`, and `applyRescueAction` had role gating
  at the API route but **no facility-scope check at all** in the service layer -- any authenticated
  doctor/coordinator/admin could call them directly on a referral belonging to two entirely unrelated
  facilities, even though the UI already hid those buttons unless the actor belonged to one side of that
  specific referral. Live-verified vulnerable before the fix and rejected (403) after, with a positive control
  confirming legitimate same-facility actors are unaffected.
- UI polish: `BenefitRulesTable`'s toggle gained a loading/disabled guard (was the one admin table missing
  one); added accessible labels to two previously placeholder-only inputs (`/scan` manual lookup, AI copilot
  chat).
- Documentation corrections: `docs/04_ARCHITECTURE.md`'s "7-Stage Closed-Loop Referral Lifecycle" section --
  apparently never reconciled by any prior stage's documentation audit -- claimed "risk-scoring," "ambulance
  dispatch," "real-time handoff tracking," "bed assignment," "clinical course documentation," "warning sign
  tracking," and "clinical outcome validation"; none of that exists, and the first and last directly
  contradict this project's core non-clinical rule. Rewrote it to match `stateMachine.ts`/`referralService.ts`
  as they actually behave. `README.md`'s "real-time" analytics/patient-status claims (server-rendered per page
  load, not live/push) were also corrected. Added a missing "resetting between demo runs" section to the demo
  guide, and recorded the document-confirm/reject-reachable-by-patient role question in `TECHNICAL_DEBT.md`
  (deliberately not changed without a product decision).
- Verified git identity (already correct: `daanialmirza5` / `daanialmirza@gmail.com`) and, via `gh api`, that
  the repository has exactly one collaborator (`daanialmirza5`, admin) -- nothing added or changed.

**Why it changed:** Requested Stage 10 (final polish, ownership verification, submission readiness).

**How it was tested:** `npx tsc --noEmit`, `npx vitest run` (172/172, unchanged -- this stage's fixes reused
already-tested pure predicates rather than adding new ones), `npx next lint`, `npx next build` all clean.
Live HTTP verification of the authorization fix (vulnerable-before/rejected-after on all six paths, plus a
positive control), and a full focused smoke pass over discharge (destination validation) -> back-referral ->
cross-facility-acknowledgment-rejection -> acknowledgment -> closure-blocker-refusal -> task completion ->
auto-close. All five key pages (`/dashboard`, `/referrals`, `/analytics`, `/admin`, `/settings`) returned 200
after a fresh seed. **Playwright**: one attempt (not a retry loop), `npx playwright test
e2e/closed-loop-referral.spec.ts` -- **6/6 passed in 2.1 minutes**, a first for this project across every
prior stage's attempts (all previously either found and fixed a real regression, or hit the machine's
documented resource-contention pattern). Free memory was ~1.7GB throughout, same range as previous
constrained runs, so this appears to be genuine headroom on this attempt rather than a changed environment.

**Commits:** `6ceffdc`, `949c166`, `602e97b`, `deb63b3`, `9bb4896`, and this documentation commit.

**Known limitations carried forward:** the document confirm/reject role question (see `TECHNICAL_DEBT.md`);
`stateMachine.ts`'s `applyIdempotentTransition`/`generateAuditTrailEntry` remain unintegrated (same P1 item
from prior stages); the in-memory rate limiter (same P3 item).

## 2026-09-13 (4) — Discharge, back-referral, and follow-up closed-loop deepening

**What changed:**
- Audit (`docs/stage-9-discharge-back-referral-audit.md`) of the whole post-referral workflow found: an
  ADMIN-facility-check bug that blocked admins from acting on receiving-facility steps, a `familyNotified`
  flag that was always hardcoded `true` regardless of whether any family account existed to notify, no
  origin-facility acknowledgment step between "back-referral sent" and "follow-up assigned" (so the loop
  wasn't actually closed -- the receiving facility unilaterally created follow-up tasks and picked the
  worker), a hardcoded universal 3-day maternal follow-up window, an inconsistent day-level-vs-moment-level
  overdue calculation between the follow-up dashboard's stat count and its per-task badges, and
  `adminOverrideStatus` able to force any non-terminal referral straight to `CLOSED` while completely
  bypassing the follow-up-completeness check the normal auto-close path enforces.
- Fixed the ADMIN-facility bug with shared `canActOnReceivingFacility`/`canActOnReferringFacility`
  predicates (replacing six inconsistent inline checks), and fixed `familyNotified` to reflect whether a
  real patient/caregiver notification was actually sent.
- Discharge now requires an explicit destination/next-care-location field (coordination bookkeeping only --
  never a medical-fitness determination) and surfaces incomplete admin/document tasks in its audit metadata.
- Split back-referral into two real steps: `generateAndSendBackReferral` (drafts and sends the summary,
  moves to `BACK_REFERRED`, no follow-up tasks yet) and a new `acknowledgeBackReferral` (origin-facility-only,
  rejects a duplicate acknowledgment, assigns the follow-up worker, and only then creates the near-term
  admin-follow-up tasks and -- for referrals with a linked newborn case -- the six-milestone newborn
  continuity schedule). This is a genuine closed loop now:
  `Created -> notified -> acknowledged -> follow-up assigned -> completed/overdue`.
- Maternal/administrative follow-up due dates are now a `SystemSetting`-backed, admin-configurable window
  (mirroring the existing newborn-milestone-template pattern) instead of a hardcoded 3 days.
- `FollowUpTask` now records who resolved it and any completion/skip note (`resolvedById`, `resolutionNote`),
  shown in both the referral detail follow-up panel and reflected through the shared task-state derivation.
- Consolidated the follow-up dashboard's overdue stat and per-task badge onto the same
  `deriveFollowUpTaskState` function already used by the referral detail page (they previously used two
  different cutoffs -- a coarse day-level one for the stat, a precise moment-level one for the badge -- so a
  task overdue by a few hours today could show an OVERDUE badge without being counted in the stat above it).
  Added a short "why overdue" explanation in both views, framed explicitly as an administrative reminder,
  never a clinical emergency signal.
- Added case closure safeguards: a new pure `getClosureBlockers` check (incomplete follow-up tasks,
  incomplete admin/document tasks, an unacknowledged back-referral) that both `adminOverrideStatus` (forcing
  `CLOSED`) and a new ordinary `closeCase` action (available to the referring doctor or a coordinator at
  either facility, not only an admin) now run before closing -- refusing with the exact blocker summary
  unless the actor explicitly confirms past it. Moving a referral off a terminal status is now logged as an
  explicit `REFERRAL_REOPENED` action rather than a generic override. A second closure attempt on an
  already-closed referral is rejected outright.
- Updated `13_DEMO_GUIDE.md` and `07_API_SPECIFICATION.md` to match the new two-step back-referral flow,
  the discharge destination field, and the new close/acknowledge endpoints.

**Why it changed:** Requested Stage 9 (discharge, back-referral, and follow-up deepening).

**How it was tested:** `npx tsc --noEmit`, `npx vitest run` (172/172, +19 new tests this stage across
`access.test.ts`, `adminCompleteness.test.ts`, `newbornContinuity.test.ts`, and the new
`closureSafeguards.test.ts`), `npx next lint`, `npx next build` all clean after every unit. Live HTTP smoke
tests covered: the ADMIN-facility fix (before/after), the full discharge -> back-referral -> acknowledge ->
follow-up-completion -> auto-close sequence end to end (including a rejected duplicate acknowledgment and a
rejected early-closure attempt with the exact blocker summary), the explicit `closeCase` path with
`confirmOutstanding`, a rejected duplicate closure on an already-closed referral, and the five key pages
(`/dashboard`, `/referrals`, `/analytics`, `/admin`, `/settings`) all returning 200 after a fresh seed.
Playwright: one honest attempt (not an open-ended retry loop) -- 2 of 6 tests in the closed-loop spec passed,
1 failed on a transport-assignment UI timeout unrelated to this stage's changes (`Mark en route to pickup`
button not found within 30s), 3 downstream serial tests didn't run as a result. The machine measured ~1.6GB
free out of 8GB during the run, consistent with the same resource-contention pattern documented in every
prior stage's E2E attempts -- **not claimed to have passed cleanly.**

**Commits:** `030f7f5`, `7c6b313`, `f9dd9a7`, `ef825d3`, `a892fff`, `cee3af3`, `b38ae08`, `68fd231`, `61314db`.

**Known limitations carried forward:** the full Playwright E2E suite remains unconfirmed on this development
machine under current memory conditions (same limitation noted in the Stage 5 changelog entry); reopening a
closed referral is only reachable through the ADMIN-only override endpoint, not a dedicated UI action.

## 2026-09-13 (3) — Analytics KPIs, judge demo fixes, E2E smoke suite

**What changed:**
- Analytics audit found real gaps against the requested metric list (`docs/analytics-and-demo-audit.md`):
  no pending/acknowledged/rescued counts (the referral list page already defines these), no transport-pending
  count, one generic admin-completeness number blending in benefit-checklist tasks specifically, no
  back-referral completion rate, and one blended follow-up completion rate mixing a few-days handoff task
  with an eight-month newborn continuity milestone. Added `src/lib/analytics/kpi.ts` (pure, unit-tested) and
  wired all of it into `computeAnalytics.ts`/the analytics page, reusing `listView.ts`'s
  `summarizeReferralCounts` rather than reinventing overlapping definitions. Also gated `/analytics` to
  `DOCTOR`/`COORDINATOR`/`ADMIN` (it had no role check at all before), added an empty state, and added an
  accessible table alternative to the funnel chart (Recharts renders to an SVG with no built-in
  screen-reader summary). Added date-range filtering (`from`/`to`, URL-synced).
- Judge demo audit found two real functional gaps and several fabricated claims in `docs/13_DEMO_GUIDE.md`
  (same pattern as the Stage 1 documentation audit, in a file that one didn't touch): `RESCUE_ACTIONS` was
  defined but referenced nowhere else in the codebase -- no UI let a care-team member act on a STUCK
  referral beyond the generic admin override -- and `launchJudgeDemoScenario()` never included a newborn
  case, so the flagship demo never showed the newborn continuity milestones from Stages 2-4. Fixed both:
  added `applyRescueAction()` (audited, notifies the receiving facility's coordinators for
  retry/escalate) plus a `RescueActionsPanel` shown in the STUCK banner, and added a linked newborn case to
  the judge demo scenario. Rewrote the demo guide to remove the fabricated claims (an "encrypted" token,
  "cryptographic timestamps," "SMS/WhatsApp" templates, fabricated task names, unmeasured "connection
  latency," a fictional "rerouting prompt") and describe the real rescue-action and newborn-continuity flow.
- E2E investigation (`docs/E2E_EXECUTION_PLAN.md`) found the suite's worker/serial/browser-reuse/setup
  choices were already reasonably optimized, and added a focused smoke config
  (`playwright.smoke.config.ts`, `npm run test:e2e:smoke`) running just the one spec file that already
  covers the whole core journey. Running it caught a real, self-inflicted regression: Stage 4's
  accessibility pass shortened five form placeholders once real labels made the old wording redundant,
  breaking five `getByPlaceholder(...)` E2E selectors across two spec files -- fixed by switching them to
  `getByLabel(...)`.

**Why it changed:** Requested Stage 5 (analytics, judge demo, E2E readiness).

**How it was tested:** `npx tsc --noEmit`, `npx vitest run` (153/153, +16 new tests this stage), `npx next
lint`, `npx next build` all clean after every unit; live HTTP smoke tests for every changed screen and
workflow (KPI rendering, role-gate redirect, rescue-action end-to-end including timeline confirmation,
judge-demo newborn-case inclusion, date-range empty state). Playwright: two honest smoke-suite attempts, not
an open-ended retry loop -- the first found and the fix confirmed a real regression; the second hit the
same resource-contention pattern documented in every prior stage (two different failures in two different
tests, not a repeat of the same bug), on a machine that measured 1.0-2.0 GB free throughout. **Not claimed
to have passed cleanly** -- full honest accounting in `docs/E2E_EXECUTION_PLAN.md`.

**Commits:** `db48506`, `0ec0bca`, `cb07b5a`, `0c0d511`, `0d8dca5`, `4ed0f37`, `7f1b84f`.

**Known limitations carried forward:** a "minimal seed" mode for faster smoke runs was identified as a real
opportunity but deliberately not built this stage (the shared seed script also backs `npm run db:seed` and
the admin panel's reset button; changing its behavior for E2E speed alone risks affecting both without a
dedicated review); the full E2E suite remains unconfirmed on this development machine under current memory
conditions.

## 2026-09-13 (2) — Accessibility sweep, mobile fixes, configurable newborn continuity

**What changed:**
- Systemic accessibility gap closed: `htmlFor`/`id` label-input pairing was used nowhere in this codebase
  (every `<label>` was a visual sibling, never programmatically associated). Added `src/components/ui/Field.tsx`
  and used it, or direct `htmlFor`/`id` pairs, across every form named in the review: `CaregiverManager`,
  `FacilitiesTable`'s add-form, `CreateReferralForm`, `AckTimeoutForm`, `NotificationTemplatesPanel`,
  `OnboardingWizard`'s caregiver step, `ReferralActions`' transport/discharge/back-referral/override forms,
  `DocumentsPanel`'s file input and type select, `LoginForm`, and `LanguageForm`.
- Fixed several controls whose accessible state didn't match their visual state: `AiCopilot`'s toggle button
  said "Open assistant" even while open; `NotificationBell`'s unread count was a color-only badge with no
  screen-reader equivalent; the onboarding language picker and referral-list status filters indicated
  selection by color alone; neither nav (desktop sidebar or mobile bottom nav) marked the current page for
  assistive tech (`aria-current`); the login failure message had no `role="alert"`; `GlobalSearch`'s results
  dropdown had no Escape-to-close and an invalid ARIA combination (fixed to a proper combobox/listbox pattern
  after ESLint's `jsx-a11y/role-supports-aria-props` caught the first attempt).
- Real mobile-overflow bug: `AiCopilot`'s chat panel was a fixed 352px wide, positioned 16px from a viewport
  edge -- on a 360px-wide phone, part of the panel rendered off-screen (invisible to page-scroll checks,
  since fixed-position elements don't affect `scrollWidth`). Made both width and height viewport-aware.
- Newborn continuity milestone schedule is now admin-configurable: `NewbornMilestoneTemplate` (migration
  `add_newborn_milestone_template`) replaced the hard-coded schedule constant as the runtime source of
  truth, with a validated (`validateMilestoneTemplateInput`), audit-logged, `ADMIN`-only admin-panel table.
  `FollowUpPanel` became a connected timeline with an explicit completed/upcoming/overdue/skipped state per
  milestone and a new "Skip" action (`COORDINATOR`/`ADMIN` only, reason required).
- Found and fixed a real authorization gap in the process: `completeFollowUpTask()` never actually enforced
  its own role-visibility rule server-side -- only the API route's `requireRole()` ran, and the UI's
  button-visibility check was the only thing stopping a FOLLOWUP worker from completing someone else's
  assigned task via a direct API call. Now enforced inside the service function itself.

**Why it changed:** Requested Stage 4 (accessibility + mobile UX sweep, newborn continuity UI depth).

**How it was tested:** `npx tsc --noEmit`, `npx vitest run` (137/137, +19 new tests this stage), `npx next
lint`, `npx next build` all clean after every unit. Live-verified: label associations render (3 `for="..."`
attributes on the caregiver form), `aria-current="page"` on both navs, unauthorized milestone-template
access correctly rejected (403 for a doctor account on both GET and POST), a valid milestone creation
audit-logs `MILESTONE_TEMPLATE_CREATED` (visible in the admin panel), and the timeline/skip UI renders
correctly against seeded data.

**Commits:** `8d5fc54`, `1d0a522`, `462bd57`, `bcdefb3`, `5a9a70c`, `49b3ed5`, `6d848d9`, `b6e56c9`.

**Known limitations carried forward:** missed-appointment tracking is still a generic due-date comparison,
not appointment-type-aware; caregiver reminders remain in-app only (no push/SMS/WhatsApp, matching the rest
of the app's demo-adapter-only notification scope).

## 2026-09-13 — Component consistency, referral list/detail overhaul

**What changed:**
- Standardized date/time display (`src/lib/format.ts`: `formatDate`/`formatDateTime`/`formatDuration`) across
  the referral timeline, notifications, admin audit log, benefit rules, and follow-up surfaces -- previously
  a mix of bare `toLocaleString()`/`toLocaleDateString()` and one explicit format. `formatDuration` also fixed
  a readability regression from the newborn continuity work: the Rescue Engine's `minutesWaiting` could now
  legitimately be in the tens of thousands (a multi-month follow-up wait), which rendered as an unreadable
  five-digit number in the STUCK banner and the analytics page.
- Added a brand-colored `:focus-visible` ring to the shared `Button` component (previously relied solely on
  the browser default outline).
- Referral list (`/referrals`): added six summary count tiles (total/pending/acknowledged/delayed/completed/
  rescued), urgency and facility filters, a debounced non-sensitive search (referral code/patient pseudonym/
  facility name), a sort control (recent/urgency/status), and bounded pagination (20 per page). All filter/
  sort/count logic lives in `src/lib/referral/listView.ts`, pure and unit-tested (12 tests), so it doesn't
  depend on a database to verify.
- Referral detail (`/referrals/[id]`): follow-up tasks (near-term handoffs and, when applicable, the newborn
  continuity milestones) moved out of the generic Actions card into their own "Follow-up & newborn
  continuity" panel, now showing each task's category, due date, and assignee -- previously an
  undifferentiated list with no category or date shown.
- Fixed two concrete, Part-1-checklist-driven issues: none of the three admin tables (Users, Facilities,
  Benefit rules) were wrapped in a horizontal-scroll container (would overflow the page on a narrow phone),
  and a status-toggle button in the benefit rules table had no accessible name beyond its badge text.
- Create-referral form: added required-field indicators, a real `<label>` for the newborn-name input
  (previously placeholder-only), and a Cancel action (previously the only way back was the browser's own
  back button).
- Extracted `canCompleteFollowUpTask()` (role-based visibility for the new follow-up panel) as a pure,
  unit-tested function rather than inline component logic.
- Reviewed Card/CardHeader/CardBody and their content components -- already consistent, no changes needed.

**Why it changed:** Requested Stage 3 (shared component consistency + referral list/detail experience).

**How it was tested:** `npx tsc --noEmit`, `npx vitest run` (102/102, +25 new tests this stage), `npx next
lint`, `npx next build` all clean after every unit; live HTTP smoke tests against freshly seeded demo data
for every changed screen (referral list with combined filters, referral detail's new panel, the create form,
analytics' duration formatting, and the admin tables).

**Commits:** `f7e4ca5`, `9ab2fc3`, `21666bd`, `1e1bf94`, `2fe1e1e`, `78dafae`, `5109d8d`.

**Known limitations carried forward:** no component-rendering test setup exists in this project (Vitest here
covers pure logic only; UI behavior is Playwright's job) -- `FollowUpPanel`/`ReferralListControls` are
therefore verified via their extracted pure logic plus live smoke tests, not a rendered-component test.
Several other forms besides the create-referral form still label fields via placeholder text only (deferred
to the dedicated accessibility stage, as in Stage 2).

## 2026-09-12 (2) — UI design tokens, SafeJourney branding, newborn continuity journey

**What changed:**
- Registered `--brand`/`--surface`/`--border` etc. as real Tailwind `@theme` tokens and replaced 76
  arbitrary-value (`bg-[var(--brand)]`) call sites across 33 files with clean utility classes (`bg-brand`).
  Pure refactor, pixel-identical output.
- Display copy across the app now reads "SafeJourney" instead of "Maatri-Relay" (file/route/DB identifiers,
  the GitHub repo name, and `MR-` referral codes intentionally unchanged).
- Fixed two mobile-navigation gaps: the app's only logout control lived in the desktop-only sidebar (no way
  to log out on mobile), and the bottom nav's hardcoded `.slice(0, 5)` silently dropped "Settings" for
  Coordinator/Admin (both have 6 nav items).
- Added a visible keyboard-focus state and an accessible name to the header's global search input, which
  previously had neither.
- Reviewed the newborn follow-up feature against the full spec checklist (see
  `docs/newborn-continuity-review.md`) and found it was effectively unbuilt beyond a bare data record. Added
  a configurable six-to-eight-month milestone schedule (`src/lib/referral/newbornContinuity.ts`) that
  schedules a home visit, two immunization reminders, two growth check-ins, and a final continuity review
  whenever a referral has a linked newborn case -- every milestone phrased as a coordination reminder, never
  a clinical instruction (test-enforced).
- Found and fixed a real pre-existing bug while doing that review: the Rescue Engine applied a 10-minute
  operational SLA timer to the follow-up status, which would have flagged every newborn referral STUCK for
  its entire multi-month journey. Follow-up escalation now depends on whether an actual follow-up task is
  overdue, not a blanket timer.
- Corrected two stale claims in `docs/06_DATABASE_SCHEMA.md` (a "no soft-delete" line that contradicted the
  soft-delete fields documented two paragraphs above it, and a "two migrations" count that was five behind).

**Why it changed:** Requested Stage 2 (UI/design-system pass + mandatory newborn-continuity depth review)
of the ongoing incremental development plan.

**How it was tested:** `npx tsc --noEmit`, `npx vitest run` (78/78, +7 new tests), `npx next lint`,
`npx next build` all clean after every unit; a live dev-server smoke test confirmed the rebrand rendered
correctly and the mobile logout/Settings fixes worked; a direct query against freshly-seeded demo data
confirmed a newborn referral mid-journey shows the correct completed/pending milestone split and reports
`ON_TRACK` rather than the pre-fix false `STUCK`.

**Commits:** `e2e2ea3`, `eebf401`, `8cfefdb`, `66b166f`, `a442a7f` (see `git log` for details).

**Known limitations carried forward:** the milestone schedule is a fixed default, not yet
admin-configurable; no dedicated continuity-timeline UI; caregiver reminders are in-app only (no push/SMS);
several forms still label inputs via placeholder text only rather than visible `<label>` elements (deferred
to the dedicated accessibility stage). See `docs/newborn-continuity-review.md` for the full list.

## 2026-09-12 — Baseline audit, build fix, documentation-accuracy correction

**What changed:**
- Full repository audit against the running app, test suite, lint, and build (not assumptions) —
  written up in `docs/development-audit.md`.
- Fixed a broken production build/lint: `catch (err: any)` in `src/lib/referral/stateMachine.ts` violated
  `@typescript-eslint/no-explicit-any`; `next build` runs lint as part of compilation, so the build had been
  broken since the commit that introduced it. Narrowed to `catch (err)` with an `err instanceof Error`
  guard.
- Corrected three documentation files (`docs/ENGINEERING_GUIDE.md`, `docs/INTERVIEW_GUIDE.md`,
  `docs/TECHNICAL_DEBT.md`) and `README.md`, which described a clinical "Obstetric Early Warning Score" risk
  calculator, GPS ambulance telemetry, an SMS gateway, NICU/HDU/ICU bed reservation, and an offline QR token
  said to decrypt vitals/allergy history — none of which exist anywhere in `src/`, verified by direct grep
  and file reads. The clinical-score claim in particular directly contradicted this project's core rule
  against calculating clinical risk. Rewrote all four documents to describe only real, verified behavior,
  correcting test-count badges (53 → 71) and softening "E2E Verified" to "E2E Suite" to match the honestly
  documented state in `docs/11_TESTING_STRATEGY.md`.
- Added `docs/changelog.md` (this file).

**Why it changed:** Operating instructions require inspecting the actual repository rather than assuming
completeness, and require that documentation never claim clinical decision-making functionality. The audit
found the build silently broken and safety-relevant documentation describing capabilities that don't exist.

**How it was tested:** `npx tsc --noEmit` (pass), `npx vitest run` (71/71 passing), `npx next lint` (clean
after the fix), `npx next build` (clean after the fix), fresh `db:seed` + dev server boot + landing-page
fetch (200, correct content).

**Commit(s):** see `git log` for the commit(s) covering this entry (recorded at push time, not duplicated
here to avoid drift if commits are amended/rebased before push).

**Known limitations carried forward:** `applyIdempotentTransition`/`generateAuditTrailEntry` in
`stateMachine.ts` remain tested but unintegrated into `referralService.ts`'s real write path (tracked in
`docs/TECHNICAL_DEBT.md`); 2 of 3 tests in `e2e/admin-and-onboarding.spec.ts` remain unconfirmed in a clean
run on this development machine (tracked in `docs/11_TESTING_STRATEGY.md` and `docs/16_FUTURE_ROADMAP.md`
item 12).
