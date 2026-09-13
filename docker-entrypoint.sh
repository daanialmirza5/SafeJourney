#!/bin/sh
set -e

echo "[entrypoint] applying database migrations..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] seeding demo data..."
  npx tsx prisma/seed.ts || true
fi

exec "$@"
