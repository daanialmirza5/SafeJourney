# E2E Execution Plan

Investigation performed 2026-09-13 per the requested Stage 5 process, before changing anything. This
documents *why* the current Playwright configuration behaves the way it does, what's already optimized,
what's genuinely improvable, and gives a concrete plan for running the suite depending on available memory.
No coverage was removed to make anything "pass" -- see `docs/11_TESTING_STRATEGY.md` for the full, honest
test-coverage history.

## What's already optimized (found while investigating, not touched)

- **Workers already reduced to 1** (`playwright.config.ts`), with an inline comment explaining why:
  concurrent first requests to a cold `next dev` server can race on its on-disk build manifest and corrupt
  it. This isn't a memory workaround, it's a correctness fix that happens to also reduce peak memory.
- **Already fully serial**: `fullyParallel: false` plus `workers: 1` means there is exactly one Playwright
  worker process and one Chromium instance for the entire run, reused across every test in every file (not
  relaunched per test) -- there's no additional "browser reuse" to configure; it's already maximally reused.
- **Test data setup is centralized, not duplicated**: `global-setup.ts` seeds one shared e2e SQLite database
  once for the whole run (migrate + `prisma/seed.ts`), not per spec file. Every spec file reuses the same
  seeded data rather than each paying its own setup cost.

## What genuinely needs memory, and why

`next dev`'s webpack dev server compiles each route on-demand on its *first* request in a run (not
upfront), so the very first navigation to a given page during a test is a cold compile -- CPU and memory
heavy -- layered on top of a running Chromium instance and the Node test-runner process, all at once. On a
machine where **6-7 GB of this machine's 7.88 GB total is already committed to other resident applications**
(observed repeatedly across every stage of this project: 1.0-1.2 GB free is typical, not a one-off), even
Playwright's normally modest footprint (a few hundred MB to ~1.5 GB for one Chromium + one dev-server
process) can push the system into swapping. The diagnostic signature seen in every prior stage's attempts --
a *different* test or assertion timing out on each repeated run, never the same one twice -- is exactly what
resource contention looks like, not a logic defect: a real bug would fail the same way every time.

## Genuine, low-risk improvements made this stage

1. **`playwright.smoke.config.ts`** -- a focused smoke config that runs only
   `closed-loop-referral.spec.ts`. That one file already exercises the entire core journey
   (create → accept → transport → arrival → discharge → back-referral → follow-up → auto-close) in a single
   `test.describe.serial` block, so it's a legitimate stand-in for "is the app fundamentally working
   end-to-end" at a fraction of the full suite's page-load and setup cost -- 1 of 6 spec files, same shared
   database and global setup, same worker/retry/timeout settings (a narrower *selection*, not a different
   test environment). Run with `npm run test:e2e:smoke`.
2. **Identified avoidable duplication, addressed via separation of concerns, not deletion**:
   `capture-all-screenshots.spec.ts` doesn't assert anything about correctness -- it's a documentation-asset
   generator (11 screenshots for `docs/screenshots/`), bundled into the same `test:e2e` command as the
   actual regression tests. It doesn't need to run on every regression pass. Added
   `npm run test:e2e:screenshots` to run it standalone when docs need refreshing; the main suite's
   composition (`playwright.config.ts`, `npm run test:e2e`) was deliberately left unchanged, since changing
   what "the full suite" includes by default is a bigger behavioral change than this stage should make
   unilaterally.

## Deliberately not done this stage (documented, not silently skipped)

- **A "minimal seed" mode for smoke runs**: the shared seed script's ~59-referral, every-lifecycle-stage
  dataset is expensive (real service-layer calls, not raw inserts) and a smoke run of one file only touches
  a handful of those referrals. A `SEED_MODE=minimal` fast path is a real, quantifiable opportunity, but
  changing the *shared* seed script's behavior risks subtly breaking assumptions the other five spec files
  and the demo/reset flow depend on (the same seed script backs `npm run db:seed` and the admin panel's
  "Reset demo data" button). That's a change worth making deliberately, with its own review, not folded into
  an E2E-speed optimization -- tracked in `docs/16_FUTURE_ROADMAP.md`.
- **Rewriting or reducing the existing 6 spec files**: out of scope per the explicit instruction not to
  immediately rewrite the E2E suite, and none of them showed a genuine logic defect -- only the documented
  resource-contention pattern.

## How to run the suite, by available memory

Check free memory first: `[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,2)`
(PowerShell) or `free -h` (Linux).

- **Comfortable headroom (roughly 3+ GB free)**: run the full suite, `npm run test:e2e`.
- **Constrained (under ~2 GB free, as this development machine has consistently been)**: run
  `npm run test:e2e:smoke` first. If it passes cleanly, that's meaningful signal the core journey works
  end-to-end; if it times out, that's much cheaper to diagnose (one file, one journey) than a full-suite
  failure. Don't repeatedly retry the *full* suite under these conditions -- it wastes time reproducing an
  already-understood resource-contention pattern rather than finding new information.
- **Severely constrained (as observed this session, ~1 GB free)**: substitute direct HTTP/DB smoke checks
  (as every stage this session has done) and state that plainly rather than claiming an E2E pass that didn't
  happen. See the result of this stage's own attempt below.

## This stage's actual attempts and outcome

Free memory at the time of this investigation: **1.07-1.14 GB of 7.88 GB total** -- the same constrained
regime documented in every prior stage. Two attempts were made (not an open-ended retry loop):

**Attempt 1** (`npm run test:e2e:smoke`): failed at "coordinator accepts and progresses transport" --
`page.getByPlaceholder("Vehicle pseudonym e.g. DEMO-AMB-42")` timed out, identically on both the initial run
and its automatic retry. This was **not** environmental flakiness -- the same exact failure at the same
exact line twice is the opposite of the documented resource-contention signature (which shows a
*different* failure each time). It was a real, self-inflicted regression: Stage 4's accessibility pass
(`a11y: add labels to remaining forms`) shortened that field's placeholder from "Vehicle pseudonym e.g.
DEMO-AMB-42" to "e.g. DEMO-AMB-42" once a real `<label>` made the redundant placeholder text unnecessary --
and the same commit did this to four other fields across two spec files, all referenced by now-stale
`getByPlaceholder(...)` calls. Fixed by switching those five selectors to `getByLabel(...)` instead (more
robust than placeholder text, and it directly exercises whether the label-input association from Stage 4
actually works in a real browser).

**Attempt 2** (same command, after the fix): got further -- past the field the first attempt died on -- then
failed differently: a `coordinator@demo.local` login returned 404 on one test, and a separate test's
`page.waitForURL(...)` timed out after passing on retry ("flaky"). Two different failure points across two
different tests in one run is exactly the resource-contention pattern from every prior stage, not a repeat
of the same bug. Free memory was ~2 GB immediately after this run, up from ~1.1 GB before it started,
confirming the run itself was consuming a meaningful share of an already-scarce budget.

**Conclusion, stated honestly**: the selector-regression bug is real, fixed, and verified progressed-past in
attempt 2. Whether the full smoke file passes cleanly end-to-end remains unconfirmed on this machine under
these memory conditions -- per the "do not waste time repeatedly retrying" guidance, a third attempt was not
made. This should be re-run on a machine with more headroom (or in CI, which doesn't share this machine's
memory profile) before being trusted as a merge gate. It is **not** claimed to have passed.
