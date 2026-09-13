# 15. Limitations

Honest, explicit scope cuts made to ship a reliable, working MVP in the available time. None of these are
accidental gaps — each was a deliberate call, listed here so nobody mistakes a demo simplification for a
production claim.

## Architecture

- **Single Next.js process, not separate frontend/backend services.** The `lib/**` service layer is
  structured so it *could* be extracted into a standalone API service later, but this MVP does not do that.
- **SQLite, not Postgres/pgvector.** Zero-config and fully offline for a hackathon judge to run locally;
  the schema and code are written so switching to Postgres is a two-line change (see `12_DEPLOYMENT.md`),
  but pgvector-backed embedding search was never implemented — the "RAG" layer is keyword-overlap scoring
  over a small hand-written knowledge base (see `08_AI_ARCHITECTURE.md`).
- **No Redis / job queue.** Notification delivery is synchronous and best-effort; there is no retry queue.
- **S3 storage adapter (closed, untested against a real bucket).** `src/lib/storage/providers/s3.ts` is a
  real, complete PutObject/GetObject adapter using `@aws-sdk/client-s3`, selected automatically when
  `STORAGE_PROVIDER=s3` and `STORAGE_BUCKET`/`STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY` are all set (falls
  back to the local adapter with a logged warning if any are missing, so an incomplete config never hard-
  fails uploads). `STORAGE_ENDPOINT` targets any S3-compatible service (MinIO, DigitalOcean Spaces,
  Cloudflare R2), not just AWS. Verified: the fallback path (unit-tested), the shared validation/key-
  generation logic (unit-tested), and that the module loads and typechecks cleanly. **Not** verified against
  a real S3 bucket -- no credentials exist in this environment. Treat this as code-reviewed and structurally
  sound, not as "confirmed working against AWS."

## AI / OCR / Notifications

- **No real LLM, OCR provider, or messaging provider is wired up**, by design (spec section 41 requires the
  app work with zero paid credentials). Every provider abstraction has exactly one adapter implemented:
  `demo`. Real adapters would be new files behind the same interfaces, not a rewrite.
- **Translation is not real machine translation.** `aiService.translate()` in demo mode returns the source
  text with an explicit "Demo mode" notice. Static UI copy is only translated into Hindi/Marathi in a
  handful of representative places (see "Internationalization" below), not exhaustively across every string.
- **Document extraction is illustrative, not real OCR.** `ocrService.extractDocument()` generates plausible
  field values from a seeded pseudo-random function keyed on the filename + declared type — it does not
  read the actual file bytes. This is explicitly labeled in every extraction's `warnings` array: "Demo
  extraction: values are illustrative and must be reviewed before confirming."

## Internationalization (partially closed)

`src/lib/i18n/translate.ts` is a real, working, unit-tested (5 tests) dictionary-based translation layer
for Hindi and Marathi -- not just architecture. `translate(lang, "English string")` returns the matching
translation or the original English text unchanged if uncovered. It's wired into the sidebar/mobile nav
labels, role labels, and the full patient-facing "My Journey" experience (dashboard + referral detail
page): the journey checklist stop labels and every "what happens next" message per referral status, live-
verified by switching `patient@demo.local`'s language via Settings and confirming the rendered HTML changes
(both Hindi and Marathi checked directly against the running app).

Coverage is deliberately concentrated on the patient/caregiver-facing surfaces, which is what spec section
27 actually cares about ("patient and caregiver friendly... multilingual-ready") -- not exhaustively across
every provider-facing microcopy string, the landing page, or the login page (those still render English
only, since no user session/language preference exists before login). Extending coverage to more surfaces
means adding more `[english]: translated` entries to the dictionary and wrapping the display site with
`translate(lang, "...")` -- no architectural change required, and no component needs to change to support a
fourth language beyond adding its dictionary.

## Product surface

- **Onboarding wizard (closed).** `/onboarding` (`src/app/onboarding/`) runs once for a first-time PATIENT
  or CAREGIVER login (`User.onboardedAt` null): Welcome → Language → (PATIENT only) add a caregiver,
  optional → "who can see your case" consent explanation → dashboard. The seeded demo accounts are marked
  already-onboarded so the standard walkthrough isn't interrupted; a caregiver added live via "Add
  caregiver" gets a fresh account and genuinely sees the wizard on first login -- live-verified end-to-end
  over HTTP (new account → redirected to `/onboarding` → language set to Hindi → completed → lands on a
  Hindi-rendered dashboard). Adapted from spec section 58: the "Role" and "State/facility context" steps
  are omitted because neither is user-chosen in this system's model (role and facility are fixed by
  whoever creates the account/referral, not selected by the user during onboarding) -- including them would
  have meant fake, non-functional wizard steps.
- **Notification template management (closed).** `NotificationTemplate` (admin-editable) backs every
  notification's title/body, falling back to the compiled-in default in
  `src/lib/notifications/templates.ts` when no override exists. Editable at `/admin` → "Notification
  templates" (edit or revert-to-default per key); `{{placeholder}}` tokens are validated as required on
  save. Live-verified: edited `REFERRAL_ACCEPTED_DOCTOR`'s copy via the admin API, then triggered a real
  accept action and confirmed the resulting notification used the edited text, not the default.
- **System health (closed).** `/admin` → "System health" shows a live DB connectivity check (`SELECT 1`),
  demo/production mode, total referral count, and process uptime -- all computed fresh on every page load,
  not cached or faked.
- **Soft-delete (closed) for Users and Facilities.** `User.deactivatedAt` / `Facility.deactivatedAt` (both
  nullable, both reversible). A deactivated user cannot log in (`/api/auth/login` returns 403) and is signed
  out of any live session immediately (`getCurrentUser()` treats a deactivated account as unauthenticated,
  not just blocked at the login screen) -- without deleting a single referral, audit entry, or notification
  they're attached to. A deactivated facility is excluded from every "create referral" facility picker and
  from new-referral coordinator notifications, while every historical referral that named it is untouched.
  Referrals, patients and documents are deliberately **not** soft-deletable -- `CLOSED`/`CANCELLED` already
  serve as their natural terminal state, and spec's audit-trail requirements (section 32) argue against ever
  hiding a referral's history. Live-verified: deactivated a fresh test user, confirmed login then returned
  403, reactivated, confirmed login succeeded again.
- **Admin CRUD for users/facilities (partially closed).** `/admin` → Users and Facilities are no longer
  read-only: each row has a Deactivate/Reactivate action (self-deactivation blocked), and Facilities has an
  inline "Add facility" form. Creating/editing individual user accounts (name, role, facility reassignment)
  from the admin UI is still not built -- spec section 56 only actually enumerates benefit rules, referral
  configuration, notification templates and demo data as admin-editable; user/facility lifecycle management
  was added here as a natural extension once soft-delete existed to back it, not because spec required it.

## Rate limiting (partially closed)

`src/lib/rateLimit.ts` implements an in-memory token-bucket limiter, applied to `/api/auth/login` (10/min
per IP — brute-force/credential-stuffing protection), `/api/ai/assistant` (20/min per account -- bounds
cost once a real provider is configured), and `/api/documents` upload (30/5min per account -- bounds
storage abuse). It is process-local state, correct for this MVP's single-process deployment target but not
shared across multiple instances -- a real multi-instance deployment would move this state to Redis behind
the same `checkRateLimit()` signature. Not every mutation route has a limiter yet; the three above were
judged highest-value (credential attacks, cost exposure, storage exhaustion).

## Testing (E2E gap closed)

- A real, browser-driven Playwright E2E suite now exists under `/e2e` (`npm run test:e2e`) and passes
  end-to-end against the actual running app -- not mocked. It covers: the full spec-section-70 acceptance
  scenario (doctor creates → document upload/extract/confirm → coordinator accepts → transport request/
  assign/progress → arrival → discharge → back-referral → follow-up completion → automatic CLOSED), the
  patient-facing journey view + Referral Passport, the authorization boundary (a patient cannot open
  another patient's referral), and the Referral Rescue Engine's immediate STUCK detection. See
  `11_TESTING_STRATEGY.md` for details, including two real bugs this suite caught and fixed (a Windows
  `execFile`/`.cmd` spawn bug in the demo-reset shell-out, and a test-selector race condition).
- **No frontend component tests** (React Testing Library) still exist as a separate layer -- the E2E suite
  covers component behavior indirectly through real user flows instead.
- The E2E suite is intentionally `workers: 1` (fully sequential) because concurrent first-time requests to
  the same cold `next dev` server were observed to race on its on-disk webpack/build manifest and
  intermittently corrupt it -- a `next dev`-only artifact, not a production concern, but worth knowing if
  you parallelize this later (only after moving to a production build for the E2E target, or giving each
  worker its own `.next` cache directory).

## Roles

- ASHA/ANM is represented by the generic `FOLLOWUP` role rather than a distinct persona with its own
  permissions — the architecture supports adding a distinct role (one new value in `RoleName` + a nav
  entry), but that specific persona split was not built out.
