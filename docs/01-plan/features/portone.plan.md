# 비회원 등기감시 PortOne V1 다날 테스트 결제 전환 기획서

- 작성일: 2026-10-15
- 상태: 기획 완료 / 구현 전
- 대상: 비회원 등기감시 최초 신청 및 현황 화면의 1개월 연장
- 산출물 범위: 이 기획서만 작성한다. 기능 코드, 패키지, 환경변수, DB는 변경하지 않는다.
- 문서 관계: 이 문서는 기존 동일 경로의 V2 다날 결제 기획을 대체한다. 기존 `docs/02-design/features/portone.design.md`와 분석·리뷰 문서는 과거 V2 구현의 참고자료이며, 후속 설계에서 본 기획과 일치하도록 갱신한다.

## 1. 기능 개요

현재 비회원 결제의 PortOne V2 어댑터를 PortOne V1(구 아임포트) 다날 카드 결제로 교체한다. 사용자는 기존 SMS OTP 인증 후 10,000원짜리 등기감시 1개월 상품의 테스트 결제를 진행하며, 서버가 V1 REST API로 실제 결제 응답을 다시 조회한 뒤 신청 또는 연장을 확정한다. 이번 범위는 **무출금 테스트 연동**이며 실결제, 운영 결제 전환, 빌링키 발급, 정기결제는 포함하지 않는다.

PortOne 공식 V2 지원 목록에서 다날은 본인인증에만 포함되고 결제에는 포함되지 않는다. 따라서 V2 다날 결제 경로를 사용할 수 없으며 V1으로 전환해야 한다. [공식 V2 지원 PG 안내](https://developers.portone.io/opi/ko/integration/start/v2/readme?v=v2)

전환과 함께 프론트 P1 두 건을 완료한다.

1. 결제창 실행 전 SDK 로드 실패는 오류로 유지하고 같은 주문의 결제 실행 재시도를 제공한다. 실행 후 승인 여부가 불명확한 실패와 구분한다.
2. `status` 세션으로 생성한 연장 주문의 콜백을 허용한다. 주문 소유권은 `verifiedIdentityHash`로 확인하고, 콜백의 영구 거부 응답을 승인 대기로 숨기지 않는다.

### 1.1 성공 기준

- `portone_v1` 설정에서 V1 CDN SDK와 V1 REST API만 사용하여 신규 신청·연장 테스트 결제가 완료된다.
- 서버 가격 SSOT, V1 재조회, 소유권, 서명·nonce 검증을 모두 통과한 주문만 `paid`로 기록한다.
- UI 완료 판정은 서버의 `status === "paid" && applied === true`에만 근거한다.
- 테스트 채널 증빙·검증값 또는 필수 키가 없으면 결제 실행 정보를 발급하지 않고 503으로 차단한다.
- P1 두 건의 신규 신청·연장·복구 경로 회귀 테스트가 통과한다.
- 신규 DB 컬럼과 마이그레이션 없이 기존 필드를 사용하고 페이지 및 관련 책임 모듈을 파일당 500줄 이하로 유지한다.

## 2. 기존 코드 분석

아래 내용은 현재 저장소 원문을 기준으로 확인했다. 과거 리뷰의 지적을 현재 미해결 상태로 일괄 간주하지 않는다.

| 영역 | 현재 구현과 확인 사항 | 이번 계획 |
| --- | --- | --- |
| `lib/danal/types.ts` | `PaymentAdapter` 네 메서드 존재. `DanalProvider.mode`는 `mock / danal / portone` | 인터페이스를 유지하고 모드에 `portone_v1` 반영 |
| `lib/danal/index.ts`, `portone-config.ts` | 명시 모드 선택, 두 환경변수 충돌 차단, 격리 mock 제한 존재 | V1 선택·설정 검증으로 교체, V2 다날 차단 |
| `portone.ts`, `portone-rest.ts`, `portone-payment.ts` | V2 `api.portone.io`, storeId/channelKey, 대문자 상태·ISO paidAt 사용 | V1 REST 봉투·imp_uid·소문자 상태·Unix 시각 매핑으로 교체 |
| `portone-test-channels.ts` | `verifiedTestChannels`가 빈 목록. V2 테스트 채널 증빙 없으면 503 | V1 imp 코드·PG·MID·카드·테스트 검증값 조합으로 대체 |
| `portone-callback.ts` | HMAC 문맥, nonce, 소모 여부를 기존 `providerReceipt`에 저장 | V1 결제에도 보존. 현재 `portone_v1:` 접두사는 기존 V2 경로에서도 쓰는 **문맥 포맷 버전**이므로 공급자 버전의 증거로 사용하지 않음 |
| `guest/guestPayment.ts` | V2 동적 import 사용. `unavailable`과 실행 후 `error`를 이미 구분. 복구 함수는 콜백의 401 외 오류를 무시하고 재조회 | V1 script 로더·콜백 계약으로 교체하고 복구의 영구 오류 보존 |
| `hooks/useGuestOrderFlow.ts` | 최초 신청은 SDK 실행 전 실패에 `retry_payment`를 제공하고 직접 콜백 영구 거부도 구분 | 기존 개선을 유지하며 V1 로더 실패·재시도로 회귀 검증 |
| `hooks/useGuestStatus.ts` | 현황 인증 purpose는 `status`. 연장 직접 콜백은 401 이외 실패를 `finalizeRenew`로 넘김 | 영구 거부를 오류로 유지. 복구 경로에도 동일 정책 적용 |
| `lib/guest-monitoring/order.ts` | 연장 주문은 `status / renewal` 세션으로 생성 가능 | 계약 유지 |
| `payment/callback/route.ts`, `lib/guest-monitoring/payment-callback.ts` | 라우트 허용 purpose는 `apply / renewal`; 서비스도 동일 제한. 라우트 purpose 불일치는 `requireSession`에서 404 | **라우트·서비스 모두** `status` 포함, 소유권 검증 유지 |
| `record-payment.ts`, `record-terminal-payment.ts`, `recovery.ts` | `mode === "portone"`에 묶인 nonce·거래 중복·기록 보호 분기, 거래 ID 기반 복구 존재 | V1에도 동일 보호가 적용되도록 관련 분기 전체 전환 |
| Prisma `GuestMonitoringOrder` | `providerMode`는 String, `providerTransactionId`는 unique, `providerReceipt`는 Text | 기존 필드로 V1 모드·imp_uid·서명 문맥 처리 |
| `package.json` | 현재 `@portone/browser-sdk` 의존성이 존재 | 저장소 전체 사용처 확인 후 제거하거나 다날 결제에서 비활성임을 명시 |
| `lib/guest-monitoring/tests/portone*.test.ts` | V2 스키마·채널 fixture를 사용하는 서버 테스트 | V1 fixture로 전환하고 보안·P1 회귀 추가 |

관련 프론트 파일 경로의 기준 디렉터리는 `app/(personal-home)/renewal/monitoring/`이다. 현재 `useGuestStatus.ts`는 476줄이므로 로더·오류 분류·복구 로직 추가 시 헬퍼 분리가 필요하다.

## 3. 사용자 스토리

| ID | 사용자 스토리 | 인수 기준 | 우선순위 |
| --- | --- | --- | --- |
| US-01 | 비회원 신청자로서 OTP 인증 후 다날 카드 테스트 결제를 마치고 감시를 시작하고 싶다 | 같은 서버 주문으로 SDK 실행 → 서버 재조회 → 적용 완료, 적용 1회 | P0 |
| US-02 | 현황 조회 사용자로서 다시 가입하지 않고 선택한 물건의 감시를 연장하고 싶다 | 소유자의 `status` 세션 콜백 성공, 기존 기간 정책에 따라 1개월 연장 1회 | P1 |
| US-03 | 결제 모듈 로드가 실패하면 원인을 안내받고 재시도하고 싶다 | 승인 대기 미표시, 재시도 버튼, 로더 재시도 성공 시 동일 주문·멱등키로 실행 | P1 |
| US-04 | 결제창 이후 통신이 끊겨도 중복 결제 없이 결과를 확인하고 싶다 | 재조회·콜백 복구에서 SDK 자동 재실행 및 신규 주문 생성 없음 | P0 |
| US-05 | 결제 확인이 영구 거부되면 승인 대기 대신 오류 안내를 받고 싶다 | 400/403/404를 직접·복구 경로에서 보존, 401은 재인증 | P1 |
| US-06 | 운영 담당자로서 실출금 위험 없이 테스트 연결 상태를 확인하고 싶다 | 증빙 없는 채널·키 누락·V2 선택은 503, mock 자동 대체 없음 | P0 |

## 4. 기술 요구사항

### 4.1 공급자 선택 및 책임 분리

- `DANAL_PROVIDER=portone_v1` 또는 `GUEST_PAYMENT_MODE=portone_v1`이면 V1 어댑터를 반환한다. 둘 다 있으면 동일해야 하며 충돌·오타·빈 설정은 503으로 닫는다.
- 구 `portone` V2 다날 결제 선택은 “다날 V2 미지원”으로 비활성화한다. 사용자 응답은 정제된 503, 내부 구분 코드는 민감정보 없는 설정 오류로 관리한다.
- mock은 기존 조건(비운영, 명시적 격리 플래그, loopback 테스트 DB, 충분한 서명 키)을 모두 만족하는 격리 테스트에만 보존한다. V1 실패 시 mock 또는 V2로 자동 우회하지 않는다.
- 권장 모듈: `lib/danal/portone-v1.ts`(어댑터), `iamport-rest.ts`(토큰·REST), `portone-v1-config.ts`(환경·안전게이트), `portone-v1-payment.ts`(응답 검증·매핑), V1 테스트 채널 증빙 모듈. 공통 서명 코드는 별도 책임으로 유지한다.
- V1 결제 어댑터는 SMS OTP 등 기존 본인인증 경로를 교체하지 않는다. 지원하지 않는 직접 본인인증은 기존처럼 차단한다.

### 4.2 환경변수와 V1 테스트 안전게이트

| 환경변수 | 용도·노출 정책 |
| --- | --- |
| `NEXT_PUBLIC_PORTONE_V1_IMP_CODE` | 공개 식별코드. 요청 기준값 `imp88200033`, `IMP.init`에 사용 |
| `PORTONE_V1_REST_API_KEY` | V1 토큰 발급용 서버 전용 키 |
| `PORTONE_V1_REST_API_SECRET` | V1 토큰 발급용 서버 전용 시크릿 |
| `DANAL_MID` | 요청 기준값 `9810030929`. SDK PG 선택 문자열 구성 및 채널 대조 |
| `DANAL_CARD_ENC_KEY` | 서버 전용 다날 채널 설정 비밀. SDK·클라이언트 응답·로그에 포함 금지 |
| `DANAL_PROVIDER` / `GUEST_PAYMENT_MODE` | `portone_v1` 명시 선택 |
| 기존 `SEARCH_INDEX_KEY` 또는 `AUTH_SECRET` | 콜백 문맥 HMAC 서명. 기존 키 정책 유지 |

V1 안전게이트는 서버가 검토한 `impCode + pgProvider=danal_tpay + MID + pay_method=card + test 검증값`을 정확히 대조한다. 테스트 검증값은 콘솔·PG 설정에서 확인한 **무출금 테스트 채널 증빙에 연결된 값**이며, 브라우저가 보내는 `test: true`나 환경변수 한 개만으로 통과시킬 수 없다. 기존 V2 `verifiedTestChannels`의 storeId/channelKey/TEST 규칙은 재사용하지 않는다.

- 공개 imp 코드와 MID는 사용자 제공 기준값이며 이 문서만으로 테스트 전용 채널임이 확인된 것은 아니다. V1 계정·MID·카드 테스트 설정 및 실출금 없음의 증빙 확보 전에는 게이트를 열지 않는다.
- 필수 환경값·서명 키·등록 채널·테스트 검증값 누락 또는 조합 불일치 시 SDK 실행 정보 발급 전 503. REST 호출·SDK 실행도 차단한다.
- `DANAL_CARD_ENC_KEY`를 V1 REST 요청의 임의 필드로 보내지 않는다. PortOne 콘솔의 다날 채널 등록과 앱 환경 확인 중 어느 단계에 사용되는지 후속 설계에서 확인하고 서버에만 보관한다.
- V1 결제조회에 V2의 `channel.type` 또는 `isForTest`가 있다고 가정하지 않는다. 공식 응답에 없는 필드를 만들어 검증하지 않으며, 테스트성은 검토된 V1 채널 설정으로 증명한다. 조회가 제공하는 PG·MID 정보는 해당 증빙과 추가 대조한다.

### 4.3 PaymentAdapter 네 메서드

| 메서드 | 요구 동작 |
| --- | --- |
| `createPayment` | DB 주문을 읽고 SSOT 10,000 KRW·pending·만료·공급자 일치 확인. nonce를 기존 필드에 CAS 발급. `Record<string,string>` 실행 정보와 서명 문맥 반환. 서버 승인/청구 API 호출 없음 |
| `verifyPayment` | 콜백 스키마·HMAC·주문/설정/만료/nonce 확인 후 `imp_uid`로 V1 조회. 소유권은 서비스에서 선검증. 브라우저 success는 확정 근거로 쓰지 않음 |
| `getPayment(transactionId)` | `transactionId=imp_uid`로 V1 재조회하고 대응 DB 주문과 대조. 기록 전 두 번째 조회 및 승인 기록 후 복구에서 사용 |
| `cancelPayment(reference)` | 기존 주문 ID 또는 기록된 imp_uid로 소유 거래를 찾고 재검증 후 `POST /payments/cancel`에 imp_uid 전달. 취소 후 재조회로 전체 취소 확인, 재호출 멱등 처리. 이번 범위는 테스트 거래 취소만 |

V2의 `paymentId=orderId` 조회를 V1에 그대로 적용하지 않는다. 승인 기록 전 두 번째 조회에도 **검증된 imp_uid**를 전달하도록 콜백 서비스 계약을 바꾼다. `getPayment`는 기존 DB에서 imp_uid를 아직 저장하지 않았더라도 REST의 merchant_uid로 주문을 찾아 대조할 수 있어야 한다. imp_uid와 orderId를 혼용하거나 임의로 만들어서는 안 된다.

### 4.4 V1 토큰·결제조회 및 서버 검증

1. `POST https://api.iamport.kr/users/getToken`에 JSON `{imp_key: PORTONE_V1_REST_API_KEY, imp_secret: PORTONE_V1_REST_API_SECRET}`를 전송한다.
2. HTTP 성공뿐 아니라 V1 봉투의 `code === 0`, 유효한 `response.access_token`과 만료값을 검사한다.
3. `GET https://api.iamport.kr/payments/{encodeURIComponent(imp_uid)}`에 `Authorization: access_token`을 설정한다. V2의 `PortOne` 접두사를 사용하지 않는다.
4. HTTP·V1 `code`·`response` 스키마를 검사한 뒤 아래 대조를 수행한다. [공식 V1 인증 결제 흐름](https://developers.portone.io/opi/ko/integration/start/v1/auth), [공식 V1 REST 명세](https://developers.portone.io/api/schema/v1/openapi.json)

| 검증 대상 | 통과 조건 |
| --- | --- |
| `imp_uid` | 요청한 거래 ID와 일치하고 기존 주문 거래 ID와 충돌하지 않음 |
| `merchant_uid` | 소유권 확인 및 서명된 서버 주문의 orderId와 정확히 일치 |
| `amount` | 정수 10,000이며 DB 주문 금액·`GUEST_SINGLE_MONITORING.amount`와 모두 일치 |
| 통화 | 주문과 공급자 응답이 KRW. 허용되지 않은 통화는 거부 |
| `pg_provider` | V1 다날 카드 `danal_tpay`와 일치. 본인인증/휴대폰용 `danal`과 혼동 금지 |
| `pay_method` | `card`와 일치 |
| PG 가맹점 | 조회에서 제공되는 MID 필드와 검토된 테스트 MID 대조. 필드 이름·제공 여부는 공식 스키마/테스트 응답으로 확정 |
| `status` | 감시 적용은 `paid`만 허용. 다른 상태는 아래 표대로 처리 |
| `paid_at` | 유효한 Unix seconds를 milliseconds로 변환. 주문 생성~만료 범위 및 현재 시각 이내인지 검증 |
| 취소 금액 | 취소·부분취소 내역이 있는 거래를 단순 `paid`로 활성화하지 않음 |

`PaymentResult`에는 `orderId=merchant_uid`, `transactionId=imp_uid`, `merchantId=검증된 다날 MID`, `amount`, `currency=KRW`, `paidAt=paid_at*1000`, 내부 status, `expiresAt=주문 만료 시각`을 매핑한다. `provider.merchantId`도 같은 MID를 사용한다. 공개 imp 코드를 MID와 혼용하지 않는다.

| V1 상태 | 내부 처리 |
| --- | --- |
| `paid` + 모든 검증 통과 | `PaymentResult.status=paid`, 기록·적용 진행 |
| `ready` | `payment_pending` 409, 결제 적용 금지 |
| `failed` | 검증된 종료 실패로 기록. 승인 시각이 없으면 가짜 paidAt를 만들지 않고 종료 결과 경로 사용 |
| `cancelled` | 내부 `canceled`로 매핑. 미승인 취소도 가짜 paidAt 생성 금지 |
| 부분취소·알 수 없는 상태·상태/취소 내역 모순 | 자동 활성화 금지, 정제된 거부 또는 확인 필요 처리 |

- 토큰 캐시는 서버 메모리에서만 만료값 기준으로 관리하며 토큰 재발급 동시 요청을 합친다. 조회 401 시 캐시 폐기·재발급 후 최대 1회 재조회, 반복 실패는 503이다. 공급자 401을 사용자 세션 만료 401로 노출하지 않는다.
- 타임아웃은 기존 8초 수준으로 제한하고 JSON 디코딩까지 적용한다. `no-store`, 리디렉션 차단, 응답 최소 필드 파싱을 유지한다.
- 금액·주문·PG·서명 불일치는 `payment_failed` 400 등 영구 거부다. 공급자 통신 실패·전파 지연성 미조회는 정제된 503으로 구분한다. 원문 오류·REST 응답을 반환하거나 로깅하지 않는다.

### 4.5 클라이언트 V1 SDK와 콜백 계약

- `guestPayment.ts`의 `@portone/browser-sdk/v2` import를 제거하고 `https://cdn.iamport.kr/v1/iamport.js`를 동적 script 로드한다. npm 설치는 필요 없다.
- SDK 로더는 별도 모듈에 둔다. `window.IMP.init`과 `window.IMP.request_pay` 존재를 확인하고 성공한 로드를 공유한다. 중복 클릭·동시 호출로 script나 결제창이 중복 생성되지 않게 한다.
- script error·timeout·로드 후 IMP 미존재 시 실패 script와 핸들러·타이머를 정리하고 **캐시된 rejected Promise를 초기화**한다. 다음 명시 재시도는 새 로드를 시작한다.
- 실행 정보는 `provider=portone_v1`, 공개 imp 코드, 서버 orderId, `pg=danal_tpay.9810030929`, `pay_method=card`, 상품명, 금액, 통화, 만료 및 서명 문맥을 포함한다. `PaymentAdapter`의 문자열 레코드 계약을 유지하고 amount는 정수 검증 후 숫자로 전달한다.
- SDK 호출 계약: `IMP.init(NEXT_PUBLIC_PORTONE_V1_IMP_CODE)` → `IMP.request_pay({pg:"danal_tpay.9810030929", pay_method:"card", merchant_uid:orderId, name:"등기감시 1개월", amount:10000, buyer_tel, m_redirect_url}, cb)`.
- `buyer_tel`은 OTP 흐름의 메모리 입력값을 사용한다. 새로고침·연장 경로에서 값이 없으면 주문 소유권을 확인한 서버가 기존 암호화 필드에서 필요한 전화만 실행 정보로 제공하는 방식을 사용한다. 저장소·URL에 전화번호를 보관하지 않고 권한 판단에도 사용하지 않는다.
- `m_redirect_url`은 같은 출처의 신청/현황 복귀 경로로 고정한다. 외부 redirect URL 입력을 받지 않는다.
- 콜백 `{success,imp_uid,merchant_uid,error_msg}`에서 success는 서버 확인을 시작하는 신호다. 성공이면 imp_uid 필수, merchant_uid와 요청 주문 일치 확인 후 `/api/guest-monitoring/payment/callback`에 전달한다. error_msg 원문은 로그·UI에 그대로 노출하지 않는다.
- 앱 콜백 요청 DTO는 기존 `paymentId(=orderId)`, `callbackContext`, `callbackSignature`에 **`imp_uid`를 추가**하는 방향으로 변경한다. strict 서버 스키마와 프론트 타입을 함께 수정한다. success·금액·merchant_uid 클라이언트 값으로 승인하지 않는다.
- 공식 다날 문서는 현재 `pg`를 deprecated로 표시하고 channelKey 사용을 권장한다. 이번 요구는 `pg.MID` 방식으로 고정하며 지정 CDN과의 실제 호환성을 테스트 채널에서 검증한다. 지원하지 않으면 임의 채널 선택으로 우회하지 않고 구현 제약으로 기록한다. [공식 V1 다날 파라미터](https://developers.portone.io/opi/ko/integration/pg/v1/danal)

### 4.6 모바일 복귀·새로고침 복구

V1 조회의 기본 식별자는 imp_uid이므로 V2의 “orderId로 재조회” 복구를 그대로 옮길 수 없다.

- PC 인라인 콜백은 검증 전 imp_uid와 서명 문맥을 메모리로 유지하여 재전송한다.
- 리다이렉트 복귀 시 공급자가 전달한 imp_uid·merchant_uid는 미신뢰 입력으로 읽고 서버 소유 주문·서명과 대조한 뒤 V1 재조회한다. 처리 후 식별자 쿼리를 제거한다. URL에 서명·nonce·PII를 추가하지 않는다.
- 메모리 문맥이 사라지면 기존 주문·동일 멱등키로 서명 문맥만 재발급한다. 새 주문이나 결제창을 자동 생성하지 않는다.
- imp_uid까지 유실된 pending 주문은 인증된 서버 복구 경로에서 V1 merchant_uid 조회를 사용해 후보 imp_uid를 찾고, 반드시 단건 재조회·전체 검증을 거친다. 동일 merchant_uid의 복수 거래나 모호한 후보는 임의 선택하지 않고 확인 필요로 처리한다. [V1 주문번호 조회 API](https://developers.portone.io/api/rest-v1/payment)
- 일반 생성 API에서 서명 발급만으로 `imp_uid`를 추정하지 않는다. 복구용 후보 탐색과 SDK 실행 정보 발급의 책임을 분리한다.
- 기존 cron은 `paid && appliedAt=null` 복구에 집중하므로 승인 미기록 pending을 자동 해결한다고 가정하지 않는다. 이번 사용자 복귀·재확인 경로에서 위 복구를 완결한다.

### 4.7 P1-① SDK 실행 전 실패 분류 및 재시도

| 실패 시점/유형 | UI 및 재시도 정책 |
| --- | --- |
| script 로드 실패·timeout·IMP 미존재·init 실패·실행 정보 오류 등 request_pay 호출 전 | 오류 유지, “결제 다시 시도”, 같은 주문·멱등키 재사용. 승인 대기로 전환하지 않음 |
| request_pay 호출 이후 예외·응답 유실·SDK 취소/닫기 | 승인 불명확으로 서버 조회 우선. SDK 자동 재실행·새 결제 금지 |
| 서버가 최종 실패·취소를 확정 | 기존 상태 정책에 따라 명시적으로 새 결제 가능 |

기존 `PaymentOutcome.unavailable` 및 최초 신청의 `retry_payment` 분기를 보존하고, 연장도 같은 정책으로 동작시킨다. 재시도 후에도 rejected Promise가 재사용돼 영구 실패하지 않아야 한다. 주문 만료 시 기존 주문 재실행을 막고 서버 정책에 따른 안내를 제공한다.

### 4.8 P1-② status 세션 허용 및 영구 거부 보존

- `payment/callback/route.ts`의 `requireSession`과 서비스 레벨 purpose 검사를 모두 `["apply","status","renewal"]`로 맞춘다. 유효하지 않은 세션의 401 정책은 유지한다.
- 소유권 조건은 `orderId + providerMode=portone_v1 + guestMonitoring.guestIdentityHash === session.verifiedIdentityHash`이다. purpose 허용만으로 타인 주문에 권한을 부여하지 않는다.
- `status` 세션을 허용해도 주문 생성의 목적별 정책과 최초 신청 draft 결합은 유지한다. 브라우저가 보내는 identity hash는 받지 않는다.
- 최초 신청 직접 콜백, 연장 직접 콜백, `resendOrderCallback`, 모바일 복귀·새로고침 후 호출부 모두 아래 분류를 공유한다.

| 콜백 결과 | 처리 |
| --- | --- |
| 2xx | 주문 재조회, 서버가 적용 완료를 확정하면 완료 |
| 앱 세션 401 | 재인증, 기존 주문·멱등키 보존 |
| `payment_pending` 409, network status 0, 429, 503 | 일시 실패. 재조회·동일 콜백 재전송, SDK 재실행 금지 |
| 400 `payment_failed`, 403, 404 | 영구 거부 오류를 보존, pending 조회 결과로 덮어쓰지 않음 |
| `payment_needs_review` 409 또는 그 외 비재시도 오류 | 확인 필요 또는 오류 안내. 일반 승인 대기·무조건 콜백 반복으로 처리하지 않음 |

영구 거부 이후 새 주문·새 결제를 자동 실행하지 않는다. 서버 상태 조회가 필요하더라도 기존 거부 안내를 지우지 않고, 명확한 적용 완료 상태가 확인될 때만 완료로 정정한다.

### 4.9 보안·DB·구조 제약

- 모든 승인 판단은 서버 SSOT와 V1 재조회 결과에 근거한다. 클라이언트 금액·success·시각·서명되지 않은 주문번호는 신뢰하지 않는다.
- 브라우저 콜백은 명시적 same-origin Origin, HttpOnly 세션·브라우저 결합, 요청 스키마, 소유권, HMAC, 만료, nonce, 거래 ID 중복을 검증한다. 공급자 웹훅을 브라우저 콜백과 혼용하지 않는다.
- nonce는 기존 `providerReceipt`에 저장하고 결제 기록과 함께 원자적으로 소모한다. 동일 거래의 재전송은 멱등 성공으로 복구하되 다른 거래·주문·nonce 재사용은 거부한다.
- `providerMode=portone_v1`, `providerTransactionId=imp_uid`, `paidAt`, `providerReceipt`, `appliedAt` 등 기존 컬럼만 사용한다. 스키마·인덱스 추가 금지. 기존 unique 제약과 identity lock을 유지한다.
- `mode === "portone"` 전용 보호가 V1에서 빠지지 않도록 callback·record·terminal·cancel·recovery 전체를 점검한다. `needs_review`가 콜백 재전송으로 해제되지 않아야 한다.
- 기존 V2 주문을 V1 주문으로 재해석하거나 providerMode만 바꾸지 않는다. 공급자 불일치 기존 주문은 차단·별도 확인하고 기록은 보존한다.
- 이름·전화·결제 원문·imp_uid·토큰·시크릿·서명·nonce는 콘솔/서버/분석/오류 수집 로그에 남기지 않는다. 감사 이벤트는 내부 주문 ID와 정제된 상태만 사용한다. URL·localStorage·sessionStorage에 PII·서명·nonce를 저장하지 않는다.
- 페이지는 화면 구성, 훅은 상태 전이, SDK 로더는 script 수명주기, 어댑터는 공급자 프로토콜, REST 모듈은 외부 통신을 담당한다. 500줄 초과 우려 시 책임 단위로 분리한다.

## 5. 우선순위와 후속 구현 순서

| 순서 | 우선순위 | 작업 | 완료 조건 |
| --- | --- | --- | --- |
| 1 | P0 | V1 테스트 채널 증빙·환경·정확한 응답 필드 확인, V2 다날 비활성 | 증빙 전 503, 운영 결제·mock 우회 없음 |
| 2 | P0 | V1 토큰·조회·취소 및 네 메서드 구현 | 금액/주문/PG/상태/시각 검증과 단위 테스트 통과 |
| 3 | P0 | 모드·DB 기록·서명·nonce·콜백 DTO·두 번째 조회 전환 | V1 보호 누락 없음, imp_uid로 일관된 조회·기록 |
| 4 | P0 | V1 CDN SDK 및 신규/연장·모바일 복구 통합 | 테스트 거래의 서버 검증·적용 1회 |
| 5 | P1-① 필수 | SDK 로더 실패 초기화·오류 유지·같은 주문 재시도 | 실패 → 재시도 성공 회귀 통과 |
| 6 | P1-② 필수 | 라우트/서비스 status 허용·소유권·영구 오류 분류 통합 | 소유자 status 연장 성공, 타인 주문 거부, 영구 오류 보존 |
| 7 | P0/P1 검증 | 회귀·빌드·문서 및 V2 의존성 정리 | 아래 인수 기준 충족, 무출금 테스트 검증 증거 확보 |

P1 두 건은 선택적 후속 개선이 아니라 이번 기능 완료에 필수다. 채널 증빙이 준비되지 않은 동안에는 fixture 기반 개발·검증을 진행하되 실제 연동 완료로 보고하지 않는다.

## 6. 테스트 및 인수 기준

### 6.1 서버 단위·통합 테스트

- 토큰: 올바른 endpoint/body, `response.access_token` 파싱, 비정상 code·누락·만료·401 재발급 1회·timeout·동시 발급 합치기.
- 조회: V1 Authorization·no-store·imp_uid 인코딩·봉투 파싱·paid_at 단위 변환, 정상 10,000 KRW 승인.
- 위변조: 9,999/10,001/소수 금액, 주문번호·imp_uid·PG·카드수단·통화·MID 불일치, 다른 주문의 거래 ID, 미래/만료 밖 승인 시각 거부.
- 상태: paid/ready/failed/cancelled/부분취소/알 수 없는 상태, 미승인 결과의 paidAt 미생성, 조회 사이 상태 변경 시 미확정 기록 방지.
- 서명·nonce: 서명 훼손·문맥 교체·만료·타인 소유·nonce 재사용 거부, 동일 거래 재전송 및 동시 콜백의 적용 1회.
- 모드·게이트: 두 selector의 V1 선택·충돌, 필수 키·채널·test 검증값 누락 503, 구 V2 다날 차단, mock 격리 조건 유지.
- 취소: 검증된 테스트 거래만 전체 취소, imp_uid 재조회 확인, 이미 취소된 요청 멱등성, 부분취소/비동기 미확정 결과를 성공으로 보고하지 않음.
- 복구: 승인 전 미저장 imp_uid의 두 번째 조회, 저장 imp_uid 기반 cron, 모바일 imp_uid 유실 시 주문번호 후보 탐색 후 단건 검증, 모호한 거래 자동 적용 금지.

### 6.2 P1 회귀 테스트

| ID | 시나리오 | 기대 결과 |
| --- | --- | --- |
| P1-01 | CDN error/timeout/IMP 없음, 최초 신청 및 연장 | request_pay 0회, 오류 유지, 승인 대기 미표시, 재시도 제공 |
| P1-02 | 최초 script 로드 reject 후 재시도 성공 | 실패 Promise·script 정리, 새 로드 성공, 동일 주문·멱등키, 결제창 1회 |
| P1-03 | request_pay 이후 예외·응답 유실 | 조회/콜백 복구만 실행, SDK·신규 주문 자동 재실행 0회 |
| P1-04 | 본인 status 세션으로 연장 생성 후 콜백 | 라우트·서비스 통과, verifiedIdentityHash 대조, 기간 1회 반영 |
| P1-05 | 타인 status 세션 또는 미인증 콜백 | 각각 404/401, 조회·기록·적용 차단 |
| P1-06 | 직접·복구 콜백 400/403/404 후 GET pending | 거부 오류 유지, 승인 대기 및 새 결제 자동 실행 없음 |
| P1-07 | 콜백 401 / pending 409 / 429 / 503 / network | 각 재인증·일시 복구 정책, 동일 주문 유지 |
| P1-08 | 모바일/새로고침·중복 클릭·중복 콜백 | SDK 자동 재실행 없음, 소유권 유지, 기간 반영 1회 |

### 6.3 검증 실행과 완료 판정

- 기존 `lib/guest-monitoring/vitest.config.ts`는 Node 환경이며 해당 서버 테스트 경로만 포함한다. SDK script·React 훅 회귀는 DOM 또는 브라우저 테스트 환경을 별도로 구성하고 실제 실행 경로를 검증한다. 서버 fixture 통과로 프론트 회귀 통과를 대체하지 않는다.
- 후속 구현에서 V1 테스트 파일을 추가하고 `portone.test.ts`, `portone-boundaries.test.ts`, callback/security 관련 기존 회귀를 갱신한다. 관련 Vitest, 타입 검사, lint 및 Next 빌드로 V2 import 잔존·브라우저 전용 API의 서버 실행 여부를 확인한다.
- 무출금 증빙이 확인된 테스트 채널에서 PC·모바일 신규 신청/연장, SDK 실패 후 재시도, 콜백 유실·재인증 복구를 검증한다. 실제 결제수단의 청구 및 출금을 허용하지 않는다.
- 검증 증거는 민감정보 없는 상태·횟수·결과만 기록한다. 테스트에 운영 DB나 실제 비밀키를 넣지 않는다.
- 이 기획 단계에서는 기능 테스트·실제 PG 호출을 실행하지 않았다. 완료 여부는 후속 구현 및 위 검증 결과로 판단한다.

## 7. 구현 전 확인 사항 및 범위 제외

| 확인 사항 | 처리 원칙 |
| --- | --- |
| imp 코드와 MID의 실제 계정 연결, 무출금 카드 테스트 설정, test 검증값 | 확인 전 503 유지. 숫자만 일치한다고 테스트로 승인하지 않음 |
| V1 응답의 MID·통화·취소 필드 및 `pg.MID` 호환성 | 공식 스키마와 민감정보를 제거한 테스트 응답으로 확정, V2 필드 재사용 금지 |
| DANAL_CARD_ENC_KEY 설정 위치 | 서버 환경/콘솔 역할을 확정하고 브라우저에 전달하지 않음 |
| 기존 V2 pending/paid 주문 존재 여부 | 읽기 전용 확인 후 공급자 혼용 차단·기록 보존 정책 적용 |
| V2 SDK의 다른 사용처 | 전체 검색 후 미사용이면 제거, 다른 용도가 있으면 유지하면서 다날 비활성 명시 |

범위 제외: 실결제 활성화, 운영 키 등록, 신규 PG 추가, 본인인증 공급자 교체, 신규 DB 컬럼, 자동결제·빌링키, 일반 환불 UI, 회원 결제 개편. 기존 등기감시 기간·가격·OTP 정책은 유지한다.
