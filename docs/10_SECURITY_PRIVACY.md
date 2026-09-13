# 10. Security & Privacy

## Authentication

- Passwords hashed with bcrypt (`src/lib/auth.ts`, 10 rounds).
- Session is a JWT (`jsonwebtoken`, `JWT_SECRET` from env) stored in an `httpOnly`, `sameSite=lax` cookie
  (`secure` in production), 7-day expiry. There is no client-readable session token — the browser cannot
  read or tamper with it via JavaScript.

## Authorization (RBAC + per-record scoping)

- `requireUser()` / `requireRole(...roles)` gate every mutation route **server-side**. The UI hides buttons
  a role can't use, but that is a UX nicety, never the enforcement — verified directly: a patient calling
  `GET /api/referrals/{id}` for a referral that isn't theirs gets a real `403 Forbidden` from the API, not
  just a hidden button (see `11_TESTING_STRATEGY.md` for the scripted proof).
- Per-referral access is centralized in `src/lib/referral/access.ts::canAccessReferral()`:
  - ADMIN: always.
  - DOCTOR/COORDINATOR: only if their `facilityId` matches the referring **or** receiving facility.
  - PATIENT: only if `referral.patient.userId === user.id`.
  - CAREGIVER: only if an active (`revokedAt: null`) `CaregiverAccess` row exists for that patient.
  - FOLLOWUP: only if assigned to at least one `FollowUpTask` on that referral.
- List/search endpoints apply the same scoping as a Prisma `where` filter
  (`src/lib/referral/queries.ts::referralScopeFor()`) so a user can never enumerate referrals outside their
  scope by paging through `/referrals` or typing into global search.

## Consent

- `Consent` records (`patientId`, `grantedToUserId`, `scope`, `grantedAt`, `revokedAt`) capture who has been
  granted access and under what scope (`RECEIVING_FACILITY`, `CAREGIVER`, `FOLLOW_UP_WORKER`,
  `COORDINATOR`). Caregiver access is separately revocable at any time from **Settings → Caregivers &
  consent**, which calls `DELETE /api/caregivers/{id}` — this sets `revokedAt` (never a hard delete, so the
  audit trail of "who used to have access" survives).

## File / upload security

- `src/lib/storage/storageService.ts` validates MIME type (`application/pdf`, `image/jpeg`, `image/png`),
  file extension, and a 10 MB size cap **before** writing anything to disk.
- The original filename is preserved only as metadata (`Document.originalName`) — the on-disk key is always
  a fresh `crypto.randomUUID()` plus the validated extension, so a malicious filename can never be used as a
  path.
- Reading a stored file (`storageService.read`) re-validates that the requested key has no path segments
  (`path.basename(key) === key`) before touching the filesystem.
- Every document read/write goes through the same `canAccessReferral` check as the parent referral — there
  is no unauthenticated or unscoped file URL.

## Audit trail

`src/lib/audit.ts::recordAuditEvent()` writes an `AuditLog` row for every state-changing action in spec
section 32's list (referral created/sent/accepted/declined, document uploaded/extracted/confirmed/rejected,
transport requested/assigned, arrival confirmed, discharge created, back-referral created, follow-up
assigned/completed, caregiver added/removed, benefit rule updated, setting updated, admin override) —
actor, actor role, entity type/id, action, before/after value, and free-form metadata. Visible to ADMIN at
`/admin` and via `GET /api/admin/audit`.

## Human override

The only way to move a referral outside the normal state graph (e.g. to `CANCELLED`, or a corrective
lateral move) is `POST /api/referrals/{id}/override`, ADMIN-only, requiring a non-empty `reason` — enforced
both by Zod validation and by `overrideTransition()` throwing if the reason is blank. Every override is
logged with the actor, old status, new status and reason.

## Account deactivation (soft-delete)

`User.deactivatedAt` and `Facility.deactivatedAt` (spec section 45) are ADMIN-only, reversible, fully
audited (`USER_DEACTIVATED`/`USER_REACTIVATED`/`FACILITY_DEACTIVATED`/`FACILITY_REACTIVATED`). Deactivating
a user takes effect immediately, not just at the next login: `getCurrentUser()` treats a deactivated
account's session cookie as unauthenticated, so an active session is cut off mid-use, not merely blocked
from a future login attempt. An admin cannot deactivate their own account (checked server-side, not just
hidden in the UI), which would otherwise be able to lock every admin out of the system at once.

## Input validation & structured errors

Every mutation route parses its body with a Zod schema (`src/lib/validation.ts`) before touching the
database — invalid input never reaches a service function. `src/lib/apiError.ts` maps every thrown error
type to the correct HTTP status (400/401/403/404/409/422/429/500) and a stable `{ code, message }` shape;
unexpected errors are logged server-side with `console.error` and returned to the client as a generic,
non-leaking "Something went wrong" 500 — no stack traces ever reach the browser.

## Rate limiting

`src/lib/rateLimit.ts` is an in-memory token-bucket limiter applied to `/api/auth/login` (10/min per IP —
brute-force/credential-stuffing protection), `/api/ai/assistant` (20/min per account), and document upload
(30/5min per account). See `docs/15_LIMITATIONS.md` for its single-process-only scope.

## What is intentionally not implemented (see `15_LIMITATIONS.md` for full list)

CSRF tokens beyond `sameSite=lax`, and a real 2FA/password-reset flow, are out of scope for this demo MVP.
