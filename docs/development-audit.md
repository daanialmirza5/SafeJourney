# Development Audit — 2026-09-12

Baseline audit performed before starting incremental SafeJourney development work. This inspects the
repository as it actually exists (not from memory of prior sessions), per the operating instructions:
"Do not assume that any feature is missing or complete."

## 1. What this repository actually is

- **Framework**: Next.js 14.2.35 (App Router), React 18.3.1, TypeScript (strict), Tailwind CSS v4.
- **Data**: Prisma ORM 5.22 over SQLite (`prisma/dev.db`), enums modeled as `String` columns with TS
  literal unions as the source of truth (`src/lib/types/enums.ts`).
- **Auth**: custom JWT-in-httpOnly-cookie session (`src/lib/auth.ts`), bcrypt password hashing, role-based
  access control enforced in `src/lib/referral/access.ts` and per-route `requireRole`/`requireUser` guards.
- **Package manager**: npm (`--legacy-peer-deps` required — documented, not a defect; a couple of unrelated
  peer-dependency chains conflict with the deliberately-pinned Next 14/React 18 versions).
- **Scripts**: `dev`, `build`, `start`, `lint` (`next lint`), `typecheck` (`tsc --noEmit`), `test` (`vitest
  run`), `test:e2e` (`playwright test`), `db:seed` (`tsx prisma/seed.ts`).
- **Domain surface**: referral lifecycle (`referralService.ts`, `stateMachine.ts`), SLA-based rescue
  engine (`rescueEngine.ts`), deterministic benefit rule engine (JSSK/PMMVY/JSY), document upload +
  illustrative OCR extraction, Referral Passport (QR + human-typed code), transport request/assign/track,
  discharge + AI-drafted (template-based, non-clinical) back-referral, community follow-up tasks, admin
  panel (users, facilities, notification templates, benefit rules, system health, audit trail), a 6-role
  demo account set, and Hindi/Marathi UI coverage concentrated on the patient/caregiver experience.
- **Testing**: 10 Vitest files / 71 unit tests; a Playwright E2E suite (`e2e/*.spec.ts`) covering the core
  closed-loop flow plus a newer admin/onboarding spec (see §4).
- **CI**: `.github/workflows/ci.yml` — build-and-test job, then a separate e2e job.

## 2. Checks run against the current `main` (this session)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **Pass** (exit 0) |
| `npx vitest run` | **Pass** — 71/71 tests, 10/10 files |
| `npx next lint` | **Failed initially** — see §3, fixed, now passes clean |
| `npx next build` | **Failed initially** — same root cause, fixed, now passes clean |
| Fresh `db:seed` + dev server boot + landing page fetch | Pass (200, correct content) |

## 3. Critical findings

### 3.1 A broken production build (fixed this session)

`src/lib/referral/stateMachine.ts` (added in commit `aa109c3`, "idempotent state transitions...") had
`catch (err: any)` in `applyIdempotentTransition`. `@typescript-eslint/no-explicit-any` is enforced by this
project's ESLint config, and `next build` runs lint as part of compilation — so **the production build has
been broken since that commit**. `npm run test`/`typecheck` don't run lint, so this had gone unnoticed.

**Fix applied**: narrowed to `catch (err)` with an `err instanceof Error` guard. Lint and build both pass
clean now. This is the kind of gap CI would have caught if the e2e/build job ran on every push to `main`
directly (it does, per `ci.yml` — worth double-checking the workflow actually ran and was green on that
commit, since a broken build reaching `main` suggests either CI didn't run, was ignored, or its build step
doesn't mirror `next build` exactly).

### 3.2 Fabricated documentation describing non-existent — and disallowed — functionality (fixed this session)

Three docs added in commits `cce697b`/`aa109c3`/`ca71423` (`ENGINEERING_GUIDE.md`, `INTERVIEW_GUIDE.md`,
`TECHNICAL_DEBT.md`) and a rewritten `README.md` described features that **do not exist anywhere in
`src/`**, verified by grep and direct file reads:

- A **"Modified Obstetric Early Warning Score (MEOWS)" clinical risk calculator** "scoring systolic BP,
  pulse, fetal heart rate, and bleeding," plus a `triage-engine.ts` file. No such file, score, or clinical
  field exists in this codebase. This is not a minor inaccuracy — a clinical risk score is exactly what
  this project's core rule prohibits ("does not calculate clinical risk scores"). Had this been real code,
  it would have been a stop-and-ask violation of the non-negotiable constraint; since it wasn't real code,
  it was **false safety-relevant documentation on a public repository**, which is arguably worse for a
  healthcare hackathon submission than an honest gap.
- **GPS ambulance telemetry / live tracking** and an **SMS/GSM gateway** listed in `TECHNICAL_DEBT.md` as
  partially-built debt. Neither Leaflet, a maps SDK, Twilio, nor any telephony library appears anywhere in
  `package.json`. Nothing was started.
- An **offline-decryptable QR token claimed to carry "complete vitals and allergy history"**
  (`INTERVIEW_GUIDE.md`). The actual passport token (`generatePassportToken()` in `referralCode.ts`) is 18
  random bytes hex-encoded — a pure lookup key, never carrying patient data, and `/api/passport/[token]`
  still requires an authenticated, role-checked session to resolve it. The claimed architecture doesn't
  exist and would have been a PHI-exposure risk if it did.
- **NICU/HDU/Obstetric ICU bed reservation** and **"Smart Facility Matcher"** claims in the README. The
  `Facility` model has no capacity/bed fields at all, and `referralService.createReferral` does no
  matching — facility selection is a plain picker.
- Test-count and "E2E Verified" badges had drifted from reality (53 vs. the actual 71 unit tests; "E2E
  Verified" overstated confidence — 2 of 3 tests in `e2e/admin-and-onboarding.spec.ts` are documented in
  `11_TESTING_STRATEGY.md` as not yet confirmed passing in a clean run).

**Fix applied**: rewrote all three docs to describe only real, grep-verified functionality, with an
explicit correction note and pointer to this audit at the top of each. Corrected the README's executive
summary, feature-section copy, mermaid diagram, 7-stage model, demo-persona table, badges, and privacy
claims to match actual behavior (facility acknowledgment instead of bed allocation, status tracking instead
of live telemetry, opaque tokens instead of "encrypted," corrected test counts). One README claim —
**AI-drafted back-referral summaries** — was verified real (`/api/referrals/[id]/back-referral` GET calls
`aiService.generateHandoffSummary`, a deterministic, editable, non-clinical summary) and was left as-is.

I don't know how these three docs and the README rewrite were produced (they weren't part of my own prior
session's work in this repo), but regardless of origin, false clinical-safety-adjacent claims in committed,
pushed, public documentation needed correcting immediately rather than waiting for a later stage.

### 3.3 Unintegrated new code (not broken, but worth tracking)

`aa109c3` also added `applyIdempotentTransition` and `generateAuditTrailEntry` to `stateMachine.ts`, with
real unit tests (20 tests in `stateMachine.test.ts`, all passing). Neither function is called anywhere
outside its own test file — `referralService.ts` still uses the older `transition`/`overrideTransition`
directly and writes to the existing `AuditLog` Prisma model for real audit rows. So the "idempotent state
transitions" and "audit trail ledger" commit message overstates what's live: the logic is correct and
tested, but not yet wired into any actual write path. Tracked in `TECHNICAL_DEBT.md` item P1.

## 4. Feature status (verified, not assumed)

**Fully implemented and working:**
- Referral lifecycle create → accept/decline → transport → arrival → discharge → back-referral → follow-up
  → close, with RBAC-scoped access at every step.
- Deterministic rescue engine (SLA-timeout-driven `operationalStatus` overlay).
- Deterministic benefit rule engine (JSSK/PMMVY/JSY), never auto-confirms eligibility.
- Referral Passport via QR + human-typed code, opaque token, session-gated resolution.
- Admin panel: system health, notification template CRUD (with default/customized/revert), benefit rules,
  user deactivate/reactivate, facility create/deactivate/reactivate, audit trail viewer.
  Not yet implemented: editing an existing user's name/role/facility (tracked in `16_FUTURE_ROADMAP.md #10`).
- Onboarding wizard (language → consent) gating first login for patient/caregiver roles.
- Hindi/Marathi translation for patient-facing surfaces and nav.
- Storage provider abstraction with a real, complete S3-compatible adapter (untested against a live
  bucket — no credentials in this environment) and a local-disk fallback.
- Rate limiting on login (in-memory).

**Partially implemented / explicitly scoped out (see `docs/15_LIMITATIONS.md` for the full, honest list):**
- No real OCR/LLM/SMS/WhatsApp provider — demo adapters only, by design (spec requires zero paid
  credentials).
- Hindi/Marathi coverage does not extend to the pre-login landing/login pages or most provider-facing
  screens.
- `e2e/admin-and-onboarding.spec.ts`: 1 of 3 tests confirmed passing across repeated runs; the other 2 have
  been observed passing in isolation but not in the same clean run, attributed to development-machine
  memory pressure (documented in `11_TESTING_STRATEGY.md`) rather than a logic defect. Should be re-run in
  CI or on a machine with more headroom before being trusted as a merge gate.
- `stateMachine.ts`'s newer idempotency/audit-checksum helpers — tested but not integrated (§3.3).

**Broken (found and fixed this session):**
- Production build / lint (§3.1).
- Fabricated documentation (§3.2).

## 5. UI/UX, accessibility, and security notes

Not re-litigating what was already found and fixed in earlier sessions (button double-spinners, missing
`aria-label`s, focus states — see git history around commit `e025a51`). Nothing new surfaced in this pass
beyond the documentation and build issues above. The app was smoke-tested after the build fix: fresh seed,
dev server boot, landing page returns 200 with correct content.

## 6. GitHub / collaborator audit

- **Owner**: `daanialmirza5`. **Visibility**: `PUBLIC`.
- **Collaborators**: exactly one — `daanialmirza5` (admin/owner). No unauthorized collaborators, bots, or
  other accounts found via `gh api repos/daanialmirza5/Maatri-Relay/collaborators`.
- **Local git identity**: `user.name`/`user.email` already correctly set to `daanialmirza5` /
  `daanialmirza@gmail.com` — no reconfiguration needed.
- **GitHub Actions**: one workflow, `ci.yml` (build-and-test, then e2e). No deploy keys, no webhooks beyond
  what GitHub sets up by default, no externally-configured secrets found in the workflow file.
- Local `main` and `origin/main` are in sync — no unpushed or diverged history at the start of this audit.

## 7. Prioritized backlog

**P0 (this session, done):**
1. Fix the broken `next build`/lint (stateMachine.ts `any` catch clause). ✅
2. Correct fabricated documentation describing non-existent clinical-scoring/telemetry/encryption claims. ✅

**P1 (near-term, real product value):**
3. Wire `applyIdempotentTransition`/`generateAuditTrailEntry` into `referralService.ts`'s actual write path,
   or remove them if the existing `AuditLog`-based approach is preferred — don't leave tested-but-dead code.
4. Re-run `e2e/admin-and-onboarding.spec.ts` to a fully confirmed-green state (ideally via CI, which doesn't
   share this machine's memory-pressure problem).
5. Admin edit/create for individual user accounts (name, role, facility) — currently only deactivate/
   reactivate exist for users.

**P2 (deepens the product, matches the requested stage order):**
6. UI/design-system pass — audit found no *new* defects, but a fresh design-system consistency pass (spacing,
   typography, status badges) is still worth doing per the requested development order.
7. Newborn 6–8 month continuity journey — confirm current scope/depth against the spec's requirement list
   (scheduled visits, vaccination/growth reminders, missed-appointment escalation, case closure) before
   assuming it's complete; this needs its own focused inspection in that stage.
8. Full Hindi/Marathi coverage of provider-facing surfaces and the pre-login landing/login pages.

**P3 (longer-term, already tracked in `16_FUTURE_ROADMAP.md`):** Postgres migration, real OCR/notification
providers, S3 bucket verification, Redis-backed rate limiting, pgvector knowledge base, distinct ASHA/ANM
persona, multi-district scale-out.

## 8. Branding note

Per instructions, "SafeJourney" is the display name going forward in user-facing copy; internal identifiers
(`maatri-relay` package name, `MR-` referral codes, `Maatri-Relay` GitHub repo name, database file names,
routes) are left as-is since renaming them carries real breakage risk for no functional benefit. Where this
audit touched README/doc copy, it preserved the existing "Maatri-Relay" branding already in place rather
than introducing a partial, inconsistent rebrand — a dedicated branding pass (updating display strings in
the UI shell, landing page, and top-level docs to lead with "SafeJourney") is more appropriate as its own
tracked unit of work than folded into this audit's corrections.
