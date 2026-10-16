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

# 시세지도가 실제로 뜨는지 검증(외부 CDN 전환 등으로 지도가 조용히 죽는 회귀 방지).
# ① CSP 헤더에 카카오 필수 도메인이 있는지(확실) ② 로컬 Chrome 있으면 실제 렌더까지(best-effort)
check_map() {
  local path="/renewal/price-map"
  local csp
  csp="$(curl -s -D - -o /dev/null "${BASE_URL}${path}" | tr -d '\r' | grep -i '^content-security-policy:')"
  if [ -z "$csp" ]; then
    echo "⚠️  ${path}: CSP 헤더를 찾지 못해 지도 CSP 검사 스킵"
  else
    local d
    for d in "t1.kakaocdn.net" "dapi.kakao.com"; do
      if ! printf "%s" "$csp" | grep -q "$d"; then
        echo "❌ ${path} CSP에 카카오 필수 도메인 '${d}' 누락 — 지도가 차단됩니다"
        exit 1
      fi
    done
    echo "✅ ${BASE_URL}${path} 지도 CSP 정상 (t1.kakaocdn.net · dapi.kakao.com)"
  fi

  local chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  if [ -x "$chrome" ]; then
    local dom
    dom="$("$chrome" --headless=new --disable-gpu --no-sandbox --virtual-time-budget=12000 --dump-dom "${BASE_URL}${path}" 2>/dev/null || true)"
    if printf "%s" "$dom" | grep -q "지도를 불러오지 못했습니다"; then
      echo "❌ ${path} 지도 렌더 실패 감지(error 상태) — 카카오 SDK/CSP 확인 필요"
      exit 1
    fi
    echo "✅ ${BASE_URL}${path} 지도 렌더 체크 통과(headless)"
  fi
}

check_status "/"
check_status "/login"
check_health
check_map

echo "✅ smoke checks complete for ${BASE_URL}"
