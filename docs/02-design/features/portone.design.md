# 비회원 등기감시 PortOne V1(다날 카드) 테스트 결제 설계서 (공용 계약서)

> 프로젝트: VESTRA
> 작성일: 2026-10-15
> 상태: Design — 백엔드(Codex)·프론트엔드(Claude) **공용 계약**. 구현·DB 변경·패키지 설치·배포 미수행
> 상위 문서: [`docs/01-plan/features/portone.plan.md`](../../01-plan/features/portone.plan.md)
> 기준 코드: `lib/danal/*`, `lib/guest-monitoring/*`, `app/api/guest-monitoring/payment/*`, `app/(personal-home)/renewal/monitoring/*`
> 관련 설계: [`sms.design.md`](./sms.design.md) (본인인증 SMS OTP — 이 문서의 상류. 본 설계는 그 뒤의 **결제** 단계)
> 대체 관계: 이 문서는 과거 **PortOne V2 다날** 설계서를 대체한다. 기획서 §0~§7과 일치하도록 전면 갱신했다.

---

## 0. 이 문서의 사용 규칙

- 이 문서는 **계약서**다. 경로·메서드·요청/응답 DTO·타입·함수 시그니처·상수·상태 매핑은 **스펙 고정**이며, 백엔드와 프론트엔드가 동일하게 구현한다.
- 양측(클라이언트↔서버)의 접점은 아래 3가지뿐이다. 이 경계를 넘는 가정(클라이언트가 결제 승인 여부를 판정, 서버가 브라우저 전달 금액·success·시각을 신뢰)은 **금지**다.
  1. `POST /api/guest-monitoring/orders` 응답의 `payment` 객체 (V1 SDK 실행 정보 + 서명된 콜백 문맥)
  2. `POST /api/guest-monitoring/payment/callback` 요청/응답 (브라우저가 `{paymentId, imp_uid, 서명 문맥}` POST)
  3. `GET /api/guest-monitoring/orders/[orderId]` 응답의 주문 상태 (`done` 판정의 유일 근거)
- 스펙에 어긋나는 구현을 발견하면 **구현을 바꾸지 말고 이 문서를 먼저 고친 뒤** 양측에 반영한다.
- **본인인증(SMS OTP)은 불변이다.** V1 결제 어댑터는 `identity` 메서드를 **지원 불가(503)로 차단**한다. OTP 모드는 결제 외 경로에서 `getDanalProvider()`를 호출하지 않는다(`session.ts:21` 선분기 유지).
- **실결제·실제 금전 출금은 허용하지 않는다.** 이번 범위는 **무출금 테스트 연동**이다. `test:true` 같은 임의 필드·환경변수 한 개로 무출금을 보장했다고 간주하지 않는다. 검토된 V1 테스트 채널 증빙(§0.1 P0 선행)이 SDK 실행 전 필수 조건이다.
- DB 신규 컬럼·마이그레이션을 **추가하지 않는다.** 기존 `GuestMonitoringOrder`의 nullable 문자열 컬럼만 재사용한다.

### 0.1 P0 선행 — V1 테스트 채널 증빙·응답 필드 확정 (코드보다 먼저)

구현 착수 전, PortOne 콘솔·공식 문서에서 아래를 **확인하고 결과를 보고**한다. 미확인 시 제약으로 보고하고, 다른 PG·mock·V2 경로로 **임의 대체하지 않는다.** (기획서 §7)

- `NEXT_PUBLIC_PORTONE_V1_IMP_CODE`(기준값 `imp88200033`)·`DANAL_MID`(기준값 `9810030929`)가 실제로 연결된 V1 계정·가맹점이며 **무출금 카드 테스트 설정**이라는 증빙. 숫자만 일치한다고 테스트로 승인하지 않는다.
- V1 결제조회 응답의 **MID 필드 이름·제공 여부**, `currency` 표기, 취소 관련 필드(`cancel_amount`·`cancelled_at` 등)를 공식 스키마와 민감정보 제거한 테스트 응답으로 확정. **V2 필드(`amount.total`·`channel.type`·`isForTest`)를 재사용하지 않는다.**
- `pg="danal_tpay.{MID}"`(pg.MID 방식)이 지정 CDN(`cdn.iamport.kr/v1/iamport.js`)과 실제 호환되는지 테스트 채널에서 검증. 공식 문서가 `pg`를 deprecated로 표기하더라도 이번 요구는 pg.MID로 고정하며, 미지원이면 임의 채널로 우회하지 않고 **구현 제약으로 기록**한다. [공식 V1 다날 파라미터](https://developers.portone.io/opi/ko/integration/pg/v1/danal)
- `DANAL_CARD_ENC_KEY`가 PortOne 콘솔의 다날 채널 등록/앱 환경 중 **어느 단계에 쓰이는지** 확정하고 서버에만 보관(REST 요청 임의 필드·브라우저 전달 금지).
- 기존 V2 `providerMode="portone"` pending/paid 주문 존재 여부를 **읽기 전용**으로 확인하고 §4.9 혼용 차단·기록 보존 정책을 적용.

증빙 전에는 안전게이트가 열리지 않아 SDK 실행 정보 발급·REST 호출이 **503으로 차단**된다. 코드·테스트가 통과해도 **"V1 다날 테스트 결제 실동작 완료"로 보고하지 않는다.** fixture 기반 개발·검증은 가능하되 실제 연동 완료로 보고하지 않는다.

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 책임 (절대규칙 §단일책임·§폴더구조)

```
[클라이언트: app/(personal-home)/renewal/monitoring]
  components/guest/*       UI (표시·입력)                ← JSX·버튼 상태 (결제 프로토콜 금지)
  hooks/useGuestApply      신청 입력·OTP·복귀 effect       ← phase 전이·세대관리 (부모)
  hooks/useGuestOrderFlow  주문→결제→콜백→상태 확정         ← 신청 결제 상태머신
  hooks/useGuestStatus     현황 조회·연장 결제             ← status 세션·연장 상태머신
  guest/guestPayment       결제 실행 헬퍼 (변경: V1 SDK)    ← provider 분기·request_pay·콜백 결과
  guest/portoneV1Loader    V1 CDN script 로더 (신규)       ← script 수명주기·IMP 공유·재시도 초기화
  guest/guestProvider      launchProvider(기존 불변)       ← 다날 리다이렉트/form (V1 불관여)
  guest/guestApi           HTTP 클라이언트 (변경: imp_uid)  ← fetch·same-origin·no-store·결과 래핑
  guest/applyFailure       실패 분류 순수 함수 (기존 유지)
        │ (HTTP, HttpOnly 세션/브라우저 쿠키)
        ▼
[서버: app/api/guest-monitoring]
  orders/route.ts            주문 생성 (불변, provider 선택만 V1)
  orders/[orderId]/route.ts  주문 상태 조회 (불변)
  payment/callback/route.ts  결제 콜백 (변경: status 세션 허용·imp_uid DTO)
        │
        ▼
[서버 서비스: lib/guest-monitoring]
  order.ts                   주문 생성·결제문맥 발급 (불변 — provider.mode만 V1)
  payment-callback.ts        콜백 위임·소유권·두 번째 조회 (변경: status 허용·imp_uid)
  activation.ts              recordPayment re-export·applyPaidOrder (불변)
  record-payment.ts          PAID 원자 기록·nonce 소비 (변경: portone_v1 분기)
  record-terminal-payment.ts 미승인 종료 기록 (변경: portone_v1 분기)
  recovery.ts                cron 복구 (변경: imp_uid 기반)
        │
        ▼
[공급자 어댑터: lib/danal]
  index.ts                   getDanalProvider() — mock|portone_v1 선택 (변경)
  types.ts                   PaymentAdapter/DanalProvider (변경: mode=portone_v1)
  portone-v1.ts              V1 PaymentAdapter (어댑터, 서버 전용)
  iamport-rest.ts            V1 토큰·REST GET/POST (신규, 서버 전용)
  portone-v1-payment.ts      V1 응답 검증·PaymentResult 매핑 (서버 전용)
  portone-v1-config.ts       env 해석·V1 안전게이트 (서버 전용)
  portone-v1-test-channels.ts V1 테스트 채널 증빙 (서버 전용)
  portone-callback.ts        HMAC 서명·nonce receipt (공급자 버전 무관, imp_uid 스키마 추가)
  mock.ts                    격리 mock (기존 불변)
        │
        ▼
[외부] api.iamport.kr (REST V1) · cdn.iamport.kr/v1/iamport.js (브라우저 IMP)
```

- **페이지(`page.tsx`)는 조합·진입만.** 결제 프로토콜을 페이지에 두지 않는다.
- **SDK UI 실행(클라이언트)과 결제 결과 검증(서버 V1 재조회)을 분리한다.** 브라우저가 전달한 금액·`success`·시각·서명되지 않은 주문번호는 신뢰하지 않는다.
- **서명은 서버만 만든다.** 브라우저는 서버가 발급한 서명 문맥을 보관·echo만 한다. `imp_uid`는 PG가 결제 시점에 발급하므로 **미신뢰 입력**으로 받아 REST로 검증한다.
- **V2 → V1 매핑 원칙**: 기존 V2 모듈(`portone.ts`/`portone-rest.ts`/`portone-config.ts`/`portone-payment.ts`/`portone-test-channels.ts`)을 아래 §1.2의 V1 모듈로 교체한다. `api.portone.io`·`PortOne ` 인증 접두사·`paymentId=orderId` 조회·대문자 상태·ISO `paidAt`·`amount.total`·`channel.type`/`isForTest`는 **전부 제거**한다.

### 1.2 신규/변경 파일 목록과 파일 분리 계획 (500줄 제한 — 절대규칙 §1)

> 서버 어댑터는 책임별로 나눠 각 파일 150줄 이하 유지. 프론트는 `useGuestStatus.ts`가 현재 476줄이므로 V1 로더·오류 분류·복구 추가 전에 **헬퍼를 분리**하고 훅에 로직을 직접 누적하지 않는다(기획서 §2 끝단).

#### 서버 (Codex)

| 파일 | 구분 | 책임 | 예상 규모 |
| --- | --- | --- | --- |
| `lib/danal/portone-v1-config.ts` | 교체(`portone-config.ts`) | `resolvePaymentMode()`(portone_v1), `paymentSigningKey()`, `getPortoneV1Config()`(impCode/restKey/restSecret/MID getter + 안전게이트). 누락·불일치 시 503 | ~70줄 |
| `lib/danal/portone-v1-test-channels.ts` | 교체(`portone-test-channels.ts`) | `verifiedV1TestChannels`(impCode+pgProvider+MID+payMethod+증빙 조합). 증빙 없으면 빈 목록 → 게이트 닫힘 | ~25줄 |
| `lib/danal/portone-callback.ts` | 변경 | `signCallbackContext`·`verifyCallbackContext`·nonce receipt. **콜백 요청 스키마에 `imp_uid` 추가**. receipt 접두사 `portone_v1:`은 **문맥 포맷 버전**이며 공급자 버전 증거로 쓰지 않음 | 49 → ~62줄 |
| `lib/danal/iamport-rest.ts` | 신규(`portone-rest.ts` 대체) | V1 토큰 발급·메모리 캐시·single-flight·401 재발급, `getPaymentByImpUid`·`findImpUidByMerchantUid`·`cancelPaymentByImpUid`. 봉투(`code`/`message`/`response`) 파싱·timeout·오류 분류 | ~140줄 |
| `lib/danal/portone-v1-payment.ts` | 교체(`portone-payment.ts`) | `findPaymentOrder`(orderId/imp_uid), `mapPayment`(§3.4 대조·매핑), `PortoneTerminalPayment` | ~90줄 |
| `lib/danal/portone-v1.ts` | 교체(`portone.ts`) | `portoneV1Provider: DanalProvider` — create/verify/get/cancel, `merchantId=검증된 MID`, identity 차단 | ~120줄 |
| `lib/danal/index.ts` | 변경 | `getDanalProvider()` portone_v1 선택(mock 격리 가드 유지) | 23 → ~28줄 |
| `lib/danal/types.ts` | 변경 | `DanalProvider.mode`에 `"portone_v1"`(V2 `"portone"` 제거) | 31 → ~33줄 |
| `lib/guest-monitoring/payment-callback.ts` | 변경 | 세션 purpose `["apply","status","renewal"]`, imp_uid 전달, 두 번째 조회를 **imp_uid**로 | 49 → ~65줄 |
| `lib/guest-monitoring/record-payment.ts` | 변경 | `provider.mode === "portone_v1"` 분기로 전환(V2 전용 보호 누락 금지) | 78 → ~80줄 |
| `lib/guest-monitoring/record-terminal-payment.ts` | 변경 | `providerMode === "portone_v1"` 분기 | 23 → ~24줄 |
| `lib/guest-monitoring/recovery.ts` | 변경 | `getPayment(imp_uid)` 기반 복구, imp_uid 유실 시 §4.6 경로 | 18 → ~30줄 |
| `app/api/guest-monitoring/payment/callback/route.ts` | 변경 | `requireSession(req, ["apply","status","renewal"])`, portone_v1 분기 | 28 → ~30줄 |
| `scripts/audit-api-auth.mjs` | 변경 | payment/callback ALLOWLIST 사유 갱신(status 세션 포함) | 설명만 |
| `package.json` + lockfile | 변경(별도) | `@portone/browser-sdk` 사용처 확인 후 제거 또는 다날 비활성 명시(§6.2) | — |
| `lib/guest-monitoring/tests/portone*.test.ts` | 변경 | V1 fixture·보안·P1 회귀로 전환 | 테스트 |

> **파일명 결정**: 위 "교체"는 기존 V2 파일을 **삭제하고 V1 이름으로 신설**하거나 동일 파일을 V1으로 전면 재작성하는 것 중 구현자가 택한다. 단 import 경로·export 이름은 **본 표의 V1 이름으로 고정**한다. 공통 서명 모듈(`portone-callback.ts`)만 이름을 유지한다.

#### 프론트 (Claude)

| 파일 | 구분 | 책임 | 예상 규모 |
| --- | --- | --- | --- |
| `.../guest/portoneV1Loader.ts` | 신규 | `cdn.iamport.kr/v1/iamport.js` 동적 script 로드. `window.IMP` 확인·성공 로드 공유·중복 방지. **실패 시 script·핸들러·타이머 정리 + 캐시된 rejected Promise 초기화**(§4.7) | ~90줄 |
| `.../guest/guestPayment.ts` | 변경 | `runPayment`의 `provider` 분기를 V1(`IMP.init`→`IMP.request_pay`)로 교체. `@portone/browser-sdk/v2` import 제거. `resendOrderCallback` 유지 | 241 → ≤290줄 |
| `.../guest/guestApi.ts` | 변경 | `GuestPaymentCallbackRequest`에 `imp_uid` 추가 | 193 → ~195줄 |
| `types/guest-monitoring.ts` | 변경 없음 권장 | `payment: Record<string,string>` 유지(§2.4) | — |
| `.../hooks/useGuestOrderFlow.ts` | 변경 | 콜백 호출 시 `imp_uid` 전달(§5.2). 실패 분류·재시도 로직 유지 | 268 → ~275줄 |
| `.../hooks/useGuestStatus.ts` | 변경 | 연장 콜백에 `imp_uid` 전달·영구 거부 보존(§4.8). 476줄 → **분리 선행** | 476 → 분리 후 ≤470줄 |
| `.../guest/guestProvider.ts`, `.../guest/applyFailure.ts` | 변경 없음 | `launchProvider`·`classifyApiFailure`·`applyResume` 불변 | — |

> **분리 트리거(절대규칙 §1·강제 트리거)**: 작성 직후 400줄 초과 감지 시 즉시 "현재 [파일명] [N]줄입니다. 분리가 필요합니다" 보고 후 분리. `useGuestStatus.ts`는 이미 476줄이므로 **연장 복귀/확정 로직을 `guest/renewResume.ts` 등 헬퍼로 분리**한 뒤 V1 변경을 올린다. 결제 프로토콜(SDK 필드·서명·imp_uid 처리)은 페이지·컴포넌트에 넣지 않는다.

---

## 2. 데이터 모델

### 2.1 DB 스키마 — **변경 없음**

Prisma `schema.prisma`, SQL, 마이그레이션을 **수정하지 않는다.** `GuestMonitoringOrder`의 기존 컬럼만 재사용한다. 기존 unique 제약·identity lock 유지.

| 컬럼 | 기존 용도 | PortOne V1에서의 용도 |
| --- | --- | --- |
| `orderId` (unique) | 서버 생성 주문번호(`ord_<uuid>`) | **V1 `merchant_uid`로 그대로 사용**(브라우저 전달 merchant_uid는 이 값과 대조만) |
| `amount` / `currency` | 서버 가격 스냅샷(10000/KRW) | 동일. V1 응답값과 대조하는 기준 |
| `productVersion` | SSOT 가격 버전(`2026-10-15`) | 동일 (`GUEST_SINGLE_MONITORING.priceVersion`) |
| `status` | pending\|paid\|needs_review\|failed\|canceled\|refunded | 동일. V1 상태를 이 enum으로 매핑(§3.4) |
| `providerMode` | `mock` \| `danal` \| (레거시 `portone`) | **`portone_v1` 사용**. 레거시 `portone`(V2) 주문은 **재해석·덮어쓰기 금지**(§4.9) |
| `providerTransactionId` (unique) | 승인 후 거래 ID | **V1 `imp_uid`**. `merchant_uid`(=orderId)와 **구분**. 혼용 금지 |
| `providerReceipt` (Text, nullable) | mock 서명 증빙 | **V1 결제 nonce 상태 머신**(§2.2). `portone_v1:` 접두사(**포맷 버전**)로 mock과 구분 |
| `expiresAt` | 결제 대기 TTL(`ORDER_TTL` 20분) | 동일. SDK/콜백 만료 판단 기준 |
| `paidAt` / `appliedAt` / `appliedPeriodStart/End` | 승인·적용 시각 | 동일 의미 |

### 2.2 `providerReceipt` nonce 상태 머신 (기존 포맷 유지)

`providerReceipt`는 `portone_v1:` 접두사 + base64url(JSON)로 nonce·소비여부를 저장한다. **점(`.`) 미포함**으로 mock receipt(`<payload>.<sig>`)와 파서가 구분된다. 이 접두사는 **문맥 포맷 버전**이며 공급자(V1/V2) 버전의 증거가 아니다(기획서 §39).

```ts
{ "v": 1,
  "nonce": "<base64url 32B 난수>",   // 서버 발급, 문맥 서명에 포함. PII·원문 결제정보 아님
  "consumed": false }                // 결제 기록 경계에서 true로 1회 전이 (§4.4)
```

| 단계 | receipt 상태 | 기타 |
| --- | --- | --- |
| 주문 생성(createPayment) | `portone_v1:{nonce, consumed:false}` | 동일 주문 재사용 시 **같은 nonce 유지**(CAS). 다른 탭·동시 재개 콜백 무효화 금지 |
| PAID 확정·결제 기록 | `portone_v1:{nonce, consumed:true}` | `recordPayment` 트랜잭션 내 nonce 소비와 paid 기록을 **동일 트랜잭션 조건부 갱신**(§4.4) |
| 일시 장애(REST timeout/5xx/전송 실패) | 변경 없음(consumed:false) | 동일 문맥·같은 멱등키 재시도 가능 |
| 소비 후 재전송(멱등) | `consumed:true` 유지 | 기존 결과 멱등 반환, 재활성화 없음 |

### 2.3 서명된 콜백 문맥 산출 규약 (서버 전용, 명문화)

주문 생성/재개 시 서버가 아래 문맥을 HMAC 서명하여 브라우저에 발급한다. 브라우저는 두 문자열을 echo만 한다. **`imp_uid`는 서명 문맥에 포함하지 않는다**(결제 시점에 PG가 발급 → 생성/서명 시점에 알 수 없음). imp_uid는 콜백 요청에서 별도 전달되어 REST로 검증된다.

```ts
// 서명 대상(JSON canonical — 키 순서 고정). 기존 contextSchema 재사용.
context = base64url(JSON.stringify({
  v: 1,
  purpose: "guest_payment_v1",   // 도메인 태그 (본인인증·웹훅과 분리)
  paymentId,                     // = 서버 orderId (= V1 merchant_uid)
  orderId,                       // paymentId와 동일 값(의미 구분 위해 명시)
  storeId,                       // [재사용 필드명] 값에는 공개 imp 코드를 담는다
  amount,                        // 정수 10000
  currency: "KRW",
  expiresAt,                     // epoch ms (= order.expiresAt)
  nonce,                         // providerReceipt의 nonce와 동일
}))
signature = HMAC-SHA256-hex(paymentSigningKey, context)
```

- `paymentSigningKey = HMAC-SHA256(serverSecret, "guest-monitoring/payment-callback/v1")`, `serverSecret = SEARCH_INDEX_KEY || AUTH_SECRET`. **누락 시 503**(`paymentSigningKey()` 기존 구현 유지).
- 기존 `contextSchema`의 `storeId` 필드명은 **그대로 유지**하되 값에는 **공개 imp 코드**를 담는다(스키마 재작성 최소화). `REST_API_KEY/SECRET`·`DANAL_CARD_ENC_KEY`·`DANAL_MID`·PII·`imp_uid`를 문맥에 넣지 않는다.
- 검증은 `timingSafeEqual`로 서명 비교 → 문맥 필드가 서버 주문과 전부 일치 → receipt nonce 일치·미소비·미만료 확인. 이것은 **브라우저용 HMAC 문맥**이며 PortOne 웹훅 서명이 아니다(웹훅은 범위 밖).

### 2.4 타입 정의

#### 2.4.1 `types/guest-monitoring.ts` (프론트·백 공용) — **변경 없음 권장**

```ts
export interface GuestOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  payment: Record<string, string>;   // V1 SDK 실행 정보 + 서명 문맥 (§3.2)
  status: GuestOrderStatus;
}
export interface GuestOrderStateResponse {
  orderId: string;
  status: GuestOrderStatus;           // "pending"|"paid"|"failed"|"canceled"|"refunded"|"needs_review"
  applied: boolean;                   // done 판정: applied && status==="paid"
  startedAt: string | null;
  paidUntil: string | null;
}
```

> `payment` Record에 담기는 **V1 런타임 키**(전부 문자열):
> `provider="portone_v1"`, `impCode`(= `NEXT_PUBLIC_PORTONE_V1_IMP_CODE`), `pg`(= `"danal_tpay.9810030929"`), `payMethod="card"`, `paymentId`(= orderId = merchant_uid), `orderName="등기감시 1개월"`, `amount`(="10000"), `currency="KRW"`, `expiresAt`(ISO), `redirectPath`, `callbackContext`, `callbackSignature`, (선택) `buyerTel`.
> **`PORTONE_V1_REST_API_KEY`·`PORTONE_V1_REST_API_SECRET`·`DANAL_CARD_ENC_KEY`·`imp_uid`·토큰·시크릿은 포함하지 않는다.** `amount`는 SDK 경계에서 정수 검증 후 `Number()` 변환. `buyerTel`은 소유권 확인 서버가 **연장/새로고침 등 메모리 전화 부재 시에만** 기존 암호화 필드에서 제공한다(저장소·URL 저장 금지, 권한 판단에 미사용 — §5.1).

신규 프론트 요청 타입(`guestApi.ts`, 클라이언트 전용):

```ts
export interface GuestPaymentCallbackRequest {
  paymentId: string;          // = orderId
  imp_uid: string;            // [V1 추가] PG 발급 거래 ID (미신뢰 입력 — 서버가 REST로 검증)
  callbackContext: string;    // 서버 발급 base64url 문맥 (echo)
  callbackSignature: string;  // 서버 발급 hex 서명 (echo)
}
export interface GuestPaymentCallbackResponse { ok: true }
// 실패는 기존 GuestApiResult의 비-ok 분기 { status, error, code }
```

#### 2.4.2 `lib/danal/types.ts` — **최소 변경**

```ts
export interface PaymentResult {
  verificationReference?: string;   // [V1] 재조회용 imp_uid (브라우저 승인 증빙 아님)
  orderId: string;                  // = merchant_uid
  transactionId: string;            // = imp_uid
  merchantId: string;               // [V1] 검증된 다날 MID (imp코드와 혼용 금지)
  amount: number;
  currency: string;
  paidAt: number;                   // epoch ms (= paid_at * 1000)
  status: "paid" | "failed" | "canceled" | "refunded";
  expiresAt: number;                // 기존 DB 주문 expiresAt (epoch ms)
}
export interface PaymentAdapter {
  createPayment(input: { orderId: string; amount: number; currency: string; expiresAt: Date;
    providerReceipt?: string | null; createdAt?: Date }): Promise<Record<string, string>>;
  verifyPayment(input: unknown): Promise<PaymentResult>;    // input에 imp_uid 포함
  getPayment(reference: string): Promise<PaymentResult>;    // [V1] reference = imp_uid
  cancelPayment(reference: string): Promise<void>;
}
export interface DanalProvider {
  mode: "mock" | "danal" | "portone_v1";   // [변경] V2 "portone" 제거(레거시 주문은 DB 문자열로만 존재)
  merchantId: string;
  identity: IdentityAdapter;
  payment: PaymentAdapter;
}
```

- **미확정 상태(`ready`/가상계좌 등)**: `PaymentResult.status`에 `pending`이 없으므로 가짜 결과를 만들지 않는다. `verifyPayment`/`getPayment`는 `GuestError("payment_pending", 409)`를 throw하고 호출부는 주문 재조회로 처리한다. 비승인 상태에 없는 `paidAt`·`transactionId`를 가짜로 채우지 않는다.
- **미승인 종료(`failed`/`cancelled`, paid_at 없음)**: `PortoneTerminalPayment`(§3.4)로 내부 전달. 가짜 paidAt 생성 금지.
- **V1 `identity` 차단**: `portoneV1Provider.identity.startVerification`/`verifyResult`는 `unavailable()`(503). 정상 흐름은 OTP가 담당.

### 2.5 서버 상수·환경변수

| 항목 | 위치 | 값/역할 | 취급 |
| --- | --- | --- | --- |
| `GUEST_SINGLE_MONITORING.amount` | `lib/pricing-plans.ts` | `10000`(정수, KRW) | **가격 SSOT. 불변 재사용** |
| `GUEST_SINGLE_MONITORING.currency` | 동일 | `"KRW"` | 동일 |
| `ORDER_TTL` | `lib/guest-monitoring/config.ts` | `20 * 60_000` | 결제 대기 TTL. 불변 |
| `GUEST_PAYMENT_MODE` / `DANAL_PROVIDER` | env | `portone_v1` 명시 선택(둘 다면 동일해야 함, 충돌 503) | 인증 모드와 독립 |
| `NEXT_PUBLIC_PORTONE_V1_IMP_CODE` | env | 공개 식별코드(기준값 `imp88200033`). `IMP.init`·SDK 전달 | 공개, 필수 |
| `PORTONE_V1_REST_API_KEY` | env | V1 토큰 발급용 키 | **서버 전용, 필수. 번들·응답·로그 금지** |
| `PORTONE_V1_REST_API_SECRET` | env | V1 토큰 발급용 시크릿 | **서버 전용, 필수. 번들·응답·로그 금지** |
| `DANAL_MID` | env | 기준값 `9810030929`. SDK `pg` 문자열 구성 + V1 응답 MID 대조 + `PaymentResult.merchantId` | 공개 가능(pg 문자열에 노출). **REST 인증에 미사용** |
| `DANAL_CARD_ENC_KEY` | env | 다날 채널 콘솔 설정용 비밀(§0.1에서 용도 확정) | **SDK·클라이언트 응답·REST 임의 필드·로그 노출 금지** |
| `SEARCH_INDEX_KEY` 또는 `AUTH_SECRET` | env | 콜백 문맥 HMAC 서명 파생키 | 기존 정책 유지. 누락 503 |
| 기존 `GUEST_MONITORING_*` 게이트·암호화 키·쿠키·레이트리밋 | env | 기능 플래그 등 | **유지** |

- 설정값 이름·`NODE_ENV`·브라우저 `test:true`만으로 무출금을 보장한다고 간주하지 않는다. **검토된 V1 테스트 채널 증빙**(§0.1)이 유일한 게이트 근거다.

---

## 3. API 스펙

> 공통 게이트: 모든 엔드포인트는 `lib/guest-monitoring/http.ts`의 `endpoint()` 래퍼를 사용한다.
> 처리 순서 = `requireEnabled()`(기능 off **404**) → (비 callback·비 GET) CSRF Origin 검사(실패 **403**) → `requireCrypto()`(키 부재 **503**) → Content-Length 상한(16KB, 초과 **413**) → IP 제한(callback 120/분, 일반 60/분) → 핸들러.
> 모든 응답은 `Cache-Control: no-store`.

### 3.1 공급자 선택 resolver (계약 전제)

```ts
// lib/danal/portone-v1-config.ts
export function resolvePaymentMode(): "mock" | "portone_v1" {
  const pay = process.env.GUEST_PAYMENT_MODE?.trim() || undefined;   // 신규, 우선
  const dan = process.env.DANAL_PROVIDER?.trim() || undefined;       // 기존
  if (pay && dan && pay !== dan) unavailable();                      // 충돌 → 503(조용한 fallback 금지)
  const mode = pay ?? dan;
  if (mode === "portone_v1" || mode === "mock") return mode;
  // 구 V2 "portone"(다날 V2 결제 미지원) 포함, 미설정·알 수 없는 값 → 503
  return unavailable();
}
```

```ts
// lib/danal/index.ts (변경)
export function getDanalProvider(): DanalProvider {
  const mode = resolvePaymentMode();                 // 충돌·미설정·오입력·V2 portone → 503
  if (mode === "portone_v1") { getPortoneV1Config(); return portoneV1Provider; }  // 게이트 검증, 누락 503
  // mock: 기존 비운영·격리 DB·플래그·32자 비밀키 조건 전부 만족 시에만
  if (process.env.NODE_ENV !== "production" && mode === "mock" &&
      process.env.GUEST_MONITORING_MOCK_ISOLATED === "true" && isolatedDatabase() &&
      (process.env.DANAL_MOCK_SECRET?.length ?? 0) >= 32) return mockProvider;
  unavailable();
}
```

- **정확히 `portone_v1`**일 때만 V1. **정확히 `mock`** + 격리 가드 전부 만족 시에만 mock. 그 외 전부 503. V1 실패 시 mock/V2로 자동 우회 없음(기획서 §4.1).
- `getPortoneV1Config()` 안전게이트: `impCode + restKey + restSecret + MID + signingKey + payMethod=card + pgProvider=danal_tpay + 등록된 테스트 채널 증빙`을 모두 검증. 하나라도 누락/불일치 시 **503**(SDK 실행 정보 발급·REST 호출 전 차단).

```ts
// lib/danal/portone-v1-test-channels.ts (증빙 전엔 빈 목록 → 게이트 닫힘)
export interface VerifiedV1TestChannel {
  impCode: string; mid: string; pgProvider: "danal_tpay"; payMethod: "card"; evidence: string;
}
export const verifiedV1TestChannels: readonly VerifiedV1TestChannel[] = [];  // §0.1 확인 후에만 추가

// getPortoneV1Config() 반환 형태(계약)
{ impCode: string; restKey: string; restSecret: string; mid: string;
  pgProvider: "danal_tpay"; payMethod: "card" }
```

---

### 3.2 `POST /api/guest-monitoring/orders` — 주문 생성 (라우트 불변, 응답 `payment` V1화)

- **인증 필요 여부:** **필요**. `requireSession(req)`(OTP 완료 세션). 라우트 기존 그대로.
- **메서드 + 경로:** `POST /api/guest-monitoring/orders`
- **Request body** (`orderSchema`, `.strict()` — 불변):

```json
{ "purpose": "initial" | "renewal",
  "draftId": "<resourceId, initial 필수>",
  "guestMonitoringId": "<resourceId, renewal 필수>",
  "idempotencyKey": "<uuid v4>" }
```

규칙: `initial`이면 `draftId`만, `renewal`이면 `guestMonitoringId`만. 멱등키는 UUID.

#### 처리 순서 (기존 `createOrder` 흐름 + V1 결제문맥 — 불변 로직)

```
getDanalProvider()  → portone_v1 선택 (충돌/미설정/증빙없음 시 503, SDK·주문 생성 전 차단)
requireSession(req) → 401 없으면 진행
guestLimit("orders", session.id, 5)
orderSchema 검증 실패 → 400 invalid_input
createOrder(session, input):
  1. 신원·초안·대상 결합 검증(기존). initial이면 session.purpose==="apply" && session.draftId===draftId,
     renewal이면 session.purpose ∈ {status, renewal}  (← status 세션으로도 연장 주문 생성 가능, order.ts:13)
  2. 미완료 주문 재사용(기존, idempotencyKey/대상별). 신규면 providerMode="portone_v1"로 생성
  3. order.status==="pending" && expiresAt>now 이면 provider.payment.createPayment(order):
       · providerReceipt 없으면 CAS로 portone_v1:{nonce,consumed:false} 발급(같은 nonce 유지)
       · 서명 문맥 생성 + V1 SDK 실행 Record 반환
  4. json({ orderId, amount, currency, payment, status }, created ? 201 : 200)
```

#### Response — **성공 200/201** (V1)

```json
{ "orderId": "ord_xxxx",
  "amount": 10000,
  "currency": "KRW",
  "status": "pending",
  "payment": {
    "provider": "portone_v1",
    "impCode": "imp88200033",
    "pg": "danal_tpay.9810030929",
    "payMethod": "card",
    "paymentId": "ord_xxxx",
    "orderName": "등기감시 1개월",
    "amount": "10000",
    "currency": "KRW",
    "expiresAt": "<ISO-8601>",
    "redirectPath": "/renewal/monitoring/guest/apply",
    "callbackContext": "<base64url>",
    "callbackSignature": "<hex>",
    "buyerTel": "<연장/새로고침 소유권 확인 시에만, 그 외 생략>"
  } }
```

- `payment.paymentId`는 `orderId`와 **동일**(= V1 `merchant_uid`).
- 이미 `paid`/`needs_review` 적용 대기거나 재사용된 완료 주문이면 `payment`는 `{}`일 수 있다(기존 `order.ts` 조건). 클라이언트는 그 경우 주문 상태 조회로 복구한다.

#### Response — **실패** (공통 `{ error, code }`)

| 상황 | HTTP | code |
| --- | --- | --- |
| 입력 형식 오류 | 400 | `invalid_input` |
| 세션 없음·만료 | 401 | `session_required` |
| 초안/대상 없음·만료·신원 불일치·purpose 불일치 | 404 | `not_found` |
| 초안 만료(명시) | 400 | `draft_expired` |
| 이미 감시 중 중복 | 409 | `duplicate_active` |
| 주문 생성 rate limit | 429 | `rate_limited` (+헤더) |
| 공급자 설정·키·채널 증빙 누락·레거시 V2 주문 불일치 | 503 | `provider_unavailable` |
| CSRF Origin 누락·불일치 | 403 | `forbidden` |
| 기능 off | 404 | `not_found` |

---

### 3.3 `POST /api/guest-monitoring/payment/callback` — 결제 콜백 (변경: status 허용·imp_uid)

- **인증 필요 여부:** 공개 콜백(`endpoint(..., {callback:true})`)이나, **V1 브라우저 경로는 추가로 Origin + OTP 완료 세션 + 주문 신원 결합을 서버에서 검증**한다. `scripts/audit-api-auth.mjs` ALLOWLIST 사유 갱신.
- **메서드 + 경로:** `POST /api/guest-monitoring/payment/callback`
- **Request body** (V1 브라우저 경로):

```json
{ "paymentId": "ord_xxxx",
  "imp_uid": "imp_1234567890",
  "callbackContext": "<base64url, 서버 발급 echo>",
  "callbackSignature": "<hex, 서버 발급 echo>" }
```

> `imp_uid` 스키마: `z.string().regex(/^imp_[0-9a-zA-Z]{1,40}$/)`(실제 형식 §0.1에서 확정, 기본값). 기존 mock 경로의 `{payload, signature}` envelope는 **불변**이며 `verifyPayment`가 공급자별 입력을 해석한다.

#### 처리 순서 (라우트 — `payment/callback/route.ts`)

```
endpoint({callback:true}) 게이트 (requireEnabled·requireCrypto·16KB·IP 120/분)
mode = resolvePaymentMode()
if (mode === "portone_v1"):
  a. Origin 헤더 부재 또는 validateOrigin 실패 → 403 forbidden  (callback 기본 Origin 예외 미적용)
  b. session = requireSession(req, ["apply","status","renewal"])   ← 401 session_required / purpose 불일치 404
  c. readJson 파싱 실패(invalid_input) → payment_failed(400)로 매핑
getDanalProvider()
json(await paymentCallback(body, session))   // 세션 전달
```

#### `paymentCallback` 서비스 (`payment-callback.ts`, V1 분기)

```
if (provider.mode === "portone_v1"):
  1. 세션 purpose ∈ {apply, status, renewal} 아니면 401 session_required
  2. body = callbackRequestSchema(+imp_uid) 파싱 실패 → payment_failed(400)
  3. 소유권: order(orderId=body.paymentId, providerMode="portone_v1",
        guestMonitoring.guestIdentityHash === session.verifiedIdentityHash) 없으면 404 not_found
         ← purpose 허용만으로 타인 주문 권한 부여 금지. identity hash는 브라우저가 보내지 않음
verified = provider.payment.verifyPayment(body)   // §3.4
   └ verifyCallbackContext: 서명·문맥·주문·nonce·만료 검증 (실패 payment_failed 400)
   └ body.imp_uid로 iamport.getPaymentByImpUid → mapPayment(order, payment)
   └ 미확정(ready/가상계좌) → payment_pending(409)
   └ 미승인 종료(failed/cancelled, paidAt 없음) → PortoneTerminalPayment(catch에서 두 번째 조회 후 recordTerminalPayment)
   └ REST 인증실패/timeout/429/5xx/손상 → provider_unavailable(503)  ← 확정 실패와 분리, nonce 미소비
guestLimit("callback:payment", verified.orderId, 20)
reget = provider.payment.getPayment(verified.verificationReference)  // [V1] = imp_uid로 두 번째 조회
reget.orderId===verified.orderId && reget.transactionId===verified.transactionId 아니면 payment_failed
paid = recordPayment(reget)        // nonce 원자 소비 + paid 기록 (§4.4)
if (paid) applyPaidOrder(paid.orderId)
return { ok: true }
```

#### Response — **성공 200:** `{ "ok": true }`

#### Response — **실패** (공통 `{ error, code }`)

| 상황 | HTTP | code |
| --- | --- | --- |
| 형식 오류·서명/문맥/주문 불일치·nonce 소비·금액/통화/PG/카드수단/MID/merchant_uid/imp_uid 불일치·취소내역 모순 | 400 | `payment_failed` (원문 REST 응답·상세·secret 미포함) |
| V1 Origin 누락·불일치 | 403 | `forbidden` |
| V1 세션 없음·만료·purpose 불일치 | 401 | `session_required` |
| 주문-세션 신원 불일치(IDOR) | 404 | `not_found` |
| 미확정 결제(ready/가상계좌 등) | 409 | `payment_pending` (호출부는 주문 재조회) |
| 이미 needs_review 재적용 시도 | 409 | `payment_needs_review` |
| V1 REST 인증실패·timeout·429·5xx·응답 손상·토큰 재발급 반복 실패 | 503 | `provider_unavailable` (일시 장애, nonce 미소비) |
| 콜백 rate limit | 429 | `rate_limited` (+헤더) |
| 기능 off | 404 | `not_found` |

- 메시지는 기존 `errors.ts` 등록값 재사용. 원문 REST 응답·상세 결제정보·secret·imp_uid를 응답·로그에 **포함하지 않는다.**

---

### 3.4 서버 결제 확정 조건 (V1 재조회 대조 — 고정)

`GET https://api.iamport.kr/payments/{encodeURIComponent(imp_uid)}` · `Authorization: {access_token}`(V2의 `PortOne ` 접두사 **미사용**, `Bearer` 아님) · `cache: "no-store"` · `redirect: "error"` · timeout(8s, JSON 디코딩까지) · V1 봉투(`code`/`message`/`response`) + 응답 스키마(zod) 검증. 아래 **전부** 충족해야 `paid` 저장·감시 활성화.

| 검증 대상 | 통과 조건 |
| --- | --- |
| `imp_uid` | 요청한 거래 ID와 일치 + 기존 다른 주문의 `providerTransactionId`와 충돌 없음(소유권은 mutation 경계에서 unique로 재확인) |
| `merchant_uid` | 서명된 서버 주문 `orderId`와 정확히 일치(소유권 핵심 결합) |
| `amount` | 정수 `10000` === DB 주문 `amount` === `GUEST_SINGLE_MONITORING.amount` |
| `currency` | 주문·응답 모두 `KRW` |
| `pg_provider` | `danal_tpay`와 일치(본인인증용 `danal`과 혼동 금지) |
| `pay_method` | `card`와 일치 |
| MID | 응답의 MID 필드(이름 §0.1 확정) === 검토된 테스트 `DANAL_MID` |
| `status` | 감시 적용은 `paid`만. 그 외는 아래 표 |
| `paid_at` | 유효 Unix seconds → ms. `createdAt ≤ paidAt ≤ expiresAt` 및 `paidAt ≤ now` |
| 취소 금액 | `cancel_amount`>0·부분취소 내역 있는 거래를 단순 `paid`로 활성화 금지 |

불일치는 **명시 거부**(`payment_failed`), paid 저장·활성화 없음.

#### V1 상태 → 내부 매핑 (고정)

| V1 `status` | 내부 처리 |
| --- | --- |
| `paid` + 모든 검증 통과 | `PaymentResult.status="paid"`, 기록·적용 진행 |
| `ready` | `payment_pending`(409), 적용 금지 |
| `failed` | `PortoneTerminalPayment("failed")`. paid_at 없으면 가짜 paidAt 생성 금지 |
| `cancelled` | `PortoneTerminalPayment("canceled")`. 미승인 취소도 가짜 paidAt 금지 |
| 부분취소·알 수 없는 상태·상태/취소내역 모순 | 자동 활성화 금지 → `payment_failed` 또는 확인 필요 |

#### `PaymentResult` 매핑 (고정)

| 내부 필드 | V1 기준 |
| --- | --- |
| `orderId` | `merchant_uid`(=서버 orderId) |
| `transactionId` | `imp_uid` |
| `merchantId` | 검증된 다날 MID(= `provider.merchantId`). 공개 imp 코드와 혼용 금지 |
| `amount`, `currency` | 검증된 V1 금액/통화 |
| `paidAt` | `paid_at * 1000`(Unix s → ms) |
| `expiresAt` | 기존 DB 주문 `expiresAt` → ms |
| `verificationReference` | **재조회용 `imp_uid`**(브라우저 승인 증빙 아님) |

---

### 3.5 `GET /api/guest-monitoring/orders/[orderId]` — 주문 상태 조회 (불변)

- **인증 필요 여부:** **필요**(`requireSession`). 라우트·응답 **불변**.
- `done` 전환의 유일 근거. `{ orderId, status, applied, startedAt, paidUntil }`. `applied && status==="paid"`일 때만 완료.

### 3.6 변경 없는 기존 엔드포인트 (회귀 금지)

| 엔드포인트 | 상태 |
| --- | --- |
| `POST /identity/start`, `/identity/verify-otp`, `/identity/callback` | **불변** — 본인인증(SMS OTP)은 결제와 무관 |
| `POST /parse-pdf`, `GET /properties`, `/properties/[id]/calendar`, `DELETE /session` | **불변** |

### 3.7 V1 토큰·조회·취소 REST (서비스 내부, 공개 UI 없음 — `iamport-rest.ts`)

- **토큰 발급:** `POST https://api.iamport.kr/users/getToken`, JSON `{imp_key: PORTONE_V1_REST_API_KEY, imp_secret: PORTONE_V1_REST_API_SECRET}`. HTTP 성공 + 봉투 `code===0` + `response.access_token`·만료값 검사. **메모리 토큰 캐시**(만료값 기준), 재발급 **동시 요청 합치기**(single-flight). 조회 401 시 캐시 폐기·재발급 후 **최대 1회 재조회**, 반복 실패 503. 공급자 401을 사용자 세션 401로 노출 금지. [공식 V1 인증 결제 흐름](https://developers.portone.io/opi/ko/integration/start/v1/auth)
- **결제조회:** `GET /payments/{encodeURIComponent(imp_uid)}`, `Authorization: {access_token}`.
- **주문번호 조회(복구용):** V1 merchant_uid 조회 API로 후보 imp_uid 탐색(§4.6). 복수·모호 후보는 임의 선택 금지(확인 필요 처리). [V1 주문번호 조회](https://developers.portone.io/api/rest-v1/payment)
- **취소:** `POST https://api.iamport.kr/payments/cancel`, body `{imp_uid}`(+필요 필드). 테스트 상점·채널·주문·취소 가능 상태를 **서버 검증 후에만** 호출하고 재조회로 전체 취소 확인. 재호출 멱등. 이번 범위는 **테스트 거래 취소만**. cron 자동 실행·공개 취소 UI 추가 금지. `cancelPayment(reference)`는 `Promise<void>`.
- 봉투·스키마는 공식 V1 명세로 확정한다. [공식 V1 REST 명세](https://developers.portone.io/api/schema/v1/openapi.json)

---

## 4. 핵심 설계 디테일

### 4.1 imp_uid ↔ merchant_uid(orderId) 해소 (`getPayment` / 복구)

- **merchant_uid = 서버 `orderId`**(`ord_<uuid>`). **imp_uid = PG 발급 거래번호.** 혼용·임의 생성 금지.
- V1 결제조회의 기본 식별자는 **imp_uid**이므로 V2의 "orderId로 재조회"를 그대로 옮기지 않는다.
- `portoneV1.getPayment(reference = imp_uid)` 동작:
  1. `getPaymentByImpUid(reference)`로 V1 조회 → 응답의 `merchant_uid` 획득.
  2. `findPaymentOrder`로 `orderId === merchant_uid && providerMode==="portone_v1"` 주문 조회(없으면 `payment_failed`).
  3. `mapPayment(order, payment)` — imp_uid·merchant_uid·금액·PG·카드·MID·상태 전부 대조.
- **직접 imp_uid 조회도 반드시 해당 서버 주문과 결합**한다. imp_uid가 아직 DB에 없어도 REST의 merchant_uid로 주문을 찾아 대조한다(기획서 §101).

### 4.2 콜백 Origin·세션·주문 결합 (브라우저 경로)

- `endpoint`의 `{callback:true}` Origin 예외를 **V1 브라우저 POST에 무조건 적용하지 않는다.** 라우트에서 `validateOrigin` 재적용(403), OTP 완료 세션 필수(401, purpose ∈ {apply,status,renewal}), 주문 `guestIdentityHash === session.verifiedIdentityHash` 결합(불일치 404).
- 공급자 웹훅과 브라우저 콜백을 혼용하지 않는다(웹훅 범위 밖).

### 4.3 V1 REST 클라이언트 (`iamport-rest.ts`)

- 호스트 고정 `https://api.iamport.kr`. 조회/취소는 `Authorization: {access_token}`(접두사 없음). `cache:"no-store"`, `redirect:"error"`, `AbortController` 8s timeout(디코딩까지), 봉투+스키마(zod) 검증.
- 오류 분류: `401`(캐시 폐기·1회 재발급 후 재조회, 반복 실패 503)·`timeout`·`429`·`5xx`·JSON 파싱 실패·봉투 `code!==0`·필수 필드 누락 → **`provider_unavailable`(503, 일시 장애)**. 결제 미존재(봉투 code 또는 404)는 전파 지연 가능성으로 정제된 503으로 구분 전달(원문 미노출). **원문 응답·토큰·secret을 로그·오류에 남기지 않는다.**

### 4.4 nonce 원자 소비 (`recordPayment` 경계)

- `verifyPayment → getPayment → recordPayment` 재조회 방어 유지. **nonce 소비는 결제 기록 경계**에 연결(검증 메서드 단독 소비 금지).
- `recordPayment`는 `locked(identity)` 트랜잭션 내에서 유효 PAID일 때 **동일 트랜잭션 조건부 갱신**:

```
updateMany({ where: {
  id: order.id,
  providerReceipt: <현재 portone_v1 미소비 문자열>,   // 경합 방지 — 소비 전 값만
  status: { notIn: ["paid","needs_review","refunded","canceled"] },
  appliedAt: null,
}, data: {
  status: "paid", paidAt, providerTransactionId: result.transactionId,   // = imp_uid
  providerReceipt: <portone_v1 consumed:true 문자열>,
}})
count === 1 성공. 아니면 동시 콜백 선처리 → 멱등 재조회로 기존 결과 확인(providerTransactionId·consumed 일치)
```

- **일시 장애에서는 `recordPayment`에 도달하지 못해 nonce 미소비** → 동일 문맥·멱등키 재시도 가능.
- **소비 후 재전송**(응답 유실)은 `providerTransactionId(=imp_uid)` 일치·`consumed:true`로 기존 결과 **멱등 반환**, 재활성화 없음.
- `needs_review`는 콜백 재전송으로 **해제되지 않는다**(수동 큐 보존).
- 감시 적용(`applyPaidOrder`) 실패는 `paid` 상태를 유지해 cron 복구가 처리(불변).
- `providerTransactionId` unique 제약으로 서로 다른 신원의 동시 청구는 `P2002` → `payment_failed`.

### 4.5 V2 전용 보호의 V1 전환 (누락 금지 — 기획서 §194)

`mode === "portone"` 전용이던 분기를 **전부 `portone_v1`로 전환**한다. 아래 모듈을 전수 점검:

| 모듈 | 전환 대상 |
| --- | --- |
| `payment-callback.ts` | 세션 purpose·소유권·두 번째 조회(imp_uid)·`PortoneTerminalPayment` catch |
| `record-payment.ts` | nonce 소비·거래 중복(imp_uid)·기록 보호·멱등 재조회·P2002 |
| `record-terminal-payment.ts` | 미승인 종료 기록·nonce 미소비·거래 소유 |
| `portone-v1.ts` cancelPayment | 취소 전 소유권·재조회 |
| `recovery.ts` | imp_uid 기반 복구 |

### 4.6 모바일 복귀·새로고침 복구 (imp_uid 기준)

- **PC 인라인 콜백:** 검증 전 imp_uid·서명 문맥을 **메모리**로 유지하여 재전송(저장소 금지).
- **리다이렉트 복귀(`m_redirect_url`):** 공급자가 쿼리로 준 `imp_uid`·`merchant_uid`는 **미신뢰 입력**으로 읽어 서버 소유 주문·서명과 대조 후 V1 재조회. 처리 후 식별자 쿼리 제거. URL에 서명·nonce·PII 추가 금지.
- **메모리 문맥 소실:** 기존 주문·동일 멱등키로 **서명 문맥만 재발급**(`resendOrderCallback`). 새 주문·결제창 자동 생성 금지. imp_uid가 있으면 함께 재전송.
- **imp_uid까지 유실된 pending:** 인증된 서버 복구 경로에서 **V1 merchant_uid 조회**로 후보 imp_uid 탐색 → **단건 재조회·전체 검증**. 동일 merchant_uid의 복수 거래·모호 후보는 임의 선택 금지(확인 필요). 일반 생성 API의 서명 발급만으로 imp_uid 추정 금지(복구용 후보 탐색과 SDK 실행 정보 발급 책임 분리 — 기획서 §158).
- **cron(`recovery.ts`):** `status:"paid", appliedAt:null`의 `providerTransactionId(=imp_uid)`로 `getPayment` → 재검증 → `recordPayment`(멱등) → `applyPaidOrder`. 승인 미기록 pending을 cron이 자동 해결한다고 가정하지 않는다(사용자 복귀 경로가 §4.6에서 완결).

### 4.7 P1-① SDK 실행 전 실패 분류 및 재시도 (프론트)

| 실패 시점/유형 | UI 및 재시도 정책 |
| --- | --- |
| script 로드 실패·timeout·`IMP` 미존재·`IMP.init` 실패·실행 정보 오류 등 `request_pay` **호출 전** | `PaymentOutcome.unavailable` — 오류 유지, "결제 다시 시도", **같은 주문·멱등키 재사용**. 승인 대기로 전환 금지 |
| `request_pay` 호출 **이후** 예외·응답 유실·SDK 취소/닫기 | 승인 불명확 → 서버 조회 우선(`error`/`canceled`→재조회). SDK 자동 재실행·새 결제 금지 |
| 서버가 최종 실패·취소를 확정 | 기존 상태 정책에 따라 명시적으로 새 결제 가능(`fresh_payment`) |

- **로더 재시도 초기화(핵심):** script error·timeout·로드 후 `IMP` 미존재 시 실패 script·핸들러·타이머를 정리하고 **캐시된 rejected Promise를 초기화**한다. 다음 명시 재시도는 **새 로드**를 시작해야 하며, rejected Promise 재사용으로 영구 실패하지 않아야 한다(기획서 §141·§169).
- 중복 클릭·동시 호출로 script나 결제창이 중복 생성되지 않게 한다(기존 `payingRef`/`renewingRef` 재진입 잠금 유지).
- 주문 만료 시 기존 주문 재실행을 막고 서버 정책 안내를 제공한다.

### 4.8 P1-② status 세션 허용 및 영구 거부 보존

- `payment/callback/route.ts`의 `requireSession`과 서비스 purpose 검사를 **모두 `["apply","status","renewal"]`**로 맞춘다. 유효하지 않은 세션 401 정책 유지.
- 소유권 조건: `orderId + providerMode="portone_v1" + guestMonitoring.guestIdentityHash === session.verifiedIdentityHash`. purpose 허용만으로 타인 주문 권한 부여 금지. 브라우저가 보내는 identity hash는 받지 않는다.
- `status` 세션 허용해도 주문 생성의 목적별 정책·초안 결합은 유지(§3.2 step 1).
- **콜백 결과 분류(직접 신청·직접 연장·`resendOrderCallback`·모바일 복귀 전부 공유):**

| 콜백 결과 | 처리 |
| --- | --- |
| 2xx | 주문 재조회, 서버가 적용 완료 확정 시 done |
| 앱 세션 401 | 재인증, 기존 주문·멱등키 보존 |
| `payment_pending` 409 / network 0 / 429 / 503 | 일시 실패 — 재조회·동일 콜백 재전송, SDK 재실행 금지 |
| 400 `payment_failed` / 403 / 404 | **영구 거부 오류 보존** — pending 조회 결과로 덮어쓰기 금지 |
| `payment_needs_review` 409 / 그 외 비재시도 | 확인 필요/오류 안내 — 승인 대기·무조건 콜백 반복으로 처리 금지 |

- 영구 거부 후 새 주문·새 결제 자동 실행 금지. 명확한 적용 완료 상태 확인 시에만 완료로 정정. 기존 `applyFailure.classifyApiFailure`의 `blocked`/`recheck`/`conflict` 분류를 재사용한다(추가 분기 불요). 연장 경로(`useGuestStatus.finalizeRenew`)도 동일 정책을 적용한다.

### 4.9 보안·DB·구조 제약 (기획서 §4.9 명문화)

- 모든 승인 판단은 서버 SSOT + V1 재조회에 근거. 클라이언트 금액·`success`·시각·서명되지 않은 주문번호 불신.
- 브라우저 콜백: same-origin Origin + HttpOnly 세션·브라우저 결합 + 요청 스키마 + 소유권 + HMAC + 만료 + nonce + 거래 ID 중복 검증.
- 기존 컬럼만 사용(스키마·인덱스 추가 금지). 기존 unique·identity lock 유지.
- 레거시 V2 `providerMode="portone"` 주문을 V1으로 재해석하거나 `providerMode`만 바꾸지 않는다. 공급자 불일치 주문은 차단·별도 확인, 기록 보존(`order.ts:53`의 `order.providerMode !== provider.mode` 503 유지 — V1 선택 시 V2 주문은 createPayment 전 차단).
- 이름·전화·결제 원문·imp_uid·토큰·시크릿·서명·nonce를 콘솔/서버/분석/오류 로그에 남기지 않는다. 감사 이벤트는 내부 주문 ID·정제 상태만. URL·localStorage·sessionStorage에 PII·서명·nonce 저장 금지.
- 책임 분리: 페이지=화면 구성, 훅=상태 전이, 로더=script 수명주기, 어댑터=공급자 프로토콜, REST 모듈=외부 통신.

---

## 5. 프론트 흐름 계약 (요약 — 구현 코드 아님)

### 5.1 `runPayment` V1 분기 (`guest/guestPayment.ts`, 변경)

`PaymentOutcome` 판별 유니온(기존 유지):

```ts
type PaymentOutcome =
  | { kind: "redirected" }                                        // 모바일 리다이렉트 — 복귀 effect가 재개
  | { kind: "confirm"; callback: GuestPaymentCallbackRequest }    // 인라인 성공 → 콜백 POST(imp_uid 포함)
  | { kind: "recover" }                                           // 실행정보 없음(mock) → 주문 상태 조회
  | { kind: "canceled" }                                          // 사용자 닫기/취소 → 재조회(새 결제 금지)
  | { kind: "unavailable"; message: string }                      // request_pay 호출 전 중단 → retry_payment
  | { kind: "error"; message: string };                           // 호출 후 예외/실패 → 재조회 먼저
```

- `payment.provider === "portone_v1"`을 **먼저 처리**:
  1. 실행 정보(`impCode`/`pg`/`payMethod`/`paymentId`/`callbackContext`/`callbackSignature`) 하나라도 비면 `unavailable`. `amount`는 `/^\d+$/ && ===10000` 검증 후 `Number()`.
  2. `portoneV1Loader.load()` → `window.IMP` 확보 실패/timeout/미존재 → `unavailable`(로더가 rejected Promise 초기화, §4.7).
  3. `IMP.init(impCode)` → `IMP.request_pay({ pg, pay_method:"card", merchant_uid: paymentId, name:"등기감시 1개월", amount:Number, buyer_tel, m_redirect_url }, cb)`.
     - `buyer_tel = payment.buyerTel ?? otpMemoryPhone`(메모리 우선, 저장소 금지).
     - `m_redirect_url = ${origin}${payment.redirectPath}`(same-origin 고정, 외부 입력 금지).
  4. 콜백 `{success, imp_uid, merchant_uid, error_msg}`:
     - `success===true` → `imp_uid` 필수 + `merchant_uid===paymentId` 확인 → `{kind:"confirm", callback:{paymentId, imp_uid, callbackContext, callbackSignature}}`.
     - `success===false` → 닫기/취소성 메시지면 `canceled`, 아니면 `error`. `error_msg` 원문은 UI·로그에 그대로 노출하지 않는다.
     - 모바일 리다이렉트로 콜백 없이 이탈 → `redirected`.
- `payment.provider !== "portone_v1"`(mock): 기존 `launchProvider` → `true`면 `redirected`, `false`면 `recover`. **`guestProvider.ts` 불변.**
- SDK 필드·서명·imp_uid·전화를 `URL`·`localStorage`·`sessionStorage`에 저장 금지(메모리 전달).

### 5.2 신청/연장 상태머신 (§4.7·§4.8 통합)

- 신청(`useGuestOrderFlow.startOrder`): `createOrder → runPayment → (confirm)paymentCallback(imp_uid 포함) → advanceOrder(재조회)`. `confirm` 성공·일시 실패는 재조회, 영구 거부(payment_failed/403/404)는 `applyFailureOutcome`로 차단, `unavailable`은 `retry_payment`. (기존 분기 유지, 콜백에 imp_uid만 추가)
- 연장(`useGuestStatus.startRenew`): `status` 세션으로 `createOrder(renewal) → runPayment(..., GUEST_STATUS_PATH) → (confirm)paymentCallback(imp_uid) → finalizeRenew`. 영구 거부를 오류로 보존(§4.8 표 — pending 조회가 덮지 않도록 유지).
- **done 판정은 서버 주문 상태(`paid && applied`)가 유일 근거.** SDK 반환·클라이언트 상태만으로 완료 화면 금지. 승인 불명확(취소/에러/일시장애)은 **먼저 재조회**.

---

## 6. 구현 순서 (백엔드 → UI)

기획서 §5 우선순위를 그대로 따른다. 각 단계는 다음 단계 착수 전 해당 테스트·`npm run build` 통과를 조건으로 한다. 한 번에 한 파일, 각 파일 완료 후 빌드 확인.

| 순서 | 우선순위 | 담당 | 작업 | 완료 조건 |
| --- | --- | --- | --- | --- |
| 0 | P0 선행 | 대장+BE | V1 테스트 채널 증빙·env·정확 응답 필드 확정, V2 다날 비활성(§0.1·§3.1) | 증빙 전 503, mock/V2 우회 없음 |
| 1 | P0 | BE | `iamport-rest.ts`(토큰·조회·취소) + `portone-v1-config.ts` + `portone-v1-test-channels.ts` + `portone-v1-payment.ts` + `portone-v1.ts` 네 메서드(§3.1·§3.4·§3.7·§4.1) | 금액/주문/PG/상태/시각/MID 검증 + 단위 테스트 통과 |
| 2 | P0 | BE | `types.ts`·`index.ts` 모드 전환, `payment-callback.ts`·`record-payment.ts`·`record-terminal-payment.ts`·`recovery.ts` V1 분기, 콜백 DTO `imp_uid`·두 번째 조회 imp_uid(§4.4·§4.5) | V1 보호 누락 없음, imp_uid 일관 조회·기록 |
| 3 | P0 | FE | `useGuestStatus.ts` 분리 선행 → `guestApi.ts` imp_uid → `portoneV1Loader.ts`(신규) → `guestPayment.ts` V1 분기(§5.1) → 신청/연장/모바일 복귀 통합(§4.6·§5.2) | 테스트 거래 서버 검증·적용 1회 |
| 4 | P1-① | FE | SDK 로더 실패 초기화·오류 유지·같은 주문 재시도(§4.7) | 실패 → 재시도 성공 회귀 통과 |
| 5 | P1-② | BE+FE | 라우트/서비스 `status` 허용·소유권·영구 오류 분류 통합(§4.8) | 소유자 status 연장 성공, 타인 거부, 영구 오류 보존 |
| 6 | P0/P1 | BE+FE | 회귀·빌드·문서·V2 의존성 정리(§6.2) | 인수 기준 충족, 무출금 테스트 증거 |

> **병렬 구현 가능**: 서버(1~2)와 프론트(3~4)는 본 계약의 DTO·상태 매핑·에러 코드 표를 공통 고정점으로 삼아 병렬 가능하나, 각자 파일 단위로 나눠 빌드 확인 후 다음 파일로 이동한다. 동시에 여러 대형 파일을 수정하지 않는다(절대규칙 §구조).

### 6.1 테스트 계약 (요약 — 기획서 §6)

- **서버 Vitest(`lib/guest-monitoring/tests`, Node 환경)**: 토큰(endpoint/body/`code`/`access_token`/만료/401 재발급 1회/timeout/동시 합치기), 조회(Authorization 접두사 없음/no-store/imp_uid 인코딩/봉투/`paid_at` ms 변환), 위변조(9999·10001·소수·주문/imp_uid/PG/카드/통화/MID 불일치·타주문 거래·시각 범위 밖), 상태(paid/ready/failed/cancelled/부분취소/모순·미승인 paidAt 미생성·조회 간 상태변경), 서명·nonce(훼손·교체·만료·타인·재사용·멱등·동시 콜백 1회 적용), 모드·게이트(두 selector·충돌·키/채널/증빙 누락 503·V2 차단·mock 격리), 취소(검증 거래만 전체취소·재조회·멱등·부분취소 비성공), 복구(미저장 imp_uid 두 번째 조회·저장 imp_uid cron·merchant_uid 후보 탐색·모호 거래 금지).
- **프론트 회귀(DOM/브라우저 환경 별도 구성)**: P1-01~08(기획서 §6.2). 서버 fixture 통과로 프론트 회귀를 대체하지 않는다. 기존 `vitest.config.ts`는 Node 환경이므로 SDK script·React 훅 회귀는 별도 환경 구성.
- **검증 명령**: `npx vitest run --config lib/guest-monitoring/vitest.config.ts`, `npm run audit:api`, `npm run lint`, `npm test`, `npm run build`.
- **검증 증거**는 민감정보 없는 상태·횟수·결과만 기록. 운영 DB·실제 비밀키를 테스트에 넣지 않는다. 실제 SDK/REST 확인은 **무출금 다날 테스트 채널로만**.

### 6.2 범위 제외

실결제 활성화, 운영 키 등록, 신규 PG 추가, 본인인증 공급자 교체, 신규 DB 컬럼, 자동결제·빌링키, 일반 환불 UI, 회원 결제 개편. 기존 등기감시 기간·가격·OTP 정책 유지. `@portone/browser-sdk`는 저장소 전체 사용처 확인 후 미사용이면 **별도 변경**으로 제거(V2 import 잔존 여부를 Next 빌드로 확인), 다른 용도가 있으면 유지하되 다날 비활성 명시.

---

## 7. 절대규칙 준수 체크리스트

> 본 설계가 플랫폼 5대 원칙·절대규칙을 어떻게 만족하는지. 구현 완료 보고 시 각 항목을 실제 결과로 재점검한다(설계 단계 자체 점검).

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (설계 기준)
─────────────────────────────────────────────────
1. 페이지 500줄 제한 : ⚠️ 설계상 준수 — useGuestStatus.ts 476줄 → V1 변경 전 헬퍼 분리 선행(§1.2).
                        서버 어댑터는 책임별 ≤150줄로 분리. 신규 page.tsx 없음
2. 단일 책임        : ✅ 로더=script, 어댑터=프로토콜, REST=통신, 콜백=서명/nonce,
                        훅=상태전이, 페이지=조합. UI/상태/로직/API 혼재 없음(§1.1)
3. 서버 검증·보안   : ✅ 승인=서버 V1 재조회 SSOT, 브라우저 금액/success/imp_uid 불신,
                        Origin+세션+소유권+HMAC+nonce+거래중복, 시크릿/토큰/PII 미노출(§4.9)
4. 성능(중복·N+1)   : ✅ 토큰 메모리 캐시+single-flight, cron take:50, 두 번째 조회는 의도적
                        재검증(중복 아님), recordPayment는 REST 호출 없이 DB 상태만(§3.3·§4.3)
5. 폴더 구조        : ✅ 어댑터·REST·config·게이트=lib/danal, 서비스=lib/guest-monitoring,
                        로더·실행·API=라우트 하위 guest/, 라우트=app/api(§1.1·§1.2)
─────────────────────────────────────────────────
위반 항목: useGuestStatus.ts 분리 선행 1건(§1.2 트리거) → 구현 3순위 첫 작업으로 분리 후 진행
─────────────────────────────────────────────────
```

### 7.1 절대규칙 매핑

| # | 규칙 | 설계 반영 |
| --- | --- | --- |
| 1 | 페이지 500줄 제한 | 서버 어댑터 다분할(각 ≤150줄), 결제 실행 `guestPayment.ts`·로더 `portoneV1Loader.ts` 분리, `useGuestStatus.ts` 476줄 → 헬퍼 선행 분리. 작성 직후 400줄 초과 시 보고 |
| 2 | 단일 책임 | config/서명/REST/어댑터 서버 분할, 클라 UI·흐름·HTTP·결제실행·로더 분리. 결제 프로토콜 페이지 금지 |
| 3 | 서버 검증·보안 | 금액·통화·PG·카드·MID·주문·시간 서버 V1 재조회 대조, HMAC+nonce 1회 소비, Origin·세션·IDOR, timingSafeEqual, 코드·PII·secret·imp_uid·원문 로그/응답/저장소 금지 |
| 4 | 성능 | REST no-store·timeout·단건 조회, 토큰 메모리 캐시·single-flight, 기존 DB rate limiter 재사용, N+1 없음, 멱등키·문맥 재사용으로 중복 호출 없음 |
| 5 | 폴더 구조 | 공급자=`lib/danal`, 서비스=`lib/guest-monitoring`, 라우트=`app/api/...`, 타입=`types/`, 클라=route 아래 `guest`/`hooks`/`components` |
| 0-1 | 로컬≠운영 검증 | 결제·env·외부연동 → t-vestra 무출금 실환경 검증 전 "완료" 선언 금지. 채널 미확인 시 제약 보고 |
| 0-2 | '확인됨' 재검증 | imp코드/MID/secret/채널 env를 이름만으로 신뢰하지 않음. 테스트 채널·REST 응답 필드 실검증(§0.1) |
| 0-3 | 땜빵 금지 | 단일 공급자 resolver, 조용한 fallback 금지(충돌 503), V2·타 PG·mock 임의 대체 금지, `test:true` 금지 |
| 0-5 규모 | 상한·캐시 | 복구 `take:50`, 토큰 캐시, REST 재조회 경량, rate limiter 유지 |
| 0-5 수명주기 | 생성뿐 아니라 소비·취소 | nonce 소비 상태 전이, 재사용 시 문맥 보존, 취소 REST(자동 환불 없음) |
| 0-5 비정상 | 재사용·동시·IDOR·입력위조·모바일복귀 | 조건부 1회 소비, Origin·세션·신원 결합, 브라우저 금액/상태/imp_uid 불신, 이중 주문 방지, 양 경로(신청·연장) 대칭 처리 |
| 0-5 적대적 | 자기 코드 적대 검토 | 구현 후 §6.1 위변조·보안·우회 테스트 + 병렬 코드리뷰 권장(보안·결제·회귀 피해 큼) |

### 7.2 API 보안 코드 리뷰 체크리스트 (CLAUDE.md 필수)

- **인증 없는 변이 핸들러:** `payment/callback`은 공개 콜백이나 V1 경로에 `validateOrigin`(403) + `requireSession(["apply","status","renewal"])`(401) + 주문-세션 신원 결합(404) + nonce 조건부 1회 소비를 적용. **ALLOWLIST 사유 갱신** 없이는 `audit:api` 실패.
- **dead code endpoint:** `payment/callback`은 `guestApi.paymentCallback` → `runPayment("confirm")`/`resendOrderCallback` → `useGuestOrderFlow`·`useGuestStatus`에서 실제 호출. 미사용 아님.
- 변경 파일 외 `app/api/` 전체에 신규 미인증 변이 없음(기존 콜백 2건 외 추가 없음). `orders`·`orders/[orderId]`는 `requireSession` 유지.

---

## 8. 미확정 · 후속

- **다날 V1 응답 MID 필드명·통화 표기·취소 필드·`pg.MID` CDN 호환성**: P0 선행 확인(§0.1). 미확인 시 어댑터/복구 설계 범위로 진행하고 제약 보고.
- **`imp_uid` 실제 형식**: §3.3 기본 regex는 확정 전 임시값. 공식 응답·테스트로 고정.
- **`DANAL_CARD_ENC_KEY` 설정 위치**: 콘솔/앱 환경 중 어디서 쓰는지 확정하고 서버에만 보관.
- **웹훅 수신**: 이번 범위 아님. 브라우저 HMAC 문맥을 웹훅 서명과 혼용 금지.
- **DB 구조 변경·마이그레이션·신규 컬럼은 계획하지 않는다.** `lib/danal`의 mock·identity 동작은 불변.
