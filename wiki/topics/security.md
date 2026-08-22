---
topic: security
last_compiled: 2026-08-22
sources: 14
---

# 보안 정책 및 가이드 (Security)

---

## Purpose [coverage: high -- 6 sources]

VESTRA의 보안 아키텍처는 행정안전부 SW 개발보안 가이드 및 OWASP Top 10 (2021) 기준을 기반으로 구현되었다. 개인정보보호법 제33조(개인정보 영향평가) 준수를 목표로 하며, PII 암호화·역할 기반 접근 제어·감사 로그를 3대 핵심 축으로 삼는다.

2026-03-23 전수 보안 점검(v3.7.0 기준) 결과 종합 등급 **B+ (7.5/10)** 이며, CRITICAL 2건·HIGH 5건·MEDIUM 7건·LOW 3건의 이슈가 식별되었다.

v4.5.1 종합평점 (2026-06-22 기준) 에서는 `withAdminAuth` HOF 통일, `crypto.ts` PII 암호화 강화, `sanitize.ts` 개선 등으로 보안 영역 점수가 **9.0/10** 으로 상향되었다. OWASP Top 10 (2021) 기준 10개 항목 중 **8개 완전 충족, 2개 부분 충족**.

**이번 세션(2026-08-22) 반영 사항** — 임대 플랫폼(매물/전자계약/가계약) 도메인의 접근 제어와 개인정보 최소화가 강화되었다.

- **매물등록 권한 가드**: 사업자 회원(RENTAL_BIZ / BUSINESS / REALESTATE)은 `verifyStatus=verified` 상태여야만 매물 등록 가능(서버 + 클라이언트 이중 게이트). 개인 임대인(LANDLORD/PERSONAL)·ADMIN은 인증 대상 아님. 임차인(TENANT)은 등록 자체 불가.
- **사업성분석 기업 전용 가드**: `lib/feasibility-guard.ts` 신설. FeasibilityReport는 BUSINESS·ADMIN만 접근 가능하며 생성 API 5종 + 화면에 일괄 적용.
- **개인정보 최소화(가계약서 주민번호)**: 서명자 주민등록번호는 생년월일 6자리 + 성별 1자리(`890101-1`)까지만 `signerRrnPrefix`로 저장. 뒷 6자리는 수집·저장하지 않음.
- **전자계약/가계약 PDF 접근 격리**: 로그인한 계약 당사자(landlordId / tenantId / creatorId / 당사자 이메일)만 PDF 다운로드 허용.
- **조회 권한 격리 유지**: 매물·의향서·채팅방 조회는 소유자(ownerId)·신청자(applicantId)·본인(userId) 필터로 격리.

---

## Architecture [coverage: high -- 4 sources]

### 보안 레이어 구조

```
[브라우저]
  ↓ HTTPS (HSTS 1년)
[Edge — middleware.ts]
  ├── JWT 사전 검증 (NextAuth v5 JWE)
  ├── /admin/* → ADMIN 역할 강제
  ├── /dashboard, /profile → 인증 강제
  └── 보안 헤더 주입 (next.config.ts)
[Vercel Serverless — API Routes]
  ├── sanitizeInput()          — XSS/스크립트 제거
  ├── validateOrigin()         — CSRF Origin/Referer 검증
  ├── rateLimit()              — DB 기반 분당·일일 제한
  ├── auth() + 역할 검사        — RBAC
  ├── withAdminAuth()          — 관리자 API 래퍼
  ├── withAgentAuth()          — 부동산 중개사 API 래퍼(REALESTATE+verified)
  ├── assertFeasibilityAccess()— 사업성분석 기업 전용 가드
  └── 리소스 소유권 검사        — ownerId/applicantId/당사자 필터
[Prisma Extension — lib/prisma.ts]
  └── PII 자동 암호화/복호화 (AES-256-GCM)
[Neon PostgreSQL]
  ├── AuditLog           — 전체 감사 이력
  ├── RateLimit          — IP 기반 슬라이딩 윈도우
  └── DailyUsage         — 역할별 일일 사용량
```

### 보안 모듈 목록 (`lib/`)

| 모듈 | 파일 | 내용 |
|------|------|------|
| 암호화 | `crypto.ts` | AES-256-GCM (PII, 시스템 설정), HMAC-SHA256 검색 해시 |
| CSRF 방어 | `csrf.ts` | Origin/Referer 기반 검증 |
| XSS 방지 | `sanitize.ts` | HTML/script/iframe 태그 제거, 매직바이트 검증 |
| Rate Limit | `rate-limit.ts` | DB 기반 슬라이딩 윈도우, 일일 역할별 한도 |
| 감사 로그 | `audit-log.ts` | 주요 액션 전체 기록 (IP, UserAgent), 민감 필드 자동 마스킹 |
| 인증 | `auth.ts` | NextAuth v5 JWT 세션, RBAC |
| 관리자 래퍼 | `with-admin-auth.ts` | `withAdminAuth` HOF — admin API 인증 통일 |
| 중개사 래퍼 | `with-agent-auth.ts` | `withAgentAuth` HOF — REALESTATE 역할 + verified 상태 강제 |
| 기능 가드 | `feasibility-guard.ts` | `assertFeasibilityAccess` — 사업성분석 BUSINESS·ADMIN 전용 |
| 에러 핸들러 | `api-error-handler.ts` | API 키/환경변수 에러 시 사용자에게 상세 정보 미노출 |

### 보안 헤더 (`next.config.ts`)

| 헤더 | 값 |
|------|----|
| Content-Security-Policy | `script-src 'self' 'unsafe-inline' ...` (CSP — `unsafe-inline` 포함, nonce 전환 필요) |
| X-Frame-Options | `DENY` |
| Strict-Transport-Security | 1년 |
| X-Content-Type-Options | `nosniff` |
| Permissions-Policy | 카메라·마이크·위치 차단 |

---

## Security [coverage: high -- 8 sources]

### 1. 인증 및 세션 관리

- **방식**: NextAuth v5, JWT 전략 (JWE 암호화 토큰, HKDF 키 파생)
- **쿠키**: HttpOnly + SameSite=Lax
- **미들웨어**: Edge 함수(`middleware.ts`)에서 JWT 사전 검증
- **RBAC**: GUEST → PERSONAL → BUSINESS → REALESTATE → ADMIN. 임대 도메인에서는 `userType`(TENANT/LANDLORD)과 `role`(RENTAL_BIZ/BUSINESS/REALESTATE 등), `verifyStatus`(verified 여부)를 함께 사용해 세분화된 권한을 판정.
- **일일 분석 한도**: GUEST 2회 / PERSONAL 5회 / BUSINESS 50회 / REALESTATE 100회 / ADMIN 무제한
- **비밀번호 정책**: bcrypt(cost=12), 8자 이상 3종 조합 필수
- **소셜 로그인**: Google, Kakao, Naver + Credentials (동적 OAuth — DB 우선, 환경변수 폴백)
- **fail-fast**: `AUTH_SECRET` 환경변수 미설정 시 서버 시작 차단 (`lib/env.ts`)

```typescript
// API Route 인증 패턴
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
if (session.user.role !== "ADMIN") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
```

### 2. 접근 제어 (RBAC + 상태 기반 + 리소스 소유권)

인증(로그인)에 더해 **역할·인증상태·리소스 소유권**을 계층적으로 검사한다. 클라이언트 게이트가 있어도 항상 서버에서 재검증한다(클라 우회 방지).

#### 2-1. 매물 등록 권한 가드 (`app/api/listings/route.ts` — POST)

등록 요청은 다음 순서로 검증한다.

1. 로그인 필수 (`session.user.id` 없으면 401)
2. **임차인 차단**: `userType === "TENANT"` 이면 403 (임차인 회원은 매물 등록 불가)
3. **사업자 인증 강제**: `role`이 `RENTAL_BIZ` / `BUSINESS` / `REALESTATE` 중 하나이면서 `verifyStatus !== "verified"` 이면 403 — 관리자 인증 완료 전 등록 차단
4. 개인 임대인(PERSONAL/LANDLORD)·ADMIN은 인증 대상이 아니며 인증 없이 등록 가능
5. Zod 스키마(`createListingSchema`)로 입력 검증 후 `ownerId = session.user.id`로 저장

```typescript
const BIZ_ROLES = ["RENTAL_BIZ", "BUSINESS", "REALESTATE"];
if (BIZ_ROLES.includes(session.user.role ?? "") && session.user.verifyStatus !== "verified") {
  return NextResponse.json(
    { error: "사업자 인증 완료 후 매물을 등록할 수 있습니다." },
    { status: 403 },
  );
}
```

클라이언트 측에서도 `ListingsContent`가 `userType !== "TENANT"` 게이트를 두지만, 서버가 최종 권한 판정을 담당한다.

#### 2-2. 사업성분석 기업 전용 가드 (`lib/feasibility-guard.ts`)

FeasibilityReport(사업성분석)는 **BUSINESS·ADMIN 전용** 기능이다. 부동산/임대사업자는 사업자 기본 기능만, 기업은 기본 + 사업성분석까지 접근한다.

```typescript
export const FEASIBILITY_ROLES = ["BUSINESS", "ADMIN"] as const;

export function assertFeasibilityAccess(session): NextResponse | null {
  if (!canUseFeasibility(session?.user?.role)) {
    return NextResponse.json(
      { error: "사업성분석은 기업 회원 전용 기능입니다." },
      { status: 403 },
    );
  }
  return null;
}
```

가드가 적용된 지점:

| 대상 | 경로 |
|------|------|
| 화면 | `app/(app)/feasibility/page.tsx` |
| 생성 API (5종) | `app/api/feasibility/parse/route.ts` |
| | `app/api/feasibility/merge/route.ts` |
| | `app/api/feasibility/verify/route.ts` |
| | `app/api/feasibility/scr-report/route.ts` |
| | `app/api/feasibility/scr-report/stream/route.ts` |

사용 패턴: `const gate = assertFeasibilityAccess(session); if (gate) return gate;`

#### 2-3. 부동산 중개사 API 래퍼 (`lib/with-agent-auth.ts`)

`withAgentAuth` HOF는 세션 존재 + `role === "REALESTATE"` + `verifyStatus === "verified"` 세 조건을 모두 만족해야 핸들러를 실행한다. 하나라도 불충족 시 403. 동적 라우트 `params` 전달을 지원한다.

#### 2-4. 리소스 소유권 격리

목록·단건 조회 및 상태 변경 API는 로그인 사용자와 리소스 소유 관계를 대조해 **본인 리소스만** 접근하도록 격리한다.

| API | 격리 필터 |
|-----|-----------|
| `GET /api/listings?mine=true` | `where.ownerId = session.user.id` (상태 필터 제거하고 본인 매물 전체) |
| `GET /api/contract-applications/[id]` | 신청자(applicantId) 또는 매물 소유자(owner.id)만 (채팅방 진입) |
| `PATCH /api/contract-applications/[id]` | WITHDRAWN=신청자만, ACCEPTED/REJECTED=임대인(ownerId)만 |
| `DELETE /api/contract-applications/[id]` | 신청자(WITHDRAWN만) / 임대인(REJECTED·WITHDRAWN만) |
| `GET /api/e-contracts/[id]/pdf` | 로그인한 계약 당사자만 (아래 2-5) |

상태 전이 검증도 함께 수행한다 — 예: 이미 처리된 의향서(`status !== "PENDING"`)는 409, 철회/거절되지 않은 의향서는 삭제 불가.

#### 2-5. 전자계약/가계약 PDF 접근 격리 (`app/api/e-contracts/[id]/pdf/route.ts`)

PDF에는 실명·서명 이미지·보증금·주소 등 개인정보가 포함되므로 **ID 열거(enumeration)로 유출되지 않도록** 로그인 당사자만 허용한다. COMPLETED 상태여도 비당사자·비로그인 접근은 금지.

```typescript
const isParty =
  userId === contract.landlordId ||
  userId === contract.creatorId ||
  userId === contract.tenantId ||
  (!!contract.tenantEmail && session?.user?.email === contract.tenantEmail) ||
  (!!contract.brokerEmail && session?.user?.email === contract.brokerEmail);
if (!isParty) return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
```

### 3. 암호화

| 항목 | 알고리즘 | 대상 |
|------|----------|------|
| PII 암호화 | AES-256-GCM | address, businessNumber |
| 키 파생 | scrypt | AUTH_SECRET + 용도별 salt (PII/OAuth 분리) |
| 검색용 해시 | HMAC-SHA256 | 암호화 필드 검색 지원 |
| 관리자 비밀번호 | bcrypt(12) | Credentials 로그인 |
| 저장 형식 | Base64 | iv(16B) + tag(16B) + ciphertext |
| 전송 암호화 | HTTPS | Vercel 기본, HSTS 1년 |

```
// Prisma Extension 자동 처리 흐름
쓰기: encryptPII(plaintext) → AES-256-GCM → Base64
읽기: decryptPII(ciphertext) → 평문 복원
검색: hashForSearch(value) → HMAC-SHA256 해시 비교
```

### 4. 개인정보 최소화 (가계약서 주민등록번호)

가계약서(전자계약) 서명 시 주민등록번호는 **뒷 6자리를 수집·저장하지 않는다.** 생년월일 6자리 + 성별 구분 1자리(`890101-1`)까지만 `EContractSignature.signerRrnPrefix`에 저장한다.

- **서버 검증** (`app/api/e-contracts/route.ts`): 입력값이 정규식 `^\d{6}-[1-4]$` 를 만족해야 하며, 형식 위반 시 400 반환. 뒷자리를 포함한 전체 주민번호는 애초에 저장 스키마에 존재하지 않음.
- **PDF 표기** (`lib/pdf/contract-template.tsx`): 서명 박스 라벨을 "생년월일·성별"로 표기하고 `signerRrnPrefix` 값만 출력. 뒷 6자리 표기 자리 없음.

```typescript
const RRN_PREFIX_RE = /^\d{6}-[1-4]$/;   // 890101-1 형식만 허용
if (party.rrn && !RRN_PREFIX_RE.test(party.rrn)) {
  return NextResponse.json({ error: "생년월일+성별 형식이 올바르지 않습니다. (예: 890101-1)" }, { status: 400 });
}
```

이는 개인정보보호법상 고유식별정보(주민등록번호) 처리 제한 원칙에 따른 **수집 최소화** 조치다.

### 5. 입력 데이터 검증

- `sanitize.ts`: script/style/iframe 태그 제거, 이벤트 핸들러(`onXxx=`) 제거, 재귀적 중첩 우회 방지
- **Zod 스키마 검증**: 임대 도메인 API는 Zod 스키마로 타입·길이·범위를 서버에서 강제 (`createListingSchema`, `patchSchema`, `safetyDocSchema` 등). URL 필드는 `z.string().url()`, 배열은 `.max()`로 상한 지정.
- `validateMagicBytes()`: 파일 업로드 시 확장자 위조 방지 (MIME 매직바이트 검증 함수 구현됨)
- Prisma ORM: 파라미터 바인딩으로 SQL Injection 원천 차단
- 입력 필드 길이 제한·타입 검증: `api-middleware.ts`

```typescript
const { address } = await req.json();
if (!address || typeof address !== "string" || address.trim().length < 2) {
  return NextResponse.json({ error: "주소를 입력해주세요" }, { status: 400 });
}
const sanitized = sanitizeInput(address);
```

### 6. CSRF 방어

Origin/Referer 헤더 검증 방식 (`lib/csrf.ts`). 상태 변경 API(POST/PUT/PATCH/DELETE)에 `validateOrigin(req)`을 선두에서 호출.

**현재 적용 대상 (예시)**:

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /api/listings` | 매물 등록 |
| `PATCH /api/contract-applications/[id]` | 의향서 수락/거절/철회 |
| `DELETE /api/contract-applications/[id]` | 의향서 삭제 |
| `PUT /api/admin/account` | 비밀번호 변경 |
| `PUT /api/admin/settings` | OAuth/PG 설정 |
| `POST /api/user/setup-role` | 역할 변경 신청 |

> **주의 (H-04)**: Origin과 Referer가 모두 없는 요청을 통과시키는 로직 존재 (`csrf.ts:28-29`). JSON body가 필요한 API는 `Content-Type: application/json`이 필요하여 일부 완화되나, 개선 필요.

### 7. Rate Limit 정책

| 제한 유형 | 값 | 식별자 | 저장소 |
|-----------|-----|--------|--------|
| 분당 요청 | 30회/60초 | IP + userId | `RateLimit` 테이블 |
| 일일 분석 | 역할별 한도 | userId | `DailyUsage` 테이블 |
| Cost Guard | OpenAI 일일 제한 | 별도 카운터 | `lib/openai.ts` (메모리 폴백 포함) |
| 개발 모드 | 무제한 | - | - |

> **주의 (H-05)**: DB 오류 시 Rate Limit 체크 실패 → 요청 무조건 허용 (fail-open). DDoS + DB 장애 동시 발생 시 비용 폭발 가능.

### 8. 에러 처리 (정보 노출 방지)

```typescript
try {
  const result = await externalApi();
} catch (error) {
  console.error("External API error:", error); // 서버 로그만
  return NextResponse.json({ error: "서비스 일시 장애" }, { status: 503 });
}
```

- API Route: try-catch에서 구체적 에러 메시지는 서버 로그에만 기록
- 사용자 응답: 일반화된 에러 메시지 반환 (예: "서버 오류가 발생했습니다.")
- Rate Limit 초과: 429 상태 코드 + 재시도 시간 헤더

### 9. 감사 로그

`lib/audit-log.ts`에서 fire-and-forget 방식으로 기록. 민감 필드 자동 마스킹.

**기록 대상 이벤트**:

| 이벤트 | action 값 | 기록 항목 |
|--------|-----------|-----------|
| 로그인 성공 | `LOGIN` | userId, provider, email |
| 로그인 실패 | `LOGIN_FAILED` | email, reason |
| 로그아웃 | `LOGOUT` | userId |
| 회원가입 | `SIGNUP` | userId, email |
| 역할 변경 | `ROLE_CHANGE` | userId, requestedRole |
| 관리자 사용자 수정 | `ADMIN_USER_UPDATE` | target userId, changes |
| 관리자 사용자 삭제 | `ADMIN_USER_DELETE` | target userId |
| 관리자 설정 변경 | `ADMIN_SETTINGS_CHANGE` | provider, category |
| 분석 요청 | `ANALYSIS_REQUEST` | type, address (마스킹) |
| Rate Limit 초과 | `RATE_LIMIT_EXCEEDED` | identifier |
| 비밀번호 변경 | `PASSWORD_CHANGE` | userId |

**보존 기간**:

| 로그 유형 | 보존 기간 | 근거 |
|-----------|-----------|------|
| 인증 관련 (LOGIN/LOGOUT/SIGNUP) | 1년 | 개인정보보호법 시행령 |
| 관리자 활동 (ADMIN_*) | 2년 | 내부 감사 기준 |
| 분석 요청 | 6개월 | 서비스 품질 관리 |
| Rate Limit | 3개월 | 운영 모니터링 |

**자동 파기**: 보존기간 초과 로그 월 1회 cron 삭제 (구현 예정).

**마스킹 대상**: email → `he****@example.com` / businessNumber → `123456****` / API 키 → `****` / password → 기록 안 함.

**접근 권한**: ADMIN만 조회 가능 (대시보드). 삭제는 자동 파기만 허용.

### 10. OWASP Top 10 (2021) 커버리지

v4.5.1 종합평점 기준 (출처: `VESTRA_종합평점_v4.5.1.md`)

| # | OWASP 항목 | 상태 |
|---|------------|------|
| A01 | Broken Access Control | ✅ 완전 충족 (RBAC + withAdminAuth/withAgentAuth HOF + feasibility-guard + 리소스 소유권 격리) |
| A02 | Cryptographic Failures | ✅ 완전 충족 (AES-256-GCM PII 암호화, HKDF 키 파생, 주민번호 최소 수집) |
| A03 | Injection | ✅ 완전 충족 (Prisma 파라미터 바인딩, Zod 스키마, sanitize.ts) |
| A04 | Insecure Design | ✅ 완전 충족 (Rate Limit + Cost Guard 이중 방어, PDF ID 열거 차단) |
| A05 | Security Misconfiguration | ✅ 완전 충족 (AUTH_SECRET fail-fast, 보안 헤더 전체 적용) |
| A06 | Vulnerable Components | ✅ 완전 충족 |
| A07 | Auth & Session Management | ✅ 완전 충족 (NextAuth v5 JWE, HttpOnly 쿠키) |
| A08 | Software Integrity Failures | ✅ 완전 충족 |
| A09 | Logging & Monitoring | ⚠️ 부분 충족 (감사 로그 구현됨, 자동 파기 스케줄러 미구현) |
| A10 | SSRF | ⚠️ 부분 충족 (외부 API 도메인 고정, 사용자 URL 미허용이나 CSP unsafe-inline 잔존) |

**전체 결과**: 8/10 완전 충족, 2/10 부분 충족

### 11. 개인정보 영향평가 (PIA)

평가일 2026-03-11. 근거: 개인정보보호법 제33조.

**수집 개인정보**:

| 항목 | 수집 목적 | 보유 기간 | 암호화 |
|------|-----------|-----------|--------|
| 이메일 | 계정 식별, 로그인 | 탈퇴 시까지 | DB 평문 (OAuth 위임) |
| 이름 | 표시용 | 탈퇴 시까지 | DB 평문 |
| 프로필 이미지 | 표시용 | 탈퇴 시까지 | URL 저장 |
| 사업자등록번호 | 기업/부동산 등급 인증 | 탈퇴 시까지 | AES-256-GCM |
| 주소 (분석용) | 부동산 분석 요청 | 탈퇴 시까지 | AES-256-GCM |
| 주민번호 앞부분(생년월일+성별) | 가계약서 당사자 식별 | 계약 보존기간 | 뒷 6자리 미수집 (최소 수집) |
| 서명 이미지 | 전자계약 서명 | 계약 보존기간 | URL/데이터 저장 |
| IP 주소 | 감사 로그, Rate Limit | 1년 | DB 평문 |
| User-Agent | 감사 로그 | 1년 | DB 평문 |

**정보주체 권리**:

| 권리 | 이행 방법 |
|------|-----------|
| 열람권 | /profile 페이지 |
| 정정권 | 프로필 수정 기능 |
| 삭제권 | 회원 탈퇴 시 Cascade 삭제 (`onDelete: Cascade`) |
| 처리정지권 | 관리자에게 요청 → 계정 비활성화 |

---

## API Surface [coverage: high -- 3 sources]

### 페이지 접근 권한

| 페이지 | GUEST | PERSONAL | BUSINESS | REALESTATE | ADMIN |
|--------|:-----:|:--------:|:--------:|:----------:|:-----:|
| / (랜딩) | O | O | O | O | O |
| /login | O | O | O | O | O |
| /rights (권리분석) | O | O | O | O | O |
| /contract (계약검토) | X | O | O | O | O |
| /tax (세금계산) | X | O | O | O | O |
| /prediction (시세전망) | X | O | O | O | O |
| /jeonse/* (전세) | O | O | O | O | O |
| /assistant (AI상담) | X | O | O | O | O |
| /feasibility (사업성분석) | X | X | O | X | O |
| /dashboard | X | O | O | O | O |
| /profile | X | O | O | O | O |
| /admin | X | X | X | X | O |
| /admin/* | X | X | X | X | O |

> 매물 등록 화면·기능은 `userType`(임대인 계열)이면서 사업자 회원은 `verifyStatus=verified`인 경우에만 활성화된다(위 표의 role 축과 별개 판정).

### API 접근 권한 매트릭스

| API | 인증 필요 | 역할/상태 제한 | Rate Limit | CSRF |
|-----|:---------:|:---------:|:----------:|:----:|
| POST /api/analyze-rights | X | - | 30/min + 일일 | - |
| POST /api/analyze-contract | O | PERSONAL+ | 30/min + 일일 | - |
| POST /api/analyze-unified | X | - | 30/min + 일일 | - |
| POST /api/predict-value | X | - | 30/min + 일일 | - |
| POST /api/chat | O | PERSONAL+ | 30/min + 일일 | - |
| GET /api/listings | X | - (mine=true 시 로그인) | - | - |
| POST /api/listings | O | 임차인 불가 + 사업자 verified | - | O |
| GET /api/contract-applications/[id] | O | 신청자 또는 매물소유자 | - | - |
| PATCH /api/contract-applications/[id] | O | 임대인(수락/거절)·신청자(철회) | - | O |
| DELETE /api/contract-applications/[id] | O | 신청자·임대인(상태 제한) | - | O |
| GET /api/e-contracts/[id]/pdf | O | 계약 당사자만 | - | - |
| POST /api/feasibility/* (5종) | O | BUSINESS·ADMIN | - | (변이 시) |
| GET /api/user/profile | O | - | - | - |
| POST /api/user/setup-role | O | PERSONAL | - | O |
| PUT /api/admin/account | O | ADMIN | - | O |
| PUT /api/admin/settings | O | ADMIN | - | O |
| GET /api/admin/users | O | ADMIN | - | - |
| PUT /api/admin/users/[id] | O | ADMIN | - | - |
| GET /api/admin/audit-logs | O | ADMIN | - | - |

### 미들웨어 보호 경로

```
middleware.ts (Edge Function)
├── /admin/*     → JWT 검증 + ADMIN 역할 확인
├── /dashboard   → JWT 검증
└── /profile     → JWT 검증
```

### Cron 엔드포인트

| 엔드포인트 | 스케줄 | 인증 방식 |
|-----------|--------|-----------|
| /api/cron/registry-monitor | 매일 09:00 | 프로덕션에서만 인증 검사 |
| /api/cron/fraud-import | 매주 월 03:00 | `CRON_SECRET` falsy 시 인증 스킵 (취약) |
| /api/cron/news-collector | - | `CRON_SECRET` falsy 시 인증 스킵 (취약) |

---

## Key Decisions [coverage: high -- 5 sources]

1. **PII 자동 암호화**: Prisma Extension(`lib/prisma.ts`)이 businessNumber, address를 쓰기/읽기 시 자동으로 AES-256-GCM 암호화/복호화. 애플리케이션 코드와 완전 분리.

2. **AUTH_SECRET fail-fast**: `lib/env.ts`에서 필수화. 환경변수 미설정 시 서버 시작 자체를 차단.

3. **동적 OAuth 프로바이더**: DB 우선, 환경변수 폴백. 관리자가 런타임에 소셜 로그인 키 변경 가능.

4. **Cost Guard**: OpenAI API 일일 호출 제한 + DB 장애 시 인메모리 폴백 카운터(보수적 한도). Rate Limit과 달리 fail-closed 처리.

5. **접근 제어를 HOF·가드 함수로 통일**: `withAdminAuth`(관리자), `withAgentAuth`(REALESTATE+verified), `assertFeasibilityAccess`(BUSINESS·ADMIN)로 인증·권한 검사를 래퍼/가드로 캡슐화하여 누락을 방지.

6. **클라이언트 게이트는 UX용, 최종 판정은 서버**: 매물 등록의 임차인 차단·사업자 verified 요구는 클라이언트에도 게이트가 있으나 서버 POST 핸들러가 동일 규칙을 재검증하여 우회를 차단.

7. **주민번호 최소 수집**: 가계약서 당사자 식별에 필요한 최소 정보(생년월일+성별 1자리)만 저장하고 뒷 6자리는 스키마에서 배제. 유출 시 피해 최소화.

8. **개인정보 문서의 ID 열거 방지**: 전자계약 PDF는 리소스 ID를 알아도 로그인 당사자가 아니면 403. COMPLETED 상태도 예외 없음.

9. **감사 로그 fire-and-forget**: 메인 요청 처리를 블로킹하지 않고 로그 기록.

10. **OWASP SSRF 해당 없음**: 사용자 입력 URL 미사용. 외부 API 호출은 서버에서 하드코딩된 도메인만 사용. (매물 사진/안전서류 URL은 저장·표시용이며 서버가 fetch하지 않음.)

---

## Gotchas [coverage: high -- 3 sources]

### 이번 세션 접근 제어 관련 주의

- **매물 등록 역할 판정은 `role` + `userType` + `verifyStatus` 3축**: `BIZ_ROLES`(RENTAL_BIZ/BUSINESS/REALESTATE) 판정과 `userType==="TENANT"` 판정이 분리되어 있다. 신규 역할/타입 추가 시 두 조건 모두 갱신 필요.
- **사업성분석 가드는 `role` 기준(BUSINESS·ADMIN)** — REALESTATE는 verified여도 사업성분석 접근 불가. feasibility API 신설 시 `assertFeasibilityAccess` 호출 누락 주의(5종에 이미 적용).
- **PDF 당사자 판정에 이메일 매칭 포함**: `tenantEmail`/`brokerEmail`은 아직 계정과 연결 전 단계일 수 있어 세션 이메일과 대조한다. 이메일 변경 시 접근 관계가 달라질 수 있음.
- **의향서 상태 전이 검증**: PATCH는 `status==="PENDING"`만, DELETE는 상태별(WITHDRAWN/REJECTED) 제한. 상태 머신 변경 시 소유권 검사와 상태 검사를 함께 확인.

### CRITICAL 이슈 (2026-03-23 감사 기준)

- **[C-01] 프로덕션 시크릿 로컬 하드코딩**: `.env.local`에 실제 프로덕션 DB 비밀번호(`PGPASSWORD`), OpenAI 키(`sk-proj-...`), `AUTH_SECRET`, `VERCEL_OIDC_TOKEN` 등이 평문 저장. `.gitignore`로 git에는 미포함이나 로컬 파일 자체가 위험. 즉시 모든 키 로테이션 필요.
- **[C-02] PII_SALT 환경변수 미설정**: `lib/crypto.ts:23-27`에서 `PII_SALT` 미설정 시 런타임 에러 throw. 사업자등록번호 등 PII 암호화가 런타임 실패 상태일 수 있음. Vercel 환경변수에 `PII_SALT` 추가 필요(`openssl rand -hex 32`).

### HIGH 이슈

- **[H-01] system-settings.ts 폴백 시크릿**: `AUTH_SECRET` 미설정 시 `"vestra-default-secret-change-me"`로 폴백(`lib/system-settings.ts:18`). DB 저장 OAuth 키가 예측 가능한 키로 암호화됨.
- **[H-02] Cron 인증 불일치**: `fraud-import`, `news-collector`는 `CRON_SECRET` 미설정 시 인증 없이 공개 접근 가능. `registry-monitor`는 프로덕션에서만 인증. 패턴 통일 및 fail-closed 필요.
- **[H-03] CSRF 방어 미적용 API 다수**: `/api/subscription`, `/api/user/sync-data`, `/api/feedback`, `/api/cascade-update` 등 상태 변경 API에 `validateOrigin` 미적용. (매물·의향서 API에는 적용됨.)
- **[H-04] CSRF Origin 부재 시 통과**: `csrf.ts:28-29`에서 Origin·Referer 모두 없는 요청 통과. JSON body 요구로 일부 완화되나 개선 필요.
- **[H-05] Rate Limit fail-open**: DB 장애 시 Rate Limit 비활성화. DDoS + DB 장애 동시 발생 시 비용 폭발 가능.

### MEDIUM 이슈

- **[M-01]** Cron 에러 응답에 `detail: String(error)` 포함 → 스택 트레이스 노출 가능.
- **[M-02]** `/api/subscription` CSRF/Rate Limit 미적용 → 구독 플랜 CSRF 변경 가능.
- **[M-03]** `/api/user/sync-data` sanitize 미적용 → Stored XSS 가능성.
- **[M-04]** 일부 admin API가 `withAdminAuth` 대신 수동 역할 검사 (`settings/GET`, `account/PUT`).
- **[M-05]** `/api/extract-pdf`에 `validateMagicBytes` 미적용 → 악성 파일 업로드 가능.
- **[M-06]** `/api/news` Rate Limit 없음 → 스크래핑 취약.
- **[M-07]** CSP `unsafe-inline` 사용 → nonce 기반 CSP 전환 필요.
- **[M-08]** 매물/전자계약 API에 Rate Limit 미적용 → 대량 등록·PDF 대량 다운로드 방어 부재. 추가 검토 필요.

### 기타 운영 주의사항

- `DIRECT_URL`은 마이그레이션 전용. 연결 풀링 미사용 직접 연결.
- 사업자등록번호·이메일은 표시 시 마스킹 처리 (`lib/crypto.ts` PII 마스킹 유틸).
- 스캔 PDF OCR 시 OpenAI Vision API 사용 → Cost Guard 적용 대상.
- IP 추출 로직에 `x-forwarded-for` 사용 시 스푸핑 가능. Vercel 환경에서는 `x-vercel-forwarded-for`가 신뢰 가능하나 일부 API가 `x-forwarded-for`만 사용.
- bcrypt 라운드 12는 현재 적절하나 하드웨어 발전에 따라 주기적 상향 검토 필요.

### PIA 개선 권고 (미구현)

- 이메일 필드 암호화 검토 (검색 해시 인덱스 활용)
- 감사 로그 IP 주소 해시 처리 검토
- 개인정보 자동 파기 스케줄러 구현 (보유기간 초과 시)
- 제3자 제공 동의 절차 (OpenAI API 전송 시)

---

## Sources

1. [[docs/security/secure-coding-guide]]
2. [[docs/security/access-control-matrix]]
3. [[docs/security/audit-log-policy]]
4. [[docs/security/security-checklist]]
5. [[docs/security/pia]]
6. [[docs/03-analysis/security-audit-2026-03-23]]
7. [[docs/TECHNICAL-STATUS-REPORT]]
8. [[documents/완료보고서-2026-03-23/VESTRA_종합평점_v4.5.1]]
9. [[lib/feasibility-guard]]
10. [[lib/with-agent-auth]]
11. [[app/api/listings/route]]
12. [[app/api/e-contracts/[id]/pdf/route]]
13. [[app/api/e-contracts/route]]
14. [[lib/pdf/contract-template]]
</content>
</invoke>
