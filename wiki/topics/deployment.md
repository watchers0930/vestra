---
topic: deployment
last_compiled: 2026-09-16
sources: 8
---

# 배포 및 인프라 (Deployment)

---

## Purpose [coverage: high -- 4 sources]

VESTRA의 프로덕션 배포 환경, 인프라 구성, 환경변수, Cron Job, 배포 절차에 관한 정보.

**배포 원칙**: 운영 배포는 직접 하지 않는다. 항상 테스트 배포(`t-vestra.vercel.app`) 먼저, 운영 승격은 사용자 확인 후 별도 지시가 있을 때만 진행.

---

## Architecture [coverage: high -- 3 sources]

```
[GitHub watchers0930/vestra]
         │
         │ git push → main 브랜치
         ↓
[Vercel CI/CD 자동 배포]
         │
         ├─ Next.js Serverless Functions (51개 API Routes)
         ├─ Static/SSR 페이지 (CDN — Vercel Edge Network)
         └─ Edge Functions (middleware.ts)
         │
         ├─ [Neon PostgreSQL] 연결 풀링 (Prisma ORM)
         ├─ [OpenAI API] gpt-4.1-mini, 서버사이드 호출
         └─ [공공 API] MOLIT, 건축물대장, 대법원, 한국은행 ECOS, VWorld, K-apt 등 10종
```

| 항목 | 설정 |
|------|------|
| 플랫폼 | Vercel |
| 런타임 | Node.js Serverless + Edge (Middleware) |
| DB 호스팅 | Neon PostgreSQL (서버리스, 연결 풀링) |
| CDN | Vercel Edge Network |
| 프로덕션 도메인 | https://vestra.ai.kr (구 vestra-plum.vercel.app) |
| 테스트 도메인 | https://t-vestra.vercel.app |
| GitHub | watchers0930/vestra |
| CI/CD | git push → Vercel 자동 배포 |
| 배포 리전 | icn1 (서울) — `vercel.json regions` 고정 |
| 현재 운영 버전 | v5.167.6 |

---

## Deployment [coverage: high -- 5 sources]

### 배포 흐름 (2-단계 모델)

```
1. Preview 배포 → t-vestra.vercel.app
   └─ npm run deploy:preview
         ├─ origin/main fetch & 동기화 확인
         ├─ npm run lint
         ├─ npm run test
         ├─ npm run build
         ├─ git push (main)
         ├─ vercel preview deployment 생성
         ├─ t-vestra.vercel.app alias 갱신
         └─ smoke check (/, /login, /api/health)

2. 운영 승격 → vestra.ai.kr
   └─ npm run deploy:promote
         ├─ 새 빌드 생성 없음
         ├─ t-vestra.vercel.app 동일 deployment → 운영 alias 승격
         └─ production smoke check 재실행
```

### 배포 명령어

```bash
# 1단계: 테스트 배포
npm run deploy:preview

# 2단계: 운영 승격 (사용자 확인 후)
npm run deploy:promote

# 또는 스크립트 직접 사용 (동일 결과)
deploy vestra   # ~/scripts/deploy.sh 경유
```

> **절대 금지**: `npx vercel` 직접 실행, 미리보기 확인 없는 즉시 운영 배포

### Smoke Check 항목

| 경로 | 내용 |
|------|------|
| `/` | 랜딩 페이지 정상 응답 |
| `/login` | 로그인 페이지 렌더링 |
| `/api/health` | API 서버 헬스체크 |

### 로컬 개발 명령어

```bash
npm run dev            # 개발 서버 (localhost:3000)
npm run build          # 프로덕션 빌드 (prebuild 게이트 후 next build --webpack)
npm run start          # 프로덕션 서버 로컬 실행
npm run test           # Vitest 테스트 실행
npm run test:watch     # Vitest watch 모드
npm run lint           # ESLint
npm run audit:api      # API 인가 게이트 단독 실행
npm run audit:security # 보안 회귀 게이트(SAST+SCA) 단독 실행
npm run seed:fraud     # 전세사기 사례 시드 데이터
npm run seed:training  # ML 학습 데이터 시드
```

### prebuild 보안 게이트 (빌드 차단)

`npm run build`는 `prebuild`가 먼저 실행되어, 두 게이트를 AND로 통과해야만 `next build`로 진입한다. 하나라도 실패하면 빌드 자체가 실패(회귀 차단).

```
prebuild = node scripts/audit-api-auth.mjs && node scripts/audit-security.mjs
```

**1. API 인가 게이트 (`audit-api-auth.mjs`)**
- `app/api/**/route.ts`의 변이 핸들러(POST/PUT/PATCH/DELETE) 중 "인증 신호"가 전혀 없는 것을 검출해 빌드 실패.
- 인증 신호(하나라도 있으면 통과): `auth()`, `withAdminAuth`, `withAgentAuth`, `CRON_SECRET`, **`verifyCronSecret`(v5.166+ 신설)**.
- 의도적 공개(rate-limit/CSRF로 보호)는 `ALLOWLIST`로 명시 관리. 미사용 ALLOWLIST 항목은 정리 권장 경고.

**2. 보안 회귀 게이트 (`audit-security.mjs`)** — SAST(경량) + SCA(의존성 취약점)
- 철학: 기존 부채는 유예(`scripts/security-baseline.json`), **신규 도입만 차단**.
- SAST(로컬 결정적, 하드 차단):
  - **바이너리 취급 tracked 소스 검출(v5.166+ 신설)**: `git grep -I` SAST는 NUL 바이트 섞인 바이너리 소스를 건너뛰어 영구 사각지대가 됨(과거 `lib/crypto.ts` NUL 사고). `git ls-files`로 tracked 소스를 직접 읽어 NUL 포함 파일을 검출·차단.
  - `eval(` baseline 0 → 신규 발견 시 차단.
  - `dangerouslySetInnerHTML` baseline 초과 시 차단(래칫).
- SCA(`npm audit`): baseline에 없는 신규 advisory가 나오면 차단. 네트워크/레지스트리 이슈로 명령 자체가 실패하면 fail-open(배포 계속). security-baseline advisory는 45→43건으로 감축.

### 환경변수

| 변수 | 용도 | 필수 여부 |
|------|------|-----------|
| `OPENAI_API_KEY` | OpenAI API 인증 (gpt-4.1-mini) | 필수 |
| `DATABASE_URL` | Neon PostgreSQL 연결 풀링 URL | 필수 |
| `DIRECT_URL` | Neon 직접 연결 (마이그레이션 전용) | 필수 |
| `AUTH_SECRET` | NextAuth v5 시크릿 (미설정 시 서버 기동 불가) | 필수 |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | 카카오 지도 SDK (JS API Key, 5ec282d2...) | 필수 |
| `MOLIT_API_KEY` | 국토교통부 공공데이터 실거래가 API (data.go.kr 계정 A) | 필수 |
| `KAPT_API_KEY` | K-apt 단지목록/건축물대장 API (data.go.kr 계정 B) | 필수 |
| `VWORLD_API_KEY` | VWorld NED 공시가격 API (개별공시지가/공동주택/개별주택) | 필수 |
| `BOK_API_KEY` | 한국은행 ECOS API (기준금리 조회) | 권장 |
| `LAW_API_KEY` | 대법원 판례 API (미설정 시 빈 배열 반환) | 선택 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 소셜 로그인 | 선택 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | Naver OAuth 소셜 로그인 | 선택 |

### Cron Jobs (총 8개, `vercel.json crons`)

| 경로 | 스케줄 (UTC) | KST | 설명 |
|------|-------------|-----|------|
| `/api/cron/registry-monitor` | `0 3,8 * * *` | 12:00, 17:00 | 감시 중인 부동산 등기 변동 프리체크·알림 |
| `/api/cron/fraud-import` | `0 3 * * 1` | 월 12:00 | 전세사기 사례 데이터 자동 수집/갱신 |
| `/api/cron/news-collector` | `0 6 * * *` | 15:00 | 부동산 뉴스 수집 |
| `/api/cron/research-journal` | `30 8 * * *` | 17:30 | 리서치 저널 생성 |
| `/api/cron/guarantee-monitor` | `0 0 * * 1` | 월 09:00 | 보증 규칙 모니터링 |
| `/api/cron/loan-rate-update` | `0 9 1,11,21 * *` | 1·11·21일 18:00 | 대출 금리 갱신 |
| `/api/cron/contract-expiry` | `0 9 * * *` | 18:00 | 계약 만료 알림 |
| `/api/cron/cleanup` | `0 19 * * *` | 04:00 | **(신설, v5.166+)** 고아 temp Blob 정리 + retention 정리(AuditLog 365일·Notification 180일) |

- **cleanup cron 신설**: 폼 이탈로 버려진 temp 업로드(고아 Blob)를 DB 참조 대조 후 미참조만 삭제 + 오래된 레코드 정리. 각 단계 독립 try/catch(하나 실패해도 다른 정리 진행). `maxDuration=60`, `dynamic=force-dynamic`.
- **cron 인증**: 모든 cron 핸들러는 `verifyCronSecret(authorization 헤더)`로 Bearer 시크릿 검증(`CRON_SECRET`). 실패 시 401.
- **`registry-monitor` maxDuration=60**: 틸코 외부 API 콜드스타트 지연으로 인한 함수 타임아웃을 방지하기 위해 `export const maxDuration = 60` + `dynamic = "force-dynamic"` 명시.

### 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행 (DIRECT_URL 필요)
prisma migrate deploy

# Prisma 클라이언트 생성 (postinstall에 자동 포함)
prisma generate
```

- `postinstall` 스크립트에 `prisma generate`가 등록되어 있어 배포 시 자동 실행됨
- 마이그레이션은 `DIRECT_URL` (직접 연결)로 실행, 일반 쿼리는 `DATABASE_URL` (연결 풀링)로 실행
- 운영 DB는 Prisma Migrate로 관리되는 상태가 아님 (`prisma/migrations` 없음). DB 구조 변경 시 별도 승인 필요.

---

## Key Decisions [coverage: high -- 3 sources]

- **2단계 배포 모델 (Preview → Promote)**: 새 빌드를 운영에 직접 올리지 않는다. `t-vestra`에서 검증 후 동일 deployment를 운영 alias로 승격. 검증된 artifact 그대로 운영 반영.
- **`npm run build`에 `--webpack` 플래그 사용**: Turbopack과 호환되지 않는 패키지(pdfjs-dist 등) 대응을 위해 Webpack 빌더 강제 지정
- **Neon Serverless + 연결 풀링 분리**: `DATABASE_URL`은 연결 풀링 엔드포인트, `DIRECT_URL`은 마이그레이션 전용 직접 연결로 분리하여 서버리스 환경에서 연결 수 폭증 방지
- **Vercel Hobby 플랜**: 함수 최대 실행 시간 제한이 있으며, AI 분석 API는 타임아웃에 주의 필요
- **`deploy vestra` alias 필수**: 계정(`watchers0930`)과 alias(`vestra.ai.kr`) 자동 갱신을 위해 `~/scripts/deploy.sh` 경유 배포가 강제됨
- **`xlsx` 의존성을 npm 대신 CDN tgz로 고정**: `package.json`의 `xlsx`를 `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`로 지정. npm 레지스트리 버전에 알려진 취약점이 있어, 공식 SheetJS CDN 배포 tgz로 대체. Vercel 빌드에서 CDN tgz 정상 설치·빌드 확인됨.
- **prebuild 게이트로 신규 보안 회귀 차단**: `next build` 진입 전 API 인가 게이트 + 보안 회귀(SAST/SCA) 게이트를 강제. 기존 부채는 baseline 유예, 신규 도입만 하드 차단하는 래칫 방식.

---

## Gotchas [coverage: high -- 3 sources]

- **Vercel 함수 실행 시간 제한**: AI 분석 API (OpenAI 호출 포함)는 실행 시간이 길어 타임아웃 위험이 있음. 최대 60초 한도 내에서 처리되도록 주의
- **Neon DB 콜드 스타트**: 유휴 후 첫 연결 시 지연 발생 가능. 연결 풀링으로 완화되지만 완전히 제거되지 않음
- **운영 배포 시 새 빌드 금지**: `deploy:promote`는 새 빌드를 만들지 않는다. `t-vestra`가 가리키는 deployment를 그대로 승격.
- **`prisma generate` 자동 실행**: `postinstall`에 걸려 있어 `npm install` 및 배포 시 항상 실행됨. Prisma 스키마 오류 시 빌드 실패 원인
- **틸코 외부 API 콜드스타트 → cron 타임아웃**: `registry-monitor` cron은 틸코 외부 API 콜드스타트 지연으로 기본 함수 한도 내 완료가 어려울 수 있어 `maxDuration=60`으로 상향. `cleanup` cron도 동일하게 `maxDuration=60`.
- **`xlsx`는 CDN tgz 의존성**: `package.json`에 URL(`cdn.sheetjs.com/...tgz`)로 박혀 있어 lockfile/설치 시 CDN 접근 필요. 오프라인/네트워크 차단 환경에서 설치 실패 가능. 버전 변경 시 취약점 회피 목적임을 유의(npm 레지스트리 버전으로 되돌리지 말 것).
- **prebuild 게이트가 빌드를 막는다**: 인증 없는 신규 변이 핸들러, NUL 바이트 섞인 바이너리 소스, 신규 `eval(`/`dangerouslySetInnerHTML`/의존성 취약점 도입 시 `next build` 이전에 빌드 실패. 배포 전 `npm run audit:api`·`npm run audit:security`로 사전 확인 가능.
- **`npx vercel` 직접 실행 금지**: 직접 실행 시 계정 라우팅과 alias 갱신이 누락됨. 반드시 `npm run deploy:preview` 사용
- **파라미터 실증 미검증**: 위험도 스코어링·사기 진단·시세 예측의 가중치 수치는 전문가 휴리스틱 기반 초기값이며, 실제 사고 데이터로 캘리브레이션이 완료되지 않은 상태
- **배포 전 체크리스트**: lint + test + build 통과, 미커밋 변경 없음, main이 origin/main과 동기화 → 세 조건 모두 충족 시에만 배포 진행

---

## Sources

- `/Users/watchers/Desktop/vestra/CLAUDE.md`
- `/Users/watchers/Desktop/vestra/docs/deployment-runbook.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/package.json`
- `/Users/watchers/Desktop/vestra/vercel.json`
- `/Users/watchers/Desktop/vestra/scripts/audit-security.mjs`
- `/Users/watchers/Desktop/vestra/scripts/audit-api-auth.mjs`
