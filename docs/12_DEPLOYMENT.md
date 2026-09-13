# 12. Deployment

## Local development (fastest path, no Docker required)

```bash
npm install --legacy-peer-deps
cp .env.example .env.local        # every value has a safe demo default
npx prisma migrate dev            # creates prisma/dev.db and applies migrations
npm run db:seed                   # wipes + regenerates the full synthetic demo dataset
npm run dev                       # http://localhost:3000
```

`--legacy-peer-deps` is required in this environment because `next@14`/`react@18` (deliberately pinned, see
`03_TRD.md`) conflict with a couple of unrelated peer-dependency chains npm's newer resolver treats as
errors rather than warnings; it does not affect runtime behavior.

Log in with any of the six seeded demo accounts (see `13_DEMO_GUIDE.md`), password `demo1234` for all.

**Don't run `npm run build` while `npm run dev` is also running** against the same checkout -- both write to
the same `.next/` cache directory, and doing so concurrently can corrupt its webpack manifest (surfaces as a
"Cannot find module './NNNN.js'" 500 on the next dev request). If that happens: stop the dev server, `rm -rf
.next` (or delete the folder on Windows), and restart `npm run dev`. This is a `next dev`-only cache issue,
not a code bug -- it doesn't affect `npm run build`/`npm run start` used alone, or the CI pipeline (which
runs typecheck/lint/test/build in one job and Playwright in a separate job with its own checkout).

**If port 3000 is already in use** (another project on the same machine, common on a shared dev box), `next
dev` silently falls back to 3001 and only prints that choice to its own console -- easy to miss if you're
not watching the terminal. Always check the "Local: http://localhost:XXXX" line `next dev` prints on
startup rather than assuming 3000; hitting the wrong port means hitting someone else's app, not yours, and
its response can look plausible enough to misread at a glance (200 status, real-looking HTML) before you
notice the content doesn't match. `curl`ing for a string unique to this app (e.g. "SafeJourney") is a
faster way to confirm you're actually talking to it than eyeballing the status code alone.

## Docker

```bash
docker build -t safejourney .
docker run -p 3000:3000 \
  -e JWT_SECRET="change-me" \
  -e SEED_ON_START=true \
  -v safejourney-db:/app/prisma \
  -v safejourney-storage:/app/storage \
  safejourney
```

Or `docker compose up --build` (see `docker-compose.yml`) — this has been built and run successfully in
this environment: `docker build` completes, the entrypoint applies Prisma migrations, seeds demo data when
`SEED_ON_START=true`, starts `next start`, and the container responds `200` on port 3000.

`docker-entrypoint.sh` always runs `prisma migrate deploy` on boot (idempotent) before starting the server,
so a fresh volume is correctly initialized on first run.

## Environment variables

See `.env.example` for the full list with inline documentation. Every variable has a demo-safe default —
`DEMO_MODE=true`, `AI_PROVIDER=demo`, `OCR_PROVIDER=demo`, `STORAGE_PROVIDER=local`,
`EMAIL_PROVIDER=demo`, `WHATSAPP_PROVIDER=demo` — so the app runs with **zero external credentials**. The
only variable that must be set explicitly for anything beyond local demo use is `JWT_SECRET`.

## Moving to Postgres (production upgrade path, not wired by default)

1. In `prisma/schema.prisma`, change `datasource db { provider = "sqlite" ... }` to `provider = "postgresql"`.
   The SQLite-specific comment-based enum documentation can optionally be converted back to real `enum`
   blocks at that point (Postgres supports them; nothing in the application code depends on which
   representation is used, since every field is typed as `string` in TypeScript regardless).
2. Set `DATABASE_URL` to a `postgresql://...` connection string.
3. Run `npx prisma migrate dev` once against the new database to regenerate migration SQL for Postgres (the
   existing SQLite migration files are not portable as-is).

## Production notes

- `npm run build && npm run start` runs the compiled app without the dev server's HMR overhead.
- Set `NODE_ENV=production` (Docker image does this).
- Uploaded files live under `/app/storage/uploads` — mount a persistent volume in any real deployment, or
  swap `STORAGE_PROVIDER` for a real S3-compatible adapter (interface ready, adapter not implemented — see
  `16_FUTURE_ROADMAP.md`).
- There is no Redis/queue in this MVP; notification delivery is synchronous and best-effort (see
  `03_TRD.md`).

## Production Readiness Checklist

Before moving from demo / hackathon mode into production deployment:

1. **Security & Secrets**: Set high-entropy `JWT_SECRET`, enforce `DEMO_MODE=false`, and configure secure HTTPS reverse proxy (e.g. Nginx, Caddy, or Cloudflare).
2. **Database Persistence**: Mount persistent volume storage for database (`/app/prisma`) and document uploads (`/app/storage/uploads`), or configure Postgres + S3 storage adapters.
3. **Automated Health Checks**: Monitor `GET /` and database connectivity to verify operational status.
4. **Audit Log Retention**: Establish automated archiving for `AuditLog` records for statutory healthcare compliance.

## CI-equivalent local checks

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm run test:e2e   # spins up its own dev server + database; safe to run anytime
```

All five pass cleanly against the current `main` state of this repository. The same sequence (minus the
E2E browser install, which only the CI job needs) runs automatically on every push/PR via
`.github/workflows/ci.yml`.

