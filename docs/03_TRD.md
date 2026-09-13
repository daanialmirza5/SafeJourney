# 03. Technical Requirements Document

## System architecture

SafeJourney is a single Next.js 14 (App Router) application that serves both the UI (React Server
Components + a handful of Client Components for interactivity) and the API (Route Handlers under
`src/app/api/**`) from one process. There is no separate backend service in this MVP — this was a
deliberate simplification to maximize reliability for a hackathon build (see `15_LIMITATIONS.md`); the
service-layer code in `src/lib/**` is framework-agnostic enough that it could be lifted into a standalone
API service later without a rewrite.

## Technology stack (as actually installed)

- **Framework:** Next.js 14.2.35 (App Router), React 18.3, TypeScript 5, pinned deliberately below the
  Next 16 / Prisma 8-rc versions that `npm install` resolves to by default in this environment, because
  those introduce breaking paradigm changes (async route params, cache components, a wholly different
  Prisma CLI) that add risk without adding value for this scope.
- **Styling:** Tailwind CSS v4 (CSS-first config via `@theme` in `globals.css`).
- **Database/ORM:** Prisma 5.22 against SQLite (`prisma/schema.prisma`, `prisma/dev.db`) — zero-config,
  runs with no external services. Every enum-like column is a validated `String` (SQLite has no native
  enum type); the allowed literal unions live in `src/lib/types/enums.ts`.
- **Auth:** Custom JWT-in-httpOnly-cookie session (`src/lib/auth.ts`), bcrypt password hashing.
- **Validation:** Zod schemas at every mutation route boundary (`src/lib/validation.ts`).
- **QR:** the `qrcode` package generates a PNG data URL from the referral's opaque passport token.
- **Charts:** Recharts, client-rendered.
- **Testing:** Vitest 1.6 for pure-logic unit tests.

## Component architecture

```
src/
  app/
    page.tsx, login/            -- public routes (marketing, auth)
    (app)/                      -- authenticated route group; layout.tsx enforces auth + renders AppShell
      dashboard/                -- role dispatcher -> one of 6 dashboard components
      referrals/, referrals/new, referrals/[id]
      scan/, notifications/, analytics/, admin/, settings/
    api/                        -- Route Handlers, thin, delegate to lib/ services
  components/
    ui/                         -- Badge, Card, Button, EmptyState, StatCard, Toast
    layout/                     -- AppShell, NotificationBell, GlobalSearch, AiCopilot
    referral/                  -- ReferralCard, ReferralTimeline, PassportCard, DocumentsPanel,
                                    ReferralActions, PatientJourney, BenefitRadar, AdministrativeChecklist,
                                    TransportStatusCard
    dashboards/                -- one component per role + DemoToolsPanel
  lib/
    referral/                  -- stateMachine, rescueEngine, adminCompleteness, referralService,
                                   queries, decorate, access, referralCode
    benefits/ruleEngine.ts
    documents/documentService.ts
    ocr/ocrService.ts
    ai/{aiService,safety,knowledgeBase}.ts
    notifications/{notificationService,providers}.ts
    storage/storageService.ts
    demo/demoService.ts
    auth.ts, db.ts, config.ts, audit.ts, apiError.ts, validation.ts, serialize.ts, clientApi.ts, nav.ts
```

## Database architecture

See `06_DATABASE_SCHEMA.md`. Key design decisions:

- `ReferralCase.status` is the workflow lifecycle (state machine); `ReferralCase.operationalStatus` is a
  separate, **computed-on-read** overlay (ON_TRACK/ACTION_REQUIRED/STUCK/CLOSED) — the two are
  intentionally decoupled so a referral can be "ACKNOWLEDGED" (workflow) and "STUCK" (operationally, because
  the next expected step is overdue) at the same time. See `src/lib/referral/decorate.ts`.
- `Patient.userId` is an optional 1:1 link to a PATIENT-role `User` — most patients created via referral
  intake don't have a portal account; the demo flagship patient does.
- Every document lives on local disk under `/storage/uploads/<uuid>.<ext>`, never keyed by the original
  filename (spec section 49); MIME type, extension and size are validated before write.

## API architecture

REST-ish Route Handlers, one file per endpoint, each following the same pattern:

```ts
export async function POST(req, { params }) {
  try {
    const actor = await requireRole(...);          // 401/403
    const input = someZodSchema.parse(await req.json()); // 422
    const result = await someLibService(...);       // 404/409 as needed
    return NextResponse.json({ ... });
  } catch (error) {
    return apiErrorResponse(error);                  // never leaks internals
  }
}
```

Full endpoint list in `07_API_SPECIFICATION.md`.

## Authentication & authorization

- Session: JWT signed with `JWT_SECRET`, stored in an `httpOnly`, `sameSite=lax` cookie, 7-day expiry.
- `requireUser()` / `requireRole(...)` in `src/lib/auth.ts` gate every mutation route server-side — the UI
  hiding a button is never the only check.
- Per-referral authorization is centralized in `src/lib/referral/access.ts::canAccessReferral()` and mirrored
  as a Prisma `where` filter in `src/lib/referral/queries.ts::referralScopeFor()` for list views, so a user
  can never enumerate referrals outside their scope even via search.

## AI / rule-engine / document-processing architecture

See `08_AI_ARCHITECTURE.md` and `09_RULE_ENGINE.md`.

## Notification architecture

`src/lib/notifications/notificationService.ts::notify()` always writes an in-app `Notification` row, then
best-effort calls a provider abstraction (`providers.ts`) selected by `EMAIL_PROVIDER` / `WHATSAPP_PROVIDER`
env vars. Only a `demo` adapter (console.log) is implemented; the interface is shaped so a real provider
slots in without touching call sites.

## Storage architecture

`src/lib/storage/storageService.ts` selects between two real provider implementations under
`src/lib/storage/providers/`: `local.ts` (disk, the default, `STORAGE_PROVIDER=local`) and `s3.ts` (a real
S3-compatible adapter via `@aws-sdk/client-s3`, activated by `STORAGE_PROVIDER=s3` plus a complete
bucket/credential set -- falls back to `local` with a logged warning if that config is incomplete, rather
than failing every upload). Validates MIME type (`application/pdf`, `image/jpeg`, `image/png`), extension,
and a 10 MB size cap before writing, regardless of which provider is active.

## State machine

See `09_RULE_ENGINE.md` and `src/lib/referral/stateMachine.ts` (fully unit-tested).

## Audit architecture

`src/lib/audit.ts::recordAuditEvent()` writes an `AuditLog` row (actor, role, entity, action, before/after,
metadata) for every state-changing action listed in spec section 32; visible at `/admin`.

## Security

See `10_SECURITY_PRIVACY.md`.

## Testing

See `11_TESTING_STRATEGY.md`.

## Deployment

See `12_DEPLOYMENT.md`.

## Scalability & failure handling (as implemented)

This MVP runs as a single Node process against a single SQLite file — adequate for a demo/pilot on one
machine, not for concurrent multi-instance production load. `DATABASE_URL` + `prisma/schema.prisma`'s
`provider` are the only two things that change to move to Postgres (see `12_DEPLOYMENT.md`). There is no
queue/retry layer for notification delivery; a failed provider call is caught and logged, never blocking the
underlying state change. There is no distributed lock around referral state transitions; SQLite's
serialized writes make this safe for the current single-process deployment target.
