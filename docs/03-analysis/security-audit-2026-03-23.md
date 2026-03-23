# VESTRA 보안 전수 점검 보고서

> 점검일: 2026-03-23
> 점검자: Security Architect Agent
> 대상 버전: v3.7.0
> 점검 범위: API Routes (59개), lib/ (90+ 모듈), middleware, 환경변수, next.config.ts

---

## 종합 평가

| 항목 | 점수 | 등급 |
|------|------|------|
| 인증/인가 | 8.5/10 | A |
| API 보안 | 7.5/10 | B+ |
| 환경변수 관리 | 5.0/10 | C |
| OWASP Top 10 | 7.5/10 | B+ |
| Cron 보안 | 6.0/10 | C+ |
| OpenAI 비용 보호 | 9.0/10 | A |
| DB 보안 | 8.5/10 | A |
| 프론트엔드 보안 | 8.0/10 | B+ |
| **종합** | **7.5/10** | **B+** |

---

## CRITICAL (즉시 수정 필요)

### [C-01] .env.local에 실제 프로덕션 비밀키 하드코딩

- **파일**: `.env.local`
- **OWASP**: A02 (Cryptographic Failures), A07 (Identification & Authentication Failures)
- **심각도**: CRITICAL
- **상세**:
  `.env.local` 파일에 다음 실제 프로덕션 시크릿이 평문으로 존재:
  - `DATABASE_URL` / `PGPASSWORD`: Neon DB 비밀번호 `npg_DClt06xZTibg`
  - `OPENAI_API_KEY`: `sk-proj-fOJubwft51...` (전체 키)
  - `AUTH_SECRET`: `8ZlGd55ZBhpkaFtTTMqghOrCwJhGXv7prY4/bMqdG+k=`
  - `VERCEL_OIDC_TOKEN`: 전체 JWT 토큰
  - `BOK_API_KEY`, `SEOUL_DATA_API_KEY`, `REB_API_KEY`, `MOLIT_API_KEY`

  `.gitignore`에 `.env*`와 `.env*.local` 패턴이 있어 git에는 커밋되지 않지만, 로컬 파일에 실제 프로덕션 키가 존재하는 것 자체가 위험합니다.

- **조치**:
  1. 이 보고서를 읽는 즉시: 현재 노출된 모든 키를 **로테이션** (DB 비밀번호 변경, OpenAI 키 재발급, AUTH_SECRET 재생성)
  2. 로컬 개발은 별도의 테스트 DB/키 사용
  3. Vercel 대시보드에서 프로덕션 환경변수를 개별 관리

### [C-02] PII_SALT 환경변수 미설정

- **파일**: `.env.local` (누락), `lib/env.ts:24` (required로 정의)
- **OWASP**: A02 (Cryptographic Failures)
- **심각도**: CRITICAL
- **상세**:
  `lib/env.ts`에서 `PII_SALT`를 필수로 정의했으나, `.env.local`에 해당 값이 없습니다.
  `lib/crypto.ts:23-27`에서 `PII_SALT` 미설정 시 에러를 throw하므로,
  현재 사업자등록번호 등 PII 암호화가 **런타임 실패** 상태일 수 있습니다.

- **조치**: `.env.local`과 Vercel 환경변수 모두에 `PII_SALT` 추가 (`openssl rand -hex 32`)

---

## HIGH (배포 전 수정 필요)

### [H-01] system-settings.ts의 하드코딩된 폴백 시크릿

- **파일**: `lib/system-settings.ts:18`
- **OWASP**: A02 (Cryptographic Failures)
- **심각도**: HIGH
- **코드**:
  ```typescript
  const secret = process.env.AUTH_SECRET || "vestra-default-secret-change-me";
  ```
  `AUTH_SECRET` 미설정 시 정적 문자열로 폴백됩니다. 이 경우 DB에 저장된 OAuth 키 등 민감 설정이 예측 가능한 키로 암호화됩니다.

- **조치**: 폴백 제거, AUTH_SECRET 미설정 시 throw Error

### [H-02] Cron 엔드포인트 인증 불일치 (3가지 패턴 혼재)

- **파일**:
  - `app/api/cron/registry-monitor/route.ts:100-106` — `process.env.NODE_ENV !== "production"`이면 인증 스킵
  - `app/api/cron/fraud-import/route.ts:18` — `cronSecret`이 falsy면 인증 스킵 (`if (cronSecret && ...)`)
  - `app/api/cron/news-collector/route.ts:17` — 동일하게 `cronSecret`이 falsy면 스킵

- **OWASP**: A01 (Broken Access Control)
- **심각도**: HIGH
- **상세**:
  `CRON_SECRET`이 `.env.local`에 설정되어 있지 않습니다. 즉:
  - `fraud-import`와 `news-collector`는 **무조건 인증 없이 접근 가능**
  - `registry-monitor`는 프로덕션에서만 인증 검사
  - 세 엔드포인트 모두 공개 URL로 접근 가능 (`/api/cron/*`)

- **조치**:
  1. `CRON_SECRET`을 Vercel 환경변수에 설정 (프로덕션 필수)
  2. 인증 패턴을 통일: `CRON_SECRET` 미설정 시 요청 거부 (fail-closed)
  3. middleware에서 `/api/cron/*` 경로를 matcher에서 제외하지 말고, 별도 보호

### [H-03] CSRF 방어 미적용 API 다수

- **OWASP**: A01 (Broken Access Control)
- **심각도**: HIGH
- **상세**: `validateOrigin()` (CSRF 방어)이 적용된 POST/PUT/DELETE 엔드포인트는 10개뿐이며, 나머지 상태 변경 API에는 미적용:

  | CSRF 미적용 (상태 변경 API) | 메서드 |
  |---|---|
  | `/api/chat` | POST |
  | `/api/analyze-unified` | POST |
  | `/api/analyze-contract` | POST |
  | `/api/predict-value` | POST |
  | `/api/generate-document` | POST |
  | `/api/extract-pdf` | POST |
  | `/api/fraud-risk` | POST |
  | `/api/feedback` | POST |
  | `/api/cascade-update` | POST |
  | `/api/subscription` | POST |
  | `/api/user/sync-data` | POST, DELETE |
  | `/api/scholar/search` | POST |
  | `/api/feasibility/parse` | POST |

- **조치**: 최소한 상태 변경이 있는 API (`subscription`, `sync-data`, `feedback`, `cascade-update`)에 `validateOrigin` 적용

### [H-04] CSRF validateOrigin의 Origin 부재 시 통과 로직

- **파일**: `lib/csrf.ts:28-29`
- **OWASP**: A01 (Broken Access Control)
- **심각도**: HIGH
- **코드**:
  ```typescript
  // 서버 사이드 호출 (origin 없음) 은 통과
  if (!origin && !referer) return null;
  ```
  Origin과 Referer가 모두 없는 요청을 통과시킵니다. 공격자가 `<img>`, `<form>` 등으로 Origin 헤더 없이 요청을 보낼 수 있습니다. (단, JSON body가 필요한 API는 `Content-Type: application/json`이 필요하므로 위험도가 일부 완화됩니다.)

- **조치**: Cron 엔드포인트나 서버 간 호출은 별도 토큰 인증으로 분리하고, 브라우저 요청은 Origin 필수로 변경

### [H-05] Rate Limit DB 실패 시 무조건 허용 (fail-open)

- **파일**: `lib/rate-limit.ts:68-71`
- **OWASP**: A05 (Security Misconfiguration)
- **심각도**: HIGH
- **코드**:
  ```typescript
  } catch {
    // DB 오류 시 요청 허용 (가용성 우선)
    return { success: true, remaining: limit, reset: resetTime.getTime() };
  }
  ```
  DB 장애 시 rate limit이 완전히 비활성화됩니다. DDoS 공격과 DB 장애가 동시에 발생하면 비용 폭발 가능.

- **조치**: 인메모리 폴백 카운터 추가 (openai.ts의 `fallbackCounter` 패턴 재사용), DB 실패 시 보수적 한도 적용

---

## MEDIUM (다음 스프린트에 수정)

### [M-01] Cron 엔드포인트 에러 응답에 상세 에러 노출

- **파일**: `app/api/cron/fraud-import/route.ts:38`
- **OWASP**: A09 (Security Logging and Monitoring Failures)
- **심각도**: MEDIUM
- **코드**:
  ```typescript
  { error: "Import failed", detail: String(error) }
  ```
  에러 스택 트레이스가 응답에 포함될 수 있습니다.

- **조치**: `detail` 필드 제거, 서버 로그에만 기록

### [M-02] subscription API에 CSRF/Rate Limit 미적용

- **파일**: `app/api/subscription/route.ts`
- **OWASP**: A01 (Broken Access Control)
- **심각도**: MEDIUM
- **상세**: 구독 변경(POST)에 `validateOrigin`, `rateLimit` 모두 미적용. 공격자가 CSRF로 사용자의 플랜을 변경할 수 있음.

- **조치**: CSRF 검증 + Rate Limit 추가

### [M-03] sync-data API에 입력 살균(sanitize) 미적용

- **파일**: `app/api/user/sync-data/route.ts`
- **OWASP**: A03 (Injection)
- **심각도**: MEDIUM
- **상세**: 클라이언트에서 전송한 `address`, `summary`, `typeLabel` 등의 문자열 필드에 `sanitizeField`가 적용되지 않음. Prisma ORM이 SQL injection은 방지하지만, 저장된 데이터가 프론트엔드에서 렌더링될 때 Stored XSS 가능성.

- **조치**: `sanitizeField` 또는 `sanitizeString` 적용

### [M-04] Admin API 일부가 withAdminAuth 대신 수동 검사

- **파일**: `app/api/admin/settings/route.ts:26-29` (GET), `app/api/admin/account/route.ts:13`
- **OWASP**: A01 (Broken Access Control)
- **심각도**: MEDIUM
- **상세**: 대부분의 admin API가 `withAdminAuth` 래퍼를 사용하지만, `settings/GET`과 `account/PUT`은 수동으로 `auth()` + 역할 검사. 일관성이 없어 실수로 누락될 위험.

- **조치**: 모든 admin API에 `withAdminAuth` 래퍼 통일

### [M-05] extract-pdf에 파일 매직바이트 검증 미적용

- **파일**: `app/api/extract-pdf/route.ts`
- **OWASP**: A08 (Software and Data Integrity Failures)
- **심각도**: MEDIUM
- **상세**: `lib/sanitize.ts`에 `validateMagicBytes` 함수가 구현되어 있지만, `extract-pdf` API에서 사용하지 않음. MIME 타입만으로 파일 종류를 판단하여 악성 파일 업로드 가능.

- **조치**: 파일 처리 전 `validateMagicBytes` 호출

### [M-06] news API에 인증/Rate Limit 미적용

- **파일**: `app/api/news/route.ts`
- **OWASP**: A01 (Broken Access Control)
- **심각도**: MEDIUM
- **상세**: 공개 읽기 API이지만 Rate Limit이 없어 스크래핑에 취약.

- **조치**: IP 기반 Rate Limit 추가

### [M-07] CSP에 'unsafe-inline' 사용

- **파일**: `next.config.ts:25-26`
- **OWASP**: A05 (Security Misconfiguration)
- **심각도**: MEDIUM
- **코드**:
  ```
  script-src 'self' 'unsafe-inline' ...
  style-src 'self' 'unsafe-inline'
  ```
  `unsafe-inline`은 인라인 스크립트/스타일을 허용하여 XSS 방어 효과를 약화시킴.

- **조치**: nonce 기반 CSP로 전환 (Next.js의 `nonce` 지원 활용)

---

## LOW (백로그 등록)

### [L-01] API 캐시 키에 사용자 구분 없는 패턴

- **파일**: `lib/api-cache.ts` (존재 확인)
- **심각도**: LOW
- **상세**: 캐시 키 생성 시 사용자 구분이 없으면 다른 사용자의 캐시된 데이터가 노출될 수 있음. (코드 확인 필요)

### [L-02] bcrypt 라운드 12 — 적절하지만 정기 검토 필요

- **파일**: `app/api/admin/account/route.ts:51`
- **심각도**: LOW
- **상세**: `bcrypt.hash(newPassword, 12)`는 현재 적절하나, 하드웨어 발전에 따라 주기적으로 상향 검토.

### [L-03] IP 추출 로직의 x-forwarded-for 스푸핑 가능성

- **심각도**: LOW
- **상세**: 여러 API에서 `req.headers.get("x-forwarded-for")` 사용. Vercel 환경에서는 `x-vercel-forwarded-for`가 신뢰 가능하지만, 일부 API는 `x-forwarded-for`만 사용.
- **해당 파일**: `app/api/chat/route.ts:13`, `app/api/analyze-unified/route.ts:32` 등

---

## 보안 강점 (잘 구현된 부분)

| 항목 | 설명 | 위치 |
|------|------|------|
| **보안 헤더** | HSTS, X-Frame-Options(DENY), CSP, X-Content-Type-Options, Permissions-Policy 모두 설정 | `next.config.ts` |
| **JWT 세션 전략** | NextAuth v5 JWE 암호화 토큰, HKDF 키 파생 | `middleware.ts` |
| **PII 자동 암호화** | Prisma Extension으로 businessNumber, address 자동 AES-256-GCM 암호화/복호화 | `lib/prisma.ts` |
| **감사 로그** | 모든 주요 액션(로그인/로그아웃/관리자 조작/분석 요청) fire-and-forget 기록, 민감정보 자동 마스킹 | `lib/audit-log.ts` |
| **입력 살균** | HTML 스트립, 길이 제한, 채팅 메시지 살균, 매직바이트 검증 함수 구현 | `lib/sanitize.ts` |
| **Cost Guard** | OpenAI 일일 호출 제한 + DB 장애 시 메모리 폴백 (보수적 한도) | `lib/openai.ts` |
| **역할 기반 접근 제어** | 5단계 역할(GUEST/PERSONAL/BUSINESS/REALESTATE/ADMIN) + 일일 사용량 제한 | `lib/auth.ts` |
| **관리자 래퍼** | `withAdminAuth` HOF로 admin API 인증 통일 | `lib/with-admin-auth.ts` |
| **비밀번호 정책** | 8자 이상 + 3종 이상 문자 조합 (공공기관 기준) | `app/api/admin/account/route.ts` |
| **DB 접근** | Prisma ORM 사용으로 SQL Injection 방어 | 전체 |
| **에러 핸들러** | API 키/환경변수 에러 시 사용자에게 상세 정보 노출 차단 | `lib/api-error-handler.ts` |

---

## OWASP Top 10 (2021) 체크리스트

| # | 취약점 | 상태 | 비고 |
|---|--------|------|------|
| A01 | Broken Access Control | **주의** | Cron 인증 불일치, CSRF 미적용 API 다수 |
| A02 | Cryptographic Failures | **주의** | PII_SALT 미설정, 폴백 시크릿 |
| A03 | Injection | **양호** | Prisma ORM + sanitize 모듈 (일부 API 미적용) |
| A04 | Insecure Design | **양호** | 역할 기반 설계, Rate Limit, Cost Guard |
| A05 | Security Misconfiguration | **주의** | fail-open rate limit, CSP unsafe-inline |
| A06 | Vulnerable Components | **양호** | (별도 `npm audit` 필요) |
| A07 | Auth Failures | **양호** | NextAuth v5 + JWT + bcrypt |
| A08 | Data Integrity Failures | **양호** | 매직바이트 검증 구현 (미적용 API 존재) |
| A09 | Logging & Monitoring | **양호** | 감사 로그 + 에러 상세 일부 노출 |
| A10 | SSRF | **양호** | 외부 API 호출은 하드코딩된 도메인만 사용 |

---

## 우선순위 수정 로드맵

### Phase 1 (즉시 — 0~1일)
1. [C-01] 모든 노출된 시크릿 로테이션
2. [C-02] PII_SALT 환경변수 설정

### Phase 2 (이번 주 — 2~3일)
3. [H-01] system-settings.ts 폴백 시크릿 제거
4. [H-02] Cron 인증 패턴 통일 (fail-closed)
5. [H-05] Rate Limit fail-open 수정

### Phase 3 (다음 스프린트)
6. [H-03][H-04] CSRF 방어 확대 및 Origin 부재 처리 강화
7. [M-01~M-07] 나머지 Medium 이슈
