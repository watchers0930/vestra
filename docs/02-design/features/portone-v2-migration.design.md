# PortOne V2 전환 설계서 (결제 검증 V1→V2)

> 프로젝트: VESTRA
> 작성일: 2026-10-20
> 상태: **Design (미리 작성)** — 구현·DB·env·실결제·배포 **미수행**. PG 정식 연동/승인 시 착수.
> 배경 근거: t-vestra 실화면 디버깅(2026-10-20) — 다날 테스트 결제 성공·PortOne 콘솔 거래 존재(`imp_550549704556`, 결제완료)인데, 서버의 V1 REST(`api.iamport.kr`)가 `imp_uid`·`merchant_uid` 둘 다 **404("존재하지 않는 결제정보")**. PortOne이 V2 플랫폼으로 전환되며 신 콘솔(채널키/V2) 거래가 구 V1 REST로 조회되지 않음(+ 2026-01-26 V1 단건조회 API 변경 공지).
> 기준 조사: 본 문서 하단 "현재 V1 구조 요약" 및 전수 조사(세션 로그).

---

## 0. 목적 / 비목적

**목적:** 서버 결제 **검증·조회·취소**를 PortOne **V1 REST(`api.iamport.kr`)** → **V2 API(`api.portone.io`)**로 전환하고, 클라이언트 결제 SDK를 **V1(`cdn.iamport.kr/v1`, imp_code)** → **V2(`@portone/browser-sdk`, storeId+channelKey)**로 전환한다. member(회원 구독)·guest(비회원 등기감시) 두 도메인 모두.

**비목적(이 문서에서 안 함):** 실제 구현·DB 변경·env 추가·실결제·배포. 결제 **정책/금액/활성화/구독 로직**은 바꾸지 않는다(검증 경계만 교체). 가입↔구독 UI 흐름(별도 완료분)은 범위 밖.

---

## 1. 핵심 설계 원칙 — "어댑터 경계만 교체"

현재 구조상 **도메인 로직은 추상 DTO(`PaymentResult`·`VerifiedPayment`)에만 의존**하고, V1 고유 개념(`imp_uid`/`merchant_uid`/`access_token`/엔드포인트)은 **3개 저수준 파일에 격리**돼 있다. 따라서:

> **V2 전환 = 저수준 어댑터(REST 클라이언트 + 결제 매핑) 교체 + 클라 SDK 교체.**
> **member/guest 도메인 로직(검증 흐름·DB 기록·활성화·cron 복구)은 DTO 인터페이스만 유지하면 거의 무변경.**

이 원칙이 리스크(보호경계·guest 영향)를 최소화하는 핵심이다. 어댑터에 **V1/V2 공통 인터페이스**를 두고 구현만 바꾼다.

---

## 2. V1 vs V2 핵심 차이

| 항목 | V1 (현재) | V2 (전환 후) |
|---|---|---|
| REST baseURL | `https://api.iamport.kr` | `https://api.portone.io` |
| 서버 인증 | `/users/getToken`(imp_key/secret)→access_token(만료)·캐싱 | **API Secret 직접** `Authorization: PortOne {V2_SECRET}` (토큰발급·캐싱 불필요) |
| 결제 조회 | `/payments/{imp_uid}` + `/payments/find/{merchant_uid}` + `/payments/findAll/{merchant_uid}`(모호성 방지) | **`GET /payments/{paymentId}` 단건 직접** (paymentId를 상점이 지정 = merchant_uid 역할) |
| 결제 취소 | `POST /payments/cancel`(imp_uid) | `POST /payments/{paymentId}/cancel` |
| 거래 식별자 | `imp_uid`(PortOne 발급) ↔ `merchant_uid`(상점) **이중** | **`paymentId` 단일**(상점이 지정, = 기존 orderId) |
| 클라 SDK | `cdn.iamport.kr/v1/iamport.js`, `IMP.init(impCode)`, `IMP.request_pay({pg:"danal_tpay.{mid}", merchant_uid})` | **`@portone/browser-sdk`**, `PortOne.requestPayment({storeId, channelKey, paymentId, orderName, totalAmount, currency, payMethod})` |
| 상점 식별 | `imp_code`(NEXT_PUBLIC_PORTONE_V1_IMP_CODE) | **`storeId`(store-xxx) + `channelKey`(channel-key-xxx)** |
| 결제 상태값 | `paid`·`ready`·`failed`·`cancelled` | `PAID`·`READY`·`FAILED`·`CANCELLED`·`PARTIAL_CANCELLED`·`PAY_PENDING`·`VIRTUAL_ACCOUNT_ISSUED` |
| PG 식별 | `pg_provider`("danal_tpay")·`pg_id`(MID) | `channel`(채널키로 결정)·응답 `pgProvider`·`pgTxId` |
| 금액 | `amount`(number) | `amount.total`(number) |
| 결제시각 | `paid_at`(Unix sec) | `paidAt`(ISO8601) |
| 웹훅 | (미사용 — 클라 콜백 기반) | V2 웹훅(`/webhook`) 선택 가능(결제상태 통지) |

**핵심 단순화:** V2는 **paymentId 단일**이라, V1의 `imp_uid↔merchant_uid` 이중성·`findAll` 모호성 처리(`candidateSchema`·409 needs_review 분기)가 **대부분 사라진다**. 조회는 `GET /payments/{orderId}` 직접.

---

## 3. 전환 범위 (파일 맵)

### 3.1 🔴 교체 (V1→V2 어댑터) — 저수준 공유

| 파일 | 현재(V1) | V2 전환 |
|---|---|---|
| `lib/danal/iamport-rest.ts` | V1 REST 클라이언트(getToken·find·findAll·cancel) | **신규 `lib/danal/portone-v2-rest.ts`**: `getPaymentById(paymentId)`·`cancelPayment(paymentId)`. getToken·findAll 제거. Authorization 헤더 방식. |
| `lib/danal/portone-v1-config.ts` | impCode·restKey·restSecret·mid·채널검증 | **`portone-v2-config.ts`**: storeId·channelKey·v2ApiSecret·(다날 MID 필요시). 검증채널(`verifiedV1TestChannels`)→V2 채널키 allowlist. |
| `lib/danal/iamport-schemas.ts` | `iamportPaymentSchema`(imp_uid/merchant_uid/amount/status...) | **`portone-v2-schemas.ts`**: V2 Payment 스키마(id/status/amount.total/paidAt/channel/pgTxId...). |
| `lib/danal/portone-v1-payment.ts` | `mapPayment`(V1 Payment→PaymentResult)·`PortoneTerminalPayment` | **`portone-v2-payment.ts`**: V2 Payment→동일 `PaymentResult` 매핑. **반환 DTO는 동일 유지.** 상태값 매핑만 변경. |

### 3.2 🟡 소폭 수정 — 검증 호출부 (DTO 유지, 호출 엔드포인트만)

| 파일 | 수정 |
|---|---|
| `lib/member-subscription/verification.ts` | `getPaymentByMerchantUid(orderId)×2` → `getPaymentById(orderId)×2`(이중조회·상태변화감지 유지). `validatePayment`의 `payment.imp_uid/merchant_uid/pg_id/paid_at` 필드 참조를 V2 DTO 필드로. |
| `lib/member-subscription/recovery.ts` | `findImpUidByMerchantUid(orderId)` 폴백 제거 — V2는 **paymentId(orderId) 직접 조회**라 imp_uid 역탐색 불필요. `settleMemberOrder(order, orderId, true)`로 단순화. |
| `lib/member-subscription/provider.ts`·`orders.ts` | `paymentInfo`가 클라에 주는 값: impCode·pg → **storeId·channelKey·payMethod**. `paymentId=orderId` 유지. `memberProviderConfig` env 교체. |
| `lib/guest-monitoring/payment-callback.ts`·`recover-pending-payment.ts`·`recovery.ts` | 동일 — 조회 함수를 V2(getPaymentById)로. `findImpUidByMerchantUid` 제거. `storeId` 참조 교체. |
| `lib/danal/portone-v1.ts`(guest DanalProvider) | provider adapter를 V2 구현으로. mode `"portone_v1"`→`"portone_v2"`(또는 공통 유지). |

### 3.3 🔴 교체 — 클라이언트 SDK

| 파일 | V2 전환 |
|---|---|
| `app/(personal-home)/renewal/pricing/member/portoneV1Loader.ts` | **`@portone/browser-sdk` import**(npm 패키지) 또는 V2 CDN. `IMP.init/request_pay` → `PortOne.requestPayment`. |
| `.../member/memberPayment.ts` `runPayment` | `imp.request_pay({pg, merchant_uid})` → `PortOne.requestPayment({storeId, channelKey, paymentId, orderName, totalAmount, currency:"KRW", payMethod:"CARD"})`. 응답 `{paymentId, code, message}` 처리. 성공 시 서버 콜백(`paymentId`). |
| `app/(personal-home)/renewal/monitoring/guest/portoneV1Loader.ts` | 동일(guest). |
| `useMemberOrderFlow.ts` 모바일 복귀 | V1 URL 파라미터(`imp_uid`·`merchant_uid`·`imp_success`) → V2 redirect(`paymentId`·`code`·`message`). `peekV1RedirectReturn`/`readV1RedirectReturn` V2화. |

### 3.4 ✅ 유지 (무변경) — 도메인 로직

- member: `record-payment.ts`(DTO 저장), `activation.ts`·`orders.ts` 활성화/주문 로직, `callback-context.ts`(서명), `status.ts`·`policy.ts`.
- guest: `activation.ts`·`record-payment.ts`·도메인.
- **단, DB `providerTransactionId`(현재 imp_uid 저장)는 V2 `paymentId` 저장으로 의미 변경 — 값만 다르고 컬럼·흐름 동일.** `providerMode` 값 `"portone_v1"`→`"portone_v2"`(마이그레이션 시 기존 레코드 처리 주의, §9).

---

## 4. 저수준 V2 어댑터 설계 (계약)

### 4.1 공통 인터페이스 (V1/V2 공통)
```ts
// 조회: paymentId(=orderId)로 단건. 없으면 null(미결제), 모호/에러는 throw.
getPaymentById(paymentId: string): Promise<PortonePayment | null>
cancelPayment(paymentId: string, reason: string): Promise<PortonePayment>
```
`PortonePayment`(정규화 DTO)로 반환 → `portone-v2-payment.ts`가 `PaymentResult`로 매핑 → **도메인 무변경**.

### 4.2 V2 REST 호출
- 조회: `GET https://api.portone.io/payments/{paymentId}` · `Authorization: PortOne {V2_API_SECRET}`
  - 200: Payment 객체. `status`로 분기.
  - 404: 미결제 → `null`(또는 PortonePaymentNotFound).
- 취소: `POST https://api.portone.io/payments/{paymentId}/cancel` · body `{ reason }`.
- **토큰 발급·캐싱 제거**(V2 Secret 직접). 8초 timeout·1회 재시도(5xx)·`providerBoundary`(민감정보 비노출)는 유지.

### 4.3 상태 매핑 (V2→내부)
| V2 status | 내부 처리(기존과 동일 결과) |
|---|---|
| `PAID` | 결제완료(paidAt·amount·cancel 이력 검증 후 "paid") |
| `READY`·`PAY_PENDING`·`VIRTUAL_ACCOUNT_ISSUED` | `payment_pending`(409, 재조회 대기) |
| `FAILED` | "failed" |
| `CANCELLED`·`PARTIAL_CANCELLED` | 전액취소만 "canceled" 인정, 부분취소는 `payment_failed`(기존 규칙 유지) |

### 4.4 검증 대조(validatePayment V2)
V1의 `imp_uid/merchant_uid/amount/pg_id` 대조를 V2로:
- `payment.id === paymentId(orderId)` (단일 식별자)
- `payment.amount.total === order.amount`
- `payment.channel.key === expected channelKey`(또는 pgProvider=danal 확인)
- `paidAt` 범위(createdAt~expiresAt) — ISO 파싱.
- 환불/취소 이력(`cancellations`/`cancelledAmount`) 검증(기존 규칙).

---

## 5. 환경변수 변경

| 구분 | V1 (제거/대체) | V2 (신규) |
|---|---|---|
| 서버 인증 | `PORTONE_V1_REST_API_KEY`·`PORTONE_V1_REST_API_SECRET` | **`PORTONE_V2_API_SECRET`** |
| 상점/채널 | `NEXT_PUBLIC_PORTONE_V1_IMP_CODE` | **`NEXT_PUBLIC_PORTONE_V2_STORE_ID`(store-xxx)** + **`NEXT_PUBLIC_PORTONE_V2_CHANNEL_KEY`(channel-key-xxx)** |
| PG | `DANAL_MID` | (V2 채널키가 PG·MID 포함 — **MID 별도 필요 여부 PortOne 확인**, §11) |
| 모드 | `GUEST_PAYMENT_MODE`·`DANAL_PROVIDER`(portone_v1/mock) | `portone_v2`/`mock`로 값 확장(키 유지 가능) |
| 유지 | `MEMBER_PAYMENT_ENVIRONMENT`·`MEMBER_MERCHANT_CONFIG_VERSION`·`AUTH_SECRET`·`MEMBER_*` | 유지 |

채널 allowlist(`verifiedV1TestChannels`) → **V2 채널키 기반 `verifiedV2Channels`**(증거·테스트/실연동 구분 유지).

---

## 6. 단계적 전환 전략 (안전 우선)

1. **어댑터 인터페이스 도입** — `getPaymentById`/`cancelPayment` 공통 시그니처로 추상화(V1 구현 래핑). 도메인 호출부를 이 인터페이스로 먼저 이전(동작 불변).
2. **V2 저수준 구현 추가** — `portone-v2-rest.ts`·`portone-v2-schemas.ts`·`portone-v2-payment.ts`·`portone-v2-config.ts`. 단위 테스트(스키마·상태매핑·대조).
3. **프로바이더 플래그** — `resolvePaymentMode()` 확장: `portone_v2` 추가. env로 V1/V2 선택(런북). mock 경로 유지.
4. **클라 SDK V2 전환** — `@portone/browser-sdk`로 결제 요청. member 먼저 → guest.
5. **t-vestra 실결제(소액) 검증** — V2 채널 테스트/실연동으로 결제→콜백→`GET /payments/{orderId}`→활성화 **end-to-end 실화면 확인**(이번 디버깅에서 막힌 바로 그 지점). 무출금은 V2 테스트 채널, 실연동은 소액 즉시 취소.
6. **member→guest 순차 전환·관측** — guest는 운영 영향 크므로 member 안정 후.
7. **V1 코드 제거** — V2 안정 확인 후 `iamport-rest.ts` 등 레거시 제거(또는 당분간 보존).

---

## 7. 검증 기준 (이번 재발 방지 — 실화면 필수)

- **단위:** V2 스키마·상태매핑·validatePayment 대조·이중조회·취소 이력.
- **통합:** 모의 V2 응답으로 callback/recover/cron 복구 흐름.
- **🔴 실화면(필수):** t-vestra에서 실제 결제 → **PortOne 콘솔 거래 ↔ `GET /payments/{orderId}` 조회 성공 ↔ 서버 주문 paid+applied ↔ 구독 활성화 ↔ 화면 "가입 완료"**까지 눈으로 확인. (코드/빌드 통과만으로 완료 선언 금지 — 0번 규칙.)
- guest 결제 회귀(실결제·cron 복구)·보호경계(기존 guest 동작) 무손상.

---

## 8. 롤백

- env 플래그(`*_PAYMENT_MODE`)로 V1↔V2 즉시 전환(코드 양립 기간). V2 장애 시 V1로 되돌림.
- V1 코드 제거는 V2 **실결제 안정 관측 후**에만.

---

## 9. 리스크 / 주의

- **보호경계:** member-subscription 결제 서버계약·guest 비회원 흐름은 "검증 경계만 교체", 정책/활성화/구독 로직 무변경. 어댑터 DTO 유지가 전제.
- **guest 운영 영향:** guest 결제는 운영 사용 중일 수 있음 → member 안정 후 전환, 플래그 양립.
- **DB `providerMode`/`providerTransactionId`:** 기존 V1 레코드(`providerMode="portone_v1"`, imp_uid)와 신규 V2(`portone_v2`, paymentId) 혼재 — 조회/복구 시 mode별 분기, 과거 미완 주문 처리 정책 필요.
- **정기결제(빌링키):** 현재 "결제창 일반/정기결제 V1". 구독이 **빌링키(정기결제)**를 쓰면 V2 빌링키 API(`/billing-keys`, 예약결제)로 별도 설계 필요 — 현재는 선불 단건이라 범위 밖이나 확인(§11).
- **이중결제/멱등:** V2 paymentId=orderId 단일이라 `record-payment.ts`의 imp_uid 중복감지를 paymentId 기준으로. 멱등키·nonce 로직 유지.

---

## 10. 현재 V1 구조 요약 (전환 대상 핵심)

- **공유 저수준:** `iamport-rest.ts`(REST), `portone-v1-config.ts`(env·채널검증), `iamport-schemas.ts`(스키마), `portone-v1-payment.ts`(매핑·`PortoneTerminalPayment`).
- **member:** `provider.ts`→`orders.ts`→클라 `memberPayment.runPayment`→`payment/callback`→`verification.verifyMemberPayment`(`getPaymentByMerchantUid×2`)→`record-payment`→활성화. 복구 `recovery.recoverMemberOrder`(`findImpUidByMerchantUid`).
- **guest:** `portone-v1.ts`(DanalProvider)→`payment-callback`→`verifyPayment`/`getPayment`→`record-payment`→`activation`. 복구 `recover-pending-payment`·cron `recovery`.
- **클라:** `portoneV1Loader`(cdn.iamport.kr/v1)·`IMP.init`·`request_pay({pg:"danal_tpay.{mid}", merchant_uid})`.
- **식별자:** imp_code(상점)·imp_uid(거래)·merchant_uid(주문=orderId).

---

## 11. PortOne에 확인할 사항 (착수 전 선결)

1. **다날(danal_tpay) V2 채널키** 발급·테스트/실연동 채널 제공 여부(현재 콘솔은 V2 채널키 보유 — 결제는 되나 V1 REST 조회 불가가 전환 사유).
2. **V2 결제 조회 API**(`GET /payments/{paymentId}`)로 **다날 테스트 결제가 조회되는지**(이번 V1 404의 V2 대응 확인 — 전환의 핵심 전제).
3. **`V2_API_SECRET`·`storeId`·`channelKey`** 정확한 값(콘솔 "V2 API" 탭).
4. **정기결제(빌링키)** 사용 여부 — 구독이 정기자동결제면 V2 빌링키 설계 추가.
5. **m_redirect(모바일 리다이렉트)** V2 지원 방식·반환 파라미터.
6. **MID(DANAL_MID)** V2에서 별도 필요 여부(채널키 포함 여부).

> 위 1~2가 "YES"(V2 API로 다날 거래 조회 가능)여야 전환의 실효가 보장된다. 착수 전 **V2 API Secret으로 이번 거래(또는 신규 V2 테스트결제)를 `GET /payments/{id}` 조회해 성공 확인**이 선결 조건.
