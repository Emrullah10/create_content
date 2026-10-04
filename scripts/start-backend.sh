#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
command -v pm2 >/dev/null 2>&1 || { echo "pm2 gerekli: npm install -g pm2" >&2; exit 1; }
# Port cakismasi: baska bir surec 3100'u tutuyorsa PM2 sessizce eski/yanlis kodla calisir.
PORT="$(grep -E '^SERVICE_CONTENT_REST_URL=' .env 2>/dev/null | sed -E 's/.*:([0-9]+)\/?$/\1/' || true)"
PORT="${PORT:-3100}"
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && ! pm2 describe create-content-service-content >/dev/null 2>&1; then
  echo "HATA: $PORT portunu baska bir surec tutuyor (lsof -nP -iTCP:$PORT -sTCP:LISTEN)." >&2
  exit 1
fi
pm2 startOrReload "$ROOT/scripts/ecosystem.config.cjs" --update-env
pm2 status
