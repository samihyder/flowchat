#!/usr/bin/env bash
# Apply every FlowChat SQL migration in order (0000–0017).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then set -a; source .env; set +a; fi
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Add it to .env first."
  exit 1
fi

for f in packages/db/drizzle/*.sql; do
  echo "Applying $f..."
  psql "$DATABASE_URL" -f "$f"
done

echo "All migrations applied."
