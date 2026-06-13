#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add it to .env first."
  exit 1
fi
for f in \
  packages/db/drizzle/0013_sprint6_email_marketing.sql \
  packages/db/drizzle/0014_sprint6_email_phase2.sql \
  packages/db/drizzle/0015_sprint6_complete.sql
do
  echo "Applying $f..."
  psql "$DATABASE_URL" -f "$f"
done
echo "Sprint 6 complete migrations applied."
