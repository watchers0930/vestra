#!/bin/bash

set -euo pipefail

ACTION="${1:-preview}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_ENV_FILE="${DEPLOY_ENV_FILE:-$HOME/.deploy-env.sh}"
PREVIEW_ALIAS="t-vestra.vercel.app"
PRODUCTION_ALIAS="vestra-plum.vercel.app"
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

  echo "📦 preview 배포 조회: $PREVIEW_ALIAS"
  deploy_url="$(npx vercel inspect "$PREVIEW_ALIAS" --token="$TOKEN" 2>&1 | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | grep -v "$PREVIEW_ALIAS" | head -1)"

  if [ -z "$deploy_url" ]; then
    echo "❌ preview alias에서 배포 URL을 찾지 못했습니다."
    exit 1
  fi

  echo "🚀 운영 승격: $deploy_url -> $PRODUCTION_ALIAS"
  npx vercel alias set "$deploy_url" "$PRODUCTION_ALIAS" --token="$TOKEN" 2>&1 | tail -1

  echo "🩺 production smoke test 실행"
  "$ROOT_DIR/scripts/smoke-deployment.sh" "https://$PRODUCTION_ALIAS"

  echo "✅ 운영 승격 완료: https://$PRODUCTION_ALIAS"
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
