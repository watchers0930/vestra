#!/bin/bash

set -euo pipefail

ACTION="${1:-preview}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$HOME/.deploy-env.sh}"
PREVIEW_ALIAS="t-vestra.vercel.app"
PRODUCTION_ALIAS="vestra-plum.vercel.app"
# 승격(promote) 시 새 빌드로 함께 이동할 운영 도메인 전체.
# 실사용 도메인(vestra.ai.kr/www)이 빠지면 승격해도 사용자는 구빌드를 봄.
PRODUCTION_DOMAINS="vestra-plum.vercel.app vestra.ai.kr www.vestra.ai.kr"
DEFAULT_BRANCH="main"

if [ -f "$DEPLOY_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$DEPLOY_ENV_FILE"
fi

TOKEN="${TOKEN_WATCHERS0930:-}"

ensure_token() {
  if [ -z "$TOKEN" ]; then
    echo "❌ TOKEN_WATCHERS0930 이 설정되지 않았습니다."
    exit 1
  fi
}

ensure_branch() {
  local current
  current="$(git -C "$ROOT_DIR" branch --show-current)"
  if [ "$current" != "$DEFAULT_BRANCH" ]; then
    echo "❌ 현재 브랜치는 '$current' 입니다. '$DEFAULT_BRANCH' 브랜치에서 실행하세요."
    exit 1
  fi
}

ensure_repo_clean() {
  if [ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]; then
    echo "❌ 커밋되지 않은 변경이 있습니다. commit 후 다시 실행하세요."
    git -C "$ROOT_DIR" status --short
    exit 1
  fi
}

sync_with_origin() {
  echo "🔄 origin/$DEFAULT_BRANCH 동기화 확인"
  git -C "$ROOT_DIR" fetch origin "$DEFAULT_BRANCH"

  local local_sha remote_sha base_sha
  local_sha="$(git -C "$ROOT_DIR" rev-parse HEAD)"
  remote_sha="$(git -C "$ROOT_DIR" rev-parse "origin/$DEFAULT_BRANCH")"
  base_sha="$(git -C "$ROOT_DIR" merge-base HEAD "origin/$DEFAULT_BRANCH")"

  if [ "$local_sha" = "$remote_sha" ]; then
    return 0
  fi

  if [ "$local_sha" = "$base_sha" ]; then
    echo "❌ 로컬 브랜치가 origin/$DEFAULT_BRANCH 보다 뒤쳐져 있습니다. 최신 main을 먼저 반영하세요."
    exit 1
  fi

  if [ "$remote_sha" != "$base_sha" ]; then
    echo "❌ 로컬과 origin/$DEFAULT_BRANCH 가 분기되었습니다. rebase 후 다시 실행하세요."
    exit 1
  fi
}

push_branch() {
  echo "📤 origin/$DEFAULT_BRANCH 로 push"
  git -C "$ROOT_DIR" push origin "$DEFAULT_BRANCH"
}

deploy_preview() {
  local deploy_url

  echo "🧪 테스트 배포 시작: $PREVIEW_ALIAS"
  deploy_url="$(cd "$ROOT_DIR" && npx vercel --yes --token="$TOKEN" 2>&1 | tee /dev/stderr | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1)"

  if [ -z "$deploy_url" ]; then
    echo "❌ 테스트 배포 URL을 찾지 못했습니다."
    exit 1
  fi

  echo "🔗 preview alias 업데이트: $PREVIEW_ALIAS -> $deploy_url"
  npx vercel alias set "$deploy_url" "$PREVIEW_ALIAS" --token="$TOKEN" 2>&1 | tail -1

  echo "🩺 preview smoke test 실행"
  "$ROOT_DIR/scripts/smoke-deployment.sh" "https://$PREVIEW_ALIAS"

  echo "✅ 테스트 배포 완료: https://$PREVIEW_ALIAS"
}

promote_preview() {
  local deploy_url

  # ⚠️ 반드시 `vercel --prod`로 실제 Production deployment를 새로 만든다 (alias 이동 금지).
  #
  # [과거 결함] 예전 promote는 preview deployment에 운영 도메인 alias만 옮겼다.
  # 그런데 Vercel cron은 alias가 아니라 "current production deployment"에서만 실행된다.
  # 그래서 alias만 옮기면 웹 화면(도메인)은 최신 코드를 보여줘도, cron은 마지막
  # `--prod` 배포(옛 빌드)에 영원히 고정됐다. 등기감시 cron이 몇 달간 구코드로 돌며
  # 로그 유실이 반복된 근본원인이 바로 이것이었다(2026-09-17 규명).
  #
  # [수정] main HEAD를 production 타깃으로 재빌드해 cron이 도는 production deployment까지
  # 최신화한다. preview 검증과 동일한 커밋(main HEAD)을 빌드하므로 산출물은 실질 동일하다.
  echo "🚀 운영 승격(production 재빌드): main HEAD -> $PRODUCTION_DOMAINS"
  deploy_url="$(cd "$ROOT_DIR" && npx vercel --prod --yes --token="$TOKEN" 2>&1 | tee /dev/stderr | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | tail -1)"

  if [ -z "$deploy_url" ]; then
    echo "❌ production 배포 URL을 찾지 못했습니다."
    exit 1
  fi

  # --prod 배포는 운영 도메인을 자동 연결하지만, 커스텀 도메인 누락 방지를 위해 명시적으로 재연결한다.
  for domain in $PRODUCTION_DOMAINS; do
    echo "🔗 운영 도메인 연결: $domain -> $deploy_url"
    npx vercel alias set "$deploy_url" "$domain" --token="$TOKEN" 2>&1 | tail -1
  done

  echo "🩺 production smoke test 실행"
  "$ROOT_DIR/scripts/smoke-deployment.sh" "https://$PRODUCTION_ALIAS"
  "$ROOT_DIR/scripts/smoke-deployment.sh" "https://vestra.ai.kr"

  # cron은 방금 만든 production deployment에서 실행됨을 확인한다(맨 위가 방금 배포여야 함).
  echo "🔎 current production deployment 확인 (맨 위가 방금 배포여야 cron이 최신 코드로 실행됨):"
  npx vercel ls vestra --prod --token="$TOKEN" 2>&1 | grep -viE '^Vercel CLI|Fetching' | head -4

  echo "✅ 운영 승격 완료: $PRODUCTION_DOMAINS"
}

ensure_token
ensure_branch
ensure_repo_clean

case "$ACTION" in
  preview)
    sync_with_origin
    "$ROOT_DIR/scripts/verify-release.sh"
    push_branch
    deploy_preview
    ;;
  promote)
    promote_preview
    ;;
  *)
    echo "❌ 알 수 없는 액션: $ACTION"
    echo "사용법: ./scripts/deploy-vestra.sh [preview|promote]"
    exit 1
    ;;
esac
