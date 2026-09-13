# 06. Database Schema

Full source of truth: `prisma/schema.prisma`. SQLite has no native enum type, so every enum-like column is
a `String`; the allowed values are documented as Prisma doc-comments on each field and mirrored as
TypeScript literal unions in `src/lib/types/enums.ts`. All tables use `cuid()` primary keys and
`createdAt`/`updatedAt` where relevant.

## Tables

| Table | Purpose | Key relationships |
|---|---|---|
| `User` | All 6 roles in one table (`role` column) | belongs to `Facility` (optional); 1:1 `Patient` (for PATIENT role) |
| `Facility` | Referring/receiving/both | many `User`, `Patient`, `ReferralCase` (as referring/receiving) |
| `Patient` | A person referred; optionally linked to a portal `User` | belongs to `Facility`, `User` (creator), optional `User` (account) |
| `CaregiverAccess` | Scoped, revocable caregiver permission | `Patient` × `User`, `permission`, `revokedAt` |
| `FamilyCase` / `MotherCase` / `NewbornCase` | Mother+newborn linkage | `FamilyCase` 1:1 `Patient`, 1:1 each of Mother/Newborn |
| `Consent` | Who can access a patient's case, and why (scope) | `Patient` × `User` |
| `ReferralCase` | The core domain object | `Patient`, referring/receiving `Facility`, referring `User` (doctor) |
| `ReferralEvent` | Immutable timeline entry | belongs to `ReferralCase`, optional actor `User` |
| `BackReferral` | 1:1 discharge handoff record | belongs to `ReferralCase` |
| `TransportRequest` | Simulated transport coordination | belongs to `ReferralCase`, pickup/destination `Facility` |
| `Document` / `DocumentExtraction` | Uploaded file + AI-extracted structured fields | belongs to `ReferralCase`, uploader `User` |
| `BenefitRule` / `BenefitEvaluation` | Deterministic entitlement rules + per-referral results | `BenefitEvaluation` belongs to `ReferralCase` × `BenefitRule` |
| `AdministrativeTask` | Readiness checklist item | belongs to `ReferralCase` |
| `FollowUpTask` | Community/admin follow-up | belongs to `ReferralCase`, assignee + creator `User` |
| `Notification` | In-app notification | belongs to `User`, optional `ReferralCase` |
| `AuditLog` | Full audit trail | optional actor `User` |
| `SystemSetting` | Runtime-configurable key/value (e.g. ack timeout) | standalone |
| `NotificationTemplate` | Admin-editable override for one notification's title/body | standalone, keyed by `key` |
| `NewbornMilestoneTemplate` | Admin-configurable newborn continuity schedule -- the source of truth read at every back-referral, no hard-coded fallback | standalone |

## Notable design decisions

- **`ReferralCase.status` vs `operationalStatus`** — the former is the state-machine lifecycle; the latter
  is a computed overlay, recomputed on every read (see `04_ARCHITECTURE.md`), not a value the application
  logic branches on internally.
- **`ReferralCase.passportToken`** — a random 36-hex-character opaque token (`crypto.getRandomValues`),
  unique-indexed, used for QR/manual passport lookup. It carries no patient data.
- **`Patient.userId`** is nullable and unique — most patients have no portal login; the demo flagship
  patient (`Ananya Patil`) is deliberately linked to `patient@demo.local` so "My Journey" has something to
  show out of the box.
- **`User.onboardedAt`** is nullable; null means "show the first-time onboarding wizard next login" (spec
  section 58), checked only for PATIENT/CAREGIVER roles. The six fixed demo accounts are seeded already-
  onboarded so the standard demo walkthrough isn't interrupted; a caregiver added live via "Add caregiver"
  gets a fresh account with this left null, so the wizard is still genuinely reachable in the running app.
- **`NotificationTemplate`** rows are overrides, not the source of truth: `src/lib/notifications/templates.ts`
  compiles in a default `title`/`body` per `key`, and a row here (if present) wins. The demo seed leaves
  this table empty on purpose, so the admin panel's "customized" flag is only ever true once an admin
  actually edits something.
- **`User.deactivatedAt` / `Facility.deactivatedAt`** (both nullable) are this schema's soft-delete fields
  (spec section 45) -- see `docs/15_LIMITATIONS.md` for exactly what they gate and why referrals/patients
  are deliberately excluded from soft-delete.
- **`FollowUpTask.category`** distinguishes the near-term post-discharge tasks (`DISCHARGE_HANDOFF`,
  `ADMIN_FOLLOW_UP`) from the newborn continuity milestones (`HOME_VISIT`, `IMMUNIZATION_REMINDER`,
  `GROWTH_CHECK`, `CONTINUITY_REVIEW`) scheduled by `src/lib/referral/newbornContinuity.ts` when a referral
  has a linked `NewbornCase` — see `docs/newborn-continuity-review.md`.
- **Indexes**: `status`, `patientId`, `referringFacilityId`, `receivingFacilityId`, `createdAt` on
  `ReferralCase`; `referralId` on every child table; `entityType`+`entityId` and `createdAt` on `AuditLog`.

## Migrations

Migrations live under `prisma/migrations/`, applied in order: `init` (full initial schema),
`patient_user_link` (optional `Patient.userId` 1:1 link), `onboarding_and_notification_templates`,
`soft_delete_users_facilities` (`User.deactivatedAt`/`Facility.deactivatedAt`, contradicting the "no
soft-delete" line this section used to have -- corrected 2026-09-12), `add_follow_up_task_category`, and
`add_newborn_milestone_template`. Run `npx prisma migrate deploy` in production, `npx prisma migrate dev` in
development.
