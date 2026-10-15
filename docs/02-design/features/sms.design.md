# 비회원 등기감시 SMS OTP 임시 인증 어댑터 설계서 (공용 계약서)

> 프로젝트: VESTRA
> 작성일: 2026-10-15
> 상태: Design — 백엔드(Codex)·프론트엔드(Claude) 공용 계약. 구현·DB 변경·배포 미수행
> 상위 문서: [`docs/01-plan/features/sms.plan.md`](../../01-plan/features/sms.plan.md)
> 기준 코드: `lib/guest-monitoring/*`, `app/api/guest-monitoring/*`, `app/(personal-home)/renewal/monitoring/*`

---

## 0. 이 문서의 사용 규칙

- 이 문서는 **계약서**다. 경로·메서드·요청/응답 DTO·타입·함수 시그니처·상수는 **스펙 고정**이며, 백엔드와 프론트엔드가 동일하게 구현한다.
- 양측의 접점은 아래 3가지뿐이다. 이 경계를 넘는 가정(예: 클라이언트가 env를 판정, 서버가 평문 코드 반환)은 **금지**다.
  1. `POST /api/guest-monitoring/identity/start` 의 응답 `launch.mode`
  2. `POST /api/guest-monitoring/identity/verify-otp` 의 요청/응답
  3. HttpOnly 쿠키(`guest_monitoring_session`, `guest_monitoring_browser`)
- 스펙에 어긋나는 구현을 발견하면 **구현을 바꾸지 말고 이 문서를 먼저 고친 뒤** 양측에 반영한다.
- 기존 다날 경로(`lib/danal/*`, callback, 결제)는 **불변**이다. 공통 로직 추출 시 다날 동작 회귀가 없어야 한다.

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 책임 (절대규칙 §단일책임·§폴더구조)

```
[클라이언트: app/(personal-home)/renewal/monitoring]
  components/guest/*   UI (표시·입력)         ← JSX·접근성·버튼 상태
  hooks/useGuest*      흐름 조정(상태머신)    ← 분기·세대관리·에러 매핑
  guest/guestApi.ts    HTTP 클라이언트         ← fetch·same-origin·결과 래핑
  guest/guestProvider  launch 해석·복귀 상태   ← launch.mode 판정
        │ (HTTP, HttpOnly 쿠키)
        ▼
[서버: app/api/guest-monitoring]
  identity/start/route.ts     엔드포인트(보안 게이트·rate limit·모드 분기)
  identity/verify-otp/route.ts 엔드포인트(신규)
        │
        ▼
[서버 서비스: lib/guest-monitoring]
  identity-mode.ts   모드 resolver·OTP TTL (신규)
  sms-otp.ts         난수·digest·발송·검증·소비 (신규)
  session.ts         세션 발급 계약(기존, OTP 분기 연결)
  schemas.ts / errors.ts / rate-limit-keys.ts / http.ts (기존, 확장)
        │
        ▼
[외부] lib/solapi-client.ts(sendSms) · prisma(GuestVerificationSession)
```

- **페이지(`page.tsx`)는 조합·진입만.** 인증 비즈니스 로직을 페이지에 두지 않는다.
- **UI는 표시·입력, 훅은 흐름, 서버 서비스는 검증·세션 소비.** OTP 코드 비교·세션 소비는 서버에서만 한다.

### 1.2 신규/변경 파일 목록과 파일 분리 계획

> 500줄 제한(절대규칙 §1). 현재 `GuestApplyForm.tsx` 215줄, `useGuestStatus.ts` 322줄, `useGuestApply.ts` 294줄. OTP 분기를 각 파일에 직접 누적하면 한계에 근접하므로 **OTP 전용 유닛을 분리**한다.

#### 서버 (Codex)

| 파일 | 구분 | 책임 | 예상 규모 |
| --- | --- | --- | --- |
| `lib/guest-monitoring/identity-mode.ts` | 신규 | `resolveIdentityMode()`, `OTP_TTL` 상수 | ~20줄 |
| `lib/guest-monitoring/sms-otp.ts` | 신규 | 코드 생성·OTP digest·`startOtp`·`verifyOtp` | ~120줄 |
| `app/api/guest-monitoring/identity/verify-otp/route.ts` | 신규 | verify-otp 엔드포인트 | ~25줄 |
| `app/api/guest-monitoring/identity/start/route.ts` | 변경 | 모드 분기(선행 다날 호출 우회)·전화번호 발송 제한 추가 | 기존 23줄 → ~35줄 |
| `lib/guest-monitoring/session.ts` | 변경 | `startIdentity` 모드 분기(다날 공급자 호출 우회) | 기존 86줄 → ~100줄 |
| `lib/guest-monitoring/schemas.ts` | 변경 | `otpVerifySchema` 추가 | +5줄 |
| `lib/guest-monitoring/errors.ts` | 변경 | `verification_failed` 메시지 추가 | +1줄 |
| `scripts/audit-api-auth.mjs` | 변경 | verify-otp ALLOWLIST 등록 | +1줄 |
| `lib/guest-monitoring/tests/sms-otp.test.ts` | 신규 | 생성·성공·실패·만료·바인딩·1회소비·시도제한·발송제한·발송장애·보안래퍼·모드·우회·결제경계 | 테스트 |

#### 프론트 (Claude)

| 파일 | 구분 | 책임 | 예상 규모 |
| --- | --- | --- | --- |
| `types/guest-monitoring.ts` | 변경 | `GuestIdentityLaunch`, `GuestOtpVerifyRequest/Response` 타입 | +15줄 |
| `app/(personal-home)/renewal/monitoring/guest/guestApi.ts` | 변경 | `verifyOtp()` 추가 | +8줄 |
| `.../guest/guestProvider.ts` | 변경 없음 권장 | `launchProvider`는 OTP launch(이동 필드 없음)에서 false 반환 — 기존 동작 그대로 사용 | — |
| `.../hooks/useGuestOtp.ts` | 신규 | OTP 대기 상태·검증 호출·세대 관리 공통 훅(P1 공통화의 선반영) | ~90줄 |
| `.../hooks/useGuestStatus.ts` | 변경 | `startAuth` OTP 분기, `useGuestOtp` 결합 | 322 → ≤360줄 (초과 시 분리) |
| `.../hooks/useGuestApply.ts` | 변경 | `startIdentity` OTP 분기, 성공 후 `startOrder` | 294 → ≤340줄 (초과 시 분리) |
| `.../components/guest/GuestOtpForm.tsx` | 신규 | 코드 입력·확인·만료 표시(status·apply 공용) | ~90줄 |
| `.../components/guest/GuestStatusAuthForm.tsx` | 변경 | 요청/코드 2단계, `GuestOtpForm` 조합 | 76 → ≤160줄 |
| `.../components/guest/GuestApplyForm.tsx` | 변경 | OTP 입력 단계 연결 | 215 → ≤280줄 (초과 시 분리) |
| `.../guest/status/GuestStatusClient.tsx` | 변경 | OTP 대기 상태 전달 | 134 → ≤180줄 |
| `.../guest/apply/GuestApplyClient.tsx` | 변경 | OTP 대기 단계 표시("인증·결제") | 137 → ≤180줄 |

> **분리 트리거:** 작성 직후 400줄 초과가 감지되면 즉시 보고 후 분리한다. OTP 공통 로직은 `useGuestOtp`와 `GuestOtpForm`으로 모으고, 두 흐름(status/apply) 훅에서 재사용하여 중복을 만들지 않는다.

---

## 2. 데이터 모델

### 2.1 DB 스키마 — **변경 없음**

Prisma `schema.prisma`, SQL, 마이그레이션을 **수정하지 않는다.** 기존 `GuestVerificationSession`의 nullable 문자열 컬럼만 재사용한다.

| 컬럼 | 기존 용도 | OTP에서의 용도 |
| --- | --- | --- |
| `id` | 세션 ID | `verificationId`로 노출 |
| `requestNonce` (unique) | 다날 nonce | OTP digest 결합·시도 제한 키 |
| `purpose` | apply/status/renewal | 동일 |
| `draftId` | apply 초안 | 동일 |
| `inputIdentityHash` | 입력 신원 해시 | 동일(코드 digest 결합) |
| `browserBindingHash` | 브라우저+UA 바인딩 | 동일 |
| `tokenHash` | 세션 토큰 해시 | 대기 중 더미, 소비 시 실제 토큰 해시 |
| `providerTxId` (nullable) | 다날 거래번호(완료 시) | **OTP 상태 머신(아래 §2.2)** |
| `expiresAt` | 세션 만료 | OTP 대기=now+OTP_TTL, 완료=now+SESSION_TTL |
| `verifiedIdentityHash` | 검증된 신원 | 완료 시 = inputIdentityHash |
| `verifiedAt` / `consumedAt` / `revokedAt` | 상태 타임스탬프 | 동일 의미 |

### 2.2 `providerTxId` 상태 머신 (OTP 전용 규약)

| 단계 | `providerTxId` | 기타 |
| --- | --- | --- |
| OTP 대기 | `otp:<digest>` | `verifiedAt`·`consumedAt` null, `expiresAt=now+OTP_TTL` |
| OTP 인증 완료 | `sms_otp_verified:<randomUUID>` | 기존 다날 완료 세션과 동일한 verified/consumed 상태 |
| 실패·폐기 | 기존 값 유지 + `revokedAt` 설정 | 검증·소비 불가 |
| 다날 대기/완료 | `null` / 다날 transactionId | 기존 동작 그대로 (불변) |

- `otp:` · `sms_otp_verified:` 두 접두사는 서로, 그리고 다날 값과 **절대 겹치지 않는다.**
- `sms_otp_verified:`의 식별자는 서버 생성 UUID이며 **다날 거래번호·실명 식별자·전화번호가 아니다.**

### 2.3 OTP digest 산출 규약 (양측 합의 불필요 — 서버 전용이나 명문화)

```
otpDigest = digest(JSON.stringify(["sms_otp_v1", requestNonce, inputIdentityHash, code]))
```

- `digest`는 기존 `session.ts`의 SHA-256 hex(`createHash("sha256")`)를 재사용한다.
- 도메인 태그(`"sms_otp_v1"`) + nonce + inputIdentityHash로 **도메인 분리**한다. 서로 다른 세션의 동일 코드가 같은 검증값이 되지 않는다.
- `JSON.stringify` 배열 직렬화로 구분자 충돌을 방지한다. 코드만 단독 해시 금지.
- 저장 시 `providerTxId = "otp:" + otpDigest`.

### 2.4 타입 정의 — `types/guest-monitoring.ts` (프론트·백 공용)

```ts
// 기존 유지
export interface GuestIdentityStartRequest {
  purpose: VerificationPurpose;       // "apply" | "status" | "renewal"
  guestName: string;
  guestPhone: string;
  draftId?: string;
}

// 기존 launch: Record<string,string> → OTP 식별 가능하도록 모드 타입 추가(상위호환)
export interface GuestIdentityLaunch {
  /** "sms_otp"면 OTP 흐름. 다날은 기존 URL/form 필드(mode 없음 또는 "danal"). */
  mode?: string;
  verificationId?: string;
  [key: string]: string | undefined;  // 다날 url/action/returnUrl 등 기존 필드 호환
}

export interface GuestIdentityStartResponse {
  verificationId: string;
  launch: GuestIdentityLaunch;        // 기존 Record<string,string>의 상위호환
  expiresAt: string;                  // ISO-8601
}

// 신규
export interface GuestOtpVerifyRequest {
  verificationId: string;
  code: string;                       // 숫자 6자리 "문자열"(앞자리 0 보존)
}
export interface GuestOtpVerifyResponse {
  ok: true;
  purpose: "status" | "apply";
}
// 실패는 기존 GuestApiError { error, code } 로 비-2xx
```

> `launch`의 런타임 계약은 그대로 `Record<string,string>`이다. `mode`는 문자열 값이므로 기존 `launchProvider`(url/action 키만 탐색)와 호환되며, OTP launch는 이동 필드가 없어 `launchProvider`가 `false`를 반환한다.

### 2.5 서버 상수

| 상수 | 위치 | 값 | 비고 |
| --- | --- | --- | --- |
| `OTP_TTL` | `lib/guest-monitoring/identity-mode.ts` (신규) | `5 * 60_000` (5분) | 미인증 OTP 유효기간. **신규 기획값** |
| `SESSION_TTL` | `lib/guest-monitoring/config.ts` (기존) | `15 * 60_000` | 인증 완료 세션. **불변** |
| `DRAFT_TTL` | `config.ts` (기존) | `30 * 60_000` | 신청 초안. **불변** |

---

## 3. API 스펙

> 공통 게이트: 모든 엔드포인트는 `lib/guest-monitoring/http.ts`의 `endpoint()` 래퍼를 사용한다.
> `endpoint()` 처리 순서 = `requireEnabled()`(기능 플래그, 미설정 시 **404**) → CSRF Origin 검사(비 GET·비 callback, 실패 시 **403**) → `requireCrypto()`(암호화 키, 부재 시 **503**) → Content-Length 상한(16KB, 초과 **413**) → `ipLimit("all", 60/분)` → 핸들러.
> **`{callback:true}` 사용 금지** (callback은 CSRF·일반 IP 제한을 건너뛴다). OTP 엔드포인트는 외부 PG 콜백이 아니다.
> 모든 응답은 `Cache-Control: no-store`.

### 3.1 모드 resolver (계약 전제)

```ts
// lib/guest-monitoring/identity-mode.ts
export function resolveIdentityMode(): "sms_otp" | "danal" {
  return process.env.GUEST_IDENTITY_MODE === "sms_otp" ? "sms_otp" : "danal";
}
```

- **정확히 `"sms_otp"`** 일 때만 OTP. 미설정·빈 값·`"danal"`·기타 값 = 다날(기존 경로).
- 서버 단일 기준. 클라이언트는 env를 판정하지 않고 `launch.mode`만 읽는다.

---

### 3.2 `POST /api/guest-monitoring/identity/start` — 인증 시작 (변경)

- **인증 필요 여부:** 공개(로그인 불필요). `endpoint()`의 CSRF + IP rate limit + 플래그/키 게이트로 보호. ALLOWLIST 기등록.
- **메서드 + 경로:** `POST /api/guest-monitoring/identity/start`
- **Request body** (기존 `identityStartSchema` 유지, `.strict()`):

```json
{ "purpose": "apply" | "status" | "renewal",
  "guestName": "홍길동",
  "guestPhone": "01012345678",
  "draftId": "<resourceId, apply일 때만 필수>" }
```

규칙: `purpose==="apply"`면 `draftId` 필수, 그 외엔 금지. 이름 2~80자, 전화 `^01[016789]\d{7,8}$`(정규화 후).

#### 처리 순서 (모드 분기 명시)

```
endpoint() 게이트 통과
0. mode = resolveIdentityMode()
1. [다날 모드만] getDanalProvider()  ← OTP 모드에서는 호출하지 않음(선행 503 우회)
2. ipLimit(req, "identity", 5, 600_000)                         // IP 5회/10분
3. identityStartSchema.safeParse(body) 실패 → 400 invalid_input
4. guestLimit("identity", guestIdentityHash(name, phone), 3, 600_000)   // 입력신원 3회/10분
5. guestLimit("identity-phone", normalizeGuestPhone(phone), 3, 600_000) // [신규] 전화번호 3회/10분
6. startIdentity(req, input) → 모드별 서비스에서 초안 검증 후 외부 호출 직전에 일일 cap 검사
8. json(result.data); attachBrowser(response, result.browser)
```

- **5번(신규 전화번호 제한):** 이름만 바꿔 동일 전화의 발송 제한을 회피하지 못하게 한다. 기존 `guestLimit`의 해시 키(`hashForSearch`) 사용. 다날·OTP 공통 적용.
- 발송 제한(2·4·5 및 서비스의 일일 cap)은 **외부 SMS 호출 이전**에 적용한다. 초과 시 429 `rate_limited`(기존 헤더), SMS 호출 0회.
- **MED-1 검수 반영:** 일일 cap(`identity-cost`, UTC날짜, 기본100·상한1000)은 라우트에서 선소모하지 않는다. OTP는 초안 검증·세션 생성 후 `sendSms` 직전, 다날은 초안 검증 후 `startVerification` 직전에 검사한다. 직접 서비스 호출에도 적용한다. 외부 호출 시도는 응답 유실·과금 여부가 불명확하므로 실패해도 차감 취소하지 않는다.

#### OTP 모드 서비스 — `startOtp(req, input)`

```
a. apply면 초안 검증: prisma.guestMonitoring.findFirst({
     id: draftId, guestIdentityHash: inputIdentityHash,
     status: "pending_payment", draftExpiresAt: { gt: now } }) 없으면 notFound()(404)
b. code = 암호학적 난수 6자리 문자열  // crypto.randomInt(0, 1_000_000).toString().padStart(6,"0") — Math.random 금지
c. browser = 기존 쿠키 || token();  nonce = token()
d. expiresAt = now + OTP_TTL(5분)
e. session 생성: { tokenHash: digest(token()) /*더미*/, requestNonce: nonce, purpose,
     draftId, inputIdentityHash, browserBindingHash: binding(req, browser),
     expiresAt, providerTxId: "otp:" + otpDigest({nonce, inputIdentityHash, code}) }
f. 일일 cap 검사 → result = sendSms(normalizeGuestPhone(phone), <인증번호 안내문 + code>)
   // cap 차단/검사 예외 시 생성 세션 폐기 후 원래 오류(429·제한 헤더 포함)를 유지한다.
   // 평문 code는 메시지 구성에만
g. success === true && channel === "sms" 아니면:
     → prisma.update({ id: session.id, data: { revokedAt: now } })  // 생성 세션 폐기(검증 불가)
     → throw GuestError("provider_unavailable", 503)
h. return { data: { verificationId: session.id,
     launch: { mode: "sms_otp", verificationId: session.id }, expiresAt: expiresAt.toISOString() },
     browser }
```

- 평문 `code`는 **생성·메시지 구성·발송 메모리에서만** 쓰고 DB·응답·로그에 남기지 않는다.
- `channel === "sms_mock"`(설정 부재), `success === false`, 예외는 **모두 성공 아님** → g 경로(503 + 세션 폐기). mock을 실제 발송으로 처리하지 않는다. (Solapi mock 전화 일부 로깅 회피는 §6 참조)
- **다날로 자동 fallback 금지.**

#### Response

**성공 200** (OTP):

```json
{ "verificationId": "<session-id>",
  "launch": { "mode": "sms_otp", "verificationId": "<session-id>" },
  "expiresAt": "<ISO-8601, now+5분>" }
```

- 최상위 `verificationId`와 `launch.verificationId`는 **동일**해야 한다.
- OTP launch에는 `url`·`action`·`returnUrl`·리다이렉트 필드가 **없다**.
- 다날 모드 응답은 기존 그대로(URL/form 필드 포함, `mode` 없음).

**실패:** (공통 `{ error, code }`)

| 상황 | HTTP | code |
| --- | --- | --- |
| 입력 형식 오류 | 400 | `invalid_input` |
| apply 초안 없음/만료/신원 불일치 | 404 | `not_found` |
| 발송/IP/신원/전화/일일 제한 초과 | 429 | `rate_limited` (+헤더) |
| CSRF Origin 누락·불일치 | 403 | `forbidden` |
| 기능 off | 404 | `not_found` |
| 암호화 키 부재 | 503 | `provider_unavailable` |
| SMS 미설정·발송 실패·예외·mock | 503 | `provider_unavailable` (세션 폐기됨) |
| 다날 모드 + 다날 미연동 | 503 | `provider_unavailable` (기존 동작) |

---

### 3.3 `POST /api/guest-monitoring/identity/verify-otp` — OTP 확인 (신규)

- **인증 필요 여부:** 공개(로그인 불필요). `endpoint()` 보호 + 브라우저 바인딩 + verificationId별 시도 제한. **`scripts/audit-api-auth.mjs` ALLOWLIST 등록 필수.**
- **메서드 + 경로:** `POST /api/guest-monitoring/identity/verify-otp`
- **Request body** (`otpVerifySchema`, `.strict()`):

```json
{ "verificationId": "<resourceId>", "code": "012345" }
```

```ts
// schemas.ts 추가
export const otpVerifySchema = z.object({
  verificationId: resourceId,                 // 기존 resourceId: /^[a-zA-Z0-9_-]{1,128}$/
  code: z.string().regex(/^[0-9]{6}$/),        // ASCII 숫자 6자리 "문자열"
}).strict();
```

- **숫자형 입력(`code: 12345`) 거부**(문자열만) → 앞자리 0·계약 보존. 부가 필드 거부(`.strict()`).
- **Query params:** 없음.

#### 처리 순서

```
endpoint() 게이트 통과 (CSRF·IP·플래그·키·16KB·no-store)
0. resolveIdentityMode() !== "sms_otp" → notFound()(404), 세션 미조회·미소비
1. otpVerifySchema.safeParse(body) 실패 → 400 invalid_input
2. guestLimit("otp-verify-id", verificationId, 5, 600_000)        // verificationId별 선 제한
3. session = prisma.findUnique({ id: verificationId })
     없음/지원X purpose/providerTxId "otp:" 접두사 아님 → verification_failed(400)
4. guestLimit("otp-verify-nonce", session.requestNonce, 5, 600_000)  // nonce 결합 제한(같은 세션 10분 5회)
5. browser 쿠키 없음 or binding(req, browser) !== session.browserBindingHash → verification_failed(400)
6. 상태 확인: verifiedAt·consumedAt·revokedAt null, expiresAt > now(서버시각) 아니면 verification_failed(400)
7. expected = session.providerTxId.slice(4)  // "otp:" 제거
   actual   = otpDigest({ nonce: session.requestNonce, inputIdentityHash: session.inputIdentityHash, code })
   timingSafeEqual(expected, actual) 불일치 → verification_failed(400)
8. [apply] 초안 재확인: findFirst({ id: session.draftId, guestIdentityHash: session.inputIdentityHash,
     status: "pending_payment", draftExpiresAt: { gt: now } }) 없으면 verification_failed(400)
9. rawToken = token();  verifiedId = "sms_otp_verified:" + crypto.randomUUID()
10. consumed = prisma.updateMany({ where: {
      id: session.id,
      providerTxId: session.providerTxId,          // 원래 otp: 저장값 (경합 방지)
      inputIdentityHash: session.inputIdentityHash,
      browserBindingHash: binding(req, browser),
      verifiedAt: null, consumedAt: null, revokedAt: null, expiresAt: { gt: now },
    }, data: {
      tokenHash: digest(rawToken),
      verifiedIdentityHash: session.inputIdentityHash,
      verifiedAt: now, consumedAt: now,
      expiresAt: new Date(now + SESSION_TTL),       // 15분으로 갱신
      providerTxId: verifiedId,                     // otp 해시 제거 + 완료 식별자 치환
    }})
11. consumed.count !== 1 → verification_failed(400)   // 동시요청 중 1건만 성공
12. attachSession(response, rawToken); attachBrowser(response, browser)   // 두 쿠키 유효기간 갱신
```

- **타이밍 세이프 비교**(7): 두 digest는 SHA-256 hex 64자로 길이 동일 → `crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))`.
- 클라이언트가 제공한 신원 해시로 **덮어쓰지 않는다.** 저장된 `inputIdentityHash`·`requestNonce`만 사용.
- 성공·오답 **모두 시도로 계산**(2·4). 새 IP·쿠키로 카운터 초기화 불가(키는 verificationId·nonce 기반).
- rate limit 키에 **코드·이름·전화 원문 금지.** 기존 `guestLimit`(`hashForSearch`)·`ipLimit` 사용 → 다중 인스턴스 공통 DB 제한.

#### Response

**성공 200:**

```json
{ "ok": true, "purpose": "status" | "apply" }
```

- 원문 세션 토큰은 **응답 바디에 넣지 않는다**(HttpOnly 쿠키로만 발급).
- `Set-Cookie: guest_monitoring_session`(15분), `guest_monitoring_browser`(15분) — 기존 `cookieOptions`(HttpOnly, prod Secure, prod `SameSite=None` path=`/api/guest-monitoring`).

**실패:** (공통 `{ error, code }`, 비-2xx)

| 상황 | HTTP | code | 세션·화면 |
| --- | --- | --- | --- |
| 요청 형식 오류 | 400 | `invalid_input` | 미인증 |
| 오답·미존재·만료·다른 브라우저·다른 신원·이미 소비·손상 해시 | 400 | `verification_failed` | 쿠키 미발급, 미인증 유지 |
| verificationId/nonce/IP 시도 제한 초과 | 429 | `rate_limited` (+헤더) | 추가 검증 차단 |
| CSRF Origin 누락·불일치 | 403 | `forbidden` | DB 검증·소비 전 차단 |
| 기능 off / OTP 모드 아님 | 404 | `not_found` | OTP 비활성, 세션 미소비 |

- `verification_failed`는 **존재 여부·불일치 필드를 노출하지 않는 단일 코드**. 세부 사유(오답/만료/바인딩 등)를 응답으로 구분하지 않는다.
- `errors.ts` `messages`에 추가: `verification_failed: "인증번호를 확인해주세요. 번호가 올바르지 않거나 시간이 만료되었을 수 있습니다."`

---

### 3.4 변경 없는 기존 엔드포인트 (회귀 금지 대상)

| 엔드포인트 | 상태 |
| --- | --- |
| `POST /identity/callback` (다날) | **불변** — HMAC·nonce 1회소비. OTP는 이 경로를 쓰지 않는다 |
| `POST /orders`, `GET /orders/[orderId]` | **불변** — OTP 성공 후 `startOrder`가 그대로 호출. 다날 503은 결제 경로 별개 |
| `GET /properties`, `GET /properties/[id]/calendar`, `DELETE /session` | **불변** — `requireSession`이 OTP 완료 세션을 기존과 동일하게 통과해야 함 |
| `POST /parse-pdf` | **불변** |

---

## 4. 구현 순서 (백엔드 → UI)

> 각 단계 후 `npm run lint` → 관련 테스트 → `npm run build`. 500줄 체크. 한 번에 한 파일.

### Phase B — 백엔드 (Codex) : 먼저

1. **B1. `identity-mode.ts` (신규)** — `resolveIdentityMode()`, `OTP_TTL`. 단위 테스트(모드 매핑: 미설정/빈값/danal/오입력→danal, sms_otp만 sms_otp).
2. **B2. `schemas.ts` + `errors.ts` (변경)** — `otpVerifySchema`, `verification_failed` 메시지.
3. **B3. `sms-otp.ts` (신규)** — 코드 생성·`otpDigest`·`startOtp`·`verifyOtp`. §2.3·§3.2·§3.3 그대로.
4. **B4. `session.ts` (변경)** — `startIdentity`를 모드 분기: OTP면 다날 공급자 호출 우회(`startOtp` 위임 or 내부 분기). **다날 분기는 바이트 동일 동작** 회귀 검증.
5. **B5. `start/route.ts` (변경)** — `resolveIdentityMode()` 선분기로 OTP 시 `getDanalProvider()` 미호출 + `identity-phone` 발송 제한 추가.
6. **B6. `verify-otp/route.ts` (신규)** — `endpoint()`(callback 아님)로 `verifyOtp` 래핑.
7. **B7. `scripts/audit-api-auth.mjs` (변경)** — ALLOWLIST에 `guest-monitoring/identity/verify-otp/route.ts` 등록(사유: CSRF + IP·verificationId·nonce rate limit + 브라우저 바인딩 + 1회 조건부 소비).
8. **B8. 테스트** — §8 전 항목. `npx vitest run --config lib/guest-monitoring/vitest.config.ts` + `npm run audit:api`.

> **핵심 우회 테스트(필수):** production 조건에서 `getDanalProvider`가 503을 던지도록 spy한 상태로 start 라우트·직접 `startIdentity`·verify-otp 모두 **공급자 호출 0회** 확인.

### Phase F — 프론트 (Claude) : 백엔드 계약 고정 후

9. **F1. `types/guest-monitoring.ts`** — §2.4 타입.
10. **F2. `guestApi.ts`** — `verifyOtp({verificationId, code})` (postJson, same-origin, no-store). 실패는 비-2xx로 반환.
11. **F3. `useGuestOtp.ts` (신규 공통 훅)** — `{status: "idle"|"pending", verificationId, expiresAt}`, `verify(code)`, `reset()`, 요청 세대(generation) 관리.
12. **F4. `GuestOtpForm.tsx` (신규)** — 코드 입력 UI(아래 §5 UX 계약). **구현은 Claude가 작성, 본 문서는 props 계약만 규정.**
13. **F5. `useGuestStatus.ts` (변경)** — `startAuth` OTP 분기 + `useGuestOtp` 결합 + 성공 후 `refreshProperties`·자동선택.
14. **F6. `GuestStatusAuthForm.tsx` / `GuestStatusClient.tsx` (변경)** — 2단계·대기 상태 노출.
15. **F7. `useGuestApply.ts` (변경)** — `startIdentity` OTP 분기 + 성공 후 현재 초안으로만 `startOrder`.
16. **F8. `GuestApplyForm.tsx` / `GuestApplyClient.tsx` (변경)** — OTP 입력 단계("인증·결제") 연결.
17. **F9. 클라이언트 흐름 테스트** — launch=false OTP vs 다날, 성공·실패·취소·새로고침, status 단건/다건/빈, apply 주문실패·초안경합.

---

## 5. 프론트 흐름 계약 (요약 — 구현 코드 아님)

### 5.1 `GuestOtpForm` props 계약 (신규 컴포넌트)

```ts
interface GuestOtpFormProps {
  verificationId: string;
  expiresAt: string;                    // 카운트다운 표시용(최종 판정은 서버)
  busy: boolean;                        // 제출 중 중복 클릭 차단
  error: string;                        // verification_failed/rate_limited 사용자 메시지
  onSubmit: (code: string) => void;     // 6자리 코드 문자열
  onResend: () => void;                 // 재요청(새 세션·코드) — status/apply 각 훅이 처리
  onCancel: () => void;                 // 입력 단계 복귀·상태 정리
}
```

- 코드 입력: `type` 문자열, `inputMode="numeric"`, `autoComplete="one-time-code"`, 6자리 제한, 연결된 `label`, 오류 안내 영역.
- 코드·이름·전화·토큰을 **URL·localStorage·sessionStorage에 저장 금지.** OTP 코드·대기 상태는 컴포넌트/훅 **메모리**로만 관리, 성공·취소 시 비운다.
- countdown·버튼 비활성화는 **안내용**. 만료·시도횟수·권한의 최종 판정은 서버.

### 5.2 현황 조회 (`useGuestStatus`)

```
이름·전화 입력 → startAuth → identityStart({purpose:"status"})
  → launchProvider(launch)===false && launch.mode==="sms_otp"
      → OTP 대기(verificationId·expiresAt 설정). 목록 갱신·인증완료 표시 금지
  → GuestOtpForm 코드 입력 → verifyOtp
      → 200 → refreshProperties → 1건 자동 selectProperty / 다건 선택 UI / 0건 빈 상태
      → 실패 → 미인증 유지, 재입력/재요청
```

- OTP 대기 중 **신청 존재·주소·건수·감시기간 노출 금지.**
- 다날 모드(launch에 url/action 존재)는 기존 동작 — `launchProvider`가 `true` 반환해 리다이렉트.

### 5.3 신청 (`useGuestApply`)

```
입력·PDF 분석 → ready → startIdentity({purpose:"apply", draftId})
  → launched===false && launch.mode==="sms_otp" → OTP 대기(phase 확장, "인증·결제" 그룹)
  → verifyOtp 200 → 현재 인증에 결합된 draftId 로만 startOrder(draftId) → 기존 결제 흐름
```

- OTP 분기에서는 **리다이렉트 복귀 마커(`pendingIdentity`)를 남기지 않거나 즉시 정리**한다. 인증 전 새로고침을 주문 재개로 오인 금지.
- 성공 후 **단순 launch 부재·클라이언트 상태만으로 주문 진행 금지.** 반드시 verifyOtp 200 이후.
- 초안 수정·reset·취소·만료·전화번호 변경 시 대기 `verificationId`·코드·오류 정리. **요청 세대(generation)** 확인으로 이전 비동기 응답이 새 초안 주문을 시작하지 못하게 한다.
- 전화번호 수정 시 인증 요청 단계로 복귀, 새 인증 시작(초안 무효화·재분석 규칙 유지).
- OTP 성공 후 주문 API 다날 503은 **기존 결제 오류 흐름**으로 안내. OTP 성공을 결제·감시 활성화 성공으로 표시 금지.

### 5.4 재요청 (P1)

- 재요청은 **새 세션·nonce·코드**. 같은 브라우저·purpose·신원의 이전 미완료 OTP는 폐기(이전 문자로 완료 불가). 재요청도 모든 발송 제한 적용.

---

## 6. 보안·운영 계약

- 코드 평문·이름·전화번호를 서버/클라 로그, 오류 객체, 분석 이벤트에 **남기지 않는다.** OTP·입력 신원 해시도 불필요 로그 금지.
- **Solapi mock 전화 일부 로깅 회피:** `startOtp`에서 `sendSms` 호출 **전** 설정 존재를 확인하거나, OTP 호출에 한정한 로그 억제를 설계한다. `sms_mock` 거부만으로 로그 금지를 충족했다고 보지 않는다. (현재 `prepareSms`/`sendSms`의 `[SOLAPI:SMS:MOCK] phone=***마스킹`가 mock 시 출력됨 → OTP 경로에서 이 출력이 나오지 않도록 설정 선검사)
- Solapi 설정은 기존 **DB 우선·env fallback** 체계 재사용. 실제 키·전화·코드·DB URL을 문서·테스트 결과에 복사 금지.
- 기능·암호화 키 게이트, CSRF, 브라우저 바인딩, HttpOnly/Secure/SameSite/path 쿠키 정책 **유지**.
- 발송 제한(start)과 검증 제한(verify)을 **각각** 적용. rate limiter 장애 시 차단(기존 `rateLimit` 동작). t-vestra에서 `RATE_LIMIT_BYPASS` 비활성 확인.
- 동시 확인·재전송·다중 탭에도 **같은 OTP는 한 번만 소비**(조건부 `updateMany` count===1), 두 번째 요청에서 새 인증 쿠키 미발급.
- OTP 구성 변경만으로 결제 공급자 불변. 신청 전체 완료 검증은 격리된 결제 mock으로만.
- 운영 DB 미접촉. 검증은 mock 또는 격리된 로컬 테스트 DB(`GUEST_TEST_DATABASE_URL` 루프백 가드)만.
- env `GUEST_IDENTITY_MODE` 변경은 서버 실행 환경 반영 필요(호스팅에 따라 재배포). 후속 배포는 t-vestra 선검증.

---

## 7. API 보안 코드 리뷰 체크리스트 (CLAUDE.md 필수)

- **인증 없는 변이 핸들러:** verify-otp는 공개지만 `endpoint()`(CSRF·IP·플래그·키) + verificationId/nonce 시도 제한 + 브라우저 바인딩 + 조건부 1회 소비로 보호. **ALLOWLIST 등록(B7)** 없이는 `audit:api` 빌드 실패 — 반드시 등록.
- **dead code endpoint:** verify-otp는 `guestApi.verifyOtp` → `useGuestOtp` → 두 흐름 훅에서 실제 호출. 미사용 라우트 아님.
- 변경 파일 외 `app/api/` 전체에 신규 미인증 변이 없음(verify-otp만 추가).

---

## 8. 테스트·인수 기준 (후속 구현 단계)

| 구분 | 필수 검증 | 기대 결과 |
| --- | --- | --- |
| 생성 | 6자리·앞자리 0·세션별 nonce/digest | SMS mock 호출 인자에서만 코드 확인, 저장값 `otp:` 해시 |
| 성공 | status·apply 정상 OTP | verified/consumed 갱신, `sms_otp_verified:` 치환, 두 쿠키, requireSession 통과 |
| 실패 | 오답·없는 ID·다날 세션·손상 해시·형식 오류 | 토큰 발급·상태 변경 없음, `verification_failed`/400 |
| 만료 | 만료 전·동일 시각·이후, 초안 만료 | 경계부터 거부, 서버 시각 우선 |
| 바인딩·신원 | 쿠키 누락·교체, UA 변경, 신원 해시 변조, 다른 초안 | 검증·주문 거부 |
| 한 번 사용 | 동일 코드 재요청·동시 확인 | 조건부 소비 1건만 성공 |
| 시도 제한 | 5회 오답 후 6번째 정답, IP 변경·동시 | 6번째부터 429, nonce별 제한 공유 |
| 발송 제한 | IP·입력신원·전화·일일, 재요청 | 초과 시 SMS 호출 0회 |
| 발송 장애 | success=false·예외·sms_mock·설정 부재 | 503, 대기 세션 폐기, 민감 로그 없음 |
| 보안 래퍼 | Origin 누락·교차, 기능 off, 키 부재 | 403·404·503, DB 소비 전 차단 |
| 모드 | 미설정·danal·오입력·sms_otp, 양방향 전환 | OTP는 명시 설정만, 다날 회귀 없음 |
| 핵심 우회 | production에서 getDanalProvider 503 spy | start·직접 startIdentity·verify 공급자 호출 0회 |
| 클라이언트 | launch=false OTP vs 다날, 성공·실패·취소·새로고침 | OTP만 입력 단계, 성공 전 조회·주문 재개 없음 |
| 흐름 재개 | status 단건/다건/빈, apply 주문실패·초안경합 | 기존 선택·달력·오류 보존, 잘못된 주문 없음 |
| 결제 경계 | OTP 성공 후 다날 503 | 인증 성공·결제 실패 구분, 감시 활성화 없음 |
| 비밀·PII | DB·응답·로그·브라우저 저장소 spy | 코드·이름·전화·토큰 금지 위치 노출 0 |

검증 명령: `npx vitest run --config lib/guest-monitoring/vitest.config.ts`, `npm run audit:api`, `npm run lint`, `npm test`(루트 `__tests__`), `npm run build`. DB 통합 테스트는 `GUEST_TEST_DATABASE_URL` 미설정 시 미실행 사실 보고.

**완료 조건:** P0 요구사항 + 위 필수 검증 통과 + 기능 파일 500줄 이하 + 다날 모드 회귀 없음 + 운영 DB 미접촉.

---

## 9. 절대규칙 준수 체크리스트

| # | 규칙 | 설계 반영 |
| --- | --- | --- |
| 1 | **페이지 500줄 제한** | `GuestOtpForm`·`useGuestOtp` 분리로 기존 파일 한계 회피. 각 파일 예상 규모 §1.2에 명시. 작성 직후 400줄 초과 시 보고·분리 |
| 2 | **단일 책임** | UI(components)/흐름(hooks)/HTTP(guestApi)/검증·소비(lib 서버) 분리. 페이지는 조합만 |
| 3 | **서버 검증·보안** | 모든 입력 서버 zod 검증(`otpVerifySchema`), CSRF·IP·바인딩·시도제한·조건부 소비. 코드·PII 로그·응답·저장소 금지. 타이밍세이프 비교 |
| 4 | **성능** | 기존 DB rate limiter 재사용(메모리 카운터 금지), 세션 단건 조회, OTP digest 경량. N+1 없음. 중복 호출 없음 |
| 5 | **폴더 구조** | 서버=`lib/guest-monitoring`·`app/api/...`, 타입=`types/`, 스키마=`schemas.ts`, 클라=route 아래 `components`/`hooks`/`guest` |
| 0-1 | 로컬≠운영 검증 | OTP·env·외부연동 작업 → t-vestra 실환경 검증 전 "완료" 선언 금지(§6) |
| 0-3 | 땜빵 금지 | 모드 resolver 단일 기준, 다날 자동 fallback 금지, 근본 분기 설계 |
| 0-5 규모 | 발송·검증 제한, 목록 상한 | 기존 공통 rate limiter·`take` 정책 유지 |
| 0-5 수명주기 | 생성뿐 아니라 폐기 | 발송 실패 시 세션 폐기(revoke), 재요청 시 이전 미완료 OTP 폐기, 모드 전환 시 미완료 검증 불가 |
| 0-5 비정상 | 재사용·동시·IDOR·입력위조 | 조건부 1회 소비, 바인딩, 숫자형 code 거부, 다른 신원/초안 거부 |
| 0-5 적대적 | 자기 코드 적대 검토 | 구현 후 §8 핵심 우회·보안 테스트 + 병렬 코드리뷰 권장 |

---

## 10. 미확정·후속(P1)

- **SMS 안내 문안**: 최종 카피는 발송 전 확정(코드·서비스명·유효시간 포함, PII 미포함). 본 설계는 "6자리 코드 + 5분" 전제.
- **공통 OTP 상태 훅/재요청 UX 고도화**(P1): `useGuestOtp`는 P0에서 최소 기능으로 도입하되 재요청·카운트다운 개선은 P1.
- **`lib/guest-monitoring/README.md` 운영 안내**(P1): 모드 전환·복귀·발송 설정·결제 한계.
- **`lib/danal` 수정·패키지 추가·DB 구조 변경은 계획하지 않는다.**
