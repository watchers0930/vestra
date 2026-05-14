## VESTRA

AI 기반 부동산 분석 플랫폼입니다. 전세 리스크, 권리분석, 시세/지도, feasibility, 리포트 기능을 포함합니다.

## Local Development

개발 서버 실행:

```bash
npm run dev
```

정적 검증:

```bash
npm run lint
npm run test
npm run build
```

## Deployment

VESTRA는 직접 운영 배포하지 않습니다.

```bash
npm run deploy:preview
npm run deploy:promote
```

배포 규칙:

- 항상 `t-vestra.vercel.app`으로 테스트 배포를 먼저 진행
- 확인 후 `vestra-plum.vercel.app`으로 승격
- preview 배포는 `lint`, `test`, `build`, `push`, `smoke`를 자동 수행

자세한 절차는 [docs/deployment-runbook.md](./docs/deployment-runbook.md)를 따릅니다.

## Runtime Notes

- preview alias도 CSRF 허용 origin에 포함됩니다.
- `/api/health`는 배포 smoke 검증용 공개 헬스체크 엔드포인트입니다.
