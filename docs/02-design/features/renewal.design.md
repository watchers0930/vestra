# Renewal 회원가입·구독 통합 위저드 설계서 (공용 계약서)

> 프로젝트: VESTRA
> 작성일: 2026-10-20
> 상태: 설계 — 백엔드(Codex)·프론트엔드(Claude) 공용 계약서. 이 문서는 구현·DB·env·실결제·배포를 수행하지 않는다.
> 연계 기획: [renewal.plan.md](../../01-plan/features/renewal.plan.md)
> 상위/관련 설계: [signup-subscription-integration.design.md](./signup-subscription-integration.design.md), [guest.design.md](./guest.design.md), [pro.design.md](./pro.design.md)
> 기준 코드(읽기 전용 확인): `lib/member-subscription/*`, `app/api/signup/onboarding-status`, `app/api/user/setup-role`, `app/api/member-subscription/*`, `app/(personal-home)/signup/*`, `app/(personal-home)/renewal/*`, `types/member-subscription.ts`, `prisma/schema.prisma`

---

## 0. 이 문서의 성격과 가장 중요한 전제

이 문서는 백엔드(Codex)와 프론트엔드(Claude)가 **각자 구현하면서 공통으로 참조하는 계약서**다. 두 구현이 서로를 호출하지 않아도 동일한 계약 위에서 맞물리도록, 아래를 **단일 진실 소스**로 삼는다.

**P0 불변 조건 (기획서 TR-04·TR-05·TR-06):**

1. **신규 API를 만들지 않는다.** 아래 §3의 엔드포인트는 전부 **기존에 존재**하며, 이 기능은 그 계약을 **변경·확장하지 않고 소비**만 한다. renewal UI를 위해 서버 응답 필드를 추가하거나 새 라우트를 신설하지 않는다.
2. **DB 스키마·마이그레이션을 만들지 않는다.** §2의 모델·enum은 **현행 그대로**를 기록한 것이며, `MemberPlan`(`"PRO"|"PREMIUM"`) 타입에 FREE를 추가하지 않고, 0원 주문·무료 완료 쓰기 테이블/API를 신설하지 않는다.
3. **정책 상수를 다시 설계하지 않는다.** `ROLE_ALLOWED_PLANS`·`ROLE_FREE_ALLOWED`는 이미 구현되어 있으므로 중복 정의하지 않는다. UI는 서버가 내려주는 `allowedPlans`·`freeAllowed`를 **표시**만 한다.
4. **2A 서버 보호 경계·결제 계약·guest 계약을 변경하지 않는다.**

즉 이 기능의 **실작업 범위는 프론트엔드(가입 UI 표현·연결·재진입·오류·완료 표현)** 이고, 백엔드의 역할은 **계약 보존 + 회귀 기준 고정 + 서버 검증 재확인**이다. §4 구현 순서의 "백엔드 단계"는 신규 서버 코드 작성이 아니라 **기존 계약을 회귀 기준으로 고정하고 UI가 소비할 계약을 명세·검증하는 단계**임에 유의한다.

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 구조 (책임 분리 — 절대규칙 2·5)

```
[표현 계층 — Presentation]  renewal 공통 톤·단계명·카드·CTA·진행바   (프론트 작업 범위)
        │ 소비
[상태/로직 계층 — Hooks]     useOnboardingStatus · useBusinessWizard · useMemberSubscription
        │                    useMemberPricing · useMemberOrderFlow · BusinessWizardContext
        │ 호출 (계약 §3)
[서버 계약 계층 — API]       /api/signup/onboarding-status · /api/user/setup-role
        │                    /api/member-subscription/*  · /api/admin/verify
        │ 위임
[도메인/보호 계층 — lib]     onboarding.ts · policy.ts · orders.ts · lifecycle.ts
                             onboarding-access.ts · protected-paths.ts · proxy.ts   ← 변경 금지(2A)
```

- 프론트는 **상태/로직 계층 훅만** 호출하고, 훅이 **서버 계약 계층**을 호출한다. 컴포넌트가 `fetch`로 직접 API를 때리거나 서버 상태를 재해석하지 않는다(권위는 서버).
- 백엔드는 **서버 계약 계층과 도메인/보호 계층**을 소유하며, 이번 기능에서 그 계약을 변경하지 않는다.

### 1.2 공통 renewal 표현 계층 (TR-01) — 신규/정리 대상

`RenewalSignupModal.tsx`(현재 158줄, 인라인 style 기준점)의 비주얼을 **모달과 전체 페이지가 공유**하도록 공통 표현 요소로 승격한다. 호스트(모달/풀페이지)만 다르고 내부 표현은 동일해야 한다.

제안 구조 (모두 `app/(personal-home)/renewal/_shared/` 아래, UI 코드는 구현 단계에서 작성):

| 파일(제안) | 책임 | 비고 |
|---|---|---|
| `signup-theme.ts` | 디자인 토큰 상수(색/테두리/radius)만. `#1d1d1f`·`#6e6e73`·`#e5e5e7`·`#0071e3`·radius 20 | 로직·JSX 없음. lib성 상수 |
| `RenewalSignupShell.tsx` | 공통 셸: 브랜드 + 진행바 슬롯 + 본문 카드 슬롯 + CTA 영역 | 모달/풀페이지가 children으로 주입 |
| `RenewalStageBar.tsx` | 상위 5단계 표시(§표시단계). "접근 가능"과 "완료 체크"를 분리해서 받음 | `WizardProgress`와 소비자 회귀 주의 |
| `RenewalStatusPanels/` | 로딩·Suspense·오류·신청접수·대기·반려·완료 패널(상태별) | 각 패널 단일 책임, 파일 분리 |

- 교체 대상(구 톤): `signup/complete/page.tsx`, `signup/complete/components/UserTypeSelector.tsx`·`BusinessInfoForm.tsx`의 `text-muted`/`bg-card`/`VestraLogoMark`, 그리고 `signup/business/steps/*`의 하드코딩 색상(`bg-[#e8f8ee]` 등).
- **스타일 회귀 방지:** `WizardProgress.tsx`(68줄)는 기존 구독관리 화면도 소비할 수 있으므로, 가입 전용 표현이 필요하면 공통 소비자를 깨지 말고 **가입 전용 조합/래퍼**를 우선한다.

### 1.3 기존 컴포넌트·훅 맵 (재사용, 현재 줄 수)

| 영역 | 파일 | 줄 수 | 역할 | 이번 작업 |
|---|---|---:|---|---|
| 가입 시작(모달) | `renewal/_shared/RenewalSignupModal.tsx` | 158 | 유형 선택 + 소셜 signIn | 시각 기준 → 공통 표현으로 승격 |
| OAuth 복귀 | `signup/complete/page.tsx` | 210 | 역할/사업자정보 확정 진입점 | 구 톤 교체, 상태 패널 공통화 |
| 개인 세부유형 | `signup/complete/components/UserTypeSelector.tsx` | 50 | TENANT/LANDLORD 선택 | 구 톤 교체 |
| 사업자 폼 | `signup/complete/components/BusinessInfoForm.tsx` | 253 | 사업자정보 입력·제출 | "등록완료/녹색체크" → "신청 접수·승인 대기" 표현으로 정리 |
| 위저드 셸 | `signup/business/BusinessWizardShell.tsx` | 113 | 진행바 + 서버 가드 | 공통 셸 연결, 완료↔접근 분리 |
| 위저드 컨텍스트 | `signup/business/BusinessWizardContext.tsx` | 57 | 상태 1회 조회 공유 | 재사용(중복 조회 금지) |
| Step1~4 | `signup/business/steps/Step{1..4}*.tsx` | 52/97/180/135 | 가입/인증/플랜/결제 | 표시 순번 매핑·상태별 CTA·톤 |
| 진행바 | `components/member-subscription/WizardProgress.tsx` | 68 | 단계 진행 표시 | 접근 vs 완료 분리, 소비자 회귀 주의 |
| 훅: 온보딩 | `signup/hooks/useOnboardingStatus.ts` | 156 | `GET /onboarding-status` 조회 | 재사용(권위 입력) |
| 훅: 위저드 | `renewal/pricing/hooks/useBusinessWizard.ts` | 163 | 서버 stage→단계 복원 | 재사용 |
| 훅: 구독현황 | `renewal/pricing/hooks/useMemberSubscription.ts` | 150 | `GET /status` | 재사용 |
| 훅: 가격 | `renewal/pricing/hooks/useMemberPricing.ts` | 156 | 역할별 상품 파생 | 재사용 |
| 훅: 주문흐름 | `renewal/pricing/hooks/useMemberOrderFlow.ts` | **459** | 주문·결제 상태머신 | 재사용. **아래 주의** |
| 의도 저장 | `lib/signup-intent.ts`, `signup/planIntent.ts` | — | 쿠키/세션 힌트 | 재사용(확장 금지) |

> ⚠️ **500줄 근접 경고(절대규칙 1):** `useMemberOrderFlow.ts`가 459줄로 상한에 근접했다. 이번 기능은 이 파일을 **재사용만** 하므로 신규 책임을 얹지 않는다. 만약 결제 표현 연결 과정에서 이 파일 수정이 불가피해 400줄 초과 증가가 예상되면, **수정 전 대장에게 분리 계획을 먼저 보고**한다(상태머신/콜백/복구 분리). 범위 밖 임의 리팩터링은 하지 않는다.

### 1.4 표시 단계 ↔ 기존 라우트/서버 stage 매핑 (TR-03·기획 §4.1)

상위에 보이는 5단계는 **표시 전용**이며, 기존 `WizardStep=1|2|3|4` 라우트와 서버 `stage` enum을 **변경하지 않는다**.

| 표시 순번 | 표시 단계명 | 개인(PERSONAL) | 사업자 3종 | 기존 라우트 | 서버 `stage` |
|---|---|---|---|---|---|
| 1 | 회원 유형 | 모달 | 모달 | (모달) | `role` |
| 2 | 소셜 가입 | 모달→OAuth | 모달→OAuth | `/signup/complete` 복귀 | `role` |
| 3 | 가입 정보 | 세부유형 선택 | 정보 입력→승인 대기→승인 | `complete` / `business/step-2` | `verify` |
| 4 | 플랜 선택 | 무료/PRO | verified 후 허용 플랜 | `business/step-3` | `plan` |
| 5 | 결제 | (유료시) | (유료시) | `business/step-4` | `pay` |
| — | 완료 | 무료 완료 or 결제 확인 | 결제 확인(부동산·기업) | — | `complete` |

- 개인은 표시 단계 3에서 세부유형만 처리(사업자 인증 UI 생략). 기존 `useBusinessWizard`의 개인 노출 단계 `[1,3,4]`를 유지한다.
- `maxStep`은 **이동 허용 상한**일 뿐이며, 단계 완료 체크는 §2.4의 실제 사실 기준으로만 표시한다.

---

## 2. 데이터 모델 (현행 그대로 — 변경 금지)

> 이 섹션의 스키마·타입·상수는 **현재 코드에 이미 존재**하는 것을 공용 참조용으로 옮긴 것이다. 신규 필드·테이블·enum·마이그레이션을 추가하지 않는다.

### 2.1 Prisma 모델 (발췌 — `prisma/schema.prisma`)

**User** (`schema.prisma:57-124`) — 온보딩/사업자 관련 필드:
```prisma
role           String  @default("PERSONAL") // GUEST|PERSONAL|BUSINESS|REALESTATE|ADMIN|LAWYER
requestedRole  String? // 사업자 전환 신청 시 승인 대기 중 요청 역할(승인 전 role은 PERSONAL 유지)
userType       String? // TENANT(임차/매수) | LANDLORD(임대/매도)
businessNumber String?
companyName    String?
representName  String?
verifyStatus   String  @default("none") // none | pending | verified | rejected
dailyLimit     Int     @default(5)
```

**Subscription** (`schema.prisma:187-206`): `plan @default("FREE")`, `status @default("active") // active|canceled|expired`, `trialEndsAt`, `graceEndsAt`, `lockedAt`, `policyVersion`, 기간(`startDate`/`endDate`).

**SubscriptionOrder** (`schema.prisma:1284-1324`): `orderId @unique`, `purpose("initial"|"renewal")`, `plan("PRO"|"PREMIUM")`, `durationMonths`, `amount`, `status @default("pending") // pending|paid|needs_review|failed|canceled|refunded`, `idempotencyKey`, `appliedPeriodStart/End`, `appliedAt`, 결제/서명/nonce 필드.

**MemberSubscriptionPolicy** (`schema.prisma:1326-1336`): `policyVersion`, `grandfatheredAt`, `legacyEntitlementsSnapshot(Json)`, `trialUsedAt`.

> **FREE의 정의:** 유료구독 레코드 없이 가입만으로 완료되는 기본 상태. `MemberPlan`에 FREE를 추가하지 않고, "유료구독 선택 안 함"으로 표현한다. 0원 주문·무료 완료 쓰기 API를 만들지 않는다.

### 2.2 핵심 타입 (`types/member-subscription.ts`)

```ts
type MemberPlan     = "PRO" | "PREMIUM";                               // (FREE 미포함 — 변경 금지)
type MemberRole     = "PERSONAL" | "RENTAL_BIZ" | "BUSINESS" | "REALESTATE";
type DurationMonths = 1 | 3 | 6 | 9 | 12 | 24;
type SubStatus      = "trialing" | "active" | "grace" | "locked" | "expired" | "canceled";
type OnboardingStage = "role" | "verify" | "plan" | "pay" | "complete";

interface OnboardingState {           // GET /api/signup/onboarding-status 응답
  stage: OnboardingStage;
  complete: boolean;                  // 서버 '보호 앱 접근' 완료 판정
  requiresPaid: boolean;              // role ∈ {REALESTATE, BUSINESS}
  role: MemberRole | "ADMIN" | "LAWYER";
  verifyStatus: string;               // none|pending|verified|rejected
  premiumActive: boolean;
  isNewSignup: boolean;               // release effectiveAt 이후 가입 대상 여부
  allowedPlans: MemberPlan[];         // 서버 허용 유료 플랜 목록(표시 권위)
  freeAllowed: boolean;               // "무료로 시작" 노출 여부(표시 권위)
}
```

`MemberSubscriptionStatus`(`GET /status` 응답, `types/member-subscription.ts:20-35`): `plan("FREE"|MemberPlan)`, `status(SubStatus)`, `role`, `isGrandfathered`, 기간/trial/grace/locked 시각, `monitoring:{used,limit}`, `trialEligible`, `paidTrialEligible`, `renewalCandidate`, `receipts[]`.

### 2.3 정책 상수 (현행 — `lib/member-subscription/pricing.ts`, 재설계 금지)

```ts
MEMBER_MONTHLY_BASE     = { PRO: 9900, PREMIUM: 29900 }
MEMBER_MONITORING_LIMIT = { PRO: 5,    PREMIUM: 20 }
ROLE_ALLOWED_PLANS = { PERSONAL:["PRO"], RENTAL_BIZ:["PRO","PREMIUM"], BUSINESS:["PREMIUM"], REALESTATE:["PREMIUM"] }
ROLE_FREE_ALLOWED  = { PERSONAL:true, RENTAL_BIZ:true, BUSINESS:false, REALESTATE:false }
DURATION_DISCOUNT  = { 1:0, 3:0, 6:10, 9:15, 12:20, 24:30 }   // %
```

### 2.4 유형별 플랜·완료 기준 (프론트 표시 규칙)

| 유형 | 승인 | FREE | PRO | PREMIUM | 완료 표시 기준 |
|---|:--:|:--:|:--:|:--:|---|
| PERSONAL | 아니요 | ✅ | ✅ | — | 역할 설정 후 기본 접근. 무료 선택 시 주문 없이 완료 표시 |
| RENTAL_BIZ | 예 | ✅ | ✅ | ✅ | 플랜 단계는 `verified` 이후. 무료는 주문 없이, 유료는 서버 확인 후 |
| REALESTATE | 예 | — | — | ✅ | `verified` + PREMIUM `active` 전까지 2A 보호 유지 |
| BUSINESS | 예 | — | — | ✅ | REALESTATE와 동일 |

**단계 완료 체크는 "접근 가능(maxStep)"이 아니라 실제 사실로만 표시한다:** ① 유형 선택, ② OAuth 성공, ③ 세부유형 저장 / 사업자 `verified`, ④ 명시적 플랜 선택, ⑤ 결제 서버 확인(`paid && applied` + 온보딩/활성화 재확인).

---

## 3. API 스펙 (기존 계약 — 소비 전용, 변경 금지)

> 모든 엔드포인트는 **이미 존재**한다. 아래는 프론트가 소비하고 백엔드가 보존해야 할 **확정 계약**이다. 요청/응답 필드·오류코드·인증·CSRF·멱등·소유권을 **변경하지 않는다**. 공통 응답 헤더: `Cache-Control: no-store`.

### 3.1 GET `/api/signup/onboarding-status`
- **인증:** 필요(`requireUser(auth())`). **CSRF:** 불필요(GET). **Rate limit:** 읽기 120/min.
- **Request:** query/body 없음.
- **성공(200):** `OnboardingState`(§2.2) — `{ stage, complete, requiresPaid, role, verifyStatus, premiumActive, isNewSignup, allowedPlans, freeAllowed }`.
- **실패:** `401` 미인증/삭제된 사용자, `403` GUEST/미지원 역할, `429` rate limit, `503` 저장소 불가.
- **판정 권위:** 승인·완료·허용 플랜은 **이 응답이 유일한 권위**다. 신청 응답 메시지·JWT 캐시·로컬 isComplete·URL을 승인 근거로 쓰지 않는다. `requestedRole`은 응답에 없다 — 사업자 대기는 `stage=verify`로 식별한다.

### 3.2 POST `/api/user/setup-role`
- **인증:** 필요(session.user.id). **CSRF:** 필요(`validateOrigin`). **멱등:** 아니오(상태 변경).
- **Request body:** `{ role: "PERSONAL"|"RENTAL_BIZ"|"BUSINESS"|"REALESTATE" (필수), businessNumber?, companyName?, representName?, userType?: "TENANT"|"LANDLORD" }`.
- **성공(200):** `{ message: string }`. 개인 설정 성공 또는 **사업자 접수 성공**. ⚠️ **200은 접수 성공이지 승인/인증 완료가 아니다.** 사업자는 `requestedRole`+`verifyStatus="pending"`만 기록되고 `role`은 승격되지 않는다.
- **실패:** `400` 잘못된 role/사업자번호 형식, `401` 미인증, `422` 사업자정보 필요 `{ needsBusinessInfo: true }`.
- **UI 규칙:** `422`→사업자정보 폼, `200`→개인은 세부유형 완료/사업자는 "신청 접수·승인 대기" 표시. `400/401/5xx`·네트워크 오류는 현재 단계에서 안내하고 자동으로 홈/성공으로 넘기지 않는다.

### 3.3 POST `/api/member-subscription/orders`
- **인증:** 필요. **CSRF:** 필요(`memberMutation`→`assertMemberOrigin`). **멱등:** 필요(`idempotencyKey`, `userId_idempotencyKey` unique).
- **Request body(zod strict, `schemas.ts`):** `{ purpose:"initial"|"renewal", plan:"PRO"|"PREMIUM", durationMonths:1|3|6|9|12|24, productKind:"standard"|"paid_trial", idempotencyKey: UUIDv4 }`.
- **성공(201):** `MemberOrderResponse` = `{ orderId(msub_*), amount, currency:"KRW", plan, durationMonths, status, payment }`.
- **실패:** `400` invalid_input/invalid_duration, `401` unauthorized, `403` forbidden/plan_not_allowed/verification_required, `409` trial_already_used/idempotency_conflict/plan_change_not_allowed, `413` payload_too_large, `429` rate_limited, `503` provider_unavailable.
- **서버 정책:** `assertPlanAllowed`가 `ROLE_ALLOWED_PLANS` 위반 시 `plan_not_allowed`, 사업자 미승인 시 `verification_required`를 반환한다(클라 필터는 UX 보조일 뿐 최종 판정은 서버).

### 3.4 GET `/api/member-subscription/orders/[orderId]`
- **인증:** 필요. **CSRF:** 불필요(GET). **소유권:** `ownedOrder(userId, orderId)`. **Rate limit:** 120/min.
- **Param:** `orderId` (`^msub_[A-Za-z0-9_-]+$`).
- **성공(200):** `{ orderId, status, applied, appliedPeriodStart, appliedPeriodEnd, plan, durationMonths }`.
- **실패:** `401`, `404` not_found(형식/소유 불일치), `429`, `503`.
- **완료 판정 입력:** 유료 완료 표시는 `status==="paid" && applied===true`를 서버로 확인한 뒤에만 한다.

### 3.5 POST `/api/member-subscription/orders/[orderId]/recover`
- **인증:** 필요. **CSRF:** 필요. **소유권:** `ownedOrder`. **Rate limit:** 주문당 15/min.
- **Param:** `orderId`. **Request body:** `{ imp_uid?: string (`^imp_[0-9a-zA-Z]{1,40}$`) }`.
- **성공(200):** `{ status, applied }`.
- **실패:** `400` invalid_input/payment_failed, `401`, `404`, `409` payment_needs_review/payment_pending/transaction_conflict, `413`, `429`, `503`.
- **용도:** OAuth/결제 리다이렉트 복귀 시 재검증. 이탈을 자동 무료 완료로 바꾸지 않는다.

### 3.6 POST `/api/member-subscription/payment/callback`
- **인증:** 필요. **CSRF:** 필요. **소유권:** `ownedOrder(paymentId)` + HMAC 서명 검증. **Rate limit:** 주문당 15/min.
- **Request body:** `{ paymentId(msub_*), imp_uid(imp_*), callbackContext(1–2048, 영숫자), callbackSignature(SHA256 hex 64자) }`.
- **성공(200):** `{ ok: true }`.
- **실패:** `400` invalid_input/payment_failed, `401`, `404`, `409` payment_needs_review/idempotency_conflict/transaction_conflict, `413`, `429`, `503`.
- **금지:** `callbackContext`·서명·nonce·`imp_uid`를 가입 의도 쿠키/planIntent 저장소에 넣지 않는다(§3.9).

### 3.7 GET `/api/member-subscription/status`
- **인증:** 필요. **CSRF:** 불필요(GET). **Rate limit:** 120/min.
- **성공(200):** `MemberSubscriptionStatus`(§2.2).
- **실패:** `401`, `429`, `503`.

### 3.8 POST `/api/member-subscription/trial`
- **인증:** 필요. **CSRF:** 필요.
- **Request body:** `{ plan: "PRO"|"PREMIUM" }`.
- **성공(201):** `{ status:"trialing", plan, trialEndsAt, monitoringLimit }`.
- **실패:** `400`, `401`, `403` plan_not_allowed/verification_required, `409` trial_already_used, `413`, `429`, `503`.
- **주의:** trial/grace/paid 주문만으로 부동산·기업의 PREMIUM `active` 완료를 대신하지 않는다.

### 3.9 관리자 사업자 승인 — `/api/admin/verify` (ADMIN 전용, 본 기능에서 호출 안 함)
- **GET:** 대기 목록 `[{ id, name, email, image, requestedRole, businessNumber, companyName, representName, createdAt }]`. 비관리자 `403`.
- **POST:** `{ userId, action:"approve"|"reject", role? }` → 승인 시 `role` 승격·`dailyLimit` 설정, 반려 시 `verifyStatus="rejected"`. CSRF 필요.
- renewal 가입 흐름은 이 API를 호출하지 않는다. 사용자는 승인 결과를 §3.1 재조회로만 확인한다.

### 3.10 GET `/api/health` (smoke check)
- 인증 불필요. `200 { status:"ok", service:"vestra", version, timestamp }`. 배포 후 `/`, `/login`, `/api/health` smoke check 대상.

### 3.11 클라이언트 저장소 계약 (쿠키/sessionStorage — 확장 금지)
- `lib/signup-intent.ts`: 쿠키 `signup_intent=1`(10분, lax) + `sessionStorage["intendedRole"]`. 허용 역할 값만 수용.
- `signup/planIntent.ts`: `sessionStorage["intendedPlan"] = { owner(userId), plan, durationMonths }`. **owner 불일치/형식 오류 시 즉시 폐기.** 계정 변경·완료 시 정리.
- **금지:** 사업자번호·개인정보·결제 서명·nonce·callbackContext·imp_uid·orderId를 힌트 저장소에 넣지 않는다. 가입 의도 쿠키에 결제정보를 추가하지 않는다.

---

## 4. 구현 순서 (백엔드 → UI)

> 이번 기능의 백엔드 작업은 **신규 코드 작성이 아니라 "계약 보존·회귀 기준 고정·검증"** 이다. UI 작업이 실제 변경의 대부분이다.

### 4.1 백엔드(Codex) — 계약 보존·검증 단계

| 순서 | 작업 | 완료 기준 | P |
|---|---|---|:--:|
| B-1 | 회귀 기준 고정: 2A 보호 경계(`onboarding.ts`/`onboarding-access.ts`/`protected-paths.ts`/`proxy.ts`/`lib/auth.ts` JWT)·agent routes·`monitoring-targets.ts`·guest·member 결제 계약을 **변경 없음**으로 확인하고 기존 테스트를 회귀 기준으로 고정 | `npx vitest run --config lib/member-subscription/vitest.config.ts` 통과 | P0-1 |
| B-2 | §3 API 계약을 본 문서와 **1:1 대조**해 응답 필드·오류코드가 일치함을 확인(불일치 발견 시 문서를 코드 기준으로 정정하고 대장 보고) | 계약 표와 실제 응답 동일 | P0-2 |
| B-3 | 서버 완료 판정 재확인: `requiresPaidToComplete`·`assertPlanAllowed`·`verification_required`·PREMIUM `active` 판정이 유형별로 올바른지 테스트로 재확인 | AC-02·AC-05·AC-08 서버측 통과 | P0-3 |
| B-4 | release-gated 동작 확인: `MEMBER_SUBSCRIPTION_ENABLED` off/버전 누락/시행일 전에서 신규 강제·신규 차단 없음, 분류된 만료 회원 enforcement 유지 | AC-11 서버측 통과 | P0 |

**이 단계에서 서버 라우트/스키마/정책 상수/env/DB를 변경하면 범위 위반이다.** 변경이 필요한 결함을 발견하면 **별도 작업으로 분리**해 대장 승인 후 진행한다.

### 4.2 프론트엔드(Claude) — UI 표현·연결·재진입 단계

| 순서 | 작업 | 완료 기준 | P |
|---|---|---|:--:|
| F-1 | 표시 상태 모델 + 공통 renewal 표현 계층(§1.2): 토큰·셸·상태 패널 | 모달↔풀페이지 동일 표현 | P1-1 |
| F-2 | `complete`·세부유형·사업자 폼 구 톤 교체 + "신청 접수·승인 대기" 표현 전환(기존 3초 완료 화면 대체) | AC-01·AC-02 표현 일관 | P1-1 |
| F-3 | 승인 상태 연결: `none/pending/rejected/verified`·조회 실패 구분, "상태 다시 확인", 재진입/포커스 복귀 갱신. 승인 후 setup-role 자동 재호출 금지 | AC-03·AC-04·AC-05·AC-06 | P0-2 |
| F-4 | 플랜·결제까지 상위 진행 표시 연결: `allowedPlans`/`freeAllowed` 표시, 무료 생략·유료 완료 동일 셸. 완료 체크는 §2.4 사실 기준 | AC-01·AC-07·AC-09 | P1-2 |
| F-5 | 재진입/새로고침/승인 후 재개/결제 복구/오류: 서버 stage 기준 복원, stale·리다이렉트 루프·중복 주문 없음 | AC-03·AC-10·AC-13 | P1-3 |
| F-6 | 모바일·데스크톱(1440/390/360) 실화면 연속 스크린샷 검수 + 관련 회귀 테스트 | §8.2 실화면 게이트, AC 전체 | P1-4 |

**UI는 서버 상태만 표현한다:** 클라이언트 결제 성공 콜백만으로 완료하지 않고, `maxStep`을 완료 체크로 쓰지 않으며, 미확정 상태에서 결제 자식 실행을 막는다.

### 4.3 동기 지점(계약 접점)

- 프론트 훅↔서버 계약은 **§3이 유일한 접점**이다. 양측은 F/B 단계에서 §3 표를 공동 기준으로 삼고, 어느 쪽도 상대 구현을 기다리지 않는다(계약이 이미 고정됨).
- 백엔드가 B-2에서 문서↔코드 불일치를 발견하면 **문서를 코드 기준으로 정정**하고 양측에 공지한다. 코드를 문서에 맞추려 계약을 바꾸지 않는다.

---

## 5. 절대규칙 준수 체크리스트

### 5.1 플랫폼 5대 원칙

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (설계 기준)
─────────────────────────────────────────────────
1. 페이지 500줄 제한 : ⚠️ 설계상 모든 신규/수정 파일 500줄 이하 유지.
                        기존 useMemberOrderFlow.ts 459줄 — 신규 책임 추가 금지,
                        400줄 초과 증가 예상 시 수정 전 대장 보고(§1.3)
2. 단일 책임         : ✅ 표현/상태(hooks)/서버계약(api)/도메인(lib) 계층 분리(§1.1).
                        테마 상수·셸·상태 패널을 각각 단일 책임 파일로 분리(§1.2)
3. 서버 검증·보안    : ✅ 승인·완료·허용플랜 판정 권위는 서버(§3.1·§3.3).
                        클라 필터는 UX 보조. 비밀값(서명/nonce/imp_uid) 힌트 저장 금지(§3.11)
4. 성능(중복·N+1)    : ✅ BusinessWizardContext로 온보딩/구독 상태 1회 조회 공유(§1.3).
                        background refresh로 중복 조회 회피. 신규 목록 쿼리 없음
5. 폴더 구조         : ✅ components(UI)/hooks(상태)/lib(공용)/api(라우트)/types 역할 유지(§1.1)
─────────────────────────────────────────────────
위반 항목: 없음 (useMemberOrderFlow 459줄은 모니터링 대상)
─────────────────────────────────────────────────
```

### 5.2 범위·회귀 불변 조건 (기획 TR-04~06)

- [ ] 신규 API·DB 스키마·마이그레이션·env·정책 상수·새 쓰기 경로를 만들지 않았다.
- [ ] `MemberPlan`에 FREE를 추가하지 않고, 0원 주문·무료 완료 쓰기 API를 만들지 않았다.
- [ ] 2A 서버 가드(`onboarding*`/`protected-paths`/`proxy`/`lib/auth` JWT)·agent routes·`monitoring-targets` 보존.
- [ ] `member-subscription/*` 요청·응답·오류·소유권·CSRF·멱등·콜백 서명·활성화 계약 무변경.
- [ ] guest(`lib/guest-monitoring/*`·guest API·`/renewal/monitoring/guest/*`) 무변경.
- [ ] `setup-role`·관리자 승인 API 계약 무변경.
- [ ] 비밀값·개인정보(서명·nonce·callbackContext·imp_uid·사업자번호)를 로그·커밋·힌트 저장소에 노출/저장하지 않았다.

### 5.3 견고성 4문 (CLAUDE.md 규칙 0-5)

1. **규모:** 상태 조회는 컨텍스트 1회 공유(N+1·중복 호출 없음). 목록성 쿼리 미도입.
2. **수명주기:** 계정 변경·완료 시 planIntent/의도 쿠키 정리(§3.11). 결제 이탈·취소 시 자동 무료 전환·고아 주문 유도 없음.
3. **비정상 경로:** OAuth 취소/역할 유실/저장소 차단/직접 단계 접근(IDOR)/stale JWT verified/결제 재시도·동시요청·소유자 변경을 §4.2 F-3·F-5에서 처리.
4. **적대적 자문:** 인증·결제·정책 변경 접점이므로 구현 후 **병렬 코드리뷰(프론트·백엔드 독립 적대검증)** 를 거친다. Codex 7라운드 통과분은 보존 대상이며 재검증 없이 통과 실적으로 보고하지 않는다.

### 5.4 배포·검증 게이트 (CLAUDE.md)

- [ ] 변경 범위 `lint`/`test`/`build` 통과. `vitest`(member-subscription config) 회귀 통과.
- [ ] `t-vestra.vercel.app` **무출금** 테스트 배포 → smoke check(`/`·`/login`·`/api/health`) → 실화면 일관성(§8.2) 확인.
- [ ] 운영 승격은 대장의 별도 지시 시에만, `t-vestra` 동일 deployment를 재빌드 없이 alias 이동.
- [ ] 완료 보고에 테스트 결과·실화면 증거·보호 경계 변경 여부(없음)·남은 제약을 포함.

---

## 6. 미해결·확인 필요 항목

- B-2에서 §3 계약 표와 실제 코드가 100% 일치하는지 백엔드가 최종 대조해야 한다(본 문서는 읽기 전용 정적 조사 기준이며, 실브라우저·실결제 재검증은 이번 단계에서 수행하지 않았다).
- `useMemberOrderFlow.ts`(459줄) 분리 필요성은 실제 수정량이 확정될 때 재판단한다(현재는 모니터링만).
