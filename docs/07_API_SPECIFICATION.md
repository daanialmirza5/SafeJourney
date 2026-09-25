# 07. API Specification

All endpoints are Next.js Route Handlers under `src/app/api/**`. Authentication is a session cookie (see
`10_SECURITY_PRIVACY.md`); "Auth" below lists the roles a route accepts via `requireRole(...)`, or "any
authenticated user" via `requireUser()`. All error responses share the shape
`{ error: { code, message, details? } }` with the matching HTTP status (see `src/lib/apiError.ts`).

## Health & Monitoring

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/health` | none | Uptime probe, service status, and deployment health check |

## Auth

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login` | none | `{ email, password }` | sets session cookie |
| POST | `/api/auth/logout` | any | - | clears session cookie |
| GET | `/api/auth/me` | none | - | returns `{ user, facility }` or `{ user: null }` |
| PATCH | `/api/users/me` | any | `{ name?, language? }` | |
| POST | `/api/users/me/complete-onboarding` | any | - | marks the first-time onboarding wizard done (spec section 58) |

## Facilities

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/facilities` | any | list active (non-deactivated) facilities |

## Referrals

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/referrals` | DOCTOR | see `createReferralSchema` | creates in `SENT`, seeds admin tasks + benefit evaluations, notifies coordinators |
| GET | `/api/referrals/[id]` | any authorized | - | 403 if `canAccessReferral` fails |
| POST | `/api/referrals/[id]/accept` | COORDINATOR, ADMIN | - | must belong to receiving facility |
| POST | `/api/referrals/[id]/clarification` | COORDINATOR, ADMIN | `{ note }` | |
| POST | `/api/referrals/[id]/decline` | COORDINATOR, ADMIN | `{ reason }` | audited override → CANCELLED |
| POST | `/api/referrals/[id]/transport` | DOCTOR, COORDINATOR, ADMIN | - | creates the `TransportRequest` |
| POST | `/api/referrals/[id]/arrival` | COORDINATOR, ADMIN | - | ARRIVED then auto UNDER_CARE |
| POST | `/api/referrals/[id]/discharge` | COORDINATOR, ADMIN | `{ destination, note? }` | requires the receiving-facility destination; no clinical fitness claim |
| GET | `/api/referrals/[id]/back-referral` | COORDINATOR, ADMIN | - | returns an AI-drafted, editable summary |
| POST | `/api/referrals/[id]/back-referral` | COORDINATOR, ADMIN | `{ dischargeSummary }` | moves to BACK_REFERRED, notifies referring facility + family; no follow-up tasks yet |
| POST | `/api/referrals/[id]/back-referral/acknowledge` | DOCTOR, COORDINATOR, ADMIN (referring facility) | `{ followUpAssigneeId? }` | one-time; rejects a duplicate acknowledgment; creates follow-up task(s), moves to FOLLOW_UP_PENDING |
| POST | `/api/referrals/[id]/close` | DOCTOR, COORDINATOR, ADMIN | `{ reason, confirmOutstanding? }` | explicit human closure; refuses with a blocker summary unless `confirmOutstanding` is set or nothing is outstanding; rejects if already terminal |
| POST | `/api/referrals/[id]/override` | ADMIN | `{ toStatus, reason, confirmOutstanding? }` | auditable human override (spec section 52); forcing CLOSED runs the same closure-blocker check as `/close`; moving off a terminal status is logged as `REFERRAL_REOPENED` |

## Transport

| Method | Path | Auth | Body |
|---|---|---|---|
| PATCH | `/api/transport/[id]` | DOCTOR, COORDINATOR, ADMIN | `{ action: "assign", vehiclePseudo, etaMinutes }` or `{ action: "progress", status }` |

## Documents

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/documents` | any authorized on the referral | multipart form: `referralId`, `file`, `typeHint?` |
| POST | `/api/documents/[id]/extract` | any authorized | runs the (demo) OCR adapter |
| POST | `/api/documents/[id]/confirm` | any authorized | `{ confirmedFields?, documentType? }` |
| POST | `/api/documents/[id]/reject` | any authorized | `{ reason }` |
| GET | `/api/documents/[id]/file` | any authorized | streams the stored file with its original MIME type |

## Caregivers

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/patients/[id]/caregivers` | staff or the patient themself | - |
| POST | `/api/patients/[id]/caregivers` | DOCTOR, ADMIN, or the patient themself | `{ email, name, permission }` |
| DELETE | `/api/caregivers/[id]` | DOCTOR, ADMIN, or the owning patient | - |

## Follow-up

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/follow-ups/[id]/complete` | FOLLOWUP, COORDINATOR, ADMIN | `{ note? }` |

## Notifications

| Method | Path | Auth |
|---|---|---|
| GET | `/api/notifications` | any |
| PATCH | `/api/notifications/[id]/read` | owning user only |

## Search & Passport

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/search?q=` | any | scoped to the caller's authorized referrals |
| GET | `/api/passport/[token]` | any | resolves by passport token **or** human referral code; still authorization-checked |

## AI

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/ai/assistant` | any | `{ question }` — clinical questions are refused before generation |

## Admin

| Method | Path | Auth | Body |
|---|---|---|---|
| GET | `/api/admin/benefit-rules` | ADMIN | - |
| PATCH | `/api/admin/benefit-rules/[id]` | ADMIN | `{ status?, sourceUrl?, lastVerified? }` |
| GET / PATCH | `/api/admin/settings` | ADMIN | `{ ackTimeoutMinutes }` |
| GET | `/api/admin/audit?entityType=` | ADMIN | last 100 audit log entries |
| GET | `/api/admin/notification-templates` | ADMIN | every template key with its effective (override-or-default) title/body |
| PATCH | `/api/admin/notification-templates/[key]` | ADMIN | `{ title, body }` -- rejects if a required `{{placeholder}}` is missing |
| DELETE | `/api/admin/notification-templates/[key]` | ADMIN | reverts that key to its compiled-in default |
| POST | `/api/admin/users/[id]/deactivate` | ADMIN | soft-deletes a user (spec section 45); blocked on your own account |
| POST | `/api/admin/users/[id]/reactivate` | ADMIN | reverses a deactivation |
| POST | `/api/admin/facilities` | ADMIN | `{ name, type, district, state }` -- creates a new facility |
| POST | `/api/admin/facilities/[id]/deactivate` | ADMIN | soft-deletes a facility (spec section 45) |
| POST | `/api/admin/facilities/[id]/reactivate` | ADMIN | reverses a deactivation |

## Demo

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/demo/reset` | ADMIN | re-runs `prisma/seed.ts` as a child process |
| POST | `/api/demo/judge-scenario` | any | creates the "Launch Judge Demo" referral |
| POST | `/api/demo/rescue-scenario` | any | creates the backdated, already-STUCK referral |
