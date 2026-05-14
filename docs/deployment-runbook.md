# VESTRA Deployment Runbook

## Rules

- 운영 배포는 직접 실행하지 않는다.
- 항상 `t-vestra.vercel.app`으로 테스트 배포를 먼저 올린다.
- 운영 승격은 별도 확인 후 `vestra-plum.vercel.app`에 alias 승격으로만 진행한다.
- 배포 전 로컬 워킹트리는 반드시 깨끗해야 한다.
- 배포는 `main` 브랜치에서만 진행한다.

## Commands

```bash
npm run deploy:preview
npm run deploy:promote
```

## What Preview Does

1. `origin/main` 최신 상태를 fetch 한다.
2. 로컬이 뒤쳐지거나 분기되었으면 중단한다.
3. `npm run lint`
4. `npm run test`
5. `npm run build`
6. `main`을 push 한다.
7. Vercel preview deployment를 생성한다.
8. `t-vestra.vercel.app` alias를 새 preview로 갱신한다.
9. smoke test를 실행한다.

## Smoke Checks

- `/`
- `/login`
- `/api/health`

## Promote Rules

- `npm run deploy:promote`는 새 빌드를 만들지 않는다.
- 현재 `t-vestra.vercel.app`가 가리키는 동일 deployment를 운영 alias로 승격한다.
- 승격 후 production smoke test를 다시 실행한다.
