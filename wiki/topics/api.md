---
topic: api
last_compiled: 2026-06-22
sources: 6
---

# API

## Purpose

[coverage: high -- 3 sources]

VESTRA 플랫폼의 모든 서버 엔드포인트 인터페이스 명세. Next.js 16 App Router 기반 Vercel 서버리스 함수로 구현되어 있으며, 총 51개 API 라우트가 존재한다 (분석 12·사업성 7·관리자 16·사용자 5·모니터링 3·상호검증 2·Cron 2·기타 4). 핵심 목적은 등기부등본 분석, 계약서 검토, 시세전망, 권리분석, AI 채팅 등 부동산 AI 서비스를 안전하게 외부에 노출하는 것이다. 모든 OpenAI 호출은 서버사이드에서만 실행된다.

- 프로덕션 베이스 URL: `https://vestra-plum.vercel.app`
- 개발 베이스 URL: `http://localhost:3000`

---

## API Surface (전체 엔드포인트 목록)

[coverage: high -- 2 sources]

### 분석 API

| # | Method | URL | 인증 | 역할 제한 | Rate Limit |
|---|--------|-----|------|----------|-----------|
| 1 | POST | `/api/analyze-unified` | 선택 | - (미로그인 시 GUEST 한도) | 10/min + 일일 |
| 2 | POST | `/api/analyze-contract` | 선택 | PERSONAL+ | 30/min + 일일 + Cost Guard |
| 3 | POST | `/api/analyze-rights` | 선택 | - | 30/min + 일일 + Cost Guard |
| 4 | POST | `/api/predict-value` | 선택 | - | 30/min + 일일 + Cost Guard |

### 문서 처리 API

| # | Method | URL | 인증 | Rate Limit |
|---|--------|-----|------|-----------|
| 5 | POST | `/api/generate-document` | 불필요 | 30/min + Cost Guard |
| 6 | POST | `/api/extract-pdf` | 불필요 | 10/min |
| 7 | POST | `/api/parse-registry` | 불필요 | - |

### 사용자 API

| # | Method | URL | 인증 | CSRF |
|---|--------|-----|------|------|
| 8 | GET | `/api/user/profile` | 필수 | - |
| 9 | GET | `/api/user/usage` | 필수 | - |
| 10 | POST | `/api/user/setup-role` | 필수 | O |
| 11 | POST | `/api/user/migrate-data` | 필수 | - |

### 관리자 API (ADMIN 역할 전용)

| # | Method | URL | CSRF |
|---|--------|-----|------|
| 12 | GET | `/api/admin/users` | - |
| 13 | GET/PATCH/DELETE | `/api/admin/users/[id]` | - |
| 14 | GET/PATCH | `/api/admin/settings` | O |
| 15 | GET | `/api/admin/stats` | - |
| 16 | GET/POST | `/api/admin/announcements` | - |
| 17 | PATCH/DELETE | `/api/admin/announcements/[id]` | - |
| 18 | GET | `/api/admin/audit-logs` | - |

### 인증 API

| # | Method | URL | 설명 |
|---|--------|-----|------|
| 19 | GET/POST | `/api/auth/[...nextauth]` | NextAuth v5 핸들러 (자동 처리) |

### 부가 기능 API

| # | Method | URL | 인증 | Rate Limit |
|---|--------|-----|------|-----------|
| 20 | POST | `/api/chat` | 선택 (PERSONAL+) | 30/min + 일일 + Cost Guard |
| 21 | GET/POST | `/api/subscription` | 필수 | - |
| 22 | POST | `/api/subscription/cancel` | 필수 | - |
| 23 | POST | `/api/real-price` | 불필요 | - |
| 24 | GET | `/api/scholar/search` | 불필요 | - |

### 추가 기능 API (완료보고서 기준)

| # | Method | URL | 설명 |
|---|--------|-----|------|
| 25 | POST | `/api/fraud-risk` | 15-피처 전세사기 위험도 산출 |
| 26 | POST | `/api/credit-check` | KCB/NICE 신용정보 (현재 Mock) |
| 27 | GET/POST | `/api/monitoring` | 부동산 변동 모니터링 등록/조회 |
| 28 | GET/PATCH | `/api/monitoring/alerts` | 모니터링 알림 조회/일괄 읽음 |
| 29 | PATCH | `/api/monitoring/alerts/[id]` | 개별 알림 읽음 처리 |
| 30 | GET/POST | `/api/fraud-cases` | 전세사기 피해사례 조회/등록 |
| 31 | GET/POST | `/api/verification/request` | 상호검증 요청 생성/목록 |
| 32 | POST | `/api/verification/respond` | 상호검증 수락/거절 |
| 33 | GET | `/api/verification/shared/[id]` | 공유 리포트 조회 |
| 34 | GET | `/api/cron/registry-monitor` | Cron: 등기변동 모니터링 (매일 09:00) |
| 35 | GET | `/api/cron/fraud-import` | Cron: 전세사기 데이터 수집 (매주 월 03:00) |

### 역할별 일일 분석 한도 (접근 통제 매트릭스 기준)

| 역할 | 일일 한도 | 설명 |
|------|----------|------|
| GUEST | 2회 | 비로그인 (IP 기반 식별) |
| PERSONAL | 5회 | 일반 회원 |
| BUSINESS | 50회 | 기업 회원 (사업자 인증) |
| REALESTATE | 100회 | 부동산 전문가 (인증) |
| ADMIN | 무제한 (9,999회) | 관리자 |

---

## Architecture

[coverage: high -- 3 sources]

### 런타임 구조

```
Client (Browser / Next.js SSR)
        │ HTTPS
Vercel Serverless Functions
  ├── Rate Limit (슬라이딩 윈도우, DB 기반)
  ├── CSRF Guard (토큰 기반)
  ├── Auth (JWT, NextAuth v5)
  └── Core Analysis Engine
        ├── V-Score / Cross-Analysis / Fraud Risk
        ├── Cascade / Confidence / Registry Parser
        └── OpenAI gpt-4.1-mini (서버사이드 전용)
        │
        ├── Neon PostgreSQL (Prisma ORM, 28개 모델)
        ├── OpenAI API
        └── 공공 API (MOLIT, 건축물대장, 대법원, ECOS, 학술검색)
```

### 인증 방식

- 프레임워크: NextAuth v5 (beta.30)
- 세션 전략: JWT (JWE 암호화)
- 소셜 로그인: Google, Naver (카카오는 설정 중)
- Credentials 로그인: 이메일 + bcrypt 비밀번호
- 세션 전달: httpOnly 쿠키 (Secure, SameSite=lax)
- 동적 OAuth: DB 기반 OAuth 키 관리 — 관리자가 설정 변경 가능

### Rate Limit 정책

| 구분 | 방식 | 저장소 |
|------|------|--------|
| 분당 제한 | 슬라이딩 윈도우 | Neon PostgreSQL `RateLimit` 테이블 |
| 일일 제한 | 역할별 카운터 | `DailyUsage` 테이블 |
| Cost Guard | OpenAI API 일일 호출 제한 | 별도 카운터 |

Rate Limit 응답 헤더: `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix timestamp)

Rate Limit 식별자: IP + userId 조합

### 미들웨어 보호 경로 (Edge Function)

```
middleware.ts
├── /admin/*   → JWT 검증 + ADMIN 역할 확인
├── /dashboard → JWT 검증
└── /profile   → JWT 검증
```

### 입력값 살균 정책 (모든 API 공통)

- HTML 태그 및 `<script>` 블록 제거 (`stripHtml`)
- 입력 길이 제한: 기본 50,000자 (`truncateInput`)
- 필드별 최대 길이: 기본 500자 (`sanitizeField`)
- 채팅: role 허용값 검증, 메시지 수 50개 제한, 개별 10,000자 제한

### 외부 API 연동 모듈

| 외부 API | 내부 모듈 | 환경변수 | 자동 호출 엔드포인트 |
|---------|----------|---------|------------------|
| MOLIT 실거래가 (국토교통부) | `lib/molit-api.ts` | `MOLIT_API_KEY` | analyze-unified, analyze-rights, predict-value |
| 건축물대장·K-apt 단지목록 (국토교통부) | `lib/building-api.ts` | `KAPT_API_KEY` | analyze-unified, analyze-rights |
| VWorld NED 공시가격 (국토지리정보원) | `lib/vworld-api.ts` | `VWORLD_API_KEY` | analyze-unified, predict-value |
| 대법원 판례 (법제처) | `lib/court-api.ts` | `LAW_API_KEY` | analyze-contract, chat |
| ECOS 기준금리 (한국은행) | `lib/bok-api.ts` | `BOK_API_KEY` | predict-value |
| OpenAI (gpt-4.1-mini) | `lib/openai.ts` | `OPENAI_API_KEY` | 분석 API 전반 |
| KCB/NICE 신용정보 | `lib/credit-api.ts` | KCB/NICE API키 | credit-check |

- `LAW_API_KEY` 미설정 시 빈 배열 반환
- KCB/NICE API키 미설정 시 MockCreditProvider 사용 (Strategy 패턴)
- 알림 발송(`lib/notification-sender.ts`): `KAKAO_ALIMTALK_API_KEY` 없으면 console.log Mock 모드, 있으면 Bizm API 호출

### Cron Jobs

| 작업 | 경로 | 스케줄 | 보안 |
|------|------|--------|------|
| 등기변동 모니터링 | `/api/cron/registry-monitor` | 매일 09:00 (`0 9 * * *`) | CRON_SECRET 검증, 프로덕션만 강제 |
| 전세사기 데이터 수집 | `/api/cron/fraud-import` | 매주 월 03:00 (`0 3 * * 1`) | CRON_SECRET 검증 |

등기변동 모니터링은 배치 크기 50건/회로 처리하며, sha256 해시 비교로 변동을 감지한다.

---

## Security

[coverage: high -- 3 sources]

### 보안 모듈 목록

| 모듈 | 파일 | 내용 |
|------|------|------|
| 암호화 | `lib/crypto.ts` | AES-256-GCM — 학습 데이터, 시스템 설정 (OAuth 키 포함) 암호화 저장 |
| CSRF 방어 | `lib/csrf.ts` | 토큰 기반 검증 — POST `/api/user/setup-role`, ADMIN 설정 변경 등 변이 요청에 적용 |
| XSS 방지 | `lib/sanitize.ts` | DOMPurify 기반 입력 살균 |
| Rate Limit | `lib/rate-limit.ts` | DB 기반 분당/일일 제한 |
| 감사 로그 | `lib/audit-log.ts` | 모든 관리자 활동 및 분석 요청 기록 (IP, UserAgent, PII 마스킹) |

### 보안 HTTP 헤더 (`next.config.ts`)

- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- X-Content-Type-Options: nosniff
- Permissions-Policy (카메라, 마이크, 위치 차단)

### 감사 로그 기록 대상 액션

| 액션 | 설명 |
|------|------|
| `LOGIN` / `LOGOUT` | 로그인/로그아웃 |
| `LOGIN_FAILED` | 로그인 실패 |
| `SIGNUP` | 회원가입 |
| `ROLE_CHANGE` | 역할 변경 |
| `ADMIN_USER_UPDATE` | 관리자의 사용자 정보 수정 |
| `ADMIN_USER_DELETE` | 관리자의 사용자 삭제 |
| `ADMIN_SETTINGS_CHANGE` | 시스템 설정 변경 |
| `ANALYSIS_REQUEST` / `ANALYSIS_COMPLETE` | 분석 요청/완료 |
| `RATE_LIMIT_EXCEEDED` | Rate Limit 초과 |
| `SETTINGS_VIEW` | 설정 조회 |
| `PASSWORD_CHANGE` | 비밀번호 변경 |
| `MONITORING_REGISTERED` | 모니터링 등록 |
| `VERIFICATION_REQUESTED` / `ACCEPT` / `REJECT` | 상호검증 요청/수락/거절 |
| `CREDIT_CHECK` | 신용정보 조회 |

### 공통 에러 코드

| HTTP | 설명 |
|------|------|
| 400 | 필수 파라미터 누락 또는 유효성 검증 실패 |
| 401 | 인증 필요 (세션 없음) |
| 403 | 권한 부족 (역할 미충족) |
| 429 | Rate Limit 또는 일일 한도 초과 |
| 500 | 서버 내부 오류 |

공통 에러 응답 형식: `{ "error": "에러 메시지 (한글)" }`

---

## Key Decisions

[coverage: medium -- 3 sources]

1. **인증 선택적 적용** — 핵심 분석 API(`analyze-unified`, `analyze-rights`, `predict-value`)는 인증 없이 사용 가능하나 미로그인 시 GUEST 일일 한도(2회)가 적용된다. `/api/analyze-contract`와 `/api/chat`은 PERSONAL 이상만 접근 가능하다 (접근 통제 매트릭스 기준).

2. **Cost Guard 별도 운영** — OpenAI API 호출 비용 보호를 위해 Rate Limit 외에 별도 Cost Guard 카운터를 운용한다. 분석 API 및 chat API에 적용된다.

3. **동적 OAuth 키 관리** — 소셜 로그인 OAuth 키를 코드에 하드코딩하지 않고 DB(`SystemSetting` 테이블)에 AES-256-GCM 암호화 저장하여 관리자 대시보드에서 변경 가능하다.

4. **Strategy 패턴으로 외부 API 격리** — KCB/NICE 신용정보 등 실제 계약이 필요한 외부 API는 Provider 인터페이스와 Mock 구현체를 분리하여, API키 없이도 플랫폼이 동작한다.

5. **등기부 API 시뮬레이션** — 등기변동 모니터링 cron에서 실제 등기부 조회 API는 미연동 상태(TODO 표시)이며, 현재는 시뮬레이션으로 동작한다 (설계 의도).

6. **알림 발송 Mock 모드** — `notification-sender.ts`의 이메일 발송은 Mock만 구현되어 있으며, 카카오 알림톡은 API키 존재 여부로 자동 전환된다.

7. **`analyze-unified` Rate Limit 특별 설정** — 다른 분석 API(30/min)의 1/3인 10/min으로 제한한다. 내부적으로 V-Score, 교차분석, 사기위험도 등 복수의 무거운 엔진을 모두 실행하기 때문이다.

---

## Gotchas

[coverage: medium -- 2 sources]

- **`/api/analyze-unified` Rate Limit 10/min** — 다른 분석 API(30/min)의 1/3. 가장 무거운 복합 분석 엔드포인트이므로 프론트에서 중복 호출에 주의.

- **MOLIT API 자동 호출** — `analyze-unified`, `analyze-rights`, `predict-value` 내부에서 국토교통부 실거래가 API를 자동 호출한다. MOLIT API 장애 시 해당 엔드포인트 전체에 영향.

- **`admin/settings` AES-256-GCM 암호화** — OAuth 키, Rate Limit 설정 등 시스템 파라미터는 DB에 암호화 저장되므로 직접 DB 쿼리로 조회해도 평문을 볼 수 없다.

- **`audit-logs` 조회 필터** — `page`, `limit`(최대 200), `action`, `userId`, `from`(ISO8601), `to`(ISO8601) 파라미터 지원.

- **카카오 로그인 비활성화 상태** — 완료보고서(v2.3.2) 기준 카카오 개발자 콘솔 설정 미완료로 비활성화. `auth/[...nextauth]`의 Kakao 콜백 경로는 코드에 있으나 실제 동작하지 않는다.

- **신용정보 API Mock 상태** — `/api/credit-check`의 KCB/NICEProvider는 스켈레톤 구현(throw Error)이며, 실제 연동을 위해서는 API키 계약 및 Provider 구현이 필요하다.

- **CRON_SECRET 검증** — cron 엔드포인트는 프로덕션 환경에서 `Authorization: Bearer ${CRON_SECRET}` 헤더 검증을 강제한다. 개발 환경에서는 무제한.

- **파라미터 실증 미검증** — V-Score 가중치, 감점 수치(30/25/20점), 증폭계수(1.3~1.7), 15-피처 가중치 등은 전문가 휴리스틱 초기값이며 실제 사고 데이터 기반 캘리브레이션이 완료되지 않았다. API 응답의 위험도 수치는 참고용으로 해석해야 한다.

---

## Sources

- `/Users/watchers/Desktop/vestra/docs/04-API-Spec.md`
- `/Users/watchers/Desktop/vestra/docs/security/access-control-matrix.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/docs/03-analysis/vestra-rfp-enhancement-final.analysis.md`
- `/Users/watchers/Desktop/vestra/documents/완료보고서-2026-03-23/VESTRA_기술분석서_v4.5.1.md`
