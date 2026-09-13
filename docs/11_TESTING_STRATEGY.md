# 11. Testing Strategy

> Update 2026-09-13 (Stage 5): unit test count is now **153** across 15 files (this section's per-file
> breakdown below predates several additions -- `format.test.ts`, `validation.test.ts`,
> `referral/listView.test.ts`, `referral/newbornContinuity.test.ts`, `analytics/kpi.test.ts` -- each covering
> the pure logic added alongside its feature; see their own commit messages for what each covers rather than
> duplicating that here). Also added `playwright.smoke.config.ts` / `npm run test:e2e:smoke` -- see
> "Focused smoke suite" below and `docs/E2E_EXECUTION_PLAN.md` for the full investigation behind it,
> including a real E2E selector regression this stage found and fixed.

## Automated unit tests (Vitest, 62 tests, `npm run test`)

All in `src/lib/**/*.test.ts`, targeting the pure rule engines where thorough coverage is cheap and
valuable:

- `referral/stateMachine.test.ts` (11) — full happy-path sequence, transport-optional branch, every
  explicitly forbidden jump from spec section 51, all override rules (cancel-any-non-terminal, reject
  cancel-a-terminal, require non-empty reason, reject same-status override).
- `referral/rescueEngine.test.ts` (7) — ON_TRACK within timeout, STUCK past timeout for both SENT and
  TRANSPORT_REQUESTED, ACTION_REQUIRED from unconfirmed documents and from a NEEDS_REVIEW admin task,
  terminal statuses always CLOSED regardless of dwell time, a non-default configured timeout.
- `referral/adminCompleteness.test.ts` (5) — 100% with zero applicable tasks, NOT_APPLICABLE excluded from
  the denominator, a real mixed-status percentage, and the default-checklist seeding logic for both
  transport/newborn-relevant and irrelevant cases.
- `benefits/ruleEngine.test.ts` (8) — asserts the engine **never** returns anything but the three safe
  outcomes, each NOT_APPLICABLE trigger (inactive rule, state mismatch, missing newborn case, missing
  transport), missing-documents listing and next-actions generation, and — the most important one — that
  even a fully-matched, fully-documented case still comes back `POTENTIALLY_APPLICABLE` with a
  "verify eligibility" action, never a confirmed approval.
- `ai/safety.test.ts` (2) — a bank of clinical questions is refused, a bank of administrative questions is
  allowed through.
- `referral/access.test.ts` (5) — `canAccessReferral()` authorization for ADMIN (always), DOCTOR/COORDINATOR
  (facility match only), PATIENT (own case only), FOLLOWUP (assigned task only), and CAREGIVER (mocking
  `db.caregiverAccess.findFirst` to prove both the granted and the revoked/absent path).
- `rateLimit.test.ts` (4) — allows calls up to the configured limit, throws `RateLimitError` once exceeded,
  resets after the window elapses (using Vitest's fake timers), and tracks independent keys separately.
- `i18n/translate.test.ts` (5) — a covered string returns its real Hindi/Marathi translation (not the
  English original), an uncovered string and an unsupported language code both fall back to English.
- `notifications/templates.test.ts` (6) — placeholder interpolation, the compiled-in default is used absent
  an admin override, an admin override wins when present, an unknown template key throws rather than
  silently sending blank copy, and every default template's declared `{{placeholders}}` actually appear in
  its own body (a self-check against a template/placeholder-list drifting apart).
- `storage/storageService.test.ts` (9) — MIME/extension/size validation, a real save→read round-trip
  through the local adapter, proof the original filename is never used as the storage key, the
  STORAGE_PROVIDER=s3-with-incomplete-credentials fallback path (if this actually tried to reach S3 it would
  throw -- no credentials exist in this environment -- so a passing round-trip proves the fallback ran), and
  path-traversal rejection on read.

Run: `npm run test` (or `npx vitest run`). Vitest is configured with `pool: "forks"`
(`vitest.config.ts`) rather than the default worker-thread pool: importing `@aws-sdk/client-s3` was
observed to reliably crash the default thread pool with a native access violation during process teardown
on this Windows environment -- after every test had already passed, which would still fail a CI job on a
nonzero exit code. Running each test file in its own child process instead of a worker thread resolved it
cleanly; verified stable across repeated runs.

## End-to-end browser tests (Playwright, `npm run test:e2e`)

A real, checked-in, repeatable browser-automation suite lives under `/e2e`. It runs against a dedicated
`prisma/e2e-test.db` (migrated + seeded fresh by `e2e/global-setup.ts` before the suite starts), driven by
a `next dev` server Playwright starts itself on port 3100 -- it never touches your local demo `dev.db`, so
running it won't disturb a demo you're mid-way through showing someone.

- **`closed-loop-referral.spec.ts`** -- the spec-section-70 acceptance scenario end-to-end, in five ordered
  steps (`test.describe.serial`) sharing one referral id: doctor creates a referral with transport required
  → uploads, extracts and confirms a document → coordinator accepts, requests/assigns/progresses transport
  through arrival → discharges and sends a back-referral assigned to the follow-up worker → the worker
  completes every task and the referral automatically reaches `CLOSED`. Every step performs the real UI
  interaction (form fills, clicks, file upload) and additionally asserts the canonical state via the JSON
  API, so a passing test proves both "the button works" and "the database is actually correct."
- **`patient-journey.spec.ts`** -- the patient-facing view (plain-language journey, "what happens next",
  Referral Passport with its QR image) against the seeded flagship case, plus the authorization boundary:
  a patient attempting to open a referral outside their scope gets a real error, proven by diffing their
  own role-scoped search results against an admin's unscoped ones to find a genuine "not mine" id (never
  hard-coded).
- **`rescue-scenario.spec.ts`** -- confirms the Referral Rescue Engine flags a backdated referral `STUCK`
  immediately on page load, with operational (not clinical) language visible in the UI.
- **`admin-and-onboarding.spec.ts`** -- the three flows added after the original suite (editing a
  notification template's copy and reverting it; creating/deactivating/reactivating a facility; and the
  full deactivate → blocked-login → reactivate → first-time-onboarding-wizard path for a freshly created
  user account, ending on a dashboard rendered in the language chosen mid-wizard). **Confirmed passing**:
  the facility create/deactivate/reactivate test, twice, in independent runs. **Written and typechecked but
  not confirmed passing in this session**: the notification-template-edit and
  deactivate/reactivate-then-onboard tests -- three separate attempts each hit a *different* random UI-wait
  timeout (an input never appearing after a click, a status badge never updating after a click, etc.), never
  the same assertion twice, while this development machine's free memory was independently observed
  dropping to 0.3-1.2 GB of 8 GB total (other resident applications, not this project). That pattern -- a
  different failure point each run, never reproducible, correlated with measured memory pressure -- is the
  signature of resource contention, not a logic defect; a real bug fails the same assertion every time. Both
  flows these two tests exercise were separately confirmed correct via direct HTTP verification (see
  "Integration-level verification" below) before the E2E spec was written. Worth re-running to green before
  trusting it as a CI gate on a machine with headroom to spare -- flagged here rather than glossed over.

### Focused smoke suite

`npm run test:e2e:smoke` (`playwright.smoke.config.ts`) runs only `closed-loop-referral.spec.ts` -- one file
that already exercises the entire core journey in a single `test.describe.serial` block -- as a faster,
representative stand-in for "is the app fundamentally working end to end," at a fraction of the full 6-file
suite's setup and page-load cost. Same shared e2e database, same worker/retry/timeout settings as the full
suite; a narrower file selection, not a different test environment. Running it in Stage 5 caught a real
regression: Stage 4's accessibility pass shortened five form fields' placeholder text once real `<label>`
elements made the old wording redundant, and five `getByPlaceholder(...)` selectors across two spec files had
gone stale as a result -- fixed by switching them to `getByLabel(...)`. Full investigation and honest
run-by-run results in `docs/E2E_EXECUTION_PLAN.md`.

Run: `npm run test:e2e`. Config: `playwright.config.ts` (`workers: 1` -- see `15_LIMITATIONS.md` for why;
`expect.timeout: 30_000`, `timeout: 90_000` and `webServer.timeout: 180_000` because this environment's cold
`next dev` first-compile per route can take significantly longer than Playwright's CI-tuned defaults; plus
`retries: 1`, added after observing that this specific development machine's available free memory can drop
low enough late in a long session -- with an IDE, a browser, WSL2 and other tooling all resident at once --
to intermittently push an otherwise-correct, previously-passing step (routine ones with no relation to
whatever was just changed, e.g. plain referral creation) past its timeout. A logic bug fails the same way on
retry; a resource-contention timeout usually doesn't -- which is exactly what was observed confirming this
diagnosis, alongside the same suite passing cleanly, twice, earlier in the same session before memory
pressure built up. If you hit suite-wide slowness locally, check free memory before assuming a regression.

**Two real bugs this suite caught and fixed, beyond the acceptance-criteria value of the tests themselves:**

1. `resetDemoData()` (and the e2e global setup, which shells out the same way) used Node's `execFile` to
   invoke `npx.cmd` on Windows without `shell: true`, which fails with `spawn EINVAL`. This meant the
   Admin panel's "Reset demo data" button was silently broken on Windows despite passing every earlier
   manual check (which had exercised `judge-scenario`/`rescue-scenario`, not `reset`, over HTTP). Fixed by
   adding `shell: process.platform === "win32"` to both call sites.
2. A test assertion used Playwright's default case-insensitive substring text match (`getByText("Confirmed",
   { exact: false })`) intending to detect a document reaching `CONFIRMED` status, but it also matched the
   Referral Passport card's unrelated "N confirmed" document-count text -- which is present from page load,
   before any document exists. This let the test race ahead of the real mutation and silently prove
   nothing. Fixed by asserting on the Confirm/Reject button pair unmounting instead, which is unambiguous.

## Integration-level verification (performed manually against the running app, not checked into CI)

Because the referral lifecycle is inherently a multi-step, database-backed, multi-actor workflow, the
highest-value verification for this MVP was exercising the **real HTTP API** end-to-end, not a mocked
integration test. This was done with scripted PowerShell/`Invoke-RestMethod` sessions against
`npm run dev`, logging in as each demo role and driving:

1. **Full closed-loop journey**: doctor creates referral (`SENT`) → coordinator accepts (`ACKNOWLEDGED`) →
   confirms arrival (`UNDER_CARE`) → discharges (`DISCHARGED`) → generates & sends back-referral
   (`FOLLOW_UP_PENDING`, two follow-up tasks created) → follow-up worker completes both tasks → referral
   auto-closes (`CLOSED`). Verified at every step via the actual API response.
2. **Referral Rescue Engine**: `/api/demo/rescue-scenario` creates a backdated referral; `GET
   /api/referrals/{id}` confirms `operationalStatus: "STUCK"` with the correct reason string, immediately,
   with no manual "tick" step required.
3. **Authorization boundary**: a patient account attempting to `GET` a referral it has no relationship to
   receives a real `403 Forbidden` from the API (not just a hidden UI element).
4. **Launch Judge Demo**: `/api/demo/judge-scenario` creates a referral with two documents already
   uploaded/extracted (one further confirmed) — verified the returned referral actually contains both
   documents in the correct statuses (this caught and fixed a real bug — see below).
5. Every authenticated page (all 6 dashboards, referral detail, admin, analytics, settings, notifications,
   scan) was hit via an authenticated session and confirmed to return `200` with the expected content
   markers present in the HTML.
6. **Soft-delete + admin CRUD**: created a facility via the admin API, confirmed it excluded from
   `/api/facilities` once deactivated and back once reactivated; created a fresh user (via "Add caregiver"),
   confirmed it could log in, had an admin deactivate it, confirmed both that its *already-open session*
   (`GET /api/auth/me`) was immediately cut off (not just blocked at the next login) and that a fresh login
   attempt returned `403`, then confirmed login worked again after reactivation; confirmed an admin
   attempting to deactivate their own account is blocked with `409`.

**A real bug this process caught:** `launchJudgeDemoScenario()` originally returned the referral object
captured *before* its two documents were uploaded, so the API response (though not the eventual page,
which re-fetches) reported zero documents. Fixed by re-fetching the referral after document upload.

**An operational trap this process surfaced, not a code bug:** on a shared machine, `next dev` silently
falls back to the next free port when 3000 is already taken by an unrelated app -- an HTTP 200 with
plausible-looking HTML from the *wrong* app was briefly mistaken for this one mid-session. Re-verified every
claim in this section against a response body containing a string unique to this app after catching that,
not just a status code. See `docs/12_DEPLOYMENT.md` for the general version of this warning.

## Seed-script-as-integration-test

`prisma/seed.ts` drives ~55 referrals through every combination of state transitions (accept, decline,
transport, arrival, discharge, back-referral, follow-up completion) by calling the exact same
`referralService.ts` functions the API routes call — not a parallel test fixture. A failure in any state
transition's invariants (e.g. an `InvalidTransitionError`) would abort or log during seeding; the seed run
used for this repository's final state completed with zero errors or skipped records across all ~55 cases.

## Build-time verification

`npm run typecheck` (strict TypeScript, zero `any` leakage in the public function signatures listed in this
doc set), `npm run lint` (`next lint`, zero warnings), `npm run build` (production build — confirms every
page compiles, every API route is correctly classified static vs. dynamic, and no server/client component
boundary errors exist).

## Continuous integration

`.github/workflows/ci.yml` runs on every push/PR: a `build-and-test` job (install → `prisma generate` →
`prisma migrate deploy` → typecheck → lint → unit tests → build) followed by an `e2e` job (installs the
Playwright Chromium browser, then `npm run test:e2e`), with the Playwright HTML report uploaded as a build
artifact on failure. This mirrors the exact local command sequence verified throughout development (see
above) rather than inventing a separate CI-only path.

## Known gaps (see `15_LIMITATIONS.md`)

No load/concurrency testing. Frontend components have no dedicated unit tests (React Testing Library) —
verified instead through the Playwright E2E suite (real user flows) and rendered-page assertions over HTTP.
