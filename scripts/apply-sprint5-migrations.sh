#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add it to .env first."
  exit 1
fi
psql "$DATABASE_URL" -f packages/db/drizzle/0009_sprint5_messaging.sql
echo "Sprint 5 migrations applied."
