# 05. User Journeys

## Journey A — Doctor creates a referral

1. Log in as `doctor@demo.local`. Dashboard shows Active / Stuck / Awaiting ack. / In transit / Arrived /
   Admin pending / Closed counts plus a scrollable list of referrals.
2. Click **Create Referral**. Fill patient name/sex, optionally include a linked newborn case, pick a
   receiving facility, set priority (doctor's own clinical judgement — never computed by the app), toggle
   transport required, write a referral note.
3. Submit → referral is created in `SENT` status, default administrative checklist is seeded, active benefit
   rules are auto-evaluated against the case, and every coordinator at the receiving facility gets a
   notification. Redirects straight to the referral detail page.

## Journey B — Receiving facility responds

1. Log in as `coordinator@demo.local`. Dashboard shows incoming referrals awaiting response.
2. Open the referral → **Accept**, **Request clarification** (creates a NEEDS_REVIEW admin task + notifies
   the doctor), or **Decline / unavailable** (audited override to CANCELLED with a reason, prompting the
   doctor to choose an alternate facility).
3. If transport is required: **Request transport** → **Assign transport** (vehicle pseudonym + ETA, demo
   mode) → progress through En route to pickup → Picked up → In transit.
4. **Mark arrived** → referral moves to ARRIVED then immediately UNDER_CARE.
5. **Discharge** (optional note) → **Generate back-referral** (an AI-drafted, fully editable discharge
   summary; assign a follow-up worker) → confirm & send. This auto-creates 1-2 follow-up tasks and moves the
   referral to FOLLOW_UP_PENDING.

## Journey B.5 — First-time onboarding (new patient/caregiver accounts only)

1. A brand-new PATIENT or CAREGIVER account (`onboardedAt` null -- e.g. one just added via "Add caregiver")
   is redirected to `/onboarding` on first login instead of their dashboard.
2. **Welcome** → **Language** (English/Hindi/Marathi, saved immediately) → *(patients only)* **add a
   caregiver, optional** → **consent explanation** ("who can see your case?") → **dashboard**, now rendered
   in the language just chosen.
3. The six fixed demo accounts skip this (seeded already-onboarded) so the standard demo walkthrough is
   never interrupted by it.

## Journey C — Patient / caregiver experience

1. Log in as `patient@demo.local` ("My Journey"). A single plain-language checklist (✓/●/○) shows progress,
   plus one line of "What happens next?" text drawn from the current status — no technical jargon, no raw
   status codes.
2. Open the referral to see the Referral Passport (QR code + download/print), upload documents, and see the
   Benefit Radar.
3. In Settings, the patient can add/remove caregivers with a scoped permission level (view only / document
   help / full administrative assistance).

## Journey D — Follow-up worker

1. Log in as `worker@demo.local`. Dashboard shows Due today / Overdue / Pending handoffs / Completed.
2. Open a task's referral, review the back-referral summary, click **Mark complete**.
3. When every follow-up task on a case is complete, the referral automatically advances
   FOLLOW_UP_PENDING → FOLLOW_UP_CONFIRMED → **CLOSED** — no separate "close" click is needed.

## Journey E — Admin

1. Log in as `admin@demo.local`. Dashboard shows system-wide KPIs and links to the Admin Panel.
2. Admin Panel: reset demo data, adjust the Referral Rescue acknowledgement timeout, enable/disable benefit
   rules and see their source/verification date, browse users/facilities, and read the last 100 audit log
   entries.

## Showcase scenario 1 — Successful referral (Launch Judge Demo)

Any logged-in user can click **Launch Judge Demo** (Doctor or Admin dashboard). This creates a fresh
referral for "Ananya Patil" → Metro Maternal Demo Hospital, transport required, with a referral note and an
identity document already uploaded/extracted/confirmed — ready to walk through Journey B by hand.

## Showcase scenario 2 — Stuck referral (Demo Rescue Scenario)

Clicking **Demo Rescue Scenario** creates a referral for "Priya Sharma" → Central Demo Referral Hospital
with its `sentAt`/`updatedAt` backdated by one hour, so it is immediately flagged **STUCK** by the Referral
Rescue Engine the moment the page loads, with the reason "Referral has not been acknowledged by the
receiving facility." This is a pure operational escalation signal, never a clinical claim.

## Showcase scenario 3 — Full loop with follow-up

Exercised automatically by `prisma/seed.ts`, which drives ~55 referrals through every combination of accept
→ transport → arrival → discharge → back-referral → follow-up completion → close using the exact same
service functions the UI calls, so the demo dataset always reflects real, valid state transitions.
