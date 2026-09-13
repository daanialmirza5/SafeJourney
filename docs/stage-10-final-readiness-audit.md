# Stage 10 Audit — Final Readiness Review

Evidence-based review performed 2026-09-14, after Stage 9 (discharge/back-referral/follow-up/closure)
shipped. Findings below come from direct code reading, two parallel read-only research passes (UI/mobile/
accessibility; rescue engine/analytics/demo/docs/notifications/audit events), and live HTTP verification for
every authorization finding -- not from assuming prior-stage documentation is still accurate.

## Git identity and GitHub ownership (verified first, per this stage's explicit instruction)

- Local `git config user.name` / `user.email` already correctly set to `daanialmirza5` /
  `daanialmirza@gmail.com` -- no correction needed.
- `git remote -v` confirms the only remote is `https://github.com/daanialmirza5/Maatri-Relay.git`.
- `gh api repos/daanialmirza5/Maatri-Relay/collaborators` (read-only inspection, no changes made) returned
  exactly one collaborator: `daanialmirza5`, role `admin`. **No other account -- bot, Claude, Antigravity,
  Gemini, service, or otherwise -- is a collaborator on this repository.** Nothing was added, invited, or
  modified.
- `git log --format="%h | %an | %ae | %s" -20` shows every commit authored by `daanialmirza5
  <daanialmirza@gmail.com>`.

## Security and authorization review (Phase 4) -- the most significant finding this stage

Direct inspection of every exported mutating function in `src/lib/referral/referralService.ts`, cross-checked
against each route's role gate and the UI's own visibility conditions (`isReferringFacility`/
`isReceivingFacility` in `ReferralActions.tsx`), specifically hunting for "a UI action that's hidden but still
callable via the API" per this stage's brief:

**Real, confirmed bug (fixed this stage, commit `6ceffdc`):** `requestTransport`, `assignTransport`,
`updateTransportProgress`, `completeFollowUpTask` (for COORDINATOR/ADMIN), `skipFollowUpTask`, and
`applyRescueAction` had **no facility-scope check at all** -- only the route's role gate
(`requireRole("DOCTOR","COORDINATOR","ADMIN")` etc.). The UI already hid these buttons unless
`isReferringFacility || isReceivingFacility`, but nothing enforced that server-side. Live-verified before the
fix: a coordinator from an unrelated third facility could call all of these directly by referral/task ID and
succeed, on a referral they could not even view via `GET /api/referrals/[id]` (which does enforce
`canAccessReferral`). Live-verified after the fix: the same outsider request is now rejected with 403 on all
six paths, while a legitimate same-facility coordinator's identical request still succeeds (positive control
tested). This is a materially more serious version of the ADMIN-facility bug found in the Stage 9 audit --
that one *blocked* a legitimate actor; this one let an *unrelated* actor mutate someone else's case.

**Already correct (verified, no change needed):**
- Every discharge/back-referral/acknowledgment/closure action (Stage 9's `canActOnReceivingFacility`/
  `canActOnReferringFacility`) was already correctly scoped.
- `canAccessReferral` (the read-path check) correctly restricts DOCTOR/COORDINATOR to their own facility,
  PATIENT to their own linked case, CAREGIVER to an active `CaregiverAccess` grant, FOLLOWUP to tasks actually
  assigned to them, ADMIN unrestricted.
- Document routes (`upload`/`extract`/`confirm`/`reject`) all correctly re-derive the referral from the
  document and call `canAccessReferral` before mutating -- consistent, no gap.
- Audit logging: every exported mutating function in `referralService.ts` calls both `logEvent` (timeline)
  and `recordAuditEvent` (audit log) adjacent to its mutation. No missing pairs found.
- Invalid-state-transition rejection: `transition`/`overrideTransition` (`stateMachine.ts`) are the only paths
  that change `status`, and both throw on an invalid move; unit-tested (`stateMachine.test.ts`).
- Duplicate-action rejection: back-referral acknowledgment (Stage 9), case closure on an already-terminal
  referral (Stage 9), and completing/skipping an already-resolved follow-up task (`canCompleteFollowUpTask`/
  `canSkipFollowUpTask` both refuse a non-open task) are all real and tested.
- ADMIN override: `adminOverrideStatus`'s closure-blocker check and `REFERRAL_REOPENED` logging (Stage 9)
  hold up under this review; no new gap found there.

**Implemented but needs polish (not a security bug, a design question worth flagging, not changed this
stage):** `POST /api/documents/[id]/confirm` and `/reject` are reachable by PATIENT/CAREGIVER on their own
linked referral (via `canAccessReferral`'s patient/caregiver branches), and the `DocumentsPanel` UI renders
the Confirm/Reject buttons to them too -- so a patient can mark a document their own hospital uploaded (e.g.
a referral note) as "Rejected." This is consistent UI+API behavior (not a hidden bypass) and low severity (a
status flag, not data loss or exposure), but it's a role-appropriateness question -- should document-review
decisions stay staff-only? -- that this stage did not resolve either way, to avoid changing a patient-facing
feature without being asked. Flagged for a future decision, not fixed.

## Phase 1 — Final product audit, by area

Classification key: **Implemented and verified** / **Implemented but needs polish** / **Missing** /
**Deferred** / **Blocked by environment**.

### Referral lifecycle, discharge, back-referral, follow-up, overdue, closure
All **Implemented and verified** -- this is exactly what Stage 9 built and verified live; this stage's review
found no regression and no new gap in this area beyond the authorization finding above (which is adjacent --
transport, not discharge/back-referral/closure themselves).

### Rescue Engine
- **Implemented and verified**: `computeOperationalStatus` (`rescueEngine.ts`) remains a purely deterministic
  wall-clock threshold check (`minutesWaiting > ackTimeoutMinutes`) -- no scoring, weighting, or ML. All four
  `RESCUE_ACTIONS` are wired end-to-end (service, route, UI, audit, notification) with no dead code.

### Analytics
- **Implemented and verified**: every KPI on `/analytics` traces to a real Prisma-backed computation
  (`src/lib/analytics/kpi.ts`, `computeAnalytics.ts`) -- no hardcoded numbers found. Role-gated to
  DOCTOR/COORDINATOR/ADMIN.

### Judge demo
- **Implemented and verified**: `launchJudgeDemoScenario`/`launchRescueScenario` call the real
  `createReferral`/`uploadDocument`/`extractDocument`/`confirmDocument` service functions -- no shortcuts or
  faked state.
- **Implemented but needs polish**: `POST /api/demo/judge-scenario` and `/rescue-scenario` only require
  `requireUser()` (any authenticated role), not specifically DOCTOR/ADMIN -- permissive but not unsafe (it
  only ever creates new synthetic demo data). Not changed this stage; low priority.
- **Implemented and verified** (destructive-by-design, appropriately guarded): `/api/demo/reset` is
  `ADMIN`-only and wipes and reseeds the entire (all-synthetic) database; the admin UI requires an explicit
  `confirm()` before calling it. No separate "production data" concept exists to protect, since this app has
  none outside the seeded demo world.

### Role-based permissions, audit events, notifications
Covered under Security review above and the notification-specific findings below.

- **Implemented and verified**: every notification send persists a `Notification` row first and only then
  best-effort dispatches through a provider in a try/catch that can never block persistence -- the bell icon
  always reflects what actually happened. Template copy (`templates.ts`) never claims SMS/WhatsApp/push
  delivery.
- **Deferred (by design, already documented)**: the email/WhatsApp "provider" stubs always simulate delivery
  regardless of whether `EMAIL_API_KEY`/`WHATSAPP_API_KEY` are set -- there is no real-adapter branch to
  select, despite a comment implying one exists. This matches `docs/15_LIMITATIONS.md`'s existing "in-app
  only" claim; not a new finding, just reconfirmed.

### Error states, loading states, empty states
- **Implemented and verified** (dominant pattern): loading-state double-submit protection and toast-based
  error surfacing are consistent across nearly every mutating UI component; `EmptyState` is used on every
  primary list/dashboard view.
- **Implemented but needs polish** (fixed this stage, see Phase 2 below): `BenefitRulesTable`'s toggle had no
  loading/disabled guard, unlike every sibling admin table.
- **Implemented but needs polish** (not changed this stage, low severity): `NotificationList`'s optimistic
  mark-read swallows a failed PATCH with no toast -- idempotent and non-critical, but inconsistent with the
  toast pattern used everywhere else. Several sub-panels (`FollowUpPanel`, `BenefitRadar`,
  `ReferralTimeline`, `CaregiverManager`, `TransportStatusCard`) use plain text instead of the shared
  `EmptyState` component for their empty case -- cosmetic inconsistency only, not a missing state.

### Mobile layouts
- **Implemented and verified**: no unguarded fixed widths or page-breaking horizontal overflow found; every
  admin data table is wrapped in `overflow-x-auto`; the app shell correctly swaps to a bottom nav below the
  `md` breakpoint.
- **Implemented but needs polish** (not changed this stage): the 6-item coordinator/admin bottom nav is
  cramped at 320px (labels like "Incoming referrals" will wrap) -- not an overflow bug, just tight.

### Accessibility labels
- **Implemented and verified** (dominant pattern): the shared `Field` component's id/htmlFor pairing is used
  broadly and correctly; most icon-only buttons have `aria-label`; toasts use `role="status"`/`"alert"` +
  `aria-live`.
- **Missing** (fixed this stage, see Phase 2 below): the manual referral-code input on `/scan` and the AI
  copilot's chat input both had no accessible label, placeholder text only.
- **Implemented but needs polish** (not changed this stage): a few plain text inputs (`LoginForm`,
  `AiCopilot`, `ReferralListControls`) rely on a border-color change on focus rather than the same
  `focus-visible:ring-2` treatment `Button` gets -- weaker keyboard-focus visibility than the rest of the app,
  but not literally invisible.

### Documentation accuracy
- **Needs correction (fixed this stage, see Phase 5 below)**: `docs/04_ARCHITECTURE.md` contained several
  overclaims left over from an earlier draft -- "risk-scoring" (directly contradicts this project's core
  non-clinical rule), "ambulance dispatch, real-time handoff tracking" (transport is a manual demo-mode
  form, not real-time or dispatch-integrated), "bed assignment" (no such feature exists in the schema or UI),
  and aspirational per-stage descriptions ("clinical outcome validation", "counter-referral generation") not
  reconciled with what `stateMachine.ts`/`referralService.ts` actually do.
- **Needs correction (fixed this stage)**: `README.md` described analytics as "real-time" and the patient
  view as showing "real-time status" -- both are server-rendered per page load, not a live/push update
  mechanism.
- **Already correctly caveated (verified, no change needed)**: `docs/13_DEMO_GUIDE.md`, `docs/02_PRD.md`,
  `docs/TECHNICAL_DEBT.md`, `docs/16_FUTURE_ROADMAP.md`, and every prior stage's audit doc all already
  correctly frame encryption/GPS/telemetry/SMS/WhatsApp/bed-reservation/risk-scoring as either not
  implemented or explicitly simulated.

## What this stage does about it

- **Phase 2 (UI polish)**: fixed the `BenefitRulesTable` missing-loading-state gap and the two missing
  accessible input labels (`/scan`, AI copilot chat). Left lower-severity/cosmetic items (notification
  mark-read error toast, plain-text empty states, focus-ring consistency on a few inputs, cramped mobile nav)
  undone -- genuinely minor, and fixing them all would be complexity for its own sake against this stage's
  explicit "do not add decorative complexity" instruction.
- **Phase 4 (security)**: fixed the cross-facility authorization gap (commit `6ceffdc`) described above --
  the one finding in this entire review that materially matters for a coordination platform's trust model.
- **Phase 5 (docs)**: corrected `docs/04_ARCHITECTURE.md` and `README.md`'s overclaims.
- Everything else above is genuinely fine as-is, or is a deliberate, documented deferral -- not a gap
  papered over.
