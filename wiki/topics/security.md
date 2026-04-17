# 보안 정책 및 가이드 (Security)

[coverage: high -- 3 sources: docs/security/secure-coding-guide.md, docs/04-API-Spec.md, docs/TECHNICAL-STATUS-REPORT.md]

---

## Purpose

VESTRA의 보안 아키텍처. 행정안전부 SW 개발보안 가이드 기반으로 구현되었으며, 개인정보 보호법을 준수한다.

---

## Architecture

### 보안 모듈 목록 (`lib/`)

| 모듈 | 파일 | 내용 |
|------|------|------|
| 암호화 | `crypto.ts` | AES-256-GCM (PII, 시스템 설정) |
| CSRF 방어 | `csrf.ts` | Origin 기반 토큰 검증 |
| XSS 방지 | `sanitize.ts` | HTML/script/iframe 태그 제거 |
| Rate Limit | `rate-limit.ts` | DB 기반 분당/일일 제한 |
| 감사 로그 | `audit-log.ts` | 관리자 활동 전체 기록 (IP, UserAgent) |
| 입력 검증 | `api-middleware.ts` | 필드별 길이 제한, 타입 검증 |
| 인증 | `auth.ts` | NextAuth v5 JWT 세션 |

### 보안 헤더 (`next.config.ts`)
- Content-Security-Policy (CSP)
- `X-Frame-Options: DENY`
- Strict-Transport-Security (HSTS)
- `X-Content-Type-Options: nosniff`
- Permissions-Policy (카메라, 마이크, 위치 차단)

---

## Security Details

### 1. 입력 데이터 검증

```typescript
// lib/sanitize.ts — 모든 API 입력에 적용
// - script/style/iframe 태그 제거
// - 이벤트 핸들러 제거 (onXxx=...)
// - 재귀적 태그 제거 (중첩 우회 방지)

const { address } = await req.json();
const sanitized = sanitizeInput(address);
// + Prisma ORM: 파라미터 바인딩으로 SQL Injection 원천 차단
// + MIME 매직바이트 검증: 파일 업로드 시 확장자 위조 방지
```

### 2. 인증 및 세션

```typescript
// NextAuth v5 JWT 전략
// - HttpOnly + SameSite=Lax 쿠키
// - middleware.ts: Edge 함수에서 JWT 사전 검증
// - RBAC 5단계: GUEST → PERSONAL → BUSINESS → REALESTATE → ADMIN
// - 비밀번호: bcrypt(12), 8자 이상 3종 조합 필수

const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "인증 필요" }, { status: 401 });
if (session.user.role !== "ADMIN") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
```

### 3. 암호화 (`crypto.ts`)

| 항목 | 알고리즘 | 대상 |
|------|----------|------|
| PII 암호화 | AES-256-GCM | address, businessNumber |
| 키 파생 | scrypt | AUTH_SECRET + 용도별 salt (PII/OAuth 분리) |
| 검색용 해시 | HMAC-SHA256 | 암호화 필드 검색 지원 |
| 관리자 비밀번호 | bcrypt(12) | credentials 로그인 |
| 저장 형식 | Base64 | iv(16) + tag(16) + ciphertext |

```
// Prisma 미들웨어 자동 처리
// 쓰기 시: encryptPII(plaintext) → AES-256-GCM → Base64
// 읽기 시: decryptPII(ciphertext) → 평문 복원
// 검색 시: hashForSearch(value) → HMAC-SHA256 해시 비교
```

### 4. CSRF 방어 (`csrf.ts`)

CSRF 검증 적용 대상 엔드포인트:
- `/api/admin/account` (비밀번호 변경)
- `/api/admin/settings` (OAuth/PG 설정)
- `/api/user/setup-role` (역할 변경 신청)

```typescript
import { validateOrigin } from "@/lib/csrf";
const csrfError = validateOrigin(req);
if (csrfError) return csrfError;
```

### 5. 에러 처리 (정보 노출 방지)

```typescript
// 사용자에게는 일반화된 메시지만 반환
try {
  const result = await externalApi();
} catch (error) {
  console.error("External API error:", error); // 서버 로그만
  return NextResponse.json({ error: "서비스 일시 장애" }, { status: 503 });
}
```

### 6. Rate Limit 정책

| 구분 | 방식 | 저장소 |
|------|------|--------|
| 분당 제한 | 슬라이딩 윈도우 | `RateLimit` 테이블 |
| 일일 제한 | 역할별 카운터 | `DailyUsage` 테이블 |
| Cost Guard | OpenAI API 일일 제한 | 별도 카운터 |

DB 오류 시: Rate Limit 체크 실패 → 요청 허용 (가용성 우선)

---

## Data Models (보안 관련)

| 모델 | 용도 |
|------|------|
| `AuditLog` | 전체 관리자 활동 기록 (userId, action, target, detail, ipAddress, userAgent, createdAt) |
| `RateLimit` | 분당 호출 수 제한 (IP 기반) |
| `DailyUsage` | 역할별 일일 분석 횟수 추적 |
| `SystemSetting` | OAuth 키 등 시스템 설정 (AES-256-GCM 암호화 저장) |

---

## 감사 로그 기록 대상 액션

| 액션 | 설명 |
|------|------|
| `LOGIN` / `LOGOUT` / `LOGIN_FAILED` | 로그인 관련 |
| `SIGNUP` | 회원가입 |
| `ROLE_CHANGE` | 역할 변경 |
| `ADMIN_USER_UPDATE/DELETE` | 관리자 사용자 수정/삭제 |
| `ADMIN_SETTINGS_CHANGE` | 시스템 설정 변경 |
| `ANALYSIS_REQUEST/COMPLETE` | 분석 요청/완료 |
| `RATE_LIMIT_EXCEEDED` | Rate Limit 초과 |
| `PASSWORD_CHANGE` | 비밀번호 변경 |

---

## Key Decisions

- `AUTH_SECRET` 환경변수 미설정 시 서버 시작 자체를 차단 (`env.ts`에서 필수화)
- PII 필드는 Prisma 미들웨어가 자동으로 암호화/복호화 (애플리케이션 코드 분리)
- OAuth 동적 프로바이더: DB 우선, 환경변수 폴백 (관리자가 런타임에 설정 변경 가능)

---

## Gotchas

- `DIRECT_URL`은 마이그레이션 전용. 연결 풀링 미사용 직접 연결
- 사업자등록번호, 이메일은 표시 시 마스킹 처리 (`lib/crypto.ts:106-119` PII 마스킹 유틸)
- 스캔 PDF OCR 시 OpenAI Vision API 사용 → Cost Guard 적용 대상

---

## Sources

- `/Users/watchers/Desktop/vestra/docs/security/secure-coding-guide.md`
- `/Users/watchers/Desktop/vestra/docs/04-API-Spec.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
