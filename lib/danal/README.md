# 비회원 등기감시 PortOne V1 백엔드

`docs/02-design/features/portone.design.md`의 orders/callback/status 계약을 따른다.
V1 `imp_uid`는 거래번호, `orderId`는 `merchant_uid`이며 서로 대체하지 않는다.
OTP 인증, 가격, DB 구조, mock 격리 정책은 유지한다.

## 안전게이트와 배포 전 확인

`portone-v1-test-channels.ts`의 승인 목록은 비어 있다. 따라서 환경변수가
설정되어도 SDK 실행 정보 발급과 REST 통신은 503으로 차단된다.
실제 무출금 연동 완료를 의미하지 않는다. V2 선택값 `portone`도 503이다.

설계 §0.1에 따라 콘솔의 imp 코드/MID 계정 결합, 무출금 카드 채널,
민감정보 제거한 실제 V1 응답, 지정 CDN의 `pg.MID` 호환성,
`DANAL_CARD_ENC_KEY` 설정 위치를 검토한 후에만 증빙 목록을 등록한다.
암호화 키는 SDK 응답·토큰 요청·결제 REST body에 포함하지 않는다.

필수 환경변수:

- `GUEST_PAYMENT_MODE=portone_v1` 또는 `DANAL_PROVIDER=portone_v1`
  (둘 다 지정하면 동일해야 함)
- `NEXT_PUBLIC_PORTONE_V1_IMP_CODE`, `DANAL_MID`
- `PORTONE_V1_REST_API_KEY`, `PORTONE_V1_REST_API_SECRET` (서버 전용)
- `SEARCH_INDEX_KEY` 또는 `AUTH_SECRET` (서버 전용 서명키)
- 기존 기능·암호화·세션 환경변수

## 책임과 복구

- `iamport-rest.ts`: 고정 V1 호스트, 토큰 캐시/single-flight,
  401 시 1회 재발급, 8초 timeout, no-store, 오류 정제.
- `iamport-schemas.ts`: V1 봉투와 최소 결제 필드 검증, PII 제거.
- `portone-v1-payment.ts`: MID/금액/통화/PG/수단/시각/취소 대조.
- `portone-v1.ts`: SDK 실행 정보, 서명 검증, 거래 조회, 테스트 전체 취소.
- `portone-callback.ts`: HMAC 문맥, nonce receipt 형식.
- `lib/guest-monitoring/payment-callback.ts`: Origin 검사를 마친
  apply/status/renewal 세션의 신원 결합, 두 번째 imp_uid 조회, 원자 기록.
- `lib/guest-monitoring/recovery.ts`: paid 미적용 주문 최대 50건,
  현재 공급자와 동일한 주문만 저장된 거래번호로 재검증.
- `lib/guest-monitoring/recover-pending-payment.ts`: 검증된 서버 세션을
  받는 imp_uid 유실 복구 함수. merchant_uid 후보가 정확히 하나일 때만
  서명·두 번의 거래 조회·원자 기록 경로로 전달한다. 후보가 없으면 pending,
  복수면 needs_review 오류다. 새 결제창이나 주문을 생성하지 않는다.

§4.6은 pending 복구의 HTTP 메서드/경로/DTO를 정의하지 않으므로
공개 엔드포인트를 임의 추가하지 않았다. 주문 상태 GET도 그대로 유지한다.
복구 함수의 HTTP 연결에는 공용 계약 확정이 필요하다.

기존 V2 주문은 재해석하거나 수정하지 않는다. 신규 V1 모드와 다른 주문의
재사용은 기존 주문 서비스에서 503으로 차단한다.

## 검증

`npx vitest run --config lib/guest-monitoring/vitest.config.ts`

테스트 채널은 모듈 mock으로만 주입하며 실제 결제·취소를 호출하지 않는다.
DB 통합 테스트는 기존 격리 DB 조건을 만족할 때 별도로 수행한다.
패키지 제거와 API 감사 allowlist 설명 변경은 허용 경로 밖이므로 이 작업에서
수행하지 않는다. 프론트의 V2 SDK import 제거는 프론트 작업 범위다.

## 공식 V1 참고 자료

- https://developers.portone.io/api/schema/v1/openapi.json
  (`PaymentAnnotation.pg_id`: MID, `paid_at`: Unix seconds,
  `cancel_amount`/`cancelled_at`/`cancel_history`: 취소 정보)
- https://developers.portone.io/opi/ko/integration/pg/v1/danal
  (`danal_tpay`, `card`, `pg` deprecated 안내; 실제 pg.MID 호환성은 미검증)

공식 스키마 확인은 실제 테스트 채널 응답·무출금 증빙을 대체하지 않는다.
