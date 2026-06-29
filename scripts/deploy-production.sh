#!/usr/bin/env bash
# One-command production deploy: migrations → Vercel env → Vercel build.
# Uses repo .env for secrets (never commit .env or Logins.rtf).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
cd "$ROOT"

# shellcheck source=scripts/lib/load-env.sh
source "$ROOT/scripts/lib/load-env.sh"
load_repo_env "$ROOT/.env"

: "${DATABASE_URL:?DATABASE_URL missing — add to .env}"

POOLER_URL="$DATABASE_URL"
if [[ "$DATABASE_URL" != *-pooler* ]]; then
  POOLER_URL="$(echo "$DATABASE_URL" | sed -E 's/(ep-[^.@]+)\./\1-pooler./')"
fi
export DATABASE_URL="$POOLER_URL"

echo "==> 1/4 Database migrations"
if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM account_service_credentials LIMIT 1" >/dev/null 2>&1; then
  echo "Applying 0018_tenant_service_credentials.sql..."
  psql "$DATABASE_URL" -f "$ROOT/packages/db/drizzle/0018_tenant_service_credentials.sql"
else
  echo "account_service_credentials exists — skipping 0018"
fi

if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM companies LIMIT 1" >/dev/null 2>&1; then
  echo "Applying 0019_global_companies.sql..."
  psql "$DATABASE_URL" -f "$ROOT/packages/db/drizzle/0019_global_companies.sql"
else
  echo "companies table exists — skipping 0019"
fi

if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='enrichment_status'" >/dev/null 2>&1; then
  echo "Applying 0020_enrichment_providers.sql..."
  psql "$DATABASE_URL" -f "$ROOT/packages/db/drizzle/0020_enrichment_providers.sql"
else
  echo "enrichment columns exist — skipping 0020"
fi

if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM contact_enrichment_suggestions LIMIT 1" >/dev/null 2>&1; then
  echo "Applying 0021_contact_enrichment_suggestions.sql..."
  psql "$DATABASE_URL" -f "$ROOT/packages/db/drizzle/0021_contact_enrichment_suggestions.sql"
else
  echo "contact_enrichment_suggestions exists — skipping 0021"
fi

if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM marketing_campaigns LIMIT 1" >/dev/null 2>&1; then
  echo "Applying 0022_s6m_campaigns.sql..."
  psql "$DATABASE_URL" -f "$ROOT/packages/db/drizzle/0022_s6m_campaigns.sql"
else
  echo "marketing_campaigns exists — skipping 0022"
fi

if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM marketing_system_state LIMIT 1" >/dev/null 2>&1; then
  echo "Applying 0023_marketing_system_state.sql..."
  psql "$DATABASE_URL" -f "$ROOT/packages/db/drizzle/0023_marketing_system_state.sql"
else
  echo "marketing_system_state exists — skipping 0023"
fi

if ! psql "$DATABASE_URL" -tAc "SELECT 1 FROM information_schema.columns WHERE table_name='marketing_campaigns' AND column_name='schedule_timezone'" >/dev/null 2>&1; then
  echo "Applying 0024_marketing_campaign_timezone.sql..."
  psql "$DATABASE_URL" -f "$ROOT/packages/db/drizzle/0024_marketing_campaign_timezone.sql"
else
  echo "schedule_timezone column exists — skipping 0024"
fi

echo "Cleaning legacy workflow_sent rows without Resend message IDs..."
psql "$DATABASE_URL" -c "
  DELETE FROM contact_email_events
  WHERE event_type = 'workflow_sent'
    AND (metadata->>'messageId' IS NULL OR metadata->>'messageId' = '');
" >/dev/null || true

if [ -z "${CREDENTIALS_ENCRYPTION_KEY:-}" ]; then
  CREDENTIALS_ENCRYPTION_KEY="$(openssl rand -hex 32)"
  echo "CREDENTIALS_ENCRYPTION_KEY=$CREDENTIALS_ENCRYPTION_KEY" >>"$ROOT/.env"
  echo "Generated CREDENTIALS_ENCRYPTION_KEY (appended to .env)"
fi

if [ -z "${JWT_SECRET:-}" ] || [ "$JWT_SECRET" = '\$JWT_SECRET' ]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  echo "Note: set JWT_SECRET on Railway API manually if not already configured."
fi

if [ -z "${CRON_SECRET:-}" ]; then
  CRON_SECRET="$(openssl rand -hex 32)"
  echo "CRON_SECRET=$CRON_SECRET" >>"$ROOT/.env"
  echo "Generated CRON_SECRET (appended to .env)"
fi

PROD_WEB_URL="${WEB_APP_URL:-https://www.digitalbrandcast.com/FlowChat}"
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/FlowChat}"
WS_URL="${NEXT_PUBLIC_WS_URL:-wss://flowchat-ws-production.up.railway.app}"
API_URL="${NEXT_PUBLIC_API_URL:-https://flowchat-production-be88.up.railway.app}"

echo "==> 2/4 Sync Vercel production env (flowchat-web)"
cd "$WEB"

upsert_vercel_env() {
  local name="$1" value="$2"
  vercel env rm "$name" production -y >/dev/null 2>&1 || true
  printf '%s' "$value" | vercel env add "$name" production >/dev/null
  echo "  ✓ $name"
}

upsert_vercel_env DATABASE_URL "$DATABASE_URL"
if [[ -z "${REDIS_URL:-}" || "${REDIS_URL}" == redis://localhost* ]]; then
  echo "  · REDIS_URL (keeping existing Vercel value)"
else
  upsert_vercel_env REDIS_URL "$REDIS_URL"
fi
upsert_vercel_env NEXT_PUBLIC_API_URL "$API_URL"
upsert_vercel_env NEXT_PUBLIC_WS_URL "$WS_URL"
upsert_vercel_env WEB_APP_URL "$PROD_WEB_URL"
upsert_vercel_env NEXT_PUBLIC_WEB_APP_URL "$PROD_WEB_URL"
upsert_vercel_env NEXT_PUBLIC_BASE_PATH "$BASE_PATH"
upsert_vercel_env CREDENTIALS_ENCRYPTION_KEY "$CREDENTIALS_ENCRYPTION_KEY"
vercel env rm CREDENTIALS_ENCRYPTION_KEY preview -y >/dev/null 2>&1 || true
printf '%s' "$CREDENTIALS_ENCRYPTION_KEY" | vercel env add CREDENTIALS_ENCRYPTION_KEY preview >/dev/null
echo "  ✓ CREDENTIALS_ENCRYPTION_KEY (preview)"

[ -n "${RESEND_API_KEY:-}" ] && upsert_vercel_env RESEND_API_KEY "$RESEND_API_KEY"
[ -n "${RESEND_FROM_EMAIL:-}" ] && upsert_vercel_env RESEND_FROM_EMAIL "$RESEND_FROM_EMAIL"
[ -n "${CRON_SECRET:-}" ] && upsert_vercel_env CRON_SECRET "$CRON_SECRET"
[ -n "${R2_ACCOUNT_ID:-}" ] && upsert_vercel_env R2_ACCOUNT_ID "$R2_ACCOUNT_ID"
[ -n "${R2_ACCESS_KEY_ID:-}" ] && upsert_vercel_env R2_ACCESS_KEY_ID "$R2_ACCESS_KEY_ID"
[ -n "${R2_SECRET_ACCESS_KEY:-}" ] && upsert_vercel_env R2_SECRET_ACCESS_KEY "$R2_SECRET_ACCESS_KEY"
[ -n "${R2_BUCKET_NAME:-}" ] && upsert_vercel_env R2_BUCKET_NAME "$R2_BUCKET_NAME"
[ -n "${R2_PUBLIC_URL:-}" ] && upsert_vercel_env R2_PUBLIC_URL "$R2_PUBLIC_URL"

echo "==> 3/4 Production build check"
cd "$ROOT"
export NODE_ENV=production
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
NEXT_PUBLIC_BASE_PATH="$BASE_PATH" \
NEXT_PUBLIC_WEB_APP_URL="$PROD_WEB_URL" \
WEB_APP_URL="$PROD_WEB_URL" \
pnpm --filter @flowchat/web build

echo "==> 4/4 Vercel deploy"
cd "$WEB"
vercel deploy --prod --yes

echo ""
echo "Done."
echo "  App (subpath): ${PROD_WEB_URL}/sign-in"
echo "  Vercel URL:    https://flowchat-web-ten.vercel.app${BASE_PATH}/sign-in"
echo ""
echo "Next: proxy www.digitalbrandcast.com/FlowChat → Vercel (see docs/SUBPATH_DEPLOYMENT.md)"
