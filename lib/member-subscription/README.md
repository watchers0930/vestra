# 회원 선불 구독 백엔드

계약: `docs/02-design/features/guest.design.md`. 이 파일의 이름과 달리 회원 전용 기능이다.
비회원 도메인/공급자 구현 및 기존 subscription-guard/subscription-plan은 변경하지 않는다.

## 구현과 출시 경계

- API 7개: orders POST, orders/[orderId] GET, recover POST, callback POST,
  trial POST, status GET, member-subscription-lifecycle GET.
- 가격표 11개, 서버 역할/인증/소유권 검증, strict DTO, Origin 검증, 16KB 실측,
  원자 rate limit, HMAC/nonce, 독립 REST 이중 조회, 거래 교차중복 검증.
- 결제 기록과 구독 적용은 별도 커밋. 적용은 사용자 행 잠금 아래 영수증/기간과 함께 커밋.
  외부 공급자 호출은 DB 트랜잭션 밖에서 실행한다. 원문 공급자 오류는 응답/로그에 전달하지 않는다.
- 체험 1회 소비와 trialing 생성은 한 트랜잭션. 자동 청구/빌링키 수집 없음.
- 기존 FREE/해지 경로가 새 선불 구독을 덮어쓰지 못하게 보호한다.
- 감시 등록/재활성화와 회원 배치는 같은 유효 권한을 검사한다. 한도 축소 시 데이터는 보존하고,
  과다 활성 항목을 중지한 다음 기존 등록 API로 사용자가 선택해 재활성화한다.
- 승인 불명확/TTL 경과 주문은 자동 새 결제를 만들지 않는다. 복구해도 후보가 없으면 pending을
  보존한다. needs_review는 자동 해제하지 않는다. 운영 검토 절차가 필요하다.

## 미실행 항목 / P0 출시 조건

운영 DB, 자격증명, 환경변수, 실결제, 배포 및 스케줄러는 변경하지 않았다.

1. 승인된 policyEffectiveAt/가격·정책 버전과 기존 회원 권한 백필이 필요하다.
   미분류 기존 사용자를 임의로 신규 정책에 편입하지 않는다.
2. `prisma/schema.prisma`는 모델 변경안이며 `member-subscription.constraints.sql`도 검토용이다.
   baseline → preview DB 재현/제약/쿼리 계획 검증 → 백필 dry-run → 백업 → 별도 승인 후 적용.
   현재 운영 DB는 migrate 미관리이므로 push/migrate를 실행하지 않는다.
3. 스키마 적용 전 배포하지 않는다. 생성된 Prisma Client는 새 컬럼을 참조한다.
4. 승인 전 MEMBER_SUBSCRIPTION_ENABLED를 설정하지 않는다. 활성화 시 필요한 값:
   NEXT_PUBLIC_MEMBER_PRICE_VERSION(공유 상수 MEMBER_PRICE_VERSION의 빌드 값),
   MEMBER_POLICY_VERSION, MEMBER_POLICY_EFFECTIVE_AT.
   실제 .env 파일은 수정하지 않았다. 위 버전과 도입 시각은 임의 기본값이 없다.
5. 공급자 설정은 현 공용 plumbing 제약 때문에 운영에서 항상 503이다.
   격리 테스트에만 MEMBER_PAYMENT_ENVIRONMENT=test, MEMBER_SUBSCRIPTION_ISOLATED_TEST=true,
   MEMBER_MERCHANT_CONFIG_VERSION과 증빙된 기존 테스트 채널이 필요하다.
   현재 allowlist가 비어 있으므로 자격증명만으로 게이트가 열리지 않는다.
   live plumbing은 설계서 §9.3의 별도 승인/검증 대상이다.
6. cron은 CRON_SECRET Bearer 인증 GET이며 vercel.json에 매시간 실행을 등록했다.
   실제 배포 후 스케줄 실행과 복구·전이·알림에 대한 운영 관측이 필요하다.
7. 사업자 인증·신청 생성/승인은 기존 별도 흐름이다. MemberRoleApplication을 임의 생성하거나
   결제로 User.role을 변경하지 않는다. 전체 사업자 API별 정책 적용 목록은 출시 전 확정해야 한다.
8. 실제 preview DB 동시성/저장/실패 복구 및 PC·모바일 무출금 결제 증빙은 아직 없다.

## 검증

- `npx vitest run --config lib/member-subscription/vitest.config.ts`
- `npx vitest run --config lib/guest-monitoring/vitest.config.ts`
- `npm test`, `npm run lint`, `npm run build`, `npm run audit:api`
- 회원 상태 테스트는 직렬화/롤백을 갖춘 메모리 fixture이며 실제 PostgreSQL 검증을 대체하지 않는다.
- 비회원 통합 테스트는 환경이 없으면 기존 테스트 규칙대로 skip한다.
- 신규 TS/route 파일은 모두 500줄 미만이다. 기존 단일 Prisma 스키마는 변경 전부터 500줄을
  초과한다. 보호 모델 이동/재포맷 없이 회원 모델만 추가하여 해당 예외는 그대로 남아 있다.
