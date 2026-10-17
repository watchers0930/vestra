# 회원 선불 구독 — 백엔드 교차검수 리포트 (Codex 구현분)

> 검수자: Claude (크로미)
> 작성일: 2026-10-16
> 대상: 커밋 안 된 백엔드 변경분 — `app/api/`, `lib/member-subscription/`, `types/`, `prisma/schema.prisma`, 수정된 기존 라우트(`app/api/subscription/*`, `app/api/monitoring/*`, `app/api/cron/registry-monitor`)
> 기준 스펙: [`docs/02-design/features/guest.design.md`](../02-design/features/guest.design.md)
> 관점: 보안(인증·CSRF·입력검증·SQLi/XSS·IDOR)·버그·성능(N+1·중복호출)·설계 스펙 일치
> 성격: **리뷰만 수행. 코드 미수정.**

---

## 0. 총평

전반적으로 **설계 계약을 상당히 충실하게 구현**했다. 특히:

- 서버 금액 산정 SSOT, 클라이언트 금액/할인 입력 거부, V1 재조회 11개 검증 항목(§4.2), 두 번째 독립 조회 대조, nonce 원자 소비, `providerTransactionId` unique 교차중복 차단, 사용자 행 `FOR UPDATE` 직렬화, 기록(paid)/적용(appliedAt) 분리 커밋 — **핵심 결제 보안 경계가 스펙대로 구현**됨.
- 모든 변이 라우트에 `auth()` + 회원 전용 Origin(Referer 우회 차단) + content-length 상한 + rate limit + 소유권(IDOR) 게이트가 일관 적용됨.
- 운영 실결제는 `memberProviderConfig()`가 **production에서 무조건 503 차단** + `MEMBER_SUBSCRIPTION_ENABLED`/`MEMBER_PAYMENT_ENVIRONMENT`/`ISOLATED_TEST` 삼중 게이트로 fail-safe. 플래그 OFF 시 기존 동작 **무변경**(회귀 안전).
- Zod `.strict()` DTO, 금지 필드 즉시 거부, strict regex(imp_uid/orderId/idempotencyKey) — 입력검증 양호. 원시 SQL은 `$queryRaw` 파라미터 바인딩만 사용(SQLi 안전). 응답에 PII/REST 원문/imp_uid/토큰/서명/nonce 미노출.

다만 **enable 시점 회귀 위험 2건(HIGH)**과 설계↔플랫폼 불일치 1건(HIGH), 다수의 MED/LOW가 있다. 아래 상세.

---

## 1. HIGH

### [HIGH] H1. cron 생명주기 엔드포인트가 트리거 불가 — POST-only + vercel.json 미등록
- **파일:** `app/api/cron/member-subscription-lifecycle/route.ts:6`, `vercel.json`, 설계 §3.7
- **문제:** Vercel Cron은 등록된 path를 **GET 요청**으로 호출한다(이 리포지토리의 기존 cron 9개가 전부 `export async function GET`, `vercel.json > crons`에 등록됨). 그런데 신규 cron은 `export async function POST`만 노출하고 `vercel.json`에도 추가되지 않았다. 따라서:
  - 만료→grace→locked 전이, `paid && appliedAt=null` 재적용, 만료/만료임박 알림이 **자동 실행되지 않는다.** 콜백 직후 적용이 실패한 주문(일시 장애)은 영구히 미적용 상태로 잔존한다.
  - 설계 §3.7도 "POST"로 적어 **스펙 자체가 Vercel Cron 동작과 모순**이다.
- **영향:** 생명주기 전반(견고성 §0-5 "수명주기")이 운영에서 미작동. 결제는 되고 서비스 적용이 안 되는 주문의 복구 경로가 사라짐.
- **수정 제안:** 다른 cron과 동일하게 `GET` 핸들러로 전환(현 `Authorization: Bearer ${CRON_SECRET}` 검증 유지), `vercel.json`의 `crons`에 path+schedule 추가. 설계 §3.7도 GET으로 정정. (브라우저 접근은 Origin 없는 GET이라도 Bearer 미검증 시 403으로 차단되는지 확인.)

### [HIGH] H2. grandfather 감시 권한 보존이 백필 스냅샷에 전적으로 의존 — 누락 시 기존 감시 무음 중단
- **파일:** `lib/member-subscription/policy.ts:57-66`, `lib/member-subscription/monitoring-targets.ts:19-22`, `lib/member-subscription/legacy-guards.ts:28-44`
- **문제:** `MEMBER_SUBSCRIPTION_ENABLED="true"`가 되면 감시 배치의 권한 판정이 `effectiveEntitlement`로 일원화된다. grandfather 회원(활성 유료 `Subscription` 행이 없는 경우)의 한도는 **오직 `membershipPolicy.legacyEntitlementsSnapshot.monitoringLimit`** 에서만 복원된다(`policy.ts:63-65`). 백필이 그 JSON path(`> 0`)를 정확히 채우지 못하면:
  - `monitoringLimit = 0`, `canUsePaidFeatures = false`로 떨어지고,
  - cron SQL 프리필터(`legacy-guards.ts:33` — `legacyEntitlementsSnapshot path:["monitoringLimit"] gt:0`)와 권위 JS 필터(`monitoring-targets.ts:21`)가 **해당 회원의 모든 활성 감시 물건을 배치에서 제외**한다.
  - 레거시 `subscription-guard`의 실제 한도로 **폴백하는 코드가 없다.**
- **영향:** 설계 §4.5/§4.7 "grandfather 감시 권한 축소 금지", "레거시 보유 권한에 새 가드를 일괄 적용해 축소하지 않는다"를 **정면 위반**할 수 있다. 플래그만 켜면(백필 불완전 상태) 기존 회원 감시가 조용히 멈춘다. 견고성 §0-5(규모·비정상 경로) 대상.
- **참고:** 플래그 OFF이면 완전 무변경이라 현재는 잠복 위험이다. 그러나 코드에 안전망이 없고 실패가 **무음**(에러 없이 대상에서 빠짐)이라는 점이 위험.
- **수정 제안:** grandfather 사용자는 스냅샷에 `monitoringLimit`이 없을 때 레거시 `getMonitoringLimit`(subscription-guard) 값으로 폴백하거나, enable을 "백필 검증 완료" 선행조건에 하드 의존시키고 "빈 스냅샷 grandfather가 레거시 한도를 유지하는지" 테스트를 추가한다.

---

## 2. MED

### [MED] M1. `memberMonitoringFilter`의 복잡 중첩 SQL이 유효 유료회원을 과잉 배제(false negative)할 수 있음
- **파일:** `lib/member-subscription/legacy-guards.ts:28-44`
- **문제:** `subscription: { is: { ... OR:[..., { user:{role}, status, endDate:{gt: now-7d} }] } }`처럼 `subscription.is` 내부에 다시 `user` 관계와 grace 윈도우(`endDate > now-7d`)를 중첩한 필터를 registry-monitor의 기본 `propertyFilter`와 AND로 합성한다(`app/api/cron/registry-monitor/route.ts:119`). 권위 JS 필터(`filterMemberMonitoringTargets`)는 이 결과를 **더 좁히기만** 하므로, SQL 프리필터가 과도하게 좁으면 그만큼 **정당한 감시 대상이 그대로 누락**된다(커버리지 축소). 수동 검증이 매우 어렵고 회귀 시 무음.
- **영향:** 유료 회원 등기감시 누락(under-delivery). §4.7 전이표의 grace 경계를 SQL과 JS 양쪽에서 이중으로 표현해 불일치 소지.
- **수정 제안:** SQL 프리필터를 느슨한 **상위집합**으로 두거나(인덱스 활용 목적의 거친 사전필터), 아예 제거하고 `take` 상한 + JS 필터에 일원화. 역할·상태(active/trialing/grace/expired/locked)·grandfather 각 조합 통합 테스트 추가.

### [MED] M2. 플래그 ON + 릴리스 config 불완전 시, 기존 registry-monitor cron 내부에서 throw
- **파일:** `lib/member-subscription/legacy-guards.ts:30`, `lib/member-subscription/monitoring-targets.ts:8` (둘 다 `memberReleaseConfig()` 호출)
- **문제:** `memberReleaseConfig()`는 `MEMBER_POLICY_EFFECTIVE_AT`/버전이 미설정·미래값이면 `fail("provider_unavailable")`(throw)한다(`config.ts:6-7`). `MEMBER_SUBSCRIPTION_ENABLED="true"`이지만 나머지 config가 덜 채워진 **부분 활성화** 상태에서 `memberMonitoringFilter`/`filterMemberMonitoringTargets`가 throw → 기존 **member 등기감시 배치 전체가 중단**될 수 있다(핵심 기존 경로). 결제 플래그는 삼중 게이트인데 이 경로는 단일 플래그로 config throw에 노출됨.
- **수정 제안:** 감시 필터 경로에서는 config 불완전을 "미활성 → `{}`/passthrough 반환"으로 **fail-open**(기능만 비활성, 기존 감시는 유지) 처리. 또는 registry-monitor GET에서 member 필터 호출을 try/catch로 감싸 기존 배치를 보호.

### [MED] M3. `providerBoundary`가 plumbing의 `payment_failed`를 503으로 오매핑
- **파일:** `lib/member-subscription/errors.ts:34-42`; 사용처 `verification.ts:38,40`, `recovery.ts:11`
- **문제:** `findImpUidByMerchantUid`는 후보 `merchant_uid` 불일치 시 `paymentFailed()`(= `GuestError("payment_failed")`) 를 throw할 수 있다(`iamport-rest.ts:90`). 그러나 `providerBoundary`는 `payment_needs_review`만 특례 처리하고 나머지는 전부 `provider_unavailable`(503)로 떨어뜨린다. 결과적으로 복구(`recover`) 중 **거래-주문 불일치라는 영구 실패가 "일시적 공급자 장애(503)"로 보고**되어 클라이언트가 안내 보존(영구 거부) 대신 재시도를 반복한다(§4.9 "400/403/404 영구 거부 → 안내 보존" 취지와 어긋남).
- **수정 제안:** `providerBoundary`에서 `payment_failed`, `not_found`도 그대로 회원 코드로 통과시키고, 그 외만 `provider_unavailable`로 정규화.

### [MED] M4. 주문 생성 트랜잭션 내 동일 user 중복 조회 (성능)
- **파일:** `lib/member-subscription/orders.ts:20,30` (및 `trial.ts:9,11`)
- **문제:** `createMemberOrder`가 user 잠금 트랜잭션 안에서 `resolveEffectiveRole`(user+subscription+membershipPolicy 조인 1회) 호출 후, `ensurePolicy`가 내부에서 `resolveEffectiveRole`를 **다시** 호출해 동일 조인 쿼리를 반복한다. 주문 1건당 불필요한 중복 조회(잠금 보유 구간에서). trial도 동일.
- **수정 제안:** 이미 로드한 `user`를 `ensurePolicy(user, tx)`로 전달하도록 시그니처 조정(§4·§성능 "중복 API/쿼리 금지").

---

## 3. LOW / 관찰

### [LOW] L1. 레거시 ON 전환 시 `isPaidPlan` vs `policy.ts` 상태 판정 미세 차이
- `lib/subscription-plan.ts:11`은 `status ?? "active"`로 null 상태를 유료로 간주하나, `policy.ts:56`은 `sub.status === "active"` 리터럴 비교라 null/빈 상태를 FREE로 판정. `Subscription.status`는 schema default `"active"`라 실제 발생 가능성은 낮지만, 플래그 전환 시 레거시 데이터의 상태 델타가 될 수 있음. (레거시 파리티는 PRO 5 / BUSINESS→PREMIUM 20에서 일치 확인됨.)

### [LOW] L2. 무료체험 후 최초 유료 적용 시 `startDate`가 체험 시작일로 유지
- `lib/member-subscription/activation.ts:27-28` update 경로는 `startDate`를 재설정하지 않아 `trialing`→유료 전환 시 체험 시작일이 남는다. §4.7 "최초 적용 startDate=now"와 미세 불일치(적용 구간은 주문에 별도 기록되므로 표시상 영향만). 

### [LOW] L3. `withLegacySubscriptionChange`는 플래그와 무관하게 항상 동작
- `lib/member-subscription/legacy-guards.ts:19-26`은 `MEMBER_SUBSCRIPTION_ENABLED` 체크 없이 기존 `/api/subscription`·`/cancel`을 항상 `memberTransaction`(user `FOR UPDATE`) + policyVersion 가드로 감싼다. 플래그 OFF에서도 기존 두 라우트의 트랜잭션/동시성 특성이 바뀐다(정합성엔 무해하나 "플래그로 완전 격리" 원칙에서 벗어남). 타 통합점(`isPaidMember`/`getMonitoringLimit`/`memberMonitoringFilter`/`filterMemberMonitoringTargets`)은 모두 플래그 가드가 있어 비대칭.

### [LOW] L4. `MemberConfigError`가 사유를 폐기 (`void reason`)
- `lib/member-subscription/errors.ts:30`. config_error(500) 발생 시 어떤 SSOT 값이 비정수/오설정인지 서버 감사 흔적이 전무. §4.10이 허용하는 "정제 실패 사유" 로깅 부재(관찰성). 민감정보 없는 reason 코드만 로깅 권장.

### [LOW] L5. monitoring POST의 사전 한도 쿼리와 `withMonitoringCapacity` 중복
- `app/api/monitoring/route.ts:142-144`, `196-207`에서 count+limit를 선검사한 뒤 `withMonitoringCapacity`가 트랜잭션 내에서 count+limit+entitlement를 재검사. 원자성 래퍼가 있는 member 경로에선 외부 선검사가 중복 쿼리(요청당 +2). 정합성엔 무해(방어적)하나 중복 호출 최소화 관점에서 정리 여지.

### [LOW] L6. 다운그레이드 재구독 시 전 감시 물건 일괄 `paused`
- `lib/member-subscription/activation.ts:31-35`는 한도 초과 시 활성 물건 **전부**를 paused 처리(코드 주석이 "사용자가 재등록으로 선택"이라 명시). §4.7 "사용자가 활성 5건 선택" 의도와 부합하나, 재적용 직후 사용자가 조치 전까지 전 감시가 일시 중단됨(UX). 설계 의도 범위 내이나 기록.

---

## 4. 설계 스펙 일치 요약 (§ 대조)

| 영역 | 결과 |
| --- | --- |
| §2.4 가격 SSOT·`computeAmount` 정수검증·역할/기간 허용표 | ✅ 일치 (RENTAL_BIZ 포함, 개인 PREMIUM·1개월 거부, paid_trial PERSONAL 전용) |
| §3 공통 게이트(auth→Origin→16KB→rate→위임)·`no-store`·실패형태 | ✅ 일치 (`http.ts`) |
| §3.1 주문 생성(금지필드 거부·멱등 재사용·미완료 1건·스냅샷) | ✅ 일치 |
| §3.3/§4.2 V1 재조회 11개 검증 + 두 번째 독립 조회 대조 | ✅ 일치 (`verification.ts`) |
| §4.4 nonce 원자 소비·멱등·기록/적용 분리·`providerTransactionId` unique | ✅ 일치 (`record-payment.ts`, `activation.ts`) |
| §4.3 회원·비회원 교차중복(prefix·서명·merchant_uid 정확일치, 비회원 테이블 읽기만) | ✅ 일치 (`record-payment.ts:16-20`, 비회원 테이블 write 없음) |
| §3.5 7일 체험 원자적 1회·Payment 미생성 | ✅ 일치 (`trial.ts`) |
| §3.6 status(locked 접근 가능·used 단일쿼리·grandfather 비오류) | ✅ 일치 (`status.ts`) |
| §3.8 기존 `/api/subscription` 402 유지·FREE 다운그레이드만·subscription-guard 불변 | ✅ 유지 (레거시 파일 미수정, 래퍼로만 분기) |
| §0.1 비회원 보호경계(guest-monitoring/portoneV1Provider diff 0) | ✅ 미접촉 (저수준 plumbing `iamport-rest`/config만 읽기 재사용) |
| §0.2 운영 실결제 차단(production 503·격리테스트 전용) | ✅ 일치 (`provider.ts:13-14`) |
| §3.7 cron 생명주기 | ❌ **H1 — POST-only·vercel.json 미등록으로 미작동** |
| §4.5/§4.7 grandfather 권한 보존 | ⚠️ **H2 — 백필 스냅샷 의존, 폴백 없음** |

---

## 5. 권고 조치 우선순위

1. **H1** cron GET 전환 + vercel.json 등록 (미작동 → 생명주기 전체 부재). 설계 §3.7 정정.
2. **H2** grandfather 한도 폴백 또는 백필 하드 의존 + 테스트 (enable 시점 무음 회귀 차단).
3. **M2** 감시 필터 경로 config throw → fail-open (부분 활성화 시 기존 배치 보호).
4. **M1** SQL 프리필터 느슨화/일원화 + 통합 테스트.
5. **M3** `providerBoundary` payment_failed/not_found 통과.
6. **M4/L5** 중복 조회·쿼리 정리, **L3** 플래그 가드 일관화, **L1/L2/L4/L6** 관찰 항목 반영 검토.

> 본 리뷰는 정적 분석 기준이다. 결제·DB·외부연동은 §0-1에 따라 격리 테스트 DB/실환경 검증 전 "완료"로 보지 않는다. 특히 H2/M1/M2는 `MEMBER_SUBSCRIPTION_ENABLED` 전환 + 백필 완료 상태에서의 실데이터 회귀 검증이 필수다.
