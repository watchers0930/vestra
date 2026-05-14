#!/bin/bash

set -euo pipefail

BASE_URL="${1:-}"

if [ -z "$BASE_URL" ]; then
  echo "❌ 사용법: npm run smoke -- https://your-alias.vercel.app"
  exit 1
fi

check_status() {
  local path="$1"
  local expected="${2:-200}"
  local status

  status="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")"
  if [ "$status" != "$expected" ]; then
    echo "❌ ${BASE_URL}${path} returned ${status} (expected ${expected})"
    exit 1
  fi

  echo "✅ ${BASE_URL}${path} -> ${status}"
}

check_health() {
  local response

  response="$(curl -fsS "${BASE_URL}/api/health")"
  if ! printf "%s" "$response" | grep -q '"status":"ok"'; then
    echo "❌ ${BASE_URL}/api/health payload missing status=ok"
    exit 1
  fi

  echo "✅ ${BASE_URL}/api/health -> ok"
}

check_status "/"
check_status "/login"
check_health

echo "✅ smoke checks complete for ${BASE_URL}"
