# 비회원 등기감시 백엔드 운영 메모

기능 기본값은 OFF이며, 운영 mock/미설정 실다날 연동은 503으로 폐쇄한다.
기능 개방 전 별도 DB 적용 절차와 실다날 계약 검증이 필요하다. 이 수정의
Prisma 변경은 기존 String 상태 설명 주석뿐이며 새 컬럼/DDL을 추가하지 않는다.

## 스케줄 및 빌드 사전 조건

- `vercel.json`에 `/api/cron/guest-monitoring-lifecycle`, `0 * * * *` 등록이 필요하다.
  라우트 생성만으로 Vercel이 실행하지 않는다. 기능 OFF에서는 DB 접근 전 404를 반환한다.
- 회원 감시 재시도 슬롯은 기존처럼 해당 시간대의 최종 `fetch_failed` 건만 처리한다.
  회원 처리 상한은 50에서 실제 비회원 처리 수(최대 15)만 차감한다.
  비회원 처리 도중 예외면 이미 소비한 작업량이 불명확하므로 15를 예약한다.
- 기존 `scripts/audit-api-auth.mjs`는 guest 세션/서명 검증 래퍼를 인식하지 않는다.
  별도 범위의 감사 스크립트 변경 시 비회원 변이 라우트 6개의 검증을 등록해야 한다.
  감사 실패를 통과시키기 위한 가짜 인증 주석이나 인증 우회는 추가하지 않는다.

## 결제 수동 처리 큐

승인된 initial 주문이 활성 물건/이미 적용된 initial 주문과 충돌하면 즉시
`needs_review`로 전이한다. `paidAt`/거래 증빙을 보존하고 `appliedAt`은 null로 유지한다.
복구 cron은 이 주문을 다시 적용하지 않는다. 콜백 재전송도 상태를 해제하지 않는다.
`GUEST_PAYMENT_NEEDS_REVIEW` 감사 로그와 `payment_needs_review` 오류 로그로 식별한다.
새 결제를 만들지 않고 기존 주문을 반환하며 초안 정리에서도 제외한다.
자동 환불은 수행하지 않는다. 운영자가 증빙과 기존 적용 내역을 확인한 뒤
확정된 환불/서비스 정책에 따라 별도 처리해야 한다.

```sql
SELECT "orderId", "status", "paidAt", "appliedAt"
FROM "GuestMonitoringOrder"
WHERE status = 'needs_review'
ORDER BY "paidAt";
```

## SMS 재시도와 불명 결과

- `preparing`: 복호화/신원 잠금/설정 조회 단계. 임대 만료 후 재시도할 수 있다.
- 외부 발송 직전에 별도 커밋으로 `dead` 표시를 남긴다. 이후 결과가 불명확하면
  영수증 조회만 한다. 발송 표시와 실제 외부 호출 사이의 프로세스 중단은
  원자화할 수 없으므로 이 작은 구간도 조회/수동 확인 대상으로 남긴다.
- 제공자가 미접수를 확정한 경우만 `failed`로 재발송한다. 최대 3회 시도한다.
- 종료된 불명/실패 건은 `dead`, `nextAttemptAt=null`이고
  `GUEST_SMS_NEEDS_REVIEW` 감사 로그와 `sms_reconciliation_required` 오류 로그를 남긴다.
  이 상태를 임의로 pending으로 되돌리기 전에 제공자 접수/발송 내역을 확인한다.
- 연장이 먼저 완료되면 신원 잠금 안에서 만료 상태를 재확인해 오래된 안내를 취소한다.

## 콜백과 쿠키

본문 파싱 전 IP당 분당 120회, 서명 검증 후 nonce/주문당 분당 20회 제한한다.
운영의 브라우저/세션 쿠키는 모두 HttpOnly, Secure, SameSite=None이다.
일반 변이 API의 Origin 검증과 브라우저 바인딩은 계속 필수다.
실다날 리턴 방식과 브라우저 동작은 공급사 연동 시 별도로 검증해야 한다.

## 검증

`npx vitest run --config lib/guest-monitoring/vitest.config.ts`

DB 통합 테스트는 `GUEST_TEST_DATABASE_URL`이 전용 loopback PostgreSQL
(`127.0.0.1:55439/vestra_guest_isolated`)을 가리킬 때만 실행된다.
Solapi 계약 테스트는 설치된 실제 SDK를 사용하며 HTTP만 대체한다.
실제 문자 발송/제공자 계정 연동을 검증하는 테스트는 아니다.
