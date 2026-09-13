# 13. Demo Guide

> Corrected 2026-09-13: an earlier revision of this guide described an "encrypted" passport token,
> "cryptographic timestamps" on the audit log, "SMS/WhatsApp" notification templates, fabricated
> post-discharge task names ("Maternal Check & Neonatal Vitals"), live database connection latency, and a
> "fallback rerouting prompt" that didn't exist. None of that was real -- see
> `docs/analytics-and-demo-audit.md` for the full audit. This revision describes only verified behavior.

## Demo accounts

All use password **`demo1234`**. Quick-login buttons for all six are on `/login`.

| Role | Email | What to show |
|---|---|---|
| Doctor | `doctor@demo.local` | Create Referral, Launch Judge Demo, Demo Rescue Scenario, acknowledge back-referral (as the referring doctor), close case |
| Coordinator | `coordinator@demo.local` | Incoming referrals, accept/clarify/decline, transport, arrival, discharge (with destination), back-referral, rescue actions, close case |
| Patient | `patient@demo.local` | "My Journey" plain-language checklist, Referral Passport QR, upcoming care check-ins, view (not confirm/reject) own documents |
| Caregiver | `caregiver@demo.local` | Linked cases |
| Follow-up worker | `worker@demo.local` | Due/overdue tasks (with who resolved each and why), mark complete → auto-close |
| Admin | `admin@demo.local` | Admin panel, benefit rules, newborn continuity schedule, referral configuration (ack timeout, maternal follow-up window), audit trail, demo tools, analytics, override status (with closure safeguards) |

## Recommended judge walkthrough (~8 minutes)

### Phase 1: Initiation & Entitlement Discovery (Doctor Role)
1. **Landing page** (`/`) — Introduce the closed-loop vision: preventing maternal/newborn referrals from ending as lost paper notes.
2. **Log in as Doctor (`doctor@demo.local`).**
   - Click **Launch Judge Demo** — provisions a fresh referral for "Ananya Patil" with ambulance transport requested **and a linked newborn case**, so the full journey (including newborn continuity, phase 4 below) is walkable end to end.
   - Point out the **Referral Passport**: a QR-encoded, opaque lookup token (no patient data embedded in the token itself) — resolving it still requires an authorized, role-checked session.
   - Review the **Benefit Radar**: a deterministic rule engine surfaces potentially-applicable government financial schemes (JSSK, PMMVY, PM-JAY/JSY) with a source citation and "needs verification" status — never an automatic confirmation.
   - Open the **Documents** panel: Launch Judge Demo already attached a referral note (extracted, awaiting review) and an identity document (already confirmed), each run through the demo OCR extractor. On the referral note, review the extracted fields (labeled as needing review, never auto-trusted) and click **Confirm** or **Reject** (a reason is required to reject). This is an administrative-completeness decision — "this paperwork is in order," never a clinical or legal validation of the document's contents — and it's restricted to staff (DOCTOR/COORDINATOR/ADMIN) for exactly that reason: a confirmed document is what gets attached to the eventual back-referral's document package. Log in as `patient@demo.local` afterward to show the contrast: the patient sees every document, its status, and can view the file, but the Confirm/Reject controls are replaced with "Awaiting review by the care team" — visible proof the UI and the API agree on who decides this, not just a hidden button.

### Phase 2: Intake, Transport & Rescue (Coordinator Role)
3. **Log in as Coordinator (`coordinator@demo.local`).**
   - Locate the incoming case under the intake list.
   - Click **Accept** → the referring doctor gets an in-app notification.
   - Progress the logistics pipeline: **Request Transport** → **Assign Transport** → **Mark in transit** → **Mark Arrived**.
4. **Demo Rescue Scenario** (Doctor or Admin dashboard): creates a second referral that's immediately past its acknowledgment SLA, so the Referral Rescue Engine flags it **STUCK** right away.
   - Open the stuck referral: the "Referral Rescue" banner shows the reason and how long it's been waiting.
   - Click one of the **rescue action buttons** (Escalate to coordinator, Retry notification, Contact receiving facility, Choose alternate demo facility) — this is a real, audited action: it's logged to the referral timeline and (for escalate/retry) re-notifies the receiving facility's coordinators. It's a coordination nudge, not an automatic clinical or workflow decision.

### Phase 3: Care Delivery, Discharge & Back-Referral
5. Complete the clinical stay with **Discharge**. A **destination / next care location** is now a required field (e.g. "Home", "Primary health centre") — the confirm button stays disabled until it's filled in. This is coordination bookkeeping only: the platform never claims or evaluates medical fitness for discharge.
6. Click **Generate Back-Referral** — an AI-drafted (deterministic, editable) discharge summary the coordinator reviews and edits before sending to the referring facility. At this point the loop is **not yet closed**: the referral moves to `BACK_REFERRED` and the referring doctor/facility is notified, but no follow-up tasks exist yet and the case cannot be closed.
7. **Log in as the referring Doctor (or a Coordinator/Admin at the referring facility)** and click **Acknowledge back-referral** on the referral detail page. This is the step that actually closes the loop:
   - Requires the origin facility to explicitly confirm receipt (a duplicate acknowledgment is rejected).
   - Assigns a follow-up worker at that point.
   - Only now are two near-term administrative tasks created ("Discharge handoff acknowledgement" and, if any admin items are still pending, "Administrative application follow-up") -- and, because this referral has a linked newborn case, six additional **newborn continuity milestones** spanning roughly two weeks to eight months (home visit, immunization reminders, growth check-ins, and a final continuity review). The due-date offset for the near-term tasks is admin-configurable (`/admin` → Referral configuration), not a hardcoded universal number.

### Phase 4: Newborn Continuity & Community Follow-Up (ASHA / Follow-Up Worker)
8. On the referral detail page, open the **"Follow-up & newborn continuity"** panel: a timeline showing every task's category, due date, and state (completed/upcoming/overdue/skipped), plus who completed or skipped each one and any note they left.
9. **Log in as Follow-Up Worker (`worker@demo.local`).**
   - View the due/overdue community tasks on the follow-up dashboard — overdue is based on each task's own due date (not a referral-wide SLA), and the dashboard explains that "overdue" here means an administrative reminder, never a clinical emergency signal.
   - Mark the near-term tasks complete. The referral does **not** close yet -- it now waits out the full newborn continuity schedule, same as it would for a real multi-month follow-up window.
10. **Log in as Coordinator or Admin** and, from the referral's follow-up panel, try **Skip** on one milestone (reason required) to show the case where a milestone genuinely doesn't apply -- distinct from completing it.

### Phase 5: Case Closure Safeguards
11. Before every task is resolved, try **Close case** (visible to the referring doctor, a coordinator at either facility, or an admin) on the referral detail page and enter a reason. Because follow-up tasks/admin paperwork are still outstanding, the platform **refuses** and shows exactly what's unresolved (incomplete follow-ups, incomplete admin/document tasks, or an unacknowledged back-referral) — this is the same check the automatic closure path enforces, so an admin can no longer silently force-close a case with outstanding items unless they explicitly confirm past this summary. Complete or skip the remaining tasks and the referral closes automatically the moment nothing is left open; alternatively, confirm the "Close anyway" option to show the explicit override path, still fully audited and reason-required. A second closure attempt on an already-closed case is rejected outright.

### Phase 6: Governance, Configuration & Analytics (Admin)
12. **Log in as Admin (`admin@demo.local`).**
    - Open `/admin` → **Newborn continuity schedule**: add, edit, or deactivate a milestone template live -- every future referral with a newborn case picks up the change. Every edit is audit-logged.
    - Also in **Referral configuration**: the acknowledgment-timeout minutes and the maternal/administrative follow-up due-date window are both live, admin-editable settings, not hardcoded numbers.
    - Review the **audit trail** (append-only in normal application use, timestamped, actor-attributed) and **System Health** (a live database connectivity check plus process uptime).
    - Open `/analytics` — Closed-Loop Referral Rate, case volume (pending/acknowledged/transport-pending/stuck/rescued), administrative continuity (benefit checklist, back-referral, document completeness), and the maternal-vs-newborn follow-up split with an overdue count.

## Resetting between demo runs

The Admin panel's **Reset demo data** button (`/admin`, ADMIN only) wipes and regenerates the *entire*
database back to the standard seeded state — every facility, user, and referral is synthetic demo data, so
there is no separate "real" data this could accidentally destroy. It requires an explicit browser
confirmation ("This will wipe and regenerate all demo data. Continue?") before it runs, since the action is
not reversible. Use it between separate judge walkthroughs so each one starts from the same clean state; you
do not need it between phases of a single walkthrough.

## What to say if asked "is this real AI?"

The AI copilot (bottom-right chat bubble) and the document extraction are both running in **demo mode** by
default — deterministic, offline, zero-API-key implementations behind a provider abstraction
(`AI_PROVIDER`/`OCR_PROVIDER` env vars). This is intentional so the app never depends on a paid credential to
run. The interfaces are real; the demo adapters are what's active. See `08_AI_ARCHITECTURE.md`.

## What to say if asked "is this connected to real hospitals / SMS / WhatsApp / ambulances?"

No — every external integration (transport, notifications) is a clearly-labeled demo/simulated adapter behind
a provider interface (spec section 54). Notifications today are in-app only (`Notification` records visible
in the bell icon); no SMS or WhatsApp provider is wired up, though the notification template system is
provider-agnostic and would apply unchanged once one is. "(demo mode)" appears directly in the UI wherever
this matters (e.g. transport assignment).

## What to say if asked "is the passport token encrypted?"

It's an opaque, randomly-generated lookup key (`crypto.getRandomValues`, 18 bytes hex-encoded) -- not
encrypted, because it doesn't need to be: it carries no patient data at all. Scanning or typing it only
resolves to a referral through an authenticated, role-checked API call
(`/api/passport/[token]`); the token alone reveals nothing.
