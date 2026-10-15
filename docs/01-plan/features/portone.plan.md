# PortOne V2 다날 테스트 결제 및 비회원 신청 복구 개선 기획서

- 작성일: 2026-10-15
- 상태: 기획 완료, 구현 전
- 대상: 비회원 등기감시 1개월 신청
- 작업 범위: 이 단계에서는 이 문서만 작성한다. 코드·패키지·환경변수·DB는 변경하지 않는다.

## 1. 기능 개요

비회원이 기존 SMS OTP 인증을 마친 후 PortOne V2 브라우저 SDK로 **다날 테스트 결제**를 진행하고, 서버가 PortOne REST API로 결제를 재조회하여 신청을 확정하도록 한다. 실제 SDK·REST 통신이 동작하는 테스트 연동이며, **실결제·실제 금전 출금은 허용하지 않는다.** mock 성공 응답을 실제 연동 성공으로 간주하지 않는다.

동시에 `useGuestApply.ts`의 세션 만료 재시도 무한루프와 OTP 성공 후 이름·전화 소실을 수정한다. 사용자는 인증 만료 시 재인증하고, 일시 장애 시 기존 주문 시도를 이어가며, 확정 결제 실패 시에만 새 결제를 시작할 수 있어야 한다.

### 1.1 포함 범위

- `lib/danal/portone.ts`에 PortOne V2 `PaymentAdapter` 신설 및 공급자 선택 연결.
- 서버 주문 응답을 기반으로 SDK 실행, `/api/guest-monitoring/payment/callback` 호출, 서버 검증·감시 적용·상태 조회 연결.
- 서버 가격 10,000원/KRW 검증, 상점·주문·거래 식별자 결합, HMAC 및 nonce 1회 소비.
- 401 재인증, 404 초안 재파싱, 확정 실패와 일시 실패의 서로 다른 재시도 정책.
- 어댑터·보안·클라이언트 복구 회귀 테스트와 테스트 환경 연동 확인.

### 1.2 불변 조건 및 제외 범위

- **본인인증은 기존 SMS OTP를 유지한다.** PortOne 본인인증, 다날 본인인증 전환, OTP 정책 변경은 제외한다.
- 실결제 채널 사용, 운영 결제 개방, 자동 환불, 정기결제·빌링키는 제외한다.
- DB 신규 컬럼·마이그레이션을 추가하지 않는다.
- 기존 `launchProvider`의 URL 이동·form POST 및 격리 mock 동작은 보존한다.
- 페이지·컴포넌트·훅은 파일당 500줄 이하로 관리하고 결제 프로토콜을 페이지에 넣지 않는다.

## 2. 기존 코드 분석

| 위치 | 확인한 현재 동작 | 변경 필요 사항 |
| --- | --- | --- |
| `lib/danal/types.ts` | `PaymentAdapter`의 create/verify/get/cancel 정의. 공급자 mode는 `mock \| danal`, cancel 반환은 `Promise<never>` | PortOne mode 및 실제 취소 성공을 표현할 타입 정합성 검토 |
| `lib/danal/index.ts` | 비운영·격리 DB·격리 플래그·32자 이상 mock 비밀키를 만족하는 mock만 반환, 나머지는 503 | 명시적 PortOne 선택 추가, mock 가드 유지 |
| `lib/danal/callback.ts` | `DANAL_MOCK_SECRET`로 mock envelope HMAC 검증 | 실 연동용 서버 발급 결제 토큰과 분리 필요 |
| `lib/guest-monitoring/order.ts` | 인증 신원/초안 결합, 대상별 미완료 주문 재사용, 서버 가격 스냅샷 및 멱등키 저장 | SDK launch 정보와 서명된 콜백 문맥 발급 연결 |
| `lib/pricing-plans.ts` | `GUEST_SINGLE_MONITORING`: 10,000원, KRW, 1개월 | 가격 SSOT 그대로 재사용 |
| `lib/guest-monitoring/activation.ts` | verify → 공급자 get 재조회 → recordPayment → applyPaidOrder. 금액·통화·공급자·승인 시간 검증 | PortOne 조회 결과 매핑, nonce 소비와 결제 기록의 원자성 연결 |
| `lib/guest-monitoring/recovery.ts` | 저장된 providerTransactionId로 paid 미적용 주문 재조회·복구 | PortOne paymentId와 transactionId 차이를 해소해야 함 |
| `app/api/guest-monitoring/payment/callback/route.ts` | callback 전용 endpoint, 일반 Origin 검사를 우회 | 브라우저 POST 경로의 Origin·세션·주문 바인딩 보강 |
| `guest/guestApi.ts` | 네트워크 예외를 status=0으로 반환, 결제 콜백 클라이언트 함수 없음 | 콜백 함수 및 표준 오류 계약 추가 |
| `guest/guestProvider.ts` | 동기 `launchProvider`, draftId/대상별 orderId/멱등키만 sessionStorage 보관 | 비동기 SDK 결제 실행 책임 분리, 기존 실행 경로 유지 |
| `hooks/useGuestApply.ts` | startOrder/recoverOrder의 401을 needsFreshPayment로 분류, retry가 다시 startOrder 호출 | 재인증 상태를 확정 결제 실패와 분리 |
| 동일 훅 `verifyApplyOtp` | 성공 직후 otpNameRef/otpPhoneRef를 비움 | 취소 경로처럼 입력값 유지 |
| `GuestApplyClient.tsx`, `GuestApplyForm.tsx` | 단계 전환으로 폼 재마운트, initialName/initialPhone으로 초기화. 분석된 초안이면 입력 잠금 | 훅 메모리 입력 복원이 빈 잠금 폼 방지의 핵심 |
| `prisma/schema.prisma` | providerMode는 문자열, providerReceipt·providerTransactionId·expiresAt 등 기존 필드 존재 | 기존 필드만 활용, mock receipt와 버전/용도 구분 |
| `package.json`, Vitest 설정 | `@portone/browser-sdk` 미설치. 루트 테스트는 `__tests__/**/*.test.ts`, 비회원 테스트는 별도 설정 | 후속 구현 시 SDK 설치와 훅 실행 테스트 환경 준비 필요 |

위 경로의 `guest/`, `hooks/`, 컴포넌트는 `app/(personal-home)/renewal/monitoring/` 기준이다. 현재 결제 nonce의 1회 소비가 구현되어 있다고 전제하지 않는다. mock HMAC 검증 및 활성화 멱등성에 더해 PortOne 결제용 소비 규칙을 설계한다.

## 3. 사용자 스토리

| 사용자 상황 | 기대 동작 | 성공 기준 |
| --- | --- | --- |
| 비회원이 PDF를 분석하고 SMS OTP 인증을 마침 | 다날 테스트 결제창에서 1개월 상품 결제 | 실제 출금 없이 서버 검증 후 감시 적용 완료 |
| 주문 생성 또는 상태 조회 시 인증 세션 만료 | 이름·전화가 복원된 ready 화면에서 SMS 재인증 | 재인증 전 주문 API 재호출 0회 |
| OTP 성공 후 주문 전송이 끊기거나 429/503 발생 | 이름·전화와 초안을 유지하고 동일 멱등키로 재시도 | 빈 입력이 잠기는 막다름 및 중복 주문 없음 |
| 초안이 만료됨 | input에서 PDF 재등록·재분석 | 만료 초안으로 인증·결제 재시작 안 함 |
| 결제가 서버 기준 실패·취소·환불로 확정됨 | 유효한 같은 초안에서 새 멱등키로 재결제 | 기존 실패 주문 반복 조회 루프 없음 |
| SDK는 성공했지만 서버 확인이 지연됨 | 기존 주문 상태 확인 또는 같은 콜백 재시도 | pending/paid 미적용 상태에서 새 결제 유도 없음 |

## 4. 기술 요구사항

### 4.1 테스트 연동 가능성 및 환경 설정

**선행 확인 항목:** 공식 자료에서 다날 결제 가이드는 V1, 다날 V2 자료는 본인인증으로 확인된다. 현재 조사만으로 해당 상점의 **다날 V2 결제 테스트 채널 지원을 확정할 수 없다.** 구현 착수 시 콘솔의 채널 종류·V2 SDK 지원 결제수단·출금 없는 테스트 방식을 확인한다. 지원이 확인되지 않으면 이 사실을 제약으로 보고하고 어댑터/복구 설계 범위에서 진행한다. V1, 다른 PG, PortOne 본인인증으로 임의 대체하지 않는다.

| 환경변수 | 역할 | 취급 |
| --- | --- | --- |
| `DANAL_PROVIDER=portone` | PortOne 결제 선택 | 기존 선택자 호환 |
| `GUEST_PAYMENT_MODE=portone` | 신규 비회원 결제 선택 | 인증 모드와 독립 |
| `NEXT_PUBLIC_PORTONE_STORE_ID` | SDK 상점 ID 및 서버 검증 기대값 | 공개 가능, 필수 |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_DANAL` | 다날 테스트 채널 지정 | 공개 가능, 필수. 테스트 결제 채널인지 확인 |
| `PORTONE_V2_API_SECRET` | V2 REST 인증 | 서버 전용, 필수 |
| `DANAL_MID` | 다날 테스트 가맹점 설정 확인 | 서버/콘솔 설정용, storeId와 동일시하지 않음 |
| `DANAL_CARD_ENC_KEY` | 다날 채널 설정에 필요한 키 | 서버/콘솔 전용, SDK 응답·번들에 노출 금지 |

- 신규 결제 모드가 명시되면 이를 우선하고, 미설정이면 기존 `DANAL_PROVIDER`를 따른다. 따라서 둘 중 하나만 portone이면 선택 가능하다. 서로 충돌하는 명시값·알 수 없는 값은 조용히 fallback하지 않고 설정 오류로 차단한다.
- PortOne 선택은 기존 SMS OTP 모드를 변경하지 않는다. `DanalProvider.identity`를 맞추기 위해 mock identity를 붙이지 않으며, PortOne 결제 공급자의 identity 메서드는 지원 불가로 차단한다. 실제 신청 인증은 기존 OTP 서비스가 담당한다.
- mock은 기존 비운영·격리 DB·플래그·비밀키 조건을 그대로 만족해야만 선택된다.
- `DANAL_MID`·암호화 키를 PortOne REST 인증에 사용하지 않는다. 채널 콘솔에 등록하는 정보와 앱 런타임에 필요한 설정을 구분하여 문서화한다.
- 설정값 이름이나 `NODE_ENV`만으로 무출금을 보장한다고 간주하지 않는다. 테스트 전용 채널 확인을 SDK 실행 전 필수 조건으로 두고 실결제 채널은 허용하지 않는다. SDK에 임의의 `test: true` 필드를 만들어 전달하지 않는다.
- 서버 조회 결과의 테스트 여부·채널 식별 필드가 제공되면 추가 검증한다. 이 사후 검증만으로 실결제 예방을 대체하지 않는다.
- 기능 플래그, 암호화 키, 쿠키, 레이트리밋 등 기존 비회원 게이트는 유지한다.

### 4.2 PortOne PaymentAdapter

`lib/danal/portone.ts`는 서버 전용으로 작성한다. SDK UI와 결제 결과 검증을 분리한다.

| 메서드 | 책임 |
| --- | --- |
| `createPayment` | 서버 주문 스냅샷을 검증하고 SDK 실행 정보 및 서명된 콜백 문맥 반환. 서버 orderId를 paymentId로 사용하여 DB 컬럼 추가 방지 |
| `verifyPayment` | 입력 형식·HMAC·만료·주문/nonce 결합 검증 후 paymentId로 REST 조회. 브라우저 전달 금액·승인 상태는 신뢰하지 않음 |
| `getPayment` | paymentId를 해석하여 REST 단건 조회, 서버 주문과 대조한 `PaymentResult` 반환 |
| `cancelPayment` | 검증된 테스트 거래에 한해 취소 REST 호출, 결과 재조회. 기존 공개 취소 UI나 자동 환불은 추가하지 않음 |

취소 API가 정상 반환하려면 현재 `Promise<never>` 계약을 `Promise<void>` 또는 공통 취소 결과 타입으로 최소 변경해야 한다. 기존 mock은 예외를 던지는 구현을 유지할 수 있다. 타입 변경은 후속 구현에 포함하며 성공한 취소를 오류로 위장하지 않는다.

단건 조회는 `GET https://api.portone.io/payments/{encodeURIComponent(paymentId)}`로 수행한다. 인증은 `Authorization: PortOne ${PORTONE_V2_API_SECRET}`이며 캐시를 사용하지 않고 제한 시간과 응답 스키마 검증을 둔다. 이 호스트와 인증 방식은 [공식 REST 문서](https://developers.portone.io/api/rest-v2)를 기준으로 한다.

서버 결제 확정 조건:

1. REST 결과의 결제 ID가 서버 주문에 결합된 paymentId와 일치한다.
2. 조회 금액 `amount.total`이 DB 주문 amount 및 `GUEST_SINGLE_MONITORING.amount`와 모두 일치한다. 현재 값은 정수 10,000원이다.
3. 통화가 DB 주문 currency 및 서버 상품 currency인 `KRW`와 일치한다.
4. 조회 storeId가 `NEXT_PUBLIC_PORTONE_STORE_ID`와 일치한다. 조회 요청에 storeId를 넣는 것만으로 응답 대조를 대체하지 않는다.
5. 테스트 다날 채널 결합을 확인하고 상태가 `PAID`여야 한다.
6. transactionId가 존재하고 다른 주문에 결합되지 않으며, paidAt이 유효한 시간이다. 기존 주문 생성/만료 시각·미래 시각 검증을 유지한다.

금액·통화·상점·주문·채널 불일치는 명시적으로 거부하며 paid 저장·감시 활성화를 하지 않는다. 원문 REST 응답이나 상세 결제정보를 오류에 포함하지 않는다.

`PaymentResult` 매핑:

| 내부 필드 | 기준 |
| --- | --- |
| `orderId` | REST 결제 ID와 일치하는 서버 orderId |
| `transactionId` | PortOne transactionId. paymentId 또는 PG 거래번호로 임의 치환하지 않음 |
| `merchantId` | 검증된 storeId. 공급자 merchantId도 같은 storeId로 정의 |
| `amount`, `currency` | 검증된 REST 금액/통화 |
| `paidAt` | REST paidAt을 epoch milliseconds로 변환 |
| `expiresAt` | 기존 DB 주문 expiresAt을 epoch milliseconds로 변환 |
| `verificationReference` | 재조회용 paymentId. 브라우저 승인 증빙이 아님 |

- `PAID → paid`, `FAILED → failed`, `CANCELLED → canceled`로 매핑한다.
- `PARTIAL_CANCELLED`는 전액 결제 완료로 취급하지 않고 활성화를 거부한다. 부분취소를 내부 refunded와 동일시하여 덮어쓰지 않는다.
- `READY`·`PAY_PENDING`·가상계좌 발급 등 미확정 상태는 확정 실패로 저장하지 않는다. 현재 `PaymentResult.status`에 pending이 없으므로 별도 미확정 오류 코드로 반환하고 호출부는 기존 주문 재조회로 처리한다.
- 비승인 상태에 없는 paidAt·transactionId를 가짜로 채우지 않는다. 실패 상태 검증 결과 타입을 분리하는 등 최소 타입 보완으로 표현한다.
- 서버 REST 인증 실패·타임아웃·429·5xx·응답 손상은 결제 확정 실패와 분리하여 일시적인 공급자 조회 실패로 처리한다.
- `getPayment(transactionId)`를 사용하는 cron 호환을 위해 기존 DB의 providerTransactionId로 orderId를 찾고 paymentId로 재조회한다. 직접 paymentId 조회도 해당 서버 주문과 결합하여 허용한다. 결제 ID와 거래 ID를 혼용하지 않는다.
- providerMode 문자열은 `portone`을 사용하도록 타입을 확장한다. 기존 문자열 DB 컬럼을 사용하며 스키마 변경은 필요 없다.
- 취소는 공식 `POST /payments/{paymentId}/cancel` 계약을 따르고 테스트 상점·채널·주문·취소 가능한 상태를 서버에서 검증한다. 기존 감시 복구 작업에서 자동 실행하지 않는다.

### 4.3 SDK 실행 및 콜백 계약

후속 구현에서 **`@portone/browser-sdk`를 설치**하고 `package.json` 및 사용 중인 lockfile에 반영한다. 현재 기획 작업에서는 설치하지 않는다. 공식 V2 진입점인 `@portone/browser-sdk/v2` 사용을 기준으로 버전과 타입을 확인한다.

orders의 기존 최상위 응답은 유지한다. payment에는 `provider: 'portone'`, storeId, channelKey, paymentId, orderName, totalAmount, currency, payMethod, 만료 및 서명된 콜백 문맥을 담는다. 기존 `Record<string, string>`을 유지할 경우 금액은 문자열로 직렬화하되 SDK 경계에서 정수 검증 후 변환한다. API secret·암호화 키는 포함하지 않는다.

SDK 호출 기준은 다음과 같다. 이는 기획 계약이며 실행 코드를 추가하는 것이 아니다.

```ts
PortOne.requestPayment({
  storeId,                          // NEXT_PUBLIC_PORTONE_STORE_ID와 일치
  channelKey,                       // NEXT_PUBLIC_PORTONE_CHANNEL_KEY_DANAL의 테스트 채널
  paymentId,                        // 서버 orders 응답의 ID
  orderName: '등기감시 1개월',
  totalAmount: 10000,                // 서버 응답 검증 후 전달
  currency: 'KRW',
  payMethod,                        // 해당 다날 V2 테스트 채널의 지원 수단
});
```

- 실제 SDK 타입에서 KRW enum 표기가 다르면 의미상 KRW로 경계 변환한다. 결제수단·PG별 추가 필드는 확인된 다날 V2 계약만 사용한다. V1의 `pg` 값이나 본인인증용 bypass를 추측하여 넣지 않는다.
- 새 비동기 결제 실행 헬퍼가 `provider === 'portone'`을 먼저 처리하고, 기존 공급자는 기존 `launchProvider`로 실행한다. 알 수 없거나 불완전한 실행 정보는 성공으로 간주하지 않는다.
- SDK 정상 반환의 paymentId가 요청 ID와 일치하는지 확인하고, 결제 콜백으로 `{paymentId, 서명된 문맥}`을 POST한다. 반환 code/예외/사용자 닫기를 구분한다.
- SDK 반환만으로 완료 화면을 표시하지 않는다. 서버 콜백 처리 후 주문 상태를 조회하고 `paid && applied`일 때만 done으로 전환한다.
- SDK 중단이나 콜백 전송 실패는 기존 주문으로 복구한다. 승인 여부가 불명확하면 먼저 재조회하며, 클라이언트 취소 신호만으로 새 결제를 만들지 않는다.
- 모바일 리다이렉트가 필요한 채널이면 복귀 URL·주문 참조로 기존 주문 문맥을 재발급받아 동일 콜백을 수행한다. 서명·nonce·개인정보를 URL에 넣지 않는다. SDK와 기존 리다이렉트 복구가 이중 주문을 만들지 않게 한다.
- 연장도 공용 orders/provider를 사용하므로 응답 호환을 확인한다. 신규 연장 UI는 범위 밖이다.

### 4.4 콜백 보안 및 DB 무변경 설계

- 브라우저는 서명을 만들지 않는다. 서버가 주문 생성/재개 때 paymentId·orderId·storeId·금액·통화·만료·nonce·용도를 결합한 토큰을 HMAC 서명한다.
- mock의 `DANAL_MOCK_SECRET`을 실제 연동 키로 재사용하지 않는다. 기존 서버 비밀키를 결제 전용 도메인으로 분리해 파생하고, 누락 시 차단한다. REST API secret과 브라우저 공개값은 서명키로 배포하지 않는다.
- nonce는 암호학적 난수이며 기존 `providerReceipt`에 버전 구분된 결제 문맥/nonce digest/소비 상태를 저장하는 방안을 사용한다. 원문 결제정보·개인정보는 넣지 않는다. mock receipt 처리와 명확히 분기한다.
- 기존 주문 재사용은 유효한 동일 결제 문맥을 재사용한다. 주문 API 재호출마다 nonce를 교체하여 다른 탭의 정상 콜백을 무효화하지 않는다.
- HMAC·서명 만료·nonce 결합 확인 후 공급자 재조회를 수행한다. **유효한 PAID 결과의 기록과 nonce 소비를 동일 트랜잭션에서 조건부 갱신**하여 동시 콜백 중 한 건만 적용한다.
- 조회/전송 일시 장애에서는 nonce를 소비하지 않아 동일 문맥 재시도가 가능해야 한다. 소비 후 응답 유실의 재전송은 기존 처리 결과를 멱등 반환하고 재활성화하지 않는다.
- `verifyPayment → getPayment → recordPayment`의 공급자 재조회 방어를 유지하고, nonce 소비는 검증 메서드 단독이 아닌 결제 기록 경계에 연결한다. 감시 적용 실패는 paid 상태를 유지하여 기존 복구가 처리한다.
- PortOne 브라우저 콜백 분기는 Origin·동일 브라우저 인증 세션·주문 신원 결합도 확인한다. 기존 외부 공급자 callback의 Origin 예외를 브라우저 경로에 무조건 적용하지 않는다.
- PortOne 웹훅은 이번 필수 범위가 아니다. 브라우저용 HMAC 문맥을 PortOne이 보낸 웹훅 서명이라고 설명하거나 혼용하지 않는다.
- 이름·전화·OTP·카드/결제정보·토큰·서명·secret·provider 원문 응답을 콘솔·서버 로그·분석 이벤트에 남기지 않는다. 오류 분류 코드만 기록한다.
- 기존 CSRF·요청 크기 제한·콜백 레이트리밋·시간 검증·거래 ID 유일성·적용 멱등성·needs_review 방어를 유지한다.

## 5. 신청 흐름 복구 요구사항

### 5.1 버그 ①: 401을 재인증으로 분리

현재 startOrder/recoverOrder는 401을 needsFreshPayment로 설정한다. retry는 이를 새 결제 대상으로 보고 startOrder를 호출하므로, 만료 세션으로 401이 반복된다.

- 401은 결제 실패가 아니라 `reauth_required`로 분류한다. needsFreshPayment를 설정하지 않고 busy·오래된 OTP 대기·pendingIdentity를 정리한다.
- 유효한 draft가 있으면 **ready로 복귀하고 이름·전화를 복원**한다. 사용자가 기존 SMS OTP 인증을 완료하기 전에는 startOrder를 호출하지 않는다.
- 이전 orderId·멱등키는 중복 결제 방지를 위해 유지한다. 재인증 후 기존 주문이 있으면 상태부터 확인하고, 주문이 없으면 기존 멱등키로 생성한다.
- 페이지 전체 새로고침 등으로 draft 객체·이름·전화 메모리가 없으면 빈 잠금 ready를 만들지 않는다. 입력/재파싱 경로를 안내한다. 기존 draftId 보관만으로 개인정보 복원이 가능하다고 가정하지 않는다.
- 이전 비동기 응답이 reset·초안 교체·재인증 이후의 상태를 덮어쓰지 않도록 요청 세대를 확인한다.

### 5.2 버그 ②: OTP 성공 후 입력 보존

- `verifyApplyOtp` 성공 시 `otpNameRef`·`otpPhoneRef`를 비우지 않는다. `cancelApplyOtp`와 같은 보존 정책을 적용한다.
- OTP 코드·대기 상태는 성공 후 정리하되, 주문 생성에 사용할 draftId는 정리 전에 확보한다. 이후 주문은 서버 세션의 초안 결합으로 검증한다.
- 이름·전화는 훅 메모리에서 `restoreName`·`restorePhone`을 통해 폼 초기값으로 전달한다. localStorage/sessionStorage/URL 저장은 금지한다.
- 주문 전송 실패 후 폼 재마운트 시 분석 완료 초안과 이름·전화가 함께 복원되어야 한다. 동일 인증 세션이 유효하면 재시도 버튼으로 주문을 이어가며 불필요한 SMS 재발송을 요구하지 않는다.
- 명시적 reset·초안 교체·흐름 종료에서는 이름·전화 참조를 정리한다. ready/failed 복귀만으로는 지우지 않는다.

### 5.3 실패 분기 및 멱등키 정책

`needsFreshPayment` 하나로 모든 실패를 표현하지 않는다. 인증·초안·주문 전송·결제 확정·적용 대기 원인을 구분하고 retry가 해당 동작만 수행하게 한다.

| 신호/상태 | 화면 및 다음 동작 | 키/주문 정책 |
| --- | --- | --- |
| 주문 생성·조회·브라우저 콜백의 401 | 유효 초안이면 ready → SMS 재인증 | 유지. 재인증 전 startOrder 금지 |
| 초안/주문 복구 API의 404 | input → PDF 재파싱 | 해당 초안·주문 재개 참조 폐기 |
| `draft_expired` 오류 코드 | HTTP 상태와 무관하게 input → 재파싱 | 만료 초안 폐기. 현재 서버는 기본 400이므로 404만 검사하지 않음 |
| 주문 전송 네트워크 오류(status=0)·429·503 | 입력 보존, 제한 안내 후 주문 재시도 | 같은 초안·동일 멱등키 유지 |
| 콜백 전송/REST 조회 일시 장애 | 같은 콜백 재시도 또는 같은 주문 조회 | 기존 paymentId·문맥·멱등키 유지 |
| 서버 기준 failed/canceled/refunded 확정, 비401 결제 실패 | 유효한 같은 초안에서 새 결제 | 해당 주문 시도 제거 후 새 멱등키. 초안 만료면 재파싱 |
| pending / paid 미적용 / needs_review | 기존 주문 상태 확인·적용 대기·확인 안내 | 유지. 새 결제 금지 |
| 상점·금액·서명 불일치, 403 등 보안 거부 | 결제 중단 및 일반화된 오류 안내 | 자동 재결제 금지 |
| 중복 활성 409 등 업무 충돌 | 현황 조회 등 기존 업무 안내 | 무조건 새 키로 재시도하지 않음 |

여기서 ‘비401 결제 실패’는 결제가 실패로 **확정된 경우**다. 비401이라는 이유만으로 429·503·전송 실패·미확정 결제를 새 결제로 분류하지 않는다. PortOne REST 내부의 결제 미존재 404는 초안 API 404와 구분하여 승인 여부를 다시 확인한다.

## 6. 구현 대상과 우선순위

| 우선순위 | 대상 | 산출물/책임 |
| --- | --- | --- |
| P0 선행 | PortOne 콘솔·공식 지원 계약 확인 | 다날 V2 결제 지원, 무출금 테스트 채널, 지원 payMethod 확인 |
| P0 | `lib/danal/portone.ts`, `index.ts`, `types.ts` | REST 어댑터·mode 선택·타입/취소 계약 정합성 |
| P0 | 결제용 callback 보안 모듈, `order.ts`, `activation.ts` | 서명 문맥 발급·nonce 원자 소비·SSOT 재검증 |
| P0 | `recovery.ts`, callback 라우트 | paymentId/transactionId 변환, 기존 주문 복구, 브라우저 요청 보안 |
| P0 | `package.json` 및 lockfile | `@portone/browser-sdk` 설치 내역 명시 |
| P0 | 신규 결제 실행 헬퍼, `guestApi.ts`, 공용 응답 타입 | SDK 실행·콜백·기존 launchProvider 공존 |
| P0 | `useGuestApply.ts` 및 필요 시 복구 분류 헬퍼 | 401 분리·입력 보존·실패별 재시도·중복 호출 방어 |
| P0 | 어댑터·콜백·훅 테스트 | 아래 필수 인수 시나리오 검증 |
| P0 | 테스트 환경 통합 확인 | 실제 SDK/REST 기반 무출금 흐름과 기존 SMS OTP 회귀 확인 |
| P1 | README·환경변수 예시·오류 안내 | 테스트 채널 구분, 설정 누락 및 재인증/대기 안내 개선 |

복구 버그 수정은 채널 지원 확인과 독립적으로 진행할 수 있다. 결제 통합 완료 판정은 다날 V2 테스트 채널의 실제 동작 확인까지 필요하다. 페이지는 표시, 훅은 흐름 조정, 클라이언트 헬퍼는 SDK, 서버 어댑터는 공급자 통신, 활성화 서비스는 DB 결제 기록·감시 적용을 담당한다.

## 7. 테스트 및 인수 기준

| 구분 | 필수 시나리오 | 기대 결과 |
| --- | --- | --- |
| 공급자 선택 | 두 선택 env 각각 portone, 미설정·충돌·오입력·키 누락 | 명시 설정만 연동, 잘못된 설정 503/설정 오류, mock 가드 보존 |
| 금액·통화 | 정상 10000/KRW, 9999·10001·소수·누락·다른 통화 | 정상만 승인, 불일치 활성화 0회 |
| 위변조 | 다른 storeId·paymentId·channelKey·transactionId, 잘못된 HMAC·nonce·만료 | 거부, 다른 주문 변경 없음 |
| 상태 매핑 | PAID·FAILED·CANCELLED·PARTIAL_CANCELLED·대기·미지원 상태 | PAID만 활성화, 대기는 실패 확정 안 함 |
| 시간·응답 | 유효 paidAt, 잘못된 날짜·미래·주문 범위 밖, 필수 필드 누락 | 엄격 검증, 승인 시각 임의 생성 없음 |
| REST | Authorization 형식, URL 인코딩, 타임아웃·401/403·404·429·5xx | 고정 API 호스트, 오류 분류, 원문/secret 로그 없음 |
| 재조회·복구 | 콜백 성공 후 적용 실패, cron transactionId 조회, 응답 유실 | 동일 주문 재조회·적용 1회, paymentId 혼용 없음 |
| nonce 소비 | 중복/동시 콜백, 동일 키 주문 재시도, 조회 장애 후 재시도 | 소비·결제 기록 원자성, 한 번 적용, 장애 시 정상 재시도 가능 |
| 취소 | 테스트 거래 정상 취소·다른 상점·실채널·반복 취소 | 검증된 테스트 건만 처리, 자동 환불 없음 |
| SDK | 요청 필드·금액·채널·반환 ID, code/예외/취소/닫기·모바일 복귀 | 서버 확정 전 done 없음, 불명확하면 기존 주문 복구 |
| 401 재인증 | createOrder·getOrderState·콜백 각각 401 후 retry 반복 | ready·입력 복원, OTP 성공 전 주문 생성 0회, 기존 키 유지 |
| 전송 실패 입력 보존 | OTP 성공 직후 주문 네트워크 실패·429·503, 폼 재마운트 | 이름·전화 비어 있지 않음, 동일 키 재시도, 잠긴 빈 입력 없음 |
| 초안 만료 | 404, 실제 `draft_expired` 400 | input·재파싱, 기존 초안 결제 재개 없음 |
| 결제 확정 실패 | failed/canceled/refunded 후 재시도 | 유효 초안 유지, 새 멱등키, 기존 pending 재결제 없음 |
| 초기화·경합 | reset·새 초안·지연 OTP 응답·이중 클릭 | 옛 응답 무시, 입력 참조 정리, 주문 중복 없음 |
| 회귀·보안 | SMS OTP 시작·성공·취소·재전송, 기존 launchProvider, mock 격리 | 인증 공급자 변화 없음, 기존 동작 유지 |
| 개인정보 | 로그·응답·브라우저 저장소 검사 | 이름·전화·OTP·결제 원문·secret의 금지 위치 노출 없음 |

테스트 배치 제안:

- 어댑터·콜백 테스트는 `lib/guest-monitoring/tests/portone.test.ts` 등 비회원 전용 suite에 추가하고 네트워크를 mock한다. fixture는 가짜 식별자만 사용한다.
- `useGuestApply`는 실제 훅 실행과 폼 재마운트를 검증한다. 현재 node 환경만 있으므로 후속 구현에서 React 테스트 도구/DOM 환경과 `.test.tsx` 포함 설정을 최소 추가한다. 문자열 소스 검색만으로 401 호출 횟수나 입력 복원을 검증했다고 간주하지 않는다.
- DB 통합 테스트는 기존 `GUEST_TEST_DATABASE_URL` 격리 가드를 유지한다. nonce 경쟁 및 결제 기록 원자성도 검증한다. 격리 DB가 없으면 미실행을 보고한다.
- 후속 검증은 비회원 전용 Vitest, 추가 훅 테스트 suite, `npm test`, `npm run audit:api`, `npm run lint`, `npm run build`를 기준으로 한다. 새 파일이 실행 대상에 포함되는지 확인한다.
- 실제 SDK/REST 확인은 무출금 다날 테스트 채널로만 진행한다. 운영 DB·실카드 청구로 검증하지 않는다. 테스트 모드 요청/응답 확인 자료에는 개인정보·결제 상세를 남기지 않는다.

완료 조건은 P0 충족, 두 복구 버그 재현 테스트 통과, 서버 위변조 거부, nonce 1회 소비, SDK/REST 실제 테스트 연동 성공, SMS OTP 불변 및 파일당 500줄 제한 준수다. 채널 미지원/미확인 상태에서는 코드 테스트가 통과해도 ‘다날 V2 테스트 결제 실동작 완료’로 보고하지 않는다.

## 8. 참고 자료 및 확인이 필요한 사항

- [PortOne V2 REST 개요](https://developers.portone.io/api/rest-v2): API 호스트·인증 방식.
- [PortOne V2 결제 API](https://developers.portone.io/api/rest-v2/payment): 조회·취소·상태·금액 타입.
- [V2 requestPayment 요청 형식](https://developers.portone.io/sdk/ko/v2-sdk/payment-request): SDK 입력 계약.
- [공식 V2 소개](https://developers.portone.io/opi/ko/integration/start/v2/readme?v=v2), [공식 다날 V1 결제 가이드](https://developers.portone.io/opi/ko/integration/pg/v1/danal): 다날 V2 결제 지원을 별도 확인해야 하는 근거.

구현 전 확정할 항목은 해당 상점의 다날 V2 **결제** 지원 여부, 무출금 테스트 채널 및 결제수단, 실제 SDK 버전/통화 enum, 테스트 여부 검증 필드다. 이 문서의 필드 구성과 nonce 저장 방식은 기존 코드 분석에 따른 구현 설계 제안이며, 채널 지원을 확인했다는 의미는 아니다.

이번 단계에서는 SDK 설치·기능 구현·테스트 실행·환경 설정·배포를 수행하지 않는다.
