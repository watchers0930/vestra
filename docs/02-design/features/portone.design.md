# 비회원 등기감시 PortOne V2 다날 테스트 결제 · 신청 복구 설계서 (공용 계약서)

> 프로젝트: VESTRA
> 작성일: 2026-10-15
> 상태: Design — 백엔드(Codex)·프론트엔드(Claude) 공용 계약. 구현·DB 변경·패키지 설치·배포 미수행
> 상위 문서: [`docs/01-plan/features/portone.plan.md`](../../01-plan/features/portone.plan.md)
> 기준 코드: `lib/danal/*`, `lib/guest-monitoring/*`, `app/api/guest-monitoring/payment/*`, `app/(personal-home)/renewal/monitoring/*`
> 관련 설계: [`sms.design.md`](./sms.design.md) (본인인증 SMS OTP — 이 문서의 상류. 본 설계는 그 뒤의 **결제** 단계)

---

## 0. 이 문서의 사용 규칙

- 이 문서는 **계약서**다. 경로·메서드·요청/응답 DTO·타입·함수 시그니처·상수·상태 매핑은 **스펙 고정**이며, 백엔드와 프론트엔드가 동일하게 구현한다.
- 양측(클라이언트↔서버)의 접점은 아래 3가지뿐이다. 이 경계를 넘는 가정(예: 클라이언트가 결제 승인 여부를 판정, 서버가 브라우저 전달 금액을 신뢰)은 **금지**다.
  1. `POST /api/guest-monitoring/orders` 응답의 `payment` 객체 (SDK 실행 정보 + 서명된 콜백 문맥)
  2. `POST /api/guest-monitoring/payment/callback` 요청/응답 (브라우저가 `{paymentId, 서명 문맥}` POST)
  3. `GET /api/guest-monitoring/orders/[orderId]` 응답의 주문 상태 (`done` 판정의 유일 근거)
- 스펙에 어긋나는 구현을 발견하면 **구현을 바꾸지 말고 이 문서를 먼저 고친 뒤** 양측에 반영한다.
- **본인인증(SMS OTP)은 불변이다.** PortOne 본인인증·다날 본인인증 전환·OTP 정책 변경은 범위 밖. PortOne 결제 공급자의 `identity` 메서드는 **지원 불가로 차단**한다.
- **실결제·실제 금전 출금은 허용하지 않는다.** mock 성공 응답을 실제 연동 성공으로 간주하지 않는다. `test:true` 같은 임의 필드를 만들어 무출금을 보장했다고 간주하지 않는다. 테스트 전용 다날 채널 확인(P0 선행)이 SDK 실행 전 필수 조건이다.
- DB 신규 컬럼·마이그레이션을 **추가하지 않는다.** 기존 `GuestMonitoringOrder`의 nullable 문자열 컬럼만 재사용한다.

### 0.1 P0 선행 — 공식 지원 확인 (코드보다 먼저)

구현 착수 전, PortOne 콘솔·공식 문서에서 아래를 **확인하고 결과를 보고**한다. 미확인 시 제약으로 보고하고, V1·다른 PG·PortOne 본인인증으로 **임의 대체하지 않는다.**

- 해당 상점(storeId)의 **다날 V2 결제** 채널 지원 여부 (다날 V2 공식 자료는 본인인증 위주로 확인됨 — 결제 지원 별도 확인 필요)
- 출금 없는 **테스트 채널** 존재 여부 및 테스트 결제수단(`payMethod`)
- 실제 SDK 버전(`@portone/browser-sdk/v2`)·통화 enum 표기·REST 응답의 테스트/채널 식별 필드

채널 미지원/미확인 시 코드·테스트가 통과해도 **"다날 V2 테스트 결제 실동작 완료"로 보고하지 않는다.** 복구 버그(§6) 수정은 채널 확인과 독립적으로 진행 가능하다.

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 책임 (절대규칙 §단일책임·§폴더구조)

```
[클라이언트: app/(personal-home)/renewal/monitoring]
  components/guest/*   UI (표시·입력)              ← JSX·버튼 상태 (결제 프로토콜 금지)
  hooks/useGuestApply  신청 흐름 상태머신           ← phase 전이·세대관리·실패 분기
  guest/guestPayment   결제 실행 헬퍼(신규)          ← provider 분기·SDK 실행·콜백 POST 트리거
  guest/guestProvider  launchProvider(기존 불변)     ← 다날 URL/form 실행 (PortOne 불관여)
  guest/guestApi       HTTP 클라이언트               ← fetch·same-origin·no-store·결과 래핑
        │ (HTTP, HttpOnly 세션/브라우저 쿠키)
        ▼
[서버: app/api/guest-monitoring]
  orders/route.ts            주문 생성(기존, provider 선택만 바뀜)
  orders/[orderId]/route.ts  주문 상태 조회(기존 불변)
  payment/callback/route.ts  결제 콜백(변경: PortOne 브라우저 경로 Origin·세션·주문 결합)
        │
        ▼
[서버 서비스: lib/guest-monitoring]
  order.ts        주문 생성·결제문맥 발급 연결 (변경)
  activation.ts   verify→get→record(nonce 원자소비)→apply (변경)
  recovery.ts     cron 미적용 주문 복구 (변경: paymentId/txId 해소)
        │
        ▼
[공급자 어댑터: lib/danal]
  index.ts            getDanalProvider() — mock|portone 선택 (변경)
  types.ts            PaymentAdapter/DanalProvider 타입 (변경: mode·cancel 반환)
  portone.ts          PortOne PaymentAdapter (신규, 서버 전용)
  portone-rest.ts     REST 클라이언트 GET/POST (신규, 서버 전용)
  portone-callback.ts HMAC 서명·검증·nonce receipt (신규, 서버 전용)
  portone-config.ts   env 해석·storeId/channelKey/secret (신규, 서버 전용)
  mock.ts             격리 mock (기존 불변)
        │
        ▼
[외부] api.portone.io (REST v2) · @portone/browser-sdk/v2 (브라우저)
```

- **페이지(`page.tsx`)는 조합·진입만.** 결제 프로토콜을 페이지에 두지 않는다.
- **SDK UI 실행(클라이언트)과 결제 결과 검증(서버 REST 재조회)을 분리한다.** 브라우저가 전달한 금액·승인 상태는 신뢰하지 않는다.
- **서명은 서버만 만든다.** 브라우저는 서버가 발급한 서명 문맥을 보관·echo만 한다.

### 1.2 신규/변경 파일 목록과 파일 분리 계획

> 500줄 제한(절대규칙 §1). `useGuestApply.ts` 현재 391줄 → 결제 실행·실패 분기를 직접 누적하면 한계 근접. **결제 실행은 `guestPayment.ts`로, 실패 분류는 순수 헬퍼로 분리**한다. 서버 어댑터는 책임별로 4개 파일로 나눠 각 파일 150줄 이하 유지.

#### 서버 (Codex)

| 파일 | 구분 | 책임 | 예상 규모 |
| --- | --- | --- | --- |
| `lib/danal/portone-config.ts` | 신규 | env 해석(`resolvePaymentMode`, storeId/channelKey/apiSecret/signingKey getter), 누락 시 503 | ~60줄 |
| `lib/danal/portone-callback.ts` | 신규 | `signCallbackContext`·`verifyCallbackContext`·nonce receipt(생성/파싱/소비표시) | ~90줄 |
| `lib/danal/portone-rest.ts` | 신규 | `getPaymentById`·`cancelPaymentById` (Authorization·URL인코딩·timeout·스키마 검증·오류 분류) | ~120줄 |
| `lib/danal/portone.ts` | 신규 | `portoneProvider: DanalProvider` — create/verify/get/cancel + `PaymentResult` 매핑 | ~150줄 |
| `lib/danal/index.ts` | 변경 | `getDanalProvider()`에 portone 선택 추가(mock 가드 유지) | 19 → ~35줄 |
| `lib/danal/types.ts` | 변경 | `mode`에 `"portone"` 추가, `cancelPayment` 반환 타입, 미확정 상태 표현 | 32 → ~40줄 |
| `lib/guest-monitoring/order.ts` | 변경 | `createPayment`에 주문 row 전달(문맥 재사용), 재사용 주문 nonce 보존 | 68 → ~80줄 |
| `lib/guest-monitoring/activation.ts` | 변경 | portone receipt 기록·nonce 원자소비, 미확정 상태 분리 처리 | 97 → ~120줄 |
| `lib/guest-monitoring/recovery.ts` | 변경 | portone `getPayment(txId)` → orderId 해소 후 paymentId 재조회 | 18 → ~25줄 |
| `app/api/guest-monitoring/payment/callback/route.ts` | 변경 | portone 브라우저 경로: Origin·세션·주문 신원 결합 검증 | 7 → ~30줄 |
| `scripts/audit-api-auth.mjs` | 변경 | payment/callback ALLOWLIST 사유 갱신(브라우저 경로 보호 추가 명시) | 설명만 |
| `package.json` + lockfile | 변경 | `@portone/browser-sdk` 설치 내역 명시 (별도 변경으로 취급) | — |
| `lib/guest-monitoring/tests/portone.test.ts` | 신규 | 어댑터·콜백·nonce·REST·매핑·복구 (네트워크 mock) | 테스트 |

#### 프론트 (Claude)

| 파일 | 구분 | 책임 | 예상 규모 |
| --- | --- | --- | --- |
| `types/guest-monitoring.ts` | 변경 없음 권장 | `payment: Record<string,string>` 유지(§2.4). 필요 시 주석만 | — |
| `.../guest/guestApi.ts` | 변경 | `paymentCallback({paymentId, callbackContext, callbackSignature})` 추가 | +10줄 |
| `.../guest/guestPayment.ts` | 신규 | `runPayment(payment)` — provider 분기·SDK 실행·콜백 결과 반환(아래 §5.1) | ~110줄 |
| `.../guest/guestProvider.ts` | 변경 없음 | `launchProvider`는 PortOne payment에서 url/action 키 없어 `false` → `runPayment`가 선처리. 기존 다날/mock 동작 보존 | — |
| `.../hooks/useGuestApply.ts` | 변경 | 401 재인증 분리·입력 보존·실패별 재시도·`runPayment` 결합 | 391 → ≤470줄 (초과 시 분리) |
| `.../hooks/useGuestApplyRecovery.ts` 또는 `guest/applyFailure.ts` | 신규(조건부) | 실패 신호→동작 분류 순수 헬퍼(§6.3 표) — 훅이 470줄 초과 시 분리 | ~60줄 |

> **분리 트리거:** 작성 직후 400줄 초과 감지 시 즉시 보고 후 분리한다. `useGuestApply`가 470줄을 넘으면 실패 분류 표(§6.3)를 `applyFailure.ts` 순수 함수로, 결제 실행은 `guestPayment.ts`로 모아 중복 없이 재사용한다. 결제 프로토콜(SDK 필드·서명)은 페이지·컴포넌트에 넣지 않는다.

---

## 2. 데이터 모델

### 2.1 DB 스키마 — **변경 없음**

Prisma `schema.prisma`, SQL, 마이그레이션을 **수정하지 않는다.** `GuestMonitoringOrder`의 기존 컬럼만 재사용한다.

| 컬럼 | 기존 용도 | PortOne에서의 용도 |
| --- | --- | --- |
| `orderId` (unique) | 서버 생성 주문번호(`ord_<uuid>`) | **PortOne `paymentId`로 그대로 사용** (컬럼 추가 방지) |
| `amount` / `currency` | 서버 가격 스냅샷(10000/KRW) | 동일. REST 조회값과 대조하는 기준 |
| `productVersion` | SSOT 가격 버전 | 동일 (`GUEST_SINGLE_MONITORING.priceVersion`) |
| `status` | pending\|paid\|needs_review\|failed\|canceled\|refunded | 동일. PortOne 상태를 이 enum으로 매핑(§3.4) |
| `providerMode` | `mock` \| `danal` | **`portone` 추가** (문자열 컬럼, 스키마 변경 없음) |
| `providerTransactionId` (unique) | 승인 후 거래 ID | PortOne `transactionId` (paymentId와 **구분**. 혼용 금지) |
| `providerReceipt` (Text, nullable) | 격리 mock의 서명 재조회 증빙 | **PortOne 결제 문맥 nonce 상태 머신**(§2.2) — mock receipt와 버전으로 분기 |
| `expiresAt` | 결제 대기 주문 TTL(`ORDER_TTL` 20분) | 동일. SDK/콜백 만료 판단 기준 |
| `paidAt` / `appliedAt` / `appliedPeriodStart/End` | 승인·적용 시각 | 동일 의미 |

### 2.2 `providerReceipt` 상태 머신 (PortOne 전용, 버전 구분)

`providerReceipt`는 공급자별로 **접두사 버전 태그**로 분기한다. mock과 PortOne은 절대 겹치지 않는다.

| 공급자 | `providerReceipt` 형식 | 설명 |
| --- | --- | --- |
| mock(기존) | `<base64url payload>.<hex signature>` | 서명 재조회 증빙 (불변) |
| PortOne(신규) | `portone_v1:<base64url(JSON)>` | 아래 JSON. **점(`.`) 미포함**으로 mock 파서와 구분 |

PortOne receipt JSON:

```ts
{ "v": 1,
  "nonce": "<base64url 32B 난수>",   // 서버 발급, 문맥 서명에 포함. PII·원문 결제정보 아님
  "consumed": false }                // 결제 기록 시 true로 1회 전이 (§4.4)
```

| 단계 | receipt 상태 | 기타 |
| --- | --- | --- |
| 주문 생성(createPayment) | `portone_v1:{nonce, consumed:false}` | 동일 주문 재사용 시 **같은 nonce 유지**(다른 탭 콜백 무효화 금지) |
| PAID 확정·결제 기록 | `portone_v1:{nonce, consumed:true}` (조건부 전이) | `recordPayment` 트랜잭션 내에서 nonce 소비와 paid 기록을 **동일 트랜잭션** 조건부 갱신 |
| 일시 장애(REST timeout/5xx/전송 실패) | 변경 없음 (consumed:false 유지) | 동일 문맥 재시도 가능 |
| 소비 후 재전송(멱등) | `consumed:true` 유지 | 기존 처리 결과 멱등 반환, 재활성화 없음 |

- `nonce`는 서버가 보관하는 난수(세션 `requestNonce`와 동일 성격). 브라우저는 서명 문맥 안의 nonce를 echo만 하며 위조 불가(서명 필요).
- `consumed`는 **결제 기록 경계**에서만 전이한다. 검증 메서드 단독으로 소비하지 않는다(§4.4).

### 2.3 서명된 콜백 문맥 산출 규약 (서버 전용이나 명문화)

주문 생성/재개 시 서버가 아래 문맥을 HMAC 서명하여 브라우저에 발급한다. 브라우저는 이 두 문자열을 echo만 한다.

```ts
// 서명 대상(JSON canonical — 키 순서 고정)
context = base64url(JSON.stringify({
  v: 1,
  purpose: "guest_payment_v1",         // 도메인 태그 (본인인증·웹훅과 분리)
  paymentId,                           // = 서버 orderId
  orderId,                             // paymentId와 동일 값(의미 구분 위해 명시)
  storeId,                             // NEXT_PUBLIC_PORTONE_STORE_ID
  amount,                              // 정수 10000
  currency: "KRW",
  expiresAt,                           // epoch ms (= order.expiresAt)
  nonce,                               // providerReceipt의 nonce와 동일
}))
signature = HMAC-SHA256-hex(paymentSigningKey, context)
```

- `paymentSigningKey`는 **결제 전용 도메인으로 파생**한다: `HMAC-SHA256(serverSecret, "guest-monitoring/payment-callback/v1")`. `serverSecret = SEARCH_INDEX_KEY || AUTH_SECRET`(기존 `requireCrypto` 보장값). **누락 시 503.**
- mock의 `DANAL_MOCK_SECRET`을 **재사용하지 않는다.** REST `PORTONE_V2_API_SECRET`·공개 `NEXT_PUBLIC_*` 값을 서명키로 **배포하지 않는다.**
- 검증은 `timingSafeEqual`로 서명 비교 후, 문맥 필드가 서버 주문과 전부 일치하고, `digest(nonce)`/`nonce`가 저장 receipt와 일치하며 미소비·미만료임을 확인한다.
- 이것은 **브라우저용 HMAC 문맥**이며 **PortOne이 보낸 웹훅 서명이 아니다.** 웹훅은 이번 범위가 아니다.

### 2.4 타입 정의

#### 2.4.1 `types/guest-monitoring.ts` (프론트·백 공용) — **변경 없음 권장**

```ts
// 기존 유지 — payment는 Record<string,string> 그대로. PortOne 금액은 문자열 직렬화.
export interface GuestOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  payment: Record<string, string>;   // PortOne SDK 실행 정보 + 서명 문맥 (§3.2)
  status: GuestOrderStatus;
}
// 기존 유지 — done 판정의 유일 근거
export interface GuestOrderStateResponse {
  orderId: string;
  status: GuestOrderStatus;           // "pending"|"paid"|"failed"|"canceled"|"refunded"|"needs_review"
  applied: boolean;
  startedAt: string | null;
  paidUntil: string | null;
}
```

> `payment`에 담기는 PortOne 키(런타임 계약, 전부 문자열):
> `provider="portone"`, `storeId`, `channelKey`, `paymentId`, `orderName`, `totalAmount`(="10000"), `currency`(="KRW"), `payMethod`, `expiresAt`, `callbackContext`, `callbackSignature`.
> **`PORTONE_V2_API_SECRET`·`DANAL_CARD_ENC_KEY`·`DANAL_MID`·개인정보는 포함하지 않는다.** 금액은 SDK 경계에서 정수 검증 후 `Number()` 변환한다.

신규 프론트 요청 타입(클라이언트 전용, `types/`에 추가):

```ts
export interface GuestPaymentCallbackRequest {
  paymentId: string;          // = orderId
  callbackContext: string;    // 서버 발급 base64url 문맥 (echo)
  callbackSignature: string;  // 서버 발급 hex 서명 (echo)
}
export interface GuestPaymentCallbackResponse { ok: true }
// 실패는 기존 GuestApiError { error, code } 로 비-2xx
```

#### 2.4.2 `lib/danal/types.ts` — **최소 변경**

```ts
export interface PaymentResult {
  verificationReference?: string;   // 재조회용 paymentId (브라우저 승인 증빙 아님)
  orderId: string;
  transactionId: string;
  merchantId: string;               // 검증된 storeId
  amount: number;
  currency: string;
  paidAt: number;                   // epoch ms
  status: "paid" | "failed" | "canceled" | "refunded";
  expiresAt: number;                // 기존 DB 주문 expiresAt (epoch ms)
}
export interface PaymentAdapter {
  createPayment(input: {
    orderId: string; amount: number; currency: string; expiresAt: Date;
    providerReceipt?: string | null; createdAt?: Date;   // [변경] 재사용 주문 문맥 보존용
  }): Promise<Record<string, string>>;
  verifyPayment(input: unknown): Promise<PaymentResult>;
  getPayment(reference: string): Promise<PaymentResult>;
  cancelPayment(reference: string): Promise<void>;        // [변경] Promise<never> → Promise<void>
}
export interface DanalProvider {
  mode: "mock" | "danal" | "portone";                     // [변경] portone 추가
  merchantId: string;
  identity: IdentityAdapter;
  payment: PaymentAdapter;
}
```

- **미확정 상태(READY/PAY_PENDING/가상계좌 발급 등)**: `PaymentResult.status`에 `pending`이 없으므로 **가짜 PaymentResult를 만들지 않는다.** `verifyPayment`/`getPayment`는 전용 오류 코드 `payment_pending`(GuestError, status 409 또는 425 — 아래 §3.3 고정값 사용)을 throw하고, 호출부는 기존 주문 재조회로 처리한다. 비승인 상태에 없는 `paidAt`·`transactionId`를 가짜로 채우지 않는다.
- **`cancelPayment` 반환 변경**: 성공한 취소를 오류로 위장하지 않도록 `Promise<void>`로 완화. 기존 **mock은 예외를 던지는 구현을 유지**(`async cancelPayment() { throw new GuestError("provider_unavailable", 503); }`)해도 타입상 호환된다.
- **PortOne `identity` 차단**: `portoneProvider.identity.startVerification`/`verifyResult`는 호출 시 `GuestError("provider_unavailable", 503)`을 던진다(지원 불가). 정상 흐름은 OTP가 담당하므로 호출되지 않지만, 오용 방어로 명시 차단한다.

### 2.5 서버 상수·환경변수

| 항목 | 위치 | 값/역할 | 취급 |
| --- | --- | --- | --- |
| `GUEST_SINGLE_MONITORING.amount` | `lib/pricing-plans.ts` (기존) | `10000` (정수, KRW) | **가격 SSOT. 불변 재사용** |
| `GUEST_SINGLE_MONITORING.currency` | 동일 | `"KRW"` | 동일 |
| `ORDER_TTL` | `lib/guest-monitoring/config.ts` (기존) | `20 * 60_000` | 결제 대기 TTL. 불변 |
| `GUEST_PAYMENT_MODE` | env | `portone`이면 신규 결제 선택(우선) | 인증 모드와 독립 |
| `DANAL_PROVIDER` | env | 기존 선택자(`mock` 등). 신규 미설정 시 따름 | 기존 호환 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | env | SDK 상점 ID = 서버 검증 기대 storeId | 공개, 필수 |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_DANAL` | env | 다날 **테스트** 채널 키 | 공개, 필수 (테스트 채널 확인) |
| `PORTONE_V2_API_SECRET` | env | REST v2 Authorization | **서버 전용, 필수. 번들·응답·로그 금지** |
| `DANAL_MID` | env | 다날 테스트 가맹점 설정 확인용 | 서버/콘솔 설정용. **storeId와 동일시 금지, REST 인증에 미사용** |
| `DANAL_CARD_ENC_KEY` | env | 다날 채널 콘솔 설정용 키 | **SDK 응답·번들·로그 노출 금지** |
| `GUEST_MONITORING_ENABLED` 등 기존 게이트 | env | 기능 플래그·암호화 키·쿠키·레이트리밋 | **유지** |

- 설정값 이름·`NODE_ENV`만으로 무출금을 보장한다고 간주하지 않는다.

---

## 3. API 스펙

> 공통 게이트: 모든 엔드포인트는 `lib/guest-monitoring/http.ts`의 `endpoint()` 래퍼를 사용한다.
> `endpoint()` 처리 순서 = `requireEnabled()`(기능 off 시 **404**) → (비 callback·비 GET) CSRF Origin 검사(실패 **403**) → `requireCrypto()`(키 부재 **503**) → Content-Length 상한(16KB, 초과 **413**) → IP 제한(callback 120/분, 일반 60/분) → 핸들러.
> 모든 응답은 `Cache-Control: no-store`.

### 3.1 공급자 선택 resolver (계약 전제)

```ts
// lib/danal/portone-config.ts
export function resolvePaymentMode(): "mock" | "portone" {
  const pay = process.env.GUEST_PAYMENT_MODE?.trim() || undefined;   // 신규, 우선
  const dan = process.env.DANAL_PROVIDER?.trim() || undefined;       // 기존
  // 둘 다 명시되고 서로 다르면 조용히 fallback 금지 → 설정 오류
  if (pay && dan && pay !== dan) throw new GuestError("provider_unavailable", 503);
  const effective = pay ?? dan;                                      // 신규가 우선, 없으면 기존
  if (effective === "portone") return "portone";
  if (effective === "mock") return "mock";
  throw new GuestError("provider_unavailable", 503);                 // 미설정·알 수 없는 값
}
```

```ts
// lib/danal/index.ts (변경)
export function getDanalProvider(): DanalProvider {
  const mode = resolvePaymentMode();              // 충돌·미설정·오입력 → 503
  if (mode === "portone") return getPortoneProvider();   // env(storeId/channel/secret/signingKey) 검증, 누락 503
  // mock: 기존 비운영·격리 DB·플래그·32자 비밀키 조건을 그대로 만족해야만 선택
  if (process.env.NODE_ENV !== "production" && process.env.DANAL_PROVIDER === "mock" &&
      process.env.GUEST_MONITORING_MOCK_ISOLATED === "true" && isolatedDatabase() &&
      (process.env.DANAL_MOCK_SECRET?.length ?? 0) >= 32) return mockProvider;
  unavailable();
}
```

- **정확히 `portone`**일 때만 PortOne. **정확히 `mock`** + 기존 격리 가드 전부 만족 시에만 mock. 그 외 전부 503.
- PortOne 선택은 **SMS OTP 모드를 변경하지 않는다.** `startIdentity`는 OTP 모드에서 `getDanalProvider()`를 호출하지 않는다(기존 `session.ts:21` 선분기 유지).

---

### 3.2 `POST /api/guest-monitoring/orders` — 주문 생성 (라우트 불변, 응답 `payment` 변경)

- **인증 필요 여부:** 필요. `requireSession(req)`(OTP 완료 세션). 라우트는 기존 그대로.
- **메서드 + 경로:** `POST /api/guest-monitoring/orders`
- **Request body** (`orderSchema`, `.strict()` — 불변):

```json
{ "purpose": "initial" | "renewal",
  "draftId": "<resourceId, initial 필수>",
  "guestMonitoringId": "<resourceId, renewal 필수>",
  "idempotencyKey": "<uuid v4>" }
```

규칙: `initial`이면 `draftId`만, `renewal`이면 `guestMonitoringId`만. 멱등키는 UUID.

#### 처리 순서 (기존 `createOrder` 흐름 + PortOne 결제문맥)

```
getDanalProvider()  → portone 선택 (충돌/미설정 시 503, SDK·주문 생성 전 차단)
requireSession(req) → 401 없으면 진행
guestLimit("orders", session.id, 5)
orderSchema 검증 실패 → 400 invalid_input
createOrder(session, input):
  1. 신원·초안·대상 결합 검증(기존). 미완료 주문 재사용(기존, idempotencyKey/대상별)
  2. 신규 주문이면: amount=product.amount, currency=product.currency, providerMode="portone", expiresAt=now+ORDER_TTL 로 생성
  3. order.status==="pending" && expiresAt>now 이면 provider.payment.createPayment(order) 호출
       └ createPayment는 order.providerReceipt를 보고:
           · 유효한 portone_v1 미소비 receipt 있으면 → 같은 nonce 재사용(재서명만)  ← 다른 탭 콜백 무효화 금지
           · 없으면 → nonce 생성, providerReceipt = portone_v1:{nonce,consumed:false} 로 주문 update
       └ 서명 문맥(context/signature) 생성, payment Record 반환
  4. json({ orderId, amount, currency, payment, status }, created ? 201 : 200)
```

#### Response

**성공 200/201** (PortOne):

```json
{ "orderId": "ord_xxxx",
  "amount": 10000,
  "currency": "KRW",
  "status": "pending",
  "payment": {
    "provider": "portone",
    "storeId": "store-...",
    "channelKey": "channel-...(다날 테스트)",
    "paymentId": "ord_xxxx",
    "orderName": "등기감시 1개월",
    "totalAmount": "10000",
    "currency": "KRW",
    "payMethod": "<다날 V2 테스트 채널 지원 수단>",
    "expiresAt": "<ISO-8601>",
    "callbackContext": "<base64url>",
    "callbackSignature": "<hex>"
  } }
```

- `payment.paymentId`는 `orderId`와 **동일**해야 한다.
- 이미 `paid`/`needs_review`로 적용 대기이거나 재사용된 완료 주문이면 `payment`는 `{}`일 수 있다(기존 `order.ts:53-54` 조건). 클라이언트는 그 경우 주문 상태 조회로 복구한다.

**실패:** (공통 `{ error, code }`)

| 상황 | HTTP | code |
| --- | --- | --- |
| 입력 형식 오류 | 400 | `invalid_input` |
| 세션 없음·만료 | 401 | `session_required` |
| 초안/대상 없음·만료·신원 불일치 | 404 | `not_found` |
| 초안 만료(명시 코드) | 400 | `draft_expired` |
| 이미 감시 중 중복 | 409 | `duplicate_active` |
| 주문 생성 rate limit | 429 | `rate_limited` (+헤더) |
| 공급자 설정 오류·키 누락 | 503 | `provider_unavailable` |
| CSRF Origin 누락·불일치 | 403 | `forbidden` |
| 기능 off | 404 | `not_found` |

---

### 3.3 `POST /api/guest-monitoring/payment/callback` — 결제 콜백 (변경: PortOne 브라우저 경로 보강)

- **인증 필요 여부:** 공개 콜백(`endpoint(..., {callback:true})`)이지만, **PortOne 브라우저 경로는 추가로 Origin + OTP 완료 세션 + 주문 신원 결합을 서버에서 검증**한다. `scripts/audit-api-auth.mjs` ALLOWLIST 유지(사유 갱신).
- **메서드 + 경로:** `POST /api/guest-monitoring/payment/callback`
- **Request body** (PortOne 브라우저 경로):

```json
{ "paymentId": "ord_xxxx",
  "callbackContext": "<base64url, 서버 발급 echo>",
  "callbackSignature": "<hex, 서버 발급 echo>" }
```

> 기존 mock/다날 경로의 요청 형식(`{payload, signature}` envelope)은 **불변**이다. `verifyPayment`가 공급자별 입력을 해석한다(mock=envelope, portone=위 형식).

#### 처리 순서 (라우트)

```
endpoint({callback:true}) 게이트 (requireEnabled·requireCrypto·16KB·IP 120/분)
0. mode = resolvePaymentMode()
1. [portone 경로만] 브라우저 요청 보강 검증:
     a. validateOrigin(req) 실패 또는 Origin 헤더 부재 → 403 forbidden
        (callback 기본 Origin 예외를 브라우저 경로엔 적용하지 않음)
     b. session = requireSession(req, ["apply","renewal"])   ← 401 session_required
     c. (아래 activation에서) 주문의 guestIdentityHash === session.verifiedIdentityHash 결합 확인 → 불일치 404/403
2. paymentCallback(mode, body or envelope, session?) 위임
3. json({ ok: true })
```

#### `paymentCallback` 서비스 (activation.ts, PortOne 분기)

```
verified = provider.payment.verifyPayment(body)
   └ portone.verifyPayment:
       1. body 형식 검증(paymentId resourceId, context base64url, signature hex 64)
       2. verifyCallbackContext: timingSafeEqual(signature, HMAC(signingKey, context)) 불일치 → payment_failed(400)
       3. context 복호화 후 purpose==="guest_payment_v1", paymentId===body.paymentId 확인
       4. 서버 주문 조회(orderId=paymentId): storeId·amount·currency·expiresAt 문맥 ↔ 주문 ↔ product 전부 일치, 아니면 payment_failed
       5. receipt(portone_v1) 파싱: nonce 일치 && consumed===false && expiresAt>now 아니면 payment_failed
       6. REST getPaymentById(paymentId)  ← 여기서 승인 재조회 (브라우저 금액·상태 불신)
       7. §3.4 확정 조건 전부 충족 시 PaymentResult(verificationReference=paymentId) 반환
          └ 미확정(READY/PAY_PENDING/가상계좌) → throw payment_pending (409)
          └ REST 인증실패/timeout/429/5xx/손상 → throw provider_unavailable (503)  ← 결제 확정 실패와 분리
guestLimit("callback:payment", verified.orderId, 20)        // 기존 콜백 레이트리밋
re-get = provider.payment.getPayment(verified.verificationReference)   // 재조회 방어(기존 패턴 유지)
re-get.orderId===verified.orderId && transactionId 일치 아니면 payment_failed
paid = recordPayment(re-get)        // nonce 원자 소비 + paid 기록 (§4.4)
if (paid) applyPaidOrder(paid.orderId)
return { ok: true }
```

#### Response

**성공 200:** `{ "ok": true }`

**실패:** (공통 `{ error, code }`)

| 상황 | HTTP | code |
| --- | --- | --- |
| 형식 오류·서명 불일치·문맥/주문 불일치·nonce 소비·금액/통화/상점/채널 불일치 | 400 | `payment_failed` (원문 REST 응답·상세 미포함) |
| PortOne 브라우저 경로 Origin 누락·불일치 | 403 | `forbidden` |
| PortOne 브라우저 경로 세션 없음·만료 | 401 | `session_required` |
| 주문-세션 신원 불일치(IDOR) | 404 | `not_found` |
| 미확정 결제(READY/PAY_PENDING/가상계좌) | 409 | `payment_pending` (호출부는 주문 재조회) |
| 이미 needs_review 상태 재적용 시도 | 409 | `payment_needs_review` |
| REST 인증실패·timeout·429·5xx·응답 손상 | 503 | `provider_unavailable` (일시 장애, nonce 미소비) |
| 콜백 rate limit | 429 | `rate_limited` (+헤더) |
| 기능 off | 404 | `not_found` |

- `payment_pending` 메시지(추가): `"결제 승인을 확인하고 있습니다. 주문 상태를 다시 확인해주세요."` (`errors.ts`에 등록).
- 오류에 원문 REST 응답·상세 결제정보·secret을 **포함하지 않는다.**

---

### 3.4 서버 결제 확정 조건 (REST 재조회 대조 — 고정)

`GET https://api.portone.io/payments/{encodeURIComponent(paymentId)}` · `Authorization: PortOne ${PORTONE_V2_API_SECRET}` · 캐시 미사용 · timeout(예: 8s) · 응답 스키마 검증. 아래 **전부** 충족해야 `paid` 저장·감시 활성화.

1. REST 결과의 결제 ID가 서버 주문에 결합된 `paymentId`와 일치.
2. 조회 `amount.total` === DB 주문 `amount` === `GUEST_SINGLE_MONITORING.amount`(정수 10000).
3. 통화 === DB 주문 `currency` === `KRW`.
4. 조회 `storeId` === `NEXT_PUBLIC_PORTONE_STORE_ID` (요청에 storeId를 넣는 것으로 응답 대조를 대체하지 않음).
5. 테스트 다날 채널 결합 확인 + 상태 `PAID`.
6. `transactionId` 존재 + 다른 주문에 미결합 + `paidAt`이 유효 시각(주문 `createdAt` ≤ paidAt ≤ `expiresAt`, paidAt ≤ now, 미래 아님).

불일치는 **명시 거부**(`payment_failed`), paid 저장·활성화 없음. 서버 조회 결과에 테스트/채널 식별 필드가 있으면 추가 검증한다(이 사후 검증만으로 실결제 예방을 대체하지 않음).

#### `PaymentResult` 매핑 (고정)

| 내부 필드 | PortOne REST 기준 |
| --- | --- |
| `orderId` | REST 결제 ID와 일치하는 서버 orderId |
| `transactionId` | PortOne `transactionId` (paymentId·PG거래번호로 임의 치환 금지) |
| `merchantId` | 검증된 `storeId` (= `provider.merchantId`) |
| `amount`, `currency` | 검증된 REST 금액/통화 |
| `paidAt` | REST `paidAt` → epoch ms |
| `expiresAt` | 기존 DB 주문 `expiresAt` → epoch ms |
| `verificationReference` | 재조회용 `paymentId` (브라우저 승인 증빙 아님) |

상태 매핑: `PAID→paid`, `FAILED→failed`, `CANCELLED→canceled`. **`PARTIAL_CANCELLED`는 전액 완료로 취급하지 않고 활성화 거부**(내부 refunded로 덮어쓰지 않음). `READY`·`PAY_PENDING`·가상계좌 미발급 등 미확정은 확정 실패로 **저장하지 않고** `payment_pending`으로 분리.

---

### 3.5 `GET /api/guest-monitoring/orders/[orderId]` — 주문 상태 조회 (불변)

- **인증 필요 여부:** 필요(`requireSession`). 라우트·응답 **불변**.
- `done` 전환의 유일 근거. `{ status, applied, startedAt, paidUntil }`. `applied && status==="paid"`일 때만 완료.

### 3.6 변경 없는 기존 엔드포인트 (회귀 금지)

| 엔드포인트 | 상태 |
| --- | --- |
| `POST /identity/start`, `/identity/verify-otp`, `/identity/callback` | **불변** — 본인인증(SMS OTP/다날)은 결제와 무관 |
| `POST /parse-pdf`, `GET /properties`, `/properties/[id]/calendar`, `DELETE /session` | **불변** |

### 3.7 취소 REST (서비스 내부, 공개 UI 없음)

- `POST https://api.portone.io/payments/{paymentId}/cancel` (공식 계약). 테스트 상점·채널·주문·취소 가능 상태를 **서버에서 검증**한 뒤에만 호출, 결과 재조회.
- **기존 감시 복구(cron)에서 자동 실행하지 않는다.** 공개 취소 UI·자동 환불을 추가하지 않는다. `cancelPayment(reference)`는 `Promise<void>`.

---

## 4. 핵심 설계 디테일

### 4.1 paymentId ↔ transactionId 해소 (`getPayment` / 복구)

- **paymentId = 서버 `orderId`**(`ord_<uuid>`). **transactionId = PortOne 발급 거래번호**(형식 상이). **혼용 금지.**
- `portone.getPayment(reference)` 동작:
  1. `reference`로 주문을 `orderId===reference`로 조회 → 있으면 그 주문의 paymentId(=orderId)로 REST 조회.
  2. 없으면 `providerTransactionId===reference`로 주문 조회 → 있으면 그 주문 orderId(=paymentId)로 REST 조회.
  3. 어느 쪽도 없으면 `payment_failed`. **직접 paymentId 조회도 반드시 해당 서버 주문과 결합**한다.
- **cron 복구(`recovery.ts`)**: `status:"paid", appliedAt:null` 주문의 `providerTransactionId`로 `getPayment(txId)` → (2)경로로 orderId 해소 후 paymentId 재조회 → `recordPayment`(멱등) → `applyPaidOrder`. PortOne 결제 미존재 404는 초안 API 404와 **구분**하여 승인 여부를 재확인(일시 장애면 다음 cron 재시도).

### 4.2 콜백 Origin·세션·주문 결합 (브라우저 경로)

- 기존 외부 PG 콜백의 Origin 예외(`endpoint`의 `{callback:true}`)를 **PortOne 브라우저 POST에 무조건 적용하지 않는다.** 라우트에서 `validateOrigin(req)`를 재적용(403), OTP 완료 세션 필수(401), 주문 `guestIdentityHash === session.verifiedIdentityHash` 결합(불일치 404).
- 모바일 리다이렉트가 필요한 채널이면 복귀 URL·주문 참조로 기존 주문 문맥을 재발급받아 동일 콜백을 수행한다. **서명·nonce·개인정보를 URL에 넣지 않는다.** SDK와 리다이렉트 복구가 이중 주문을 만들지 않게 한다(동일 orderId·멱등키 유지).

### 4.3 PortOne REST 클라이언트 (`portone-rest.ts`)

- 호스트·인증 고정: `https://api.portone.io`, `Authorization: PortOne ${PORTONE_V2_API_SECRET}`. `cache: "no-store"`, `AbortController` timeout, 응답 JSON 스키마(zod) 검증.
- 오류 분류: `401/403`(인증)·`timeout`·`429`·`5xx`·JSON 파싱 실패·필수 필드 누락 → **`provider_unavailable`(503, 일시 장애)**. `404`(결제 미존재)는 승인 여부 재확인용으로 호출부에 구분 전달. **원문 응답·secret을 로그·오류에 남기지 않는다.**

### 4.4 nonce 원자 소비 (`recordPayment` 경계)

- `verifyPayment → getPayment → recordPayment` 공급자 재조회 방어를 유지. **nonce 소비는 검증 메서드 단독이 아니라 결제 기록 경계**에 연결한다.
- `recordPayment`는 기존 `locked(identity)` 트랜잭션 내에서, 유효 PAID일 때 아래를 **동일 트랜잭션 조건부 갱신**:

```
updateMany({ where: {
  id: order.id,
  providerReceipt: <현재 portone_v1 미소비 문자열>,   // 경합 방지 — 소비 전 값만
  status: { notIn: ["paid","needs_review","refunded","canceled"] },
  appliedAt: null,
}, data: {
  status: "paid",
  paidAt, providerTransactionId: result.transactionId,
  providerReceipt: <portone_v1 consumed:true 문자열>,  // nonce 소비 전이
}})
count === 1 이어야 성공. 아니면 동시 콜백이 이미 처리 → 멱등 재조회로 기존 결과 확인
```

- **일시 장애(REST/전송)에서는 `recordPayment`에 도달하지 못하므로 nonce 미소비** → 동일 문맥 재시도 가능.
- **소비 후 재전송**(응답 유실)은 `providerTransactionId` 일치·`appliedAt` 확인으로 기존 결과 **멱등 반환**, 재활성화 없음(기존 `activation.ts:18-21` 패턴 유지).
- 감시 적용(`applyPaidOrder`) 실패는 `paid` 상태를 유지하여 기존 cron 복구가 처리(불변).
- `recordPayment`의 `providerReceipt` 기록 분기: `mock→verificationReference`, `portone→consumed receipt`, `danal→null`(기존 흐름 보존).

---

## 5. 프론트 흐름 계약 (요약 — 구현 코드 아님)

### 5.1 `runPayment` 결제 실행 헬퍼 (`guest/guestPayment.ts`, 신규)

```ts
// 반환은 판별 유니온. UI/프로토콜 세부는 Claude 구현, 본 문서는 계약만 규정.
type PaymentOutcome =
  | { kind: "redirected" }                                        // 페이지 이탈(다날/모바일) — useEffect 복귀 재개
  | { kind: "confirm"; callback: GuestPaymentCallbackRequest }    // SDK 인라인 성공 → 콜백 POST 필요
  | { kind: "recover" }                                           // 실행정보 없음(mock) → 주문 상태 조회
  | { kind: "canceled" }                                          // 사용자 닫기/취소 → 재조회(새 결제 금지)
  | { kind: "error"; message: string };                           // SDK code/예외 → 재조회 먼저

async function runPayment(payment: Record<string, string>): Promise<PaymentOutcome>;
```

- `payment.provider === "portone"`을 **먼저 처리**: `@portone/browser-sdk/v2` 동적 import → `PortOne.requestPayment({ storeId, channelKey, paymentId, orderName:"등기감시 1개월", totalAmount:Number(payment.totalAmount), currency:"KRW", payMethod })`.
  - 금액은 `Number()` 변환 전 정수 검증(`/^\d+$/` && ===10000 기대). 통화 enum 표기가 다르면 의미상 KRW로 경계 변환.
  - SDK 반환 `paymentId`가 요청 ID와 일치 확인. `code==null`(성공) → `{kind:"confirm", callback:{paymentId, callbackContext, callbackSignature}}`. `code!=null`/예외 → `{kind:"error"}`. 사용자 닫기 → `{kind:"canceled"}`.
  - 모바일 리다이렉트 채널이면 `{kind:"redirected"}`.
- `payment.provider !== "portone"` (다날/mock): 기존 `launchProvider(payment)` 호출 → `true`면 `{kind:"redirected"}`, `false`(mock)면 `{kind:"recover"}`. **`launchProvider`·`guestProvider.ts`는 변경하지 않는다.**
- SDK 필드·서명을 `URL`·`localStorage`·`sessionStorage`에 저장 금지. 콜백 문맥은 **메모리**로만 전달.

### 5.2 `useGuestApply` 결제 단계 (§6 복구 요구사항과 통합)

```
verifyApplyOtp 200 → 현재 인증에 결합된 draftId 로만 startOrder(draftId)   (§6.2)
startOrder:
  createOrder 성공 → setOrderId → outcome = runPayment(res.data.payment)
    · redirected → 이탈(useEffect 복귀 시 recoverOrder)
    · confirm    → paymentCallback(outcome.callback)
                     · 성공 → recoverOrder(orderId)   (status 재조회로 done 판정)
                     · 실패(payment_pending/503/네트워크) → recoverOrder(orderId)  (새 결제 금지)
    · recover    → recoverOrder(orderId)              (mock)
    · canceled   → recoverOrder(orderId)              (승인 불명확 → 재조회, 새 결제 금지)
    · error      → setError + recoverOrder(orderId)
done 전환은 오직 recoverOrder가 classifyOrderState==="applied"일 때만.
```

- **SDK 반환·클라이언트 상태만으로 `done`/완료 화면을 표시하지 않는다.** 서버 주문 상태(`paid && applied`)가 유일 근거.
- 승인 여부가 불명확하면(취소/에러/일시장애) **먼저 재조회**. 클라이언트 취소 신호만으로 새 결제를 만들지 않는다.

---

## 6. 신청 흐름 복구 요구사항 (채널 확인과 독립, 선행 가능)

### 6.1 버그 ①: 401을 재인증으로 분리 (`useGuestApply`)

현재 `startOrder`/`recoverOrder`는 401을 `needsFreshPayment=true`로 설정하고, `retry`가 이를 새 결제로 보고 `startOrder`를 다시 호출 → 만료 세션으로 401 반복(무한루프).

- **401은 결제 실패가 아니라 `reauth_required`로 분류**한다. `needsFreshPayment`를 설정하지 않고 `busy`·OTP 대기·`pendingIdentity`를 정리한다.
- 유효 `draft`가 있으면 **`ready`로 복귀하고 이름·전화를 복원**(`restoreName`/`restorePhone`). 사용자가 **SMS OTP 재인증을 완료하기 전에는 `startOrder`를 호출하지 않는다.**
- 이전 `orderId`·멱등키는 중복 결제 방지를 위해 **유지**. 재인증 후 기존 주문이 있으면 상태부터 확인, 없으면 기존 멱등키로 생성.
- 페이지 전체 새로고침 등으로 `draft`·이름·전화 메모리가 없으면 **빈 잠금 `ready`를 만들지 않고** `input`(PDF 재등록/재분석)으로 안내. `draftId` 보관만으로 PII 복원 가능하다고 가정하지 않는다.
- 이전 비동기 응답이 `reset`·초안 교체·재인증 이후 상태를 덮어쓰지 않도록 **요청 세대(generation)** 확인.

### 6.2 버그 ②: OTP 성공 후 입력 보존 (`useGuestApply.verifyApplyOtp`)

현재 `verifyApplyOtp` 성공 직후 `otpNameRef`/`otpPhoneRef`를 비운다(`useGuestApply.ts:246-248`). 이후 `startOrder` 전송 실패로 폼이 재마운트되면 `restoreName`/`restorePhone`이 빈 값 → 잠긴 빈 입력(막다름).

- **`verifyApplyOtp` 성공 시 `otpNameRef`·`otpPhoneRef`를 비우지 않는다.** `cancelApplyOtp`와 동일 보존 정책. OTP 코드·대기 상태(`otp.resetOtp()`)와 `otpDraftIdRef`만 정리하되, 주문 생성에 쓸 `draftId`는 **정리 전에 확보**한다.
- 이름·전화는 **훅 메모리**(`restoreName`/`restorePhone`)로만 폼 초기값에 전달. `localStorage`/`sessionStorage`/`URL` 저장 금지.
- 이름·전화 참조는 **명시적 `reset`·초안 교체·흐름 종료**에서만 정리. `ready`/`failed` 복귀만으로는 지우지 않는다.
- 동일 인증 세션이 유효하면 재시도 버튼으로 주문을 이어가며 **불필요한 SMS 재발송을 요구하지 않는다.**

### 6.3 실패 분기 및 멱등키 정책

`needsFreshPayment` 하나로 모든 실패를 표현하지 않는다. 아래로 분류하고 `retry`가 해당 동작만 수행한다. (훅이 470줄 초과 시 이 분류를 `applyFailure.ts` 순수 함수로 분리.)

| 신호/상태 | 화면 및 다음 동작 | 키/주문 정책 |
| --- | --- | --- |
| 주문 생성·조회·콜백의 **401** | 유효 초안이면 `ready` → SMS 재인증 | 유지. **재인증 전 `startOrder` 금지** |
| 초안/주문 복구 API **404** | `input` → PDF 재파싱 | 해당 초안·주문 재개 참조 폐기 |
| **`draft_expired`** 코드 | HTTP와 무관하게 `input` → 재파싱 | 만료 초안 폐기. 서버 기본 400이므로 404만 검사하지 않음 |
| 주문 전송 네트워크(status=0)·429·503 | 입력 보존, 제한 안내 후 재시도 | **같은 초안·동일 멱등키** 유지 |
| 콜백 전송/REST 조회 일시 장애·`payment_pending` | 같은 콜백 재시도 또는 같은 주문 조회 | 기존 paymentId·문맥·멱등키 유지 |
| 서버 기준 **failed/canceled/refunded 확정**, 비401 결제 실패 | 유효 초안에서 새 결제 | 해당 주문 제거(`clearOrder`) 후 새 멱등키. 초안 만료면 재파싱 |
| pending / paid 미적용 / needs_review | 기존 주문 상태 확인·적용 대기 안내 | 유지. **새 결제 금지** |
| 상점·금액·서명 불일치, 403 보안 거부 | 결제 중단·일반화 오류 안내 | **자동 재결제 금지** |
| 중복 활성 **409** 등 업무 충돌 | 현황 조회 등 기존 안내 | 무조건 새 키로 재시도하지 않음 |

- **'비401 결제 실패'는 결제가 실패로 확정된 경우만.** 비401이라는 이유로 429·503·전송 실패·미확정(`payment_pending`)을 새 결제로 분류하지 않는다.
- PortOne REST 내부의 **결제 미존재 404는 초안 API 404와 구분**하여 승인 여부를 재확인한다.

---

## 7. 구현 순서 (백엔드 → UI)

> 각 단계 후 `npm run lint` → 관련 테스트 → `npm run build`. 500줄 체크. 한 번에 한 파일.
> **복구 버그(§6)는 채널 확인과 독립**이므로 P0로 병행 가능. 결제 통합 완료 판정은 다날 V2 테스트 채널 실동작 확인까지 필요.

### P0 선행 — 콘솔·공식 지원 확인 (§0.1). 미확인 시 제약 보고.

### Phase B — 백엔드 (Codex) : 먼저

1. **B1. `types.ts` (변경)** — `mode:"portone"`, `cancelPayment:Promise<void>`, `createPayment` 입력 확장. (mock·다날 호환 회귀 확인)
2. **B2. `portone-config.ts` (신규)** — `resolvePaymentMode`, env getter, signingKey 파생. 단위 테스트(미설정·충돌·오입력·키누락 → 503, portone/mock만 선택).
3. **B3. `portone-callback.ts` (신규)** — `signCallbackContext`·`verifyCallbackContext`·receipt 생성/파싱/소비표시(§2.2·§2.3).
4. **B4. `portone-rest.ts` (신규)** — `getPaymentById`·`cancelPaymentById`(Authorization·URL인코딩·timeout·스키마·오류분류). 네트워크 mock 테스트.
5. **B5. `portone.ts` (신규)** — `portoneProvider` create/verify/get/cancel + `PaymentResult` 매핑(§3.4) + identity 차단. 미확정→`payment_pending`.
6. **B6. `index.ts` (변경)** — `getDanalProvider()` portone 선택 추가, **mock 격리 가드 보존**.
7. **B7. `order.ts` (변경)** — `createPayment(order)`에 주문 row 전달, 재사용 주문 nonce 보존. 다날/mock 분기 바이트 동일 회귀.
8. **B8. `activation.ts` (변경)** — portone receipt 기록·nonce 원자 소비(§4.4), 미확정/일시장애 분리, `payment_pending` 코드. `errors.ts` 메시지 추가.
9. **B9. `recovery.ts` (변경)** — portone `getPayment(txId)` orderId 해소.
10. **B10. `payment/callback/route.ts` (변경)** — portone 브라우저 경로 Origin·세션·주문 결합(§4.2).
11. **B11. `package.json`+lockfile (변경, 별도)** — `@portone/browser-sdk` 설치.
12. **B12. `scripts/audit-api-auth.mjs`** — payment/callback ALLOWLIST 사유 갱신. `npm run audit:api` 통과.
13. **B13. 테스트** — §8 전 항목. `npx vitest run --config lib/guest-monitoring/vitest.config.ts` + `npm run audit:api`.

> **핵심 우회 테스트(필수):** `resolvePaymentMode` 각 분기(충돌/미설정/오입력/portone/mock), REST 네트워크 전부 mock, nonce 경합·동시 콜백 1회 소비, paymentId↔txId 혼용 없음, mock/다날 회귀 무변경.

### Phase F — 프론트 (Claude) : 백엔드 계약 고정 후

14. **F1. `guestApi.ts`** — `paymentCallback({paymentId, callbackContext, callbackSignature})` (postJson, same-origin, no-store). 실패는 비-2xx 반환.
15. **F2. `guestPayment.ts` (신규)** — `runPayment(payment)` 판별 유니온(§5.1). `@portone/browser-sdk/v2` 동적 import.
16. **F3. `useGuestApply.ts` (변경)** — 401 분리(§6.1)·입력 보존(§6.2)·실패 분기(§6.3)·`runPayment` 결합(§5.2)·요청 세대. 470줄 초과 시 F3b 분리.
17. **F3b. `applyFailure.ts` (조건부 신규)** — 실패→동작 분류 순수 함수.
18. **F4. 클라이언트 흐름 테스트(§8)** — 401 재인증 반복, 전송 실패 입력 보존, 확정 실패 새키, pending 재조회, SDK code/취소/닫기/모바일, 초기화·경합.

---

## 8. 테스트 · 인수 기준 (후속 구현 단계)

| 구분 | 필수 시나리오 | 기대 결과 |
| --- | --- | --- |
| 공급자 선택 | 두 env 각 portone·mock, 미설정·충돌·오입력·키 누락 | 명시 설정만 연동, 잘못된 설정 503, mock 격리 가드 보존 |
| 금액·통화 | 10000/KRW, 9999·10001·소수·누락·다른 통화 | 정상만 승인, 불일치 활성화 0회 |
| 위변조 | 다른 storeId·paymentId·channelKey·transactionId, 잘못된 HMAC·nonce·만료 문맥 | 거부, 다른 주문 변경 없음 |
| 상태 매핑 | PAID·FAILED·CANCELLED·PARTIAL_CANCELLED·READY·PAY_PENDING·가상계좌 | PAID만 활성화, 미확정은 `payment_pending`(확정 실패 아님) |
| 시간·응답 | 유효 paidAt, 잘못된/미래/주문범위 밖, 필수 필드 누락 | 엄격 검증, 승인 시각 임의 생성 없음 |
| REST | Authorization 형식, URL 인코딩, timeout·401/403·404·429·5xx | 고정 호스트, 오류 분류(503 vs 404), 원문/secret 로그 없음 |
| 재조회·복구 | 콜백 성공 후 적용 실패, cron txId 조회, 응답 유실 | 동일 주문 재조회·적용 1회, paymentId↔txId 혼용 없음 |
| nonce 소비 | 중복/동시 콜백, 동일 키 주문 재시도, 조회 장애 후 재시도 | 소비·기록 원자성 1회, 장애 시 미소비 재시도 가능 |
| 취소 | 테스트 거래 취소·다른 상점·실채널·반복 취소 | 검증된 테스트 건만, 자동 환불 없음, cron 미자동실행 |
| SDK | 요청 필드·금액·채널·반환 ID, code/예외/취소/닫기·모바일 복귀 | 서버 확정 전 `done` 없음, 불명확 시 기존 주문 재조회 |
| 콜백 보안 | Origin 누락·교차, 세션 없음, 타 신원 주문(IDOR) | 403·401·404, DB 소비 전 차단 |
| 401 재인증 | createOrder·getOrderState·콜백 각 401 후 retry 반복 | `ready`·입력 복원, **재인증 전 주문 생성 0회**, 기존 키 유지 |
| 전송 실패 입력 보존 | OTP 성공 직후 주문 network/429/503, 폼 재마운트 | 이름·전화 비어 있지 않음, 동일 키 재시도, 잠긴 빈 입력 없음 |
| 초안 만료 | 404, 실제 `draft_expired` 400 | `input`·재파싱, 기존 초안 결제 재개 없음 |
| 결제 확정 실패 | failed/canceled/refunded 후 재시도 | 유효 초안 유지, 새 멱등키, 기존 pending 재결제 없음 |
| 초기화·경합 | reset·새 초안·지연 응답·이중 클릭 | 옛 응답 무시, 입력 참조 정리, 주문 중복 없음 |
| 회귀·보안 | SMS OTP 시작·성공·취소, 기존 launchProvider, mock 격리 | 인증 공급자 변화 없음, 기존 동작 유지 |
| 개인정보 | 로그·응답·브라우저 저장소 검사 | 이름·전화·OTP·카드/결제 원문·토큰·서명·secret 금지 위치 노출 0 |

**테스트 배치**
- 어댑터·콜백·nonce·REST·매핑 테스트 → `lib/guest-monitoring/tests/portone.test.ts` (네트워크 mock, fixture는 **가짜 식별자만**).
- `useGuestApply` 흐름은 실제 훅 실행·폼 재마운트로 검증. 문자열 소스 검색만으로 401 호출 횟수·입력 복원을 검증했다고 간주하지 않는다(현재 node 환경 → DOM/React 테스트 설정은 후속 최소 추가).
- DB 통합(nonce 경합·기록 원자성)은 기존 `GUEST_TEST_DATABASE_URL` 격리 가드 유지, 없으면 **미실행 보고**.
- 검증 명령: `npx vitest run --config lib/guest-monitoring/vitest.config.ts`, `npm run audit:api`, `npm run lint`, `npm test`, `npm run build`.
- 실제 SDK/REST 확인은 **무출금 다날 테스트 채널로만**. 운영 DB·실카드 청구로 검증하지 않는다.

**완료 조건:** P0 충족 + 두 복구 버그 재현 테스트 통과 + 서버 위변조 거부 + nonce 1회 소비 + SDK/REST 실제 테스트 연동 성공 + SMS OTP 불변 + 파일당 500줄 이하 + 운영 DB 미접촉. **채널 미지원/미확인 시 코드 통과만으로 '실동작 완료' 보고 금지.**

---

## 9. API 보안 코드 리뷰 체크리스트 (CLAUDE.md 필수)

- **인증 없는 변이 핸들러:** `payment/callback`은 공개 콜백이나, PortOne 브라우저 경로에 `validateOrigin`(403) + `requireSession`(401) + 주문-세션 신원 결합(404) + nonce 조건부 1회 소비를 추가. **ALLOWLIST 사유 갱신(B12)** 없이는 `audit:api` 실패.
- **dead code endpoint:** `payment/callback`은 `guestApi.paymentCallback` → `runPayment("confirm")` → `useGuestApply.startOrder`에서 실제 호출. 미사용 아님.
- 변경 파일 외 `app/api/` 전체에 신규 미인증 변이 없음(기존 콜백 2건 외 추가 없음). `orders`·`orders/[orderId]`는 `requireSession` 유지.

---

## 10. 절대규칙 준수 체크리스트

| # | 규칙 | 설계 반영 |
| --- | --- | --- |
| 1 | **페이지 500줄 제한** | 서버 어댑터 4파일 분리(각 ≤150줄), 결제 실행 `guestPayment.ts` 분리, `useGuestApply` 470줄 초과 시 `applyFailure.ts` 분리. 페이지는 조합만. 작성 직후 400줄 초과 시 보고·분리 |
| 2 | **단일 책임** | config/서명/REST/어댑터 서버 4분할, 클라 UI·흐름·HTTP·결제실행 분리. 결제 프로토콜 페이지 금지 |
| 3 | **서버 검증·보안** | 금액·통화·상점·주문·채널·시간 서버 REST 재조회 대조, HMAC+nonce 1회 소비, Origin·세션·IDOR, timingSafeEqual, 코드·PII·secret·원문 로그·응답·저장소 금지 |
| 4 | **성능** | REST no-store·timeout·단건 조회, 기존 DB rate limiter 재사용, nonce 경량, N+1 없음, 중복 호출 없음(멱등키·문맥 재사용) |
| 5 | **폴더 구조** | 공급자=`lib/danal`, 서비스=`lib/guest-monitoring`, 라우트=`app/api/...`, 타입=`types/`, 클라=route 아래 `guest`/`hooks`/`components` |
| 0-1 | 로컬≠운영 검증 | 결제·env·외부연동 → t-vestra 무출금 실환경 검증 전 "완료" 선언 금지. 채널 미확인 시 제약 보고 |
| 0-2 | '확인됨' 재검증 | storeId/channel/secret env를 이름만으로 신뢰하지 않음. 테스트 채널·REST 테스트 필드 실검증 |
| 0-3 | 땜빵 금지 | 단일 공급자 resolver, 조용한 fallback 금지(충돌 503), V1·타 PG 임의 대체 금지, `test:true` 금지 |
| 0-5 규모 | 상한·캐시 | 복구 `take:50`·cron 재시도, REST 재조회 경량, rate limiter 유지 |
| 0-5 수명주기 | 생성뿐 아니라 소비·취소 | nonce 소비 상태 전이, 재사용 시 문맥 보존, 취소 REST(자동 환불 없음) |
| 0-5 비정상 | 재사용·동시·IDOR·입력위조·모바일복귀 | 조건부 1회 소비, Origin·세션·신원 결합, 브라우저 금액/상태 불신, 이중 주문 방지 |
| 0-5 적대적 | 자기 코드 적대 검토 | 구현 후 §8 위변조·보안·우회 테스트 + 병렬 코드리뷰 권장(보안·결제·회귀 피해 큼) |

---

## 11. 미확정 · 후속(P1)

- **다날 V2 결제 채널 지원·테스트 payMethod·통화 enum·테스트 식별 필드**: P0 선행 확인 항목(§0.1). 미확인 시 어댑터/복구 설계 범위로 진행하고 제약 보고.
- **SDK 버전·`@portone/browser-sdk/v2` 타입**: 설치 시점에 확정. 금액·통화는 경계 변환.
- **웹훅 수신**: 이번 필수 범위 아님. 브라우저 HMAC 문맥을 웹훅 서명과 혼용 금지.
- **README·env 예시·오류 안내 개선**(P1): 테스트 채널 구분, 설정 누락·재인증/대기 안내.
- **연장(renewal) 결제 UI**: 공용 orders/provider 사용으로 응답 호환만 확인. 신규 연장 UI는 범위 밖.
- **DB 구조 변경·마이그레이션·신규 컬럼은 계획하지 않는다.** `lib/danal`의 mock·identity 동작은 불변.
