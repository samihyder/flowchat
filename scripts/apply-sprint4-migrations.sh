#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add it to .env first."
  exit 1
fi
psql "$DATABASE_URL" -f packages/db/drizzle/0006_sprint4_lifecycle.sql
psql "$DATABASE_URL" -f packages/db/drizzle/0007_sprint4_completion.sql
psql "$DATABASE_URL" -f packages/db/drizzle/0008_analytics_exceptions.sql
echo "Sprint 4 migrations applied."
