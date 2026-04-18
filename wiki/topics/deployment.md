---
topic: deployment
last_compiled: 2026-04-18
sources: 4
---

# 배포 및 인프라 (Deployment)

---

## Purpose [coverage: high -- 4 sources]

VESTRA의 프로덕션 배포 환경, 인프라 구성, 환경변수, Cron Job, 배포 절차에 관한 정보.

---

## Architecture [coverage: high -- 3 sources]

```
[GitHub watchers0930/vestra]
         │
         │ git push → main 브랜치
         ↓
[Vercel CI/CD 자동 배포]
         │
         ├─ Next.js Serverless Functions (49개 API Routes)
         ├─ Static/SSR 페이지 (CDN — Vercel Edge Network)
         └─ Edge Functions (middleware.ts)
         │
         ├─ [Neon PostgreSQL] 연결 풀링 (Prisma ORM)
         ├─ [OpenAI API] gpt-4.1-mini, 서버사이드 호출
         └─ [공공 API] MOLIT, 건축물대장, 대법원, 한국은행 ECOS
```

| 항목 | 설정 |
|------|------|
| 플랫폼 | Vercel (Hobby) |
| 런타임 | Node.js Serverless + Edge (Middleware) |
| DB 호스팅 | Neon PostgreSQL (서버리스, 연결 풀링) |
| CDN | Vercel Edge Network |
| 도메인 | https://vestra-plum.vercel.app |
| GitHub | watchers0930/vestra |
| CI/CD | git push → Vercel 자동 배포 |

---

## Deployment [coverage: high -- 4 sources]

### 배포 명령어

```bash
# 반드시 deploy 스크립트 사용 (npx vercel 직접 실행 금지)
deploy vestra
# → ~/scripts/deploy.sh 경유
# → watchers0930 계정으로 배포
# → 배포 후 vestra-plum.vercel.app alias 자동 갱신
```

> 주의: `npx vercel --prod --yes` 직접 실행은 금지. 반드시 `deploy vestra` alias를 사용한다.

### 로컬 개발 명령어

```bash
npm run dev           # 개발 서버 (localhost:3000)
npm run build         # 프로덕션 빌드 (--webpack 플래그 포함)
npm run start         # 프로덕션 서버 로컬 실행
npm run test          # Vitest 테스트 실행
npm run test:watch    # Vitest watch 모드
npm run lint          # ESLint
npm run seed:fraud    # 전세사기 사례 시드 데이터
npm run seed:training # ML 학습 데이터 시드
```

### 환경변수

| 변수 | 용도 | 필수 여부 |
|------|------|-----------|
| `OPENAI_API_KEY` | OpenAI API 인증 (gpt-4.1-mini) | 필수 |
| `DATABASE_URL` | Neon PostgreSQL 연결 풀링 URL | 필수 |
| `DIRECT_URL` | Neon 직접 연결 (마이그레이션 전용) | 필수 |
| `AUTH_SECRET` | NextAuth v5 시크릿 (미설정 시 서버 기동 불가) | 필수 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오 지도 SDK (JS API Key) | 필수 |
| `MOLIT_API_KEY` | 국토교통부 공공데이터 실거래가 API | 필수 |
| `BOK_API_KEY` | 한국은행 ECOS API (기준금리 조회) | 권장 |
| `LAW_API_KEY` | 대법원 판례 API (미설정 시 빈 배열 반환) | 선택 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 소셜 로그인 | 선택 |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | Kakao OAuth 소셜 로그인 | 선택 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | Naver OAuth 소셜 로그인 | 선택 |

### Cron Jobs

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| 등기 모니터링 | 매일 09:00 | 감시 중인 부동산 등기 변동 확인 및 알림 |
| 사기 데이터 수집 | 매주 월요일 03:00 | 전세사기 사례 데이터 자동 수집/갱신 |

### 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행 (DIRECT_URL 필요)
prisma migrate deploy

# Prisma 클라이언트 생성 (postinstall에 자동 포함)
prisma generate
```

- `postinstall` 스크립트에 `prisma generate`가 등록되어 있어 배포 시 자동 실행됨
- 마이그레이션은 `DIRECT_URL` (직접 연결)로 실행, 일반 쿼리는 `DATABASE_URL` (연결 풀링)로 실행

---

## Key Decisions [coverage: high -- 3 sources]

- **`npm run build`에 `--webpack` 플래그 사용**: Turbopack과 호환되지 않는 패키지(pdfjs-dist 등) 대응을 위해 Webpack 빌더 강제 지정
- **Neon Serverless + 연결 풀링 분리**: `DATABASE_URL`은 연결 풀링 엔드포인트, `DIRECT_URL`은 마이그레이션 전용 직접 연결로 분리하여 서버리스 환경에서 연결 수 폭증 방지
- **Vercel Hobby 플랜**: 함수 최대 실행 시간 제한이 있으며, AI 분석 API는 타임아웃에 주의 필요
- **PWA 지원**: `@serwist/next` 패키지 적용, 서비스 워커는 `app/sw.ts`에 위치
- **Vercel Analytics / Speed Insights 내장**: `@vercel/analytics`, `@vercel/speed-insights` 패키지가 의존성에 포함되어 성능 모니터링 활성화
- **`@vercel/kv` 내장**: KV 스토어 패키지가 의존성에 포함 (Rate Limit 등 활용 가능)
- **`deploy vestra` alias 필수**: 계정(`watchers0930`)과 alias(`vestra-plum.vercel.app`) 자동 갱신을 위해 `~/scripts/deploy.sh` 경유 배포가 강제됨

---

## Gotchas [coverage: high -- 3 sources]

- **Vercel Hobby 함수 실행 시간 제한**: AI 분석 API (OpenAI 호출 포함)는 실행 시간이 길어 타임아웃 위험이 있음. 최대 60초 한도 내에서 처리되도록 주의
- **Neon DB 콜드 스타트**: 유휴 후 첫 연결 시 지연 발생 가능. 연결 풀링으로 완화되지만 완전히 제거되지 않음
- **카카오 OAuth 미완**: 카카오 개발자 콘솔 설정이 완료되지 않아 카카오 로그인이 비활성화 상태 (v2.3.2 기준)
- **`prisma generate` 자동 실행**: `postinstall`에 걸려 있어 `npm install` 및 배포 시 항상 실행됨. Prisma 스키마 오류 시 빌드 실패 원인이 될 수 있음
- **`npx vercel` 직접 실행 금지**: 직접 실행 시 계정 라우팅과 alias 갱신이 누락됨. 반드시 `deploy vestra` 사용
- **파라미터 실증 미검증**: 위험도 스코어링·사기 진단·시세 예측의 가중치 수치는 전문가 휴리스틱 기반 초기값이며, 실제 사고 데이터로 캘리브레이션이 완료되지 않은 상태

---

## Sources

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/package.json`
