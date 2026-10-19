# 회원 구독(member-subscription) 출시 런북

> 작성: 2026-10-19 (인계·정리 세션)
> 목적: 코드는 완성·검증됐고 **안전하게 비활성(플래그 off)** 상태로 운영에 배포돼 있다.
> PG 정식 계약·승인이 끝나면 **이 문서 순서대로** 실행해 출시한다. 각 단계는 대장 승인·백업이 선행된다.
> 설계 계약: `docs/02-design/features/guest.design.md`(이름과 달리 회원 전용) · 백엔드 가이드: `lib/member-subscription/README.md`

---

## 0. 현재 상태 (출시 전)

- ✅ **코드 완성**: API 7종·결제 검증(V1 2회 재조회·HMAC·nonce·금액 SSOT)·활성화·체험·라이프사이클 cron·사업자 위저드. 테스트 154 pass(격리 DB 9 skip)·타입 0·메인 회귀 0.
- ✅ **운영에 배포돼 있으나 완전 비활성**: `MEMBER_SUBSCRIPTION_ENABLED` 미설정 → API·cron 전부 `provider_unavailable`(503)로 즉시 중단. **없는 테이블을 쿼리하지 않음**(cron도 `memberReleaseConfig()`에서 먼저 fail). 사용자에게 구독 UI 노출 없음.
- ✅ H1(cron GET+vercel.json 등록)·H2(grandfather 폴백 `policy.ts:51-61`)는 **이미 구현됨**.

## 1. 선행 조건 (대장·PG 확보 후 시작)

- [ ] PortOne/다날 **정식 가맹점 계약 완료** + live 채널(impCode·MID·REST 키/시크릿) 발급
- [ ] 승인된 **가격·정책 버전**(`MEMBER_PRICE_VERSION`/`MEMBER_POLICY_VERSION`)과 **도입 시각**(`MEMBER_POLICY_EFFECTIVE_AT`) 확정
- [ ] **기존 회원 권한 baseline** 확정 (grandfather 보존 대상: 어떤 회원이 어떤 감시 한도를 유지하는지)
- [ ] 운영 DB 백업 가능 상태

## 2. 출시 절차 (순서 엄수)

### A. Prisma 스키마 적용 ⚠️ 운영 DB 변경
> 운영 DB는 migrate 미관리 → `prisma migrate/db push` 금지. 수동 DDL + 검증.
1. `prisma/member-subscription.constraints.sql`(검토용) + `prisma/schema.prisma`의 신규 모델(`SubscriptionOrder`·`MemberSubscriptionPolicy`·User.membershipPolicy) 검토
2. **preview DB에서 재현**: DDL 적용 → 제약(CHECK/UNIQUE) → 쿼리 계획 검증
3. **백업** 후 운영 DB에 수동 DDL 적용 (IF NOT EXISTS, 보호 모델 무변경)
4. `npx prisma generate` (Client가 새 컬럼 참조)
5. ⚠️ **스키마 적용 전 배포 금지** (Client가 없는 컬럼 참조 시 런타임 에러)

### B. 기존 회원 grandfather 백필 ⚠️ 데이터
> 미실행 시: 도입 전 회원이 enable 순간 감시 한도 0으로 급락 위험(폴백은 `policy.ts`에 있으나 스냅샷이 정본).
1. 승인된 baseline으로 도입 전 회원의 `MemberSubscriptionPolicy` 레코드 생성
2. `legacyEntitlementsSnapshot`에 기존 권한(`monitoringLimit`, `plan`) 채우기
3. **dry-run → 검수 → 커밋**. 미분류 사용자를 임의로 신규 정책에 편입하지 않음.

### C. PG live 채널 연결 ⚠️ 결제
1. `lib/danal/portone-v1-test-channels.ts`(또는 live 채널 레지스트리)의 `verifiedV1*Channels` allowlist에 **승인·증빙된 live 채널** 추가 (설계서 §9.3)
2. 현재 `provider.ts`가 `channelEnvironment="test"` 고정 + `sandbox===true` 강제 → **live plumbing은 §9.3 별도 검증 후** 연결

### D. 환경변수 설정
```
MEMBER_SUBSCRIPTION_ENABLED=true
NEXT_PUBLIC_MEMBER_PRICE_VERSION=<MEMBER_PRICE_VERSION 빌드값>
MEMBER_POLICY_VERSION=<승인값>
MEMBER_POLICY_EFFECTIVE_AT=<ISO, 과거/현재>
# 결제(초기 테스트 검증용): MEMBER_PAYMENT_ENVIRONMENT=test + MEMBER_MERCHANT_CONFIG_VERSION
# live 전환 시: 위 test 값을 live plumbing(§9.3)으로 교체
```
(Vercel env. 운영 직행 금지 — t-vestra preview에 먼저)

### E. 테스트 배포 → 검증 → 운영 승격 (CLAUDE.md 규칙)
1. t-vestra에 **무출금 테스트 모드**로 배포 → 구독 신청·주문·결제창·콜백·활성화 PC/모바일 증빙
2. smoke + member 테스트 통과 확인
3. 대장 확인 후 `deploy vestra promote`

### F. 출시 후 관측
- cron(`member-subscription-lifecycle`, 매시간) 실제 실행 로그 + 만료→grace→locked 전이·재적용·알림
- `needs_review` 큐 수동 검토 절차 가동 (자동 해제 안 함)

## 3. 롤백
- 긴급 시 **`MEMBER_SUBSCRIPTION_ENABLED` 제거**(env) → 전 기능 즉시 비활성(503), 코드/DB 그대로. 가장 빠른 안전장치.
- 코드 롤백: `backup/ux-recovery-20261019` 또는 직전 운영 deployment alias 복구.

## 4. 남은 개선 (출시 필수 아님 — 백로그)
- **G1**: 사업자 위저드 단계 복원 — `MemberSubscriptionStatus` DTO에 `roleApplicationId/status/completionStep` 추가하면 이탈 후 재방문 시 단계 복원이 매끄러워짐(현재는 verifyStatus 기반으로 동작하되 복원만 덜 매끄러움).
- **G2**: `/pricing` 레거시를 `/renewal/pricing` 신규 화면으로 정리(현재 리다이렉트로 커버).
- 둘 다 UX 개선이며 출시를 막지 않음. 출시 후 반영 가능.
