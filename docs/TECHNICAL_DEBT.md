# Technical Debt & Architectural Audit

**Repository**: `SafeJourney`
**Status**: living document, updated as debt is identified or paid down. See `docs/16_FUTURE_ROADMAP.md`
for planned feature work — this file tracks debt (things that work but should be improved), not backlog.

> A previous revision of this file listed "SMS/GSM gateway fallback," "real-time GPS ambulance telemetry,"
> and "voice-guided vernacular intake" as debt items. None of that infrastructure exists in this codebase
> (no SMS/telephony library, no GPS/mapping library, no voice/speech library in `package.json`), so those
> entries described work that was never started under a debt framing that implied it was partially built.
> Corrected during the 2026-09-12 audit — see `docs/development-audit.md`.

## Prioritized Debt Items

- **[P1 — Medium] `stateMachine.ts` helpers not yet integrated.** `applyIdempotentTransition` and
  `generateAuditTrailEntry` (added alongside `validateTransitionSequence`) are real, unit-tested functions,
  but `referralService.ts` still calls the older `transition`/`overrideTransition`/`canTransition` directly
  and writes audit rows through the existing Prisma `AuditLog` model — the new checksum-based audit entry
  type is not wired into any write path yet. Either integrate them or remove them; leaving tested-but-unused
  code invites confusion about what's actually enforced at runtime.
- **[P2 — Low] Documentation accuracy.** `ENGINEERING_GUIDE.md` and `INTERVIEW_GUIDE.md` previously
  described a clinical "Obstetric Early Warning Score" risk calculator and an offline QR token that
  decrypts vitals/allergy history — neither exists, and the former would have violated this project's core
  rule against clinical risk scoring. Both were rewritten during the 2026-09-12 audit to describe only
  what the code actually does.
- **[P3 — Low] Rate limiter is in-memory**, tracked already in `16_FUTURE_ROADMAP.md` item 5 — noted here
  too since it resets on every server restart, which is easy to forget when reasoning about login lockouts
  during local development.
- **Resolved in Stage 11 — Document confirm/reject role scope.** The item flagged during Stage 10 (document
  confirm/reject reachable by PATIENT/CAREGIVER, not just staff) was investigated in full in
  `docs/stage-11-document-permission-decision.md` and resolved: confirm/reject is now restricted to
  `DOCTOR`/`COORDINATOR`/`ADMIN` (`requireRole` added to both routes), matching every other
  administrative-decision action in this codebase. The decision doc explains why: a confirmed document
  feeds the outgoing back-referral's document package, the passport's confirmed-count, and the analytics
  document-completeness KPI, so it's a real coordination decision, not a cosmetic one. Patients/caregivers
  still see every document, its status, and can view the file -- the review controls are simply replaced
  with "Awaiting review by the care team" for roles that aren't authorized to decide.
