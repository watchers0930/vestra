# Guest payment adapters

`portone.design.md`의 orders/callback/status DTO를 사용한다. PortOne 본인인증,
웹훅, 자동 환불, DB 마이그레이션은 추가하지 않는다. SMS OTP는 기존 경로를 유지한다.

## 활성화 제약 (P0)

2026-10-15 확인: 공식 REST V2의 조회/취소, `KRW`, `SelectedChannel.type`
(`TEST`/`LIVE`), `channel.key`, `pgProvider`, `transactionId` 필드는 확인했다.
해당 상점의 **다날 V2 결제 지원, 무출금 테스트 채널, 지원 payMethod**는
콘솔 증빙이 없어 확인하지 못했다. V1이나 다른 PG로 대체하지 않는다.

따라서 `portone-test-channels.ts`의 검토된 채널 목록은 비어 있다.
환경변수만 채우거나 `test:true`를 설정해도 결제 실행 정보는 발급되지 않으며,
`provider_unavailable` (503)로 차단한다. 실결제를 실행한 적은 없다.
검토된 콘솔/공식 지원 증빙이 확보된 후에만 정확한 storeId/channelKey,
payMethod, pgProvider와 비밀정보가 없는 증빙 참조를 목록에 등록해야 한다.
SDK 버전과 KRW 경계 표기도 그때 확인해야 한다.

필요 환경변수:

- `GUEST_PAYMENT_MODE=portone` (또는 `DANAL_PROVIDER=portone`; 둘 다 설정 시 같아야 함)
- `NEXT_PUBLIC_PORTONE_STORE_ID`
- `NEXT_PUBLIC_PORTONE_CHANNEL_KEY_DANAL`
- `PORTONE_V2_API_SECRET` (서버 전용)
- 기존 기능/암호화 설정과 `SEARCH_INDEX_KEY` 또는 `AUTH_SECRET`

브라우저 SDK 설치와 `scripts/audit-api-auth.mjs` allowlist 설명 갱신은
이번 작업의 수정 허용 경로 밖이므로 수행하지 않았다. 기존 API 인증 감사는 통과한다.

## 검증

`npx vitest run --config lib/guest-monitoring/vitest.config.ts`

PortOne 네트워크는 모두 mock한다. 단위 테스트용 가상 채널은 테스트 모듈에만 있으며,
운영 채널 목록이나 환경변수에 주입하지 않는다. 단위 테스트는 실제 PG 성공 증빙이 아니다.
실제 PostgreSQL 통합 검증은 별도 `GUEST_TEST_DATABASE_URL`이 있는 격리 DB에서 수행한다.

`FAILED`나 승인 전 `CANCELLED`에는 `paidAt`이 없을 수 있다. 승인 시각을 만들지 않고
내부 terminal 오류로 전달하여 재조회로 같은 결과를 확인한 후 실패/취소만 기록한다.
`READY`/`PAY_PENDING`은 기록하지 않고 `payment_pending` (409)를 반환한다.
응답 유실 후 서명된 재전송은 기존 거래와 소비 receipt가 일치할 때만 멱등 복구한다.

공식 자료:
- https://developers.portone.io/api/rest-v2/payment
- https://github.com/portone-io/server-sdk/blob/main/javascript/src/generated/payment/PaidPayment.ts
- https://github.com/portone-io/server-sdk/blob/main/javascript/src/generated/payment/FailedPayment.ts
- https://github.com/portone-io/server-sdk/blob/main/javascript/src/generated/common/SelectedChannel.ts
