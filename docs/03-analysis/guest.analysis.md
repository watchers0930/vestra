# 회원 선불 구독 — 설계서 ↔ 구현 갭 분석 (교차수정 반영 후)

> 프로젝트: VESTRA
> 작성일: 2026-10-16
> 분석자: Claude (크로미)
> 기준 설계: [`docs/02-design/features/guest.design.md`](../02-design/features/guest.design.md) (717줄 공용 계약)
> 대상 구현: 미커밋 백엔드(`lib/member-subscription/*`, `app/api/member-subscription/*`, `app/api/cron/member-subscription-lifecycle`, 수정된 기존 라우트) + 프론트(`app/(personal-home)/renewal/pricing/*`, `signup/business/*`, `components/member-subscription/*`, 프로필 패널)
> 교차검수 원본: [`guest.review-backend.md`](./guest.review-backend.md) / [`guest.review-frontend.md`](./guest.review-frontend.md)
> 방법: 정적 코드 대조(백엔드·프론트 병렬 정밀 검증) + 가격 11종 전수 계산 + 핵심 주장 직접 재확인. **코드 미수정·DB 미접근·실결제 미실행.** 브라우저 실환경 검증은 미수행(§5 완료 조건 참조).

---

## 1. Match Rate (일치율)

| 영역 | 일치율 | 근거 요약 |
| --- | ---: | --- |
| **백엔드** | **약 96%** | 가격 SSOT·V1 재조회 11체크·2차 독립조회·nonce 원자소비·txId unique·교차중복 차단·기록/적용 분리·공통 게이트·IDOR·보호경계 전부 설계 준수. 잔여는 설계 §3.7 문서 불일치(코드는 정상) + 경미(M4 activation 잔존·L2·L5). |
| **프론트엔드** | **약 89%** | 교차검수 HIGH 3건·MED 대부분 해소. 미해소: MED10(사업자 신청 복원 — **FE/BE 계약 미비로 구조적 차단**), MED12 일부(`app/(app)/pricing` 레거시 잔존), LOW13·14 일부. 플랫폼 규칙 이탈 1건(`useMemberOrderFlow.ts` 425줄). |
| **종합** | **약 92%** | 보안·결제·정합성 핵심 경계는 설계와 **사실상 완전 일치**. 남은 갭은 ①FE/BE 공용 계약(DTO) 미비에서 비롯된 사업자 전환 흐름, ②레거시 `/pricing` 통합 미완, ③문서-구현 소폭 불일치, ④훅 분리·접근성 품질 항목. |

> 종합 일치율은 "핵심 결제·보안 경계 100% + 주변 UX·계약·문서 갭"의 가중 판단이다. 설계가 "계약서(스펙 고정)"임을 감안하면, **계약을 깨는 치명 불일치는 없고** 남은 것은 완성도·후속 계약 확장 범주다.

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### 2.1 치명(출시 전 반드시) — **GAP 없음(핵심 경계)**

설계 §4.2(11체크)·§4.4(nonce/멱등/분리)·§4.3(교차중복)·§4.5(결제로 role 승격 금지)·§0.1(비회원 경계 diff 0)·§0.2(운영 503 차단)은 모두 구현에서 확인됨. **보안·결제 정합성에 설계 위반 없음.**

- `git diff` 결과 `lib/guest-monitoring/*`·`lib/danal/*` 변경 0건 → §0.1 보호경계 준수.
- `provider.ts`가 production/플래그 삼중 게이트로 503 차단 → §0.2 준수.
- `verification.ts:10-45` 11+체크 + 독립 2차 조회, 불일치 시 `needs_review` → §4.2 준수.

### 2.2 구조적 갭 (FE/BE 공용 계약 보완 선행 필요)

| GAP | 설계 근거 | 현상 | 우선순위 |
| --- | --- | --- | --- |
| **G1. 사업자 전환이 `MemberRoleApplication`과 미연결** | §4.6·§5.2 "서버 `MemberRoleApplication` 상태로 step 복원", §3.1 `roleApplicationId` 전달 | `useBusinessWizard.ts:33-37`은 JWT `verifyStatus`+구독유무만 사용. `Step4Payment.tsx:80` 결제 시 `roleApplicationId` 미전달. `Step2Verify.tsx:83`은 기존 `/signup/complete`로 이탈(성공 시 `/dashboard`로 가 위저드 복귀 문맥 상실). 근본 원인: `MemberSubscriptionStatus` DTO(§2.3)에 신청 id/status 필드가 **없어** FE가 채울 소스가 없음. | **P1** (계약 보완 → 양측 반영) |

### 2.3 연동 누락 / 미완

| GAP | 설계 근거 | 현상 | 우선순위 |
| --- | --- | --- | --- |
| **G2. 레거시 `/pricing` 미전환** | §1.2 "`/pricing`은 회원 화면만 신규 SSOT 참조로 전환" | `app/(app)/pricing/page.tsx:8,27`이 여전히 레거시 `PRICING_PLANS`(29,900/연간 토글) 사용. 신규 기간선택/체험/결제 흐름 없음. (`/renewal/pricing`·마이페이지는 전환 완료) | **P1** |
| **G3. 사업자 모바일 결제 복귀 경로 불일치** | §4.9·§5.1 모바일 복귀 재개 | `MemberPaymentInfo.redirectPath`가 타입상 `/renewal/pricing` 고정(`types:60`). 사업자 step-4 모바일 결제 복귀가 위저드 밖 `/renewal/pricing`에서 처리됨(적용은 되나 UX 단절). 서버가 주문별 redirectPath를 내려주지 않으면 FE 단독 해결 불가 → 계약 확인 필요. | **P2** |

### 2.4 문서-구현 불일치

| GAP | 현상 | 우선순위 |
| --- | --- | --- |
| **G4. 설계 §3.7 제목이 `POST`로 잔존** | 코드는 cron을 `GET`으로 전환 완료(`route.ts:6`) + `vercel.json:38` 등록 완료(H1 코드 해소). 그러나 `guest.design.md:450` 제목이 아직 `POST /api/cron/...` → 스펙-구현 불일치. 운영 무해하나 "스펙에 어긋나면 문서 먼저 고친다"(§0) 원칙상 정정 필요. | **P2** (문서만) |

### 2.5 경미 / 관찰

- **G5.** `activation.ts:26-28` update 경로에 `startDate` 없음 → trial→paid 및 만료 후 재구독 시 `Subscription.startDate`가 최초 가입일로 고정. `appliedPeriodStart`는 정확하나 `status.startDate` 표기가 "현재 유료기간 시작"이 아님(§4.7 "최초 적용 startDate=now"와 소폭 불일치). **설계 의도 확인 필요.**
- **G6.** `monitoring POST` 재활성화 경로의 사전 count/limit 선검사가 `withMonitoringCapacity`(tx 내 재검)와 중복(요청당 +2쿼리, TOCTOU 노출). 최종 방어는 tx가 담당해 안전하나 중복.
- **G7.** `MemberConfigError`가 reason 폐기(`errors.ts:30`) → config_error 발생 시 서버 관측성 전무(민감정보 없는 코드만 로깅 권장).
- **G8.** Dead component: `PricingRenewalClient.tsx`(129줄) 참조 0건(고아). `/renewal/pricing/page.tsx`는 `MemberSubscribeClient` 렌더.

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (구현 결과 기준)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 (500줄 초과 파일 0건. 최대 page 225줄, 최대 service 92줄)
                         ⚠️ 단 useMemberOrderFlow.ts 425줄 — 설계 §1.2 "훅 ≤300줄" 자체 목표 초과
2. 단일 책임           : ✅ 준수 (UI=components / 상태=hooks / 로직=member·lib / API=memberApi·route 분리 명확)
3. 서버 검증·보안      : ✅ 준수 (전 변이 route auth+Origin+16KB+rate+IDOR, cron=CRON_SECRET timingSafeEqual,
                         클라 금액/할인/한도/역할 전부 서버 SSOT, Zod .strict() 금지필드 거부)
4. 성능 (중복·N+1)     : ⚠️ 경미 (status 단일쿼리·cron take 상한·위저드 status 단일화는 ✅.
                         잔여: G6 monitoring 사전 count 중복, M4 activation user 재조회)
5. 폴더 구조           : ✅ 준수 (lib/member-subscription, app/api/member-subscription, types/, route하위 member/hooks/components)
─────────────────────────────────────────────────
위반 항목: 실질 위반 없음.
  - 500줄 초과 0건. 인증 없는 변이 핸들러 0건. 폴더구조·단일책임 준수.
  - 품질 권고: useMemberOrderFlow.ts 425줄 헬퍼 분리(§1.2 목표), G6 중복쿼리 정리.
─────────────────────────────────────────────────
```

**상세:**
- **500줄 제한:** 백엔드 최대 `policy.ts` 92줄, 전 route ≤17줄(설계 ≤120 충족), 전 service ≤92줄(≤200 충족). 프론트 최대 page 225줄. **초과 0건.**
- **훅 목표(§1.2 ≤300):** `useMemberOrderFlow.ts` **425줄** 1건 초과(createOrder·runPayment·callback·recover·모바일복귀·retry 집약). 플랫폼 500줄 하드룰은 아니나 설계 자체 기준 이탈 → 헬퍼 분리 권고.
- **서버 검증:** 전 변이 엔드포인트 인증 확인(6 member route = `requireUser`, cron = `CRON_SECRET`). **인증 없는 POST/PUT/DELETE 0건.** 원시 SQL은 파라미터 바인딩만(SQLi 안전). 응답에 PII/REST원문/imp_uid/토큰/서명/nonce 미노출.
- **dead code API:** 신규 6 route 전부 프론트에서 호출됨(orders→useMemberOrderFlow, callback→memberPayment, recover→복구흐름, trial→beginTrial, status→useMemberSubscription, cron→vercel.json). **API dead endpoint 없음.** (단 G8 — 컴포넌트 레벨 dead code 1건.)

---

## 4. 교차검수 지적사항 해소 확인

### 4.1 백엔드 (review-backend.md) — HIGH 2 / MED 4 / LOW 6

| # | 지적 | 판정 | 근거 |
| --- | --- | --- | --- |
| **H1** | cron POST-only + vercel.json 미등록 | ✅ **해소**(문서 잔존) | `route.ts:6` GET 전환, `vercel.json:38` `"0 * * * *"` 등록, `timingSafeEqual` 검증. ⚠️ 설계 §3.7 제목만 POST 잔존(G4). |
| **H2** | grandfather 한도 폴백 없음 | ✅ **해소** | `policy.ts:68-77` 스냅샷 baseline 누락 시 `snapshot.plan`으로 레거시 한도 복원(PRO→5, BUSINESS/PREMIUM→20) + `Math.max`로 축소 방지. 명시적 0은 유지. |
| **M1** | 중첩 SQL 과잉배제 | ✅ **해소** | `legacy-guards.ts:29` `memberMonitoringFilter()`→`{}`(상위집합), 판정을 JS 필터 일원화 + take 상한. |
| **M2** | config 불완전 시 cron 내부 throw | ✅ **해소(fail-open)** | `monitoring-targets.ts:10-15` try/catch, `provider_unavailable`이면 경고 후 passthrough. |
| **M3** | providerBoundary payment_failed→503 오매핑 | ✅ **해소** | `errors.ts:38-43` payment_failed/not_found/needs_review passthrough, 그 외만 503 정규화. |
| **M4** | locked tx 내 role 중복조회 | ⚠️ **부분** | orders/trial은 user 재사용으로 해소. 단 `activation.ts:17`이 settle 경로에서 `resolveEffectiveRole` 재호출 — 잔존. 성능 경미. |
| **L1** | isPaidPlan vs policy null-status | ◻ 관찰(실질 일치) | policy.ts도 레거시 분기에서 `?? "active"` 사용 → 회귀 위험 낮음. |
| **L2** | trial→paid startDate 유지 | ◻ 미반영 | `activation.ts:26` 유지. 경미(G5). |
| **L3** | withLegacySubscriptionChange 플래그 무관 | ◻ 미반영(보안상 안전) | 플래그 무관 보호가 오히려 안전(유료기간/role 덮어쓰기 차단). |
| **L4** | config 사유 폐기 | ◻ 미반영 | `errors.ts:30` 유지(G7). |
| **L5** | monitoring 사전 count 중복 | ◻ 미반영 | 유지(G6). |
| **L6** | 다운그레이드 전 감시 paused | ◻ 미반영(의도적) | `activation.ts:31-35` 설계 의도(재등록 선택). |

**백엔드 결론:** HIGH 2·MED 3(M1/M2/M3) 전부 해소, M4 부분. LOW는 대부분 설계 의도이거나 경미. **핵심 결제/보안 경계는 설계 완전 준수.**

### 4.2 프론트엔드 (review-frontend.md) — HIGH 3 / MED 9 / LOW 2

| # | 지적 | 판정 | 근거 |
| --- | --- | --- | --- |
| **HIGH1** | 사업자 결제 단계 항상 차단 | ✅ **해소** | `useBusinessWizard.ts:62-68` verified+미구독 `maxStep=4`로 결제 진입 허용. `BusinessWizardContext.tsx:47` 로딩 중 보류, 셸이 ready 전 자식 미렌더. |
| **HIGH2** | 응답 유실 후 GET만 반복 | ✅ **해소** | `useMemberOrderFlow.ts:179-195` `recoverAndCheck`가 POST `/recover` 후 GET 확인. `retry()`가 recheck/retry_same(orderId有)에서 호출. |
| **HIGH3** | 401 후 주문 문맥 상실 | ✅ **해소** | `useMemberOrderFlow.ts:375-414` unauthenticated 시 식별자 쿼리 유지 + `onReauth`, 재로그인 후 recover 재개. `activeRef` 보존. |
| **MED4** | 주문생성 실패 재시도 무동작 | ✅ **해소** | `:333-343` retry_payment·orderId 미발급 retry_same이 createOrder부터 같은 멱등키 재전송. |
| **MED5** | 모바일 복귀 결제 UI 숨김 | ✅ **해소** | `MemberSubscribeClient.tsx:166-175` 선택 조건 밖에서 PaymentStateNotice 렌더. |
| **MED6** | failed/canceled/refunded→'확인 중' | ✅ **해소** | `:145-164` 전 OrderStatus 분기 + 상태별 안내. |
| **MED7** | status 401/세션변경 미처리 | ✅ **해소** | `useMemberSubscription.ts:78-83` 서버 401→reauthRequired, `:111-116` statusOwner≠userId stale 처리. |
| **MED8** | paid_trial 적격성 미반영 | ✅ **해소** | `useMemberPricing.ts:84-86` paidTrialEligible=false 비활성+사유. |
| **MED9** | 체험 실패 결과 폐기 | ✅ **해소** | `useMemberSubscription.ts:118-137` `{ok,message,status}` 반환, 화면 분기 표시. |
| **MED10** | 위저드 복원이 MemberRoleApplication 미연결 | ❌ **미해소(계약 한계)** | JWT verifyStatus만 사용, roleApplicationId 미전달, DTO에 신청 필드 없음(G1). **FE 단독 해결 불가.** |
| **MED11** | 셸·단계 status 중복조회 | ✅ **해소** | `BusinessWizardContext.tsx:40-54` 1회 조회 공유. |
| **MED12** | 레거시 가격 병치 | ⚠️ **부분** | 마이페이지 해소(레거시 월가격 카드 제거, 신규 패널). 단 `app/(app)/pricing` 레거시 잔존(G2). |
| **LOW13** | Link 안 Button 중첩 | ❌ 미해소 | Step1/2/4·MemberSubscriptionPanel `<Link><Button>` 유지. |
| **LOW14** | 접근성 누락 | ⚠️ 부분 | PlanDurationPicker aria-pressed·TrialNotice role=alert 추가. PaymentStateNotice role=status·WizardProgress aria-current·plan 버튼 색상의존은 미해소. |

**프론트 결론:** HIGH 3건 전부 해소, MED 9건 중 7건 해소. 미해소 MED10은 **공용 계약(DTO) 미비에서 비롯된 구조적 갭**으로 FE 단독 수정 불가. MED12·LOW는 품질/연동 범주.

---

## 5. 종합 의견 및 남은 수정 우선순위

### 종합 의견

교차수정이 **실제로 반영되어** 백엔드 HIGH 2건·프론트 HIGH 3건이 모두 해소됐다. 특히 결제·보안의 핵심 경계(서버 금액 SSOT, V1 재조회 11체크, 2차 독립조회, nonce 원자소비, txId unique 교차중복, 기록/적용 분리, IDOR, 비회원 보호경계 diff 0, 운영 503 차단)는 **설계 계약과 사실상 완전 일치**한다. 플랫폼 5대 원칙상 500줄 초과·인증 없는 변이·dead API·폴더구조 위반은 없다.

남은 갭의 성격은 "치명 결함"이 아니라 **①공용 계약(DTO) 확장이 선행돼야 풀리는 사업자 전환 흐름(G1/MED10), ②레거시 `/pricing` 통합 미완(G2), ③문서-구현 소폭 불일치(G4), ④품질 항목(훅 분리·접근성·중복쿼리)** 이다.

⚠️ **완료 선언 불가 — 실환경 검증 미수행.** 본 분석은 정적 코드 대조이며, 설계 §0.2·§6.1·§9에 따라 격리 테스트 DB·t-vestra 무출금 실결제·PC/모바일 복귀·재로그인 회귀·백필 후 grandfather 감시 유지는 **아직 증빙되지 않았다.** 특히 H2(백필 의존)·M1/M2(감시 필터)는 `MEMBER_SUBSCRIPTION_ENABLED` 전환 + 백필 완료 상태의 실데이터 회귀가 필수다. 코드 통과 ≠ 운영 동작(절대규칙 0-1).

### 남은 수정 우선순위

| 순위 | 항목 | 분류 | 조치 |
| --- | --- | --- | --- |
| **P1-1** | **G1/MED10** 사업자 전환-신청 연결 | 계약+FE+BE | `MemberSubscriptionStatus` DTO에 신청 id/status/재개 step 추가 → `useBusinessWizard`가 복원, step-4가 `roleApplicationId` 전달, `/signup/complete` 폼을 위저드로 연결. **설계 §2.3/§5.2 선 정정 후 양측 반영.** |
| **P1-2** | **G2/MED12** 레거시 `/pricing` 통합 | FE | `app/(app)/pricing`을 신규 SSOT 참조/조합 화면으로 전환(또는 명시적 연결). 기존 `lib/pricing-plans.ts` 자체는 보호 유지. |
| **P2-1** | **G4** 설계 §3.7 제목 정정 | 문서 | `POST`→`GET`으로 정정(코드는 이미 GET). |
| **P2-2** | **G3** 사업자 모바일 복귀 경로 | 계약 | 주문별 `redirectPath`를 서버가 내려주도록 계약 확인/보완. |
| **P2-3** | `useMemberOrderFlow.ts` 425줄 | 품질 | recover/모바일복귀 헬퍼 분리(§1.2 ≤300 목표). |
| **P3** | G5(startDate)·G6(중복쿼리)·G7(config 관측성)·G8(dead component)·LOW13·LOW14 | 품질/관찰 | G5는 설계 의도 확인 후 결정, 나머지는 정리/보강. |
| **P0(출시 전)** | 실환경 검증 | 검증 | 격리 DB 서버 테스트 + t-vestra 무출금 결제·모바일/재로그인 복구·백필 후 grandfather 감시 유지 실증빙. §9.3 실결제 선행조건 완료 전 "완료" 미선언. |

---

> 본 분석은 정적 대조 기준이다. 결제·DB·외부연동·백필은 §0-1에 따라 격리 테스트 DB/실환경 검증 전 "완료"로 보지 않는다. 치명 결함은 없으나 출시 완료 판정에는 위 P0 실환경 증빙이 필수다.
