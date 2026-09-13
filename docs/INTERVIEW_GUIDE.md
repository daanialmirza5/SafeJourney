# SafeJourney — Interview Guide & Technical Defense

> Corrected 2026-09-12: an earlier revision of this file's pitch and Q&A described a clinical Early Warning
> Score calculation and an offline QR token that decrypts a patient's vitals and allergy history. Neither is
> implemented — the QR/passport token is an opaque lookup key with no embedded patient data (see
> `src/app/api/passport/[token]/route.ts`), and clinical scoring is explicitly out of scope for this
> project. This revision reflects the real system. See `docs/development-audit.md`.

## 1. Pitches

- **30-second pitch**: "SafeJourney is a closed-loop maternal and newborn referral coordination platform.
  It keeps a referral connected end-to-end — acknowledgment, transport, documentation, administrative
  benefits, arrival, discharge, back-referral, and community follow-up — using deterministic rules, not
  clinical AI. The doctor decides; the platform coordinates."
- **2-minute pitch**: "Referrals between primary and tertiary facilities often lose continuity: paperwork
  doesn't travel with the patient, the receiving facility doesn't know a referral is coming, benefit
  paperwork gets missed under time pressure, and follow-up after discharge has no forcing function.
  SafeJourney addresses that coordination gap with a digital Referral Passport (QR-accessible, permission-
  checked, no patient data embedded in the token itself), a deterministic Rescue Engine that flags a
  referral as `STUCK` when an SLA timer (e.g. acknowledgment) is breached, a rule engine that surfaces
  likely scheme eligibility (JSSK/PMMVY/JSY) for human verification, and a community follow-up workflow that
  closes the loop after discharge. It never diagnoses or scores clinical risk — every rule it runs is an
  administrative or timing check."

## 2. Key technical Q&A

- **Q: How does the Referral Passport work if the receiving facility has no prior visibility into the
  case?**
  - **A**: Creating a referral (`referralService.createReferral`) persists the case and generates a
    QR-encoded token that resolves to the referral through `/api/passport/[token]`. The token is a pure
    lookup key — it carries no patient data — and resolution still requires the caller to be an
    authenticated, authorized user (`canAccessReferral`), so scanning it alone reveals nothing without a
    valid session and role/facility permission.
- **Q: What happens if a referral goes unacknowledged?**
  - **A**: `rescueEngine.ts` computes an `operationalStatus` overlay from configurable SLA timers. Once the
    acknowledgment timeout is breached, the referral is flagged `STUCK` for the coordinator dashboard — a
    threshold check, not a predictive or clinical judgment. A human coordinator decides what to do next.
- **Q: Where is the line on "AI" in this system?**
  - **A**: Every AI/OCR/notification integration is behind a provider interface with exactly one real
    adapter in this environment (`demo` — no external credentials required). Where AI-flavored features
    exist (document field extraction, a knowledge-base search assistant), they explain or summarize; they
    never decide eligibility, risk, or whether a referral is needed. Those decisions stay with deterministic
    rule engines or human staff. See `docs/08_AI_ARCHITECTURE.md`.
- **Q: What made the back-referral loop "closed" rather than just one-directional?**
  - **A**: An earlier version generated the back-referral and unilaterally created follow-up tasks and
    picked the follow-up worker in the same step — the origin facility never confirmed it had actually
    received anything. That's not a closed loop, it's a broadcast. Fixed by splitting it into two real
    steps: sending the back-referral (no follow-up tasks yet), then a separate,
    origin-facility-only acknowledgment (`acknowledgeBackReferral`) that rejects a duplicate confirmation and
    is the step that actually assigns the follow-up worker and creates the coordination tasks. Only after
    that does the loop count as closed.
- **Q: How do you stop an admin (or anyone) from closing a case that still has loose ends?**
  - **A**: A pure function, `getClosureBlockers`, checks for incomplete follow-up tasks, incomplete
    admin/document tasks, and an unacknowledged back-referral. Both the ordinary closure action and the
    ADMIN override path run it before setting status to `CLOSED`; if anything is outstanding, the action is
    refused with the exact list, and the actor has to explicitly confirm past it to proceed. This closed a
    real gap: the ADMIN override could previously force any non-terminal referral straight to `CLOSED`
    without checking any of that.
- **Q: How do you know a hidden or disabled UI button isn't still callable through the API?**
  - **A**: This is exactly what a Stage 10 security review found and fixed: `requestTransport`,
    `assignTransport`, `updateTransportProgress`, `completeFollowUpTask` (for COORDINATOR/ADMIN),
    `skipFollowUpTask`, and `applyRescueAction` had role gating at the route (`requireRole(...)`) but **no
    facility-scope check at all** in the service layer. The UI already hid those buttons unless
    `isReferringFacility || isReceivingFacility`, but that client-side hiding was never backed by a
    server-side check — any authenticated doctor/coordinator/admin could call them directly on a referral
    belonging to two completely unrelated facilities. Live-verified before the fix (an outsider's request
    succeeded) and after (the same request now returns 403, while a legitimate same-facility actor's
    identical request still succeeds). The lesson: UI-level hiding is a convenience, never a security
    boundary — every mutation has to re-check who's allowed to touch this specific record, not just what
    role the caller has.
- **Q: Should a patient be able to "confirm" or "reject" their own documents?**
  - **A**: This was an open product question, not a bug -- worked through explicitly in
    `docs/stage-11-document-permission-decision.md`. It looks like a harmless status flag until you trace
    where `document.status === "CONFIRMED"` is actually read: it's what `generateAndSendBackReferral`
    attaches to the outgoing back-referral's document package, and it feeds the passport's confirmed-count
    and the analytics document-completeness KPI. So it's a real coordination decision -- "this paperwork is
    administratively complete" -- not a passive acknowledgment, and every other decision of that shape in
    this codebase (discharge, back-referral, closure) already sits with the staff managing the case.
    Restricted confirm/reject to `DOCTOR`/`COORDINATOR`/`ADMIN` accordingly; a patient still sees every
    document and its status, just not the decision controls. Deliberately didn't invent a new
    "clinical vs. administrative vs. patient-acknowledgment" three-tier status model for this -- that would
    have been new complexity solving a problem the codebase doesn't have anywhere else.
