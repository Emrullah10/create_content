#!/usr/bin/env bash
# Sunucuda guncelle: kod cek -> env -> bagimlilik -> build -> migration -> env JSON -> pm2.
# Sira BILINCLI: build -> migration -> pm2. Build basarisizsa DB'ye dokunulmaz; migration basarisizsa `set -e` keser ve eski surum ayakta kalir.
# Bayraklar: SKIP_GIT=1 · SKIP_BUILD=1 · SKIP_DB=1 · CREATE_CONTENT_ENV_FILE=../env/.env
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_DIR="$(dirname "$ROOT")/env"
ENV_FILE="${CREATE_CONTENT_ENV_FILE:-$ENV_DIR/.env}"
MIGRATION_ENV_FILE="${CREATE_CONTENT_MIGRATION_ENV_FILE:-$ENV_DIR/migration.env}"
GENERATED="$ROOT/.env.generated.json"

[ -f "$ENV_FILE" ] || { echo "HATA: env yok: $ENV_FILE (sablon .env.example, chmod 600)" >&2; exit 1; }

[ "${SKIP_GIT:-}" = "1" ] || git pull --ff-only

# Env build'den ONCE: web derlemesi VITE_* ve APP_BASE degerlerini okur.
set +u; set -a; . "$ENV_FILE"; set +a; set -u

if [ "${SKIP_BUILD:-}" != "1" ]; then
  npm ci --include=dev   # env NODE_ENV=production tasisa da vite gibi devDeps kurulmali
  npm run build
fi

if [ "${SKIP_DB:-}" != "1" ]; then
  # Yetkili baglanti dizesini runner KENDISI okur; kabukta source edilmez (PM2 ortamina sizardi).
  if [ -f "$MIGRATION_ENV_FILE" ]; then
    MIGRATION_DB_CONNECTION_STRING="$(grep -E '^MIGRATION_DB_CONNECTION_STRING=' "$MIGRATION_ENV_FILE" | cut -d= -f2- | sed -e "s/^'//" -e "s/'$//")" node scripts/apply-migrations.mjs --pending
  else
    node scripts/apply-migrations.mjs --pending
  fi
fi

# JSON turetme node ile: kabukta elle JSON kacisi, sir icindeki tek bir " ile bozulur.
node scripts/env-to-json.mjs "$GENERATED" "$ENV_FILE" "$ROOT/.env.example"
ENV_FILE="$GENERATED" pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env
pm2 save
pm2 status
