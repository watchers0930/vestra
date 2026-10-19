# 회원가입·구독 통합 설계서 (pro)

> 프로젝트: VESTRA
> 작성일: 2026-10-19
> 상태: Design — 구현·DB 변경·마이그레이션·env·실결제·배포 **미수행**
> 준거 기획: [`pro.plan.md`](../../01-plan/features/pro.plan.md)
> 상위/관련 설계: [`signup-subscription-integration.design.md`](./signup-subscription-integration.design.md), [`guest.design.md`](./guest.design.md) (결제·주문·활성화 공용 계약 — 본 문서가 전제로 삼음)
> 본 문서의 성격: **백엔드(Codex)와 프론트엔드(Claude)가 각자 구현할 때 따르는 공용 계약서**. 아래 타입·상수·API·판정 규칙은 두 구현의 유일한 정본(SSOT)이다.

---

## 0. 문서 목적과 역할 분담

### 0.1 목적
회원가입(유형 선택 → 소셜 → 사업자 인증 → 플랜 → 결제 → 완료)을 하나의 연속 흐름으로 통합하고, 유형(role)별로 선택 가능한 플랜을 차등한다. **가입 완료 여부는 서버 상태로만 판정**하며, 클라이언트가 보낸 role/completed/step/금액/인증값을 신뢰하지 않는다.

### 0.2 역할 분담

| 담당 | 범위 | 핵심 산출물 |
| --- | --- | --- |
| **백엔드 (Codex)** | 정책 상수, 온보딩 완료 판정·접근 가드, 신규 읽기 엔드포인트, 타입 확장 | `lib/member-subscription/pricing.ts`(수정), `lib/member-subscription/onboarding.ts`(신규), `app/api/signup/onboarding-status/route.ts`(신규), `types/member-subscription.ts`(가산) |
| **프론트 (Claude)** | 가입 진입·OAuth 복귀 연결, 위저드 일반화, 플랜 선택 UI, 가입 의도 확장 | `signup/page.tsx`·`signup/complete/page.tsx`, 위저드 셸/훅 role 일반화, `Step3PlanSelect`, `lib/signup-intent.ts`(확장) |

### 0.3 보호 경계 (양측 공통 — 변경·되돌림 금지)
- `lib/guest-monitoring/*`, `lib/danal/portone-v1.ts`의 `portoneV1Provider`, 비회원 단건 결제·등기감시 흐름.
- `app/api/member-subscription/*`의 주문·콜백·검증·결제기록·활성화·복구·기간 계산 구현 및 그 서버 계약.
- `lib/member-subscription/orders.ts`·`policy.ts`·`status.ts`·`lifecycle.ts`·`recovery.ts`·`payment-callback.ts`의 기존 함수 시그니처·반환 의미.
- 재사용 훅(`useMemberOrderFlow`·`useMemberPricing`·`useMemberSubscription`)과 회원 API 클라이언트(`memberApi.ts`·`memberPayment.ts`)의 요청/응답·리다이렉트·저장소·오류 처리.
- 기존 결제 DTO·상태머신·`MemberPlan` 타입(`"PRO"|"PREMIUM"`). **FREE를 유료 플랜 타입·주문 DTO에 추가하지 않는다.**

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 핵심 설계 원칙
온보딩 완료 판정은 **기존 entitlement를 조합하는 별도 책임**으로 신규 모듈에 둔다. 기존 결제 상태머신·API 응답에 `onboarding` 필드를 추가하거나 `trialing`/`grace` 권한 의미를 재정의하지 않는다. "결제 완료(`주문.status === "paid" && applied === true`)"와 "온보딩 완료"는 별개이며, 온보딩 판정이 결제 판정을 재정의하지 않는다.

### 1.2 백엔드 파일 분리 계획 (Codex)

| 파일 | 상태 | 책임 | 비고 |
| --- | --- | --- | --- |
| `lib/member-subscription/pricing.ts` | 수정 | 정책 상수 SSOT | `ROLE_ALLOWED_PLANS` 수정 + `ROLE_FREE_ALLOWED` 신설 (§3) |
| `lib/member-subscription/onboarding.ts` | **신규** | 온보딩 완료 판정(순수 규칙 + DB 조립 + 서버 가드) | `decideOnboarding`·`requiresPaidToComplete`·`resolveOnboardingState`·`requireOnboardingComplete` (§4). 500줄 이하·단일책임 |
| `app/api/signup/onboarding-status/route.ts` | **신규** | 위저드 재진입 라우팅용 서버 권위 읽기 | `resolveOnboardingState` 호출만, 로직 無 (§5.1) |
| `types/member-subscription.ts` | 가산 | 타입 SSOT | `OnboardingStage`·`OnboardingState` 추가 (기존 DTO 불변, §2.2) |

- `onboarding.ts`는 **순수 결정 함수**(`decideOnboarding`, DB 접근 없음)와 **조립/가드**(`resolveOnboardingState`·`requireOnboardingComplete`, DB 접근)를 한 파일 내에서 분리 배치한다. 순수 함수는 단위 테스트 대상이다.
- 기존 `policy.ts`의 `resolveEffectiveEntitlement`·`effectiveEntitlement`를 **읽기로 재사용**한다. 온보딩 모듈은 이 결과를 소비할 뿐 `policy.ts`를 수정하지 않는다.

### 1.3 프론트 파일 분리 계획 (Claude)

| 파일 | 상태 | 책임 | 비고 |
| --- | --- | --- | --- |
| `app/(app)/signup/page.tsx` | 수정(최소) | 유형 선택 → 소셜 진입 | 기존 로그인자 리다이렉트 보존. `markSignupIntent` 확장 호출부 |
| `app/(personal-home)/signup/complete/page.tsx` | 수정 | OAuth 복귀 → `setup-role` → 플랜 단계 연결 | **실패를 성공으로 이동시키지 않음**(재시도 제공) |
| `lib/signup-intent.ts` | 확장 | 가입 의도 보존 | `intendedPlan` 가산 + 검증 파서 (§6) |
| `app/(personal-home)/signup/business/BusinessWizardContext.tsx`·`BusinessWizardShell.tsx` | 수정 | 위저드 셸 role 일반화 | 공유 구조 유지. 클라 가드는 서버 접근 통제를 대체하지 않음 |
| `app/(personal-home)/renewal/pricing/hooks/useBusinessWizard.ts` | 수정 | `deriveWizard` role별 완료조건 | 개인 인증 단계 생략, 체험 완료 우회 제거 (§7.1) |
| `signup/business/steps/Step3PlanSelect.tsx` | 수정 | 허용 카드만 렌더 | `ROLE_ALLOWED_PLANS`+`ROLE_FREE_ALLOWED` 기반, 체험 완료 CTA 제거 (§7.2) |
| `signup/business/steps/Step4Payment.tsx` | 수정(최소) | 결제 단계 | 기존 결제 훅 재사용. 완료 전 서버 완료조건 확인 |
| 개인 위저드 진입 라우트 | 신규/일반화 | 개인은 인증 단계 생략 | 기존 엔진 role 일반화 또는 개인용 경량 셸. 공유 플랜·결제 단계 유지, 500줄/단일책임 준수 |

- **플랜·결제 단계(`Step3PlanSelect`·`Step4Payment`)와 결제 훅은 개인·사업자가 공유**한다. 별도 결제 구현을 만들지 않는다. 차이는 **인증 단계 유무**와 **선택지 필터**뿐이다.
- 위저드 일반화 시 한 파일이 UI/상태/비즈니스 로직을 혼재하지 않도록, 단계 계산(hook)·가드(shell)·화면(step component)을 분리 유지한다.

---

## 2. 데이터 모델

### 2.1 기존 Prisma 모델 (무변경 — 참조용)
이번 작업은 **DB 스키마·DDL·마이그레이션을 변경하지 않는다.** 아래는 판정에 사용하는 기존 필드다.

```prisma
model User {
  role           String  @default("PERSONAL") // GUEST|PERSONAL|BUSINESS|REALESTATE|RENTAL_BIZ|ADMIN|LAWYER
  requestedRole  String? // 사업자 전환 신청 시 승인 대기 요청 역할(승인 전 role은 PERSONAL 유지)
  userType       String? // TENANT | LANDLORD (PERSONAL 세부)
  businessNumber String?
  companyName    String?
  representName  String?
  verifyStatus   String  @default("none") // none|pending|verified|rejected
  createdAt      DateTime @default(now())
  subscription       Subscription?
  membershipPolicy   MemberSubscriptionPolicy?
}

model Subscription {
  plan          String  @default("FREE") // FREE | PRO | BUSINESS
  status        String  @default("active") // active|canceled|expired
  startDate     DateTime
  endDate       DateTime?
  trialEndsAt   DateTime?
  graceEndsAt   DateTime?
  lockedAt      DateTime?
  policyVersion String?
}

model MemberSubscriptionPolicy {
  policyVersion              String
  grandfatheredAt            DateTime?
  legacyEntitlementsSnapshot Json
  trialUsedAt                DateTime?
}
```

- **"FREE 선택"을 저장하는 전용 필드는 없다.** 설계상 FREE 완료는 "역할 설정 완료"를 기본 상태로 해석하며, 유료구독 레코드를 만들지 않는다. 유료 선택 의도는 화면 복구 힌트일 뿐 보안 근거가 아니다.
- 전용 영속 상태(온보딩 완료 플래그 등)가 필요한지는 후속 상세설계 대상이며, **이번 단계에서 결제 DTO·스키마·env를 바꾸지 않는다.**

### 2.2 타입 정의

**기존 타입 (`types/member-subscription.ts`) — 불변.** `MemberPlan`/`MemberRole`/`SubStatus`/`OrderStatus`/`MemberProductView`/`MemberSubscriptionStatus`/`MemberOrderRequest`/`MemberOrderResponse`/`MemberOrderStatus`/`MemberPaymentCallbackRequest`/`MemberPaymentInfo`의 필드·경로·에러를 바꾸지 않는다.

```ts
export type MemberPlan = "PRO" | "PREMIUM";               // 불변 — FREE 추가 금지
export type MemberRole = "PERSONAL" | "RENTAL_BIZ" | "BUSINESS" | "REALESTATE";
export type SubStatus  = "trialing" | "active" | "grace" | "locked" | "expired" | "canceled";
```

**신규 타입 (가산만 — 기존 DTO와 독립).**

```ts
/** 온보딩 단계. 서버가 권위적으로 산출하며 프론트가 라우팅에 사용한다. */
export type OnboardingStage =
  | "role"       // 역할 미설정 — 유형/역할 설정 필요
  | "verify"     // 사업자 인증 미완료(requestedRole 존재 + verifyStatus pending/rejected/none)
  | "plan"       // 인증/역할 확정, 플랜 선택 필요
  | "pay"        // 유료 선택/필수인데 해당 구독 미활성 — 결제·복구 필요
  | "complete";  // 가입 완료

export interface OnboardingState {
  stage: OnboardingStage;
  complete: boolean;         // stage === "complete"
  requiresPaid: boolean;     // requiresPaidToComplete(role)
  role: MemberRole | "ADMIN" | "LAWYER";
  verifyStatus: string;      // none|pending|verified|rejected
  premiumActive: boolean;    // 실제 PREMIUM 구독이 status==="active"
  isNewSignup: boolean;      // 신규 가입 경로 대상 계정 여부(§4.4)
  allowedPlans: MemberPlan[];// 해당 role의 유료 선택지(= ROLE_ALLOWED_PLANS[role])
  freeAllowed: boolean;      // 무료 시작 허용 여부(= ROLE_FREE_ALLOWED[role])
}
```

> 이 타입들은 **신규 `GET /api/signup/onboarding-status`의 응답 전용**이다. 기존 `MemberSubscriptionStatus`·주문 DTO에 섞지 않는다.

---

## 3. 정책 상수 계약 (`lib/member-subscription/pricing.ts`)

기존 상수 `MEMBER_MONTHLY_BASE`(PRO 9900, PREMIUM 29900), `MEMBER_MONITORING_LIMIT`(PRO 5, PREMIUM 20), `DURATION_DISCOUNT`(1·3:0, 6:10, 9:15, 12:20, 24:30%), `computeAmount`·`priceProduct`는 **변경하지 않는다.** 가격·한도·기간을 바꾸지 않는다.

**변경 1 — `ROLE_ALLOWED_PLANS` (유료 선택지, FREE 제외):**
```ts
export const ROLE_ALLOWED_PLANS: Record<MemberRole, MemberPlan[]> = {
  PERSONAL:   ["PRO"],             // 현행 유지
  RENTAL_BIZ: ["PRO", "PREMIUM"],  // 현행 유지
  REALESTATE: ["PREMIUM"],         // 변경: PRO 제거
  BUSINESS:   ["PREMIUM"],         // 변경: PRO 제거
};
```

**변경 2 — `ROLE_FREE_ALLOWED` 신설 (무료 시작 허용, 유료 목록과 분리):**
```ts
export const ROLE_FREE_ALLOWED: Record<MemberRole, boolean> = {
  PERSONAL: true, RENTAL_BIZ: true, REALESTATE: false, BUSINESS: false,
};
```

### 3.1 상수 변경의 서버 강제 효과 (추가 코드 없이 성립)
- `policy.ts`의 `assertPlanAllowed(role, plan, verifyStatus)`는 `ROLE_ALLOWED_PLANS[role].includes(plan)`가 아니면 `plan_not_allowed`를, 사업자 미인증이면 `verification_required`를 던진다. **REALESTATE/BUSINESS의 PRO 위조 주문은 상수 변경만으로 기존 경로에서 `plan_not_allowed`로 거절**된다.
- `effectiveEntitlement`의 `roleEligible` 계산도 동일 상수를 쓰므로, 상수 축소가 **기존 부동산/기업 PRO 보유자**의 기준선에 영향을 줄 수 있다 → §4.4·§9 회귀 검증 대상.
- `FREE`는 유료 주문 목록에 **넣지 않는다.** 무료 완료 경로가 `createMemberOrder`나 구독 변경 API를 호출하지 않도록 `ROLE_FREE_ALLOWED`를 별도 상수로 분리해 결제 검증 로직 오염을 막는다.

---

## 4. 온보딩 완료 판정 계약 (`lib/member-subscription/onboarding.ts`, 신규)

### 4.1 `requiresPaidToComplete`
```ts
export function requiresPaidToComplete(role: string): boolean {
  return role === "REALESTATE" || role === "BUSINESS";
}
```

### 4.2 순수 결정 함수 `decideOnboarding`
DB 접근 없이 **정규화된 서버 사실**만 받아 단계를 결정한다(단위 테스트 대상).

```ts
export interface OnboardingFacts {
  role: string;                 // User.role (서버 권위 — 승인으로만 부여됨)
  requestedRole: string | null; // User.requestedRole (승인 대기 요청)
  verifyStatus: string;         // none|pending|verified|rejected
  premiumActive: boolean;       // 실제 PREMIUM 구독 state.status==="active"
  isNewSignup: boolean;         // §4.4
}
export function decideOnboarding(f: OnboardingFacts): { stage: OnboardingStage; complete: boolean };
```

**판정 규칙표 (기획 §5.1 매핑 — 정본):**

| # | 조건 | stage | complete |
| --- | --- | --- | --- |
| 1 | `role==="PERSONAL"` && `requestedRole` 없음 && 역할 미설정(초기값) | `role` | ✗ |
| 2 | `requestedRole`이 사업자(RENTAL_BIZ/BUSINESS/REALESTATE) && `verifyStatus ∈ {pending, rejected, none}` | `verify` | ✗ (현재 role이 PERSONAL이어도 개인 무료 완료로 **오인 금지**) |
| 3 | `role==="PERSONAL"` 설정 완료(요청 역할 없음) | `complete` | ✓ (FREE 기본 허용) |
| 4 | `role==="RENTAL_BIZ"` && `verifyStatus==="verified"` | `complete` | ✓ (FREE 기본 허용) |
| 5 | `requiresPaidToComplete(role)` && `verifyStatus==="verified"` && `premiumActive===true` | `complete` | ✓ |
| 6 | `requiresPaidToComplete(role)` && `verifyStatus==="verified"` && `premiumActive===false` | `pay` | ✗ (PREMIUM 결제·복구로 안내) |
| 7 | `role ∈ {ADMIN, LAWYER}` 또는 `isNewSignup===false` | `complete` | ✓ (기존 회원·비대상 역할은 가드 미적용, §4.4) |

- **`pay` 단계의 유료 선택 PERSONAL/RENTAL_BIZ**: 이들은 FREE가 기본 허용이므로 `complete`로 본다(앱 접근 허용). 유료 주문이 `pending`이거나 미활성인 것은 "결제 진행 중"일 뿐 **앱 접근을 막지 않는다.** 결제 필수로 앱을 막는 것은 REALESTATE/BUSINESS뿐이다.
- **`premiumActive`는 엄격 판정**: `entitlement.plan === "PREMIUM"` && `entitlement.state.status === "active"`만 참. `trialing`·`grace`·`locked`·`expired`·`canceled`·FREE·PRO·"status 문자열만 active" 는 모두 거짓. SDK success·콜백 200·`paid` 단독으로 참을 만들지 않는다.
- 역할은 항상 **서버 현재 `User.role`**을 쓴다. 결제·SDK·클라이언트 값으로 역할을 자동 부여·승격하지 않는다.

### 4.3 서버 조립 `resolveOnboardingState`
```ts
export async function resolveOnboardingState(
  userId: string, now?: Date, db?: MemberTransaction
): Promise<OnboardingState>;
```
- `resolveEffectiveEntitlement(userId, now, db)`(기존, `policy.ts`)로 `plan`·`state`·`role`을 얻고, 같은 트랜잭션에서 `User.requestedRole`·`verifyStatus`·`createdAt`·`membershipPolicy`를 읽는다.
- `premiumActive = entitlement.plan === "PREMIUM" && entitlement.state.status === "active"`.
- `isNewSignup`은 §4.4 규칙으로 계산.
- `decideOnboarding(facts)`를 호출해 `stage`·`complete`를 얻고, `allowedPlans = ROLE_ALLOWED_PLANS[role] ?? []`, `freeAllowed = ROLE_FREE_ALLOWED[role] ?? false`를 채워 `OnboardingState`를 반환한다.
- **클라이언트가 보낸 role/plan/step/completed를 읽지 않는다.** 판정 입력은 전부 로그인 사용자 ID에 귀속된 DB 상태다.

### 4.4 신규 가입 대상 판별 `isNewSignup`
기존 회원·grandfather 계정이 신규 완료조건에 걸려 권한이 급락하지 않도록 **신규 가입 경로에만** 가드를 적용한다. `status.ts`의 `newUnclassified` 개념과 동일 기준:

```
isNewSignup = release 활성(memberReleaseConfig) && !user.membershipPolicy
              && user.createdAt >= release.effectiveAt
```
- `membershipPolicy`가 있거나(기존 backfill/grandfather) `createdAt < effectiveAt`(출시 이전 가입)이면 `isNewSignup=false` → 규칙표 #7로 `complete` 처리(가드 미적용).
- **주의:** 현재 grandfather 폴백(`effectiveEntitlement`의 `grandfathered = !policy`)은 정책 레코드 부재도 grandfather로 본다. 온보딩 가드는 이를 그대로 면제 근거로 삼지 않고, **release 활성 + policy 부재 + createdAt ≥ effectiveAt**(=신규 미분류)인 계정만 가드 대상으로 좁힌다. 누락 레코드로 신규 계정이 가드를 우회하지 못하게 한다.
- `release`가 비활성(`memberReleaseConfig` 실패)이면 신규 가입 자체가 진행 불가 상태이므로 `isNewSignup=false`로 두어 기존 접근을 막지 않는다.

### 4.5 서버 접근 가드 `requireOnboardingComplete`
```ts
export async function requireOnboardingComplete(userId: string): Promise<OnboardingState>;
// 신규 가입 미완료(isNewSignup && !complete && requiresPaid)면 fail("forbidden").
```
- **적용 지점 한정:** REALESTATE/BUSINESS 신규 계정이 PREMIUM 미결제로 보호 앱을 쓰는 것을 막는 라우팅/접근 가드에만 쓴다.
- **유료 기능 실행 가드는 신설하지 않는다.** 기존 `requireMemberEntitlement`(`policy.ts`)가 `canUsePaidFeatures`(=`monitoringLimit > 0`)로 이미 막는다. REALESTATE/BUSINESS가 PREMIUM active 아니면 `plan==="FREE"` → `limit=0` → `canUsePaidFeatures=false`로 **이미 거절**된다. 온보딩 가드는 이를 중복 구현하지 않고 보완(라우팅·앱 진입)만 담당한다.
- **열어두어야 하는 경로(가드 대상 아님):** 로그인, 가입 재개, 사업자 인증, 플랜 선택, 결제/복구, 구독 현황(`GET /status`), 본인 데이터 읽기/내보내기, 고객지원. 복구 경로를 잠그지 않는다.
- "FREE 완료"를 기록하는 쓰기 엔드포인트는 **존재하지 않는다**(완료는 파생 판정). 따라서 "FREE 완료 직접 요청" 위조 대상이 없다.

---

## 5. API 스펙

### 5.1 신규 — `GET /api/signup/onboarding-status`

| 항목 | 내용 |
| --- | --- |
| 메서드 + 경로 | `GET /api/signup/onboarding-status` |
| 용도 | 위저드 재진입/라우팅용 **서버 권위 상태 읽기** (프론트는 `stage`로 다음 화면을 라우팅) |
| 인증 | **필요.** 세션 없으면 401 |
| Query params | 없음 |
| Request body | 없음 |
| Rate limit | 읽기 스코프(기존 `memberRateLimit(userId, "read", 120)` 재사용 권장) |
| 캐시 | `Cache-Control: no-store` |

**Response 200 (성공):** `OnboardingState` (§2.2)
```json
{
  "stage": "pay",
  "complete": false,
  "requiresPaid": true,
  "role": "REALESTATE",
  "verifyStatus": "verified",
  "premiumActive": false,
  "isNewSignup": true,
  "allowedPlans": ["PREMIUM"],
  "freeAllowed": false
}
```

**Response (실패):** 기존 회원 API 봉투 형식 `{ error: string, code: MemberErrorCode }` 재사용.

| 상태 | code | 상황 |
| --- | --- | --- |
| 401 | `unauthorized` | 미로그인 |
| 429 | `rate_limited` | 읽기 한도 초과 (`Retry-After` 헤더) |
| 503 | `provider_unavailable` | release 비활성 등 — 단, 가능한 한 **읽기는 유지**하고 `isNewSignup=false`로 안전 응답하는 것을 우선한다(현황 조회처럼 복구 경로를 막지 않음) |

- 핸들러는 `requireUser(await auth())` → `memberRateLimit` → `resolveOnboardingState(userId)` → `memberJson(...)` 순서로 **조립만** 하고 판정 로직을 두지 않는다(§1.2).
- **GET이므로 CSRF/`memberMutation` 불필요**, 변이 없음.
- `nextPath`(다음 화면 경로)는 응답에 넣지 않는다. 경로 매핑은 프론트 책임(§7.3)으로 두어 백엔드를 라우팅에서 분리한다.

### 5.2 수정 — `POST /api/user/setup-role` (계약 유지, 동작 보존)

| 항목 | 내용 |
| --- | --- |
| 메서드 + 경로 | `POST /api/user/setup-role` |
| 인증 | **필요** (401 `{ error: "인증 필요" }`). CSRF: `validateOrigin` |
| Request body | `{ role: "PERSONAL"\|"RENTAL_BIZ"\|"REALESTATE"\|"BUSINESS", userType?: "TENANT"\|"LANDLORD", businessNumber?, companyName?, representName? }` |
| Response 200 | `{ message: string }` (PERSONAL 즉시 전환 / 사업자 신청 접수) |
| Response 422 | `{ needsBusinessInfo: true }` (사업자인데 business info 미보유 → 폼 입력 필요) |
| Response 400 | `{ error }` (유효하지 않은 역할·사업자 정보 형식) |

- **계약·동작 변경 없음.** PERSONAL은 즉시 `role` 설정, 사업자(RENTAL_BIZ 포함)는 `requestedRole`+`verifyStatus="pending"` 기록(승인 전 `role`은 PERSONAL 유지). 이번 작업은 이 라우트의 로직을 바꾸지 않고 **후속 플랜 단계로의 연결(프론트)**만 추가한다.
- 프론트는 이 호출의 **성공을 사업자 인증 완료로 처리하지 않는다**(신청 접수 ≠ verified).

### 5.3 재사용 — 회원 구독/결제 API (전부 무변경)

아래 엔드포인트는 **구현·요청/응답·에러·서명·멱등·소유권 검증을 변경하지 않는다.** 공통: `memberEndpoint` 봉투(`{ error, code }`, `Cache-Control: no-store`), `requireUser(await auth())` 인증, 변이는 `memberMutation`(CSRF `assertMemberOrigin` + 16KB 상한 + rate limit).

| 메서드 + 경로 | 인증 | Request | Response(성공) | Response(실패) |
| --- | --- | --- | --- | --- |
| `POST /api/member-subscription/orders` | 필요 | `MemberOrderRequest { purpose:"initial"\|"renewal", plan:MemberPlan, durationMonths, productKind, idempotencyKey }` | 201 `MemberOrderResponse { orderId, amount, currency, plan, durationMonths, status, payment }` | `plan_not_allowed`(403)·`verification_required`(403)·`invalid_duration`(400)·`idempotency_conflict`(409)·`plan_change_not_allowed`(409)·`rate_limited`(429) 등 |
| `GET /api/member-subscription/orders/[orderId]` | 필요(본인) | — | 200 `MemberOrderStatus { orderId, status, applied, appliedPeriodStart, appliedPeriodEnd, plan, durationMonths }` | `not_found`(404) |
| `POST /api/member-subscription/payment/callback` | 필요 | `MemberPaymentCallbackRequest { paymentId, imp_uid, callbackContext, callbackSignature }` | 200 (적용 결과) | `payment_failed`(400)·`payment_pending`(409)·`payment_needs_review`(409)·`transaction_conflict`(409) |
| `POST /api/member-subscription/orders/[orderId]/recover` | 필요(본인) | `{ imp_uid? }` | 200 (재검증·멱등 복구 결과) | `payment_*`·`not_found`(404) |
| `GET /api/member-subscription/status` | 필요 | — | 200 `MemberSubscriptionStatus` | `rate_limited`(429) |
| `POST /api/member-subscription/trial` | 필요 | (기존 계약) | 200 `TrialResult` | `trial_already_used`(409) 등 |

- **온보딩 작업은 이 표의 어떤 응답에도 `onboarding` 필드를 추가하지 않는다.** 온보딩 상태는 §5.1 전용 엔드포인트로만 노출한다.
- 주문 적격성·금액 재계산·멱등·공급자 재검증·소유권(`ownedOrder`)은 기존 서버 구현 그대로다. 신규 정책은 **상수(§3)로만** 주문 거절에 반영된다.

---

## 6. 가입 의도 보존 계약 (`lib/signup-intent.ts` 확장)

기존 `SIGNUP_INTENT_COOKIE`(10분 만료, 신규 소셜 가입 차단/허용 검사용)와 `INTENDED_ROLE_KEY` sessionStorage, 그리고 "신규 소셜 계정 + 쿠키 없음 → 계정 생성 차단" 서버 검사는 **유지**한다.

**확장:** `markSignupIntent`에 선택 플랜·기간 힌트를 가산한다.
```ts
export const INTENDED_PLAN_KEY = "intendedPlan";
export function markSignupIntent(intendedRole?: string, intendedPlan?: { plan: MemberPlan; durationMonths: DurationMonths }): void;
export function readIntendedPlan(): { plan: MemberPlan; durationMonths: DurationMonths } | null; // 형식 검증 후 유효할 때만 반환
```

- **힌트는 복구 UX 전용이며 권한 근거가 아니다.** 서버는 쿠키/sessionStorage의 role·plan을 읽더라도 권한·완료 판정에 쓰지 않는다. 항상 §4 서버 판정이 우선한다.
- 신규 정상 흐름은 **OAuth 이후 플랜을 선택**하므로 최초 `intendedPlan`은 비어 있을 수 있다. 재인증 왕복 등에서 **유효한 값만 복원**하고 선결제를 강요하지 않는다.
- `readIntendedPlan`은 허용된 `MemberPlan`·`DurationMonths` 형식만 통과시키고, **현재 서버 role과 불일치하면 무시**하고 다시 선택하게 한다.
- **저장 금지:** 사업자번호, 결제 서명, `nonce`, `callbackContext`, `imp_uid`는 가입 의도 저장소에 넣지 않는다. 결제 복구용 `orderId` 보존은 기존 `useMemberOrderFlow` 구현 그대로 사용한다.
- 가입 의도/플랜 힌트는 **정상 소비·완료·계정 전환 시 정리**해 다른 계정 선택이 섞이지 않게 한다.

---

## 7. 프론트 위저드 일반화 계약

### 7.1 `deriveWizard` / 완료 판정 (role별)
현재 `useBusinessWizard`의 `deriveWizard`는 `memberStatus.plan !== "FREE" && (active||trialing)`이면 완료로 본다. 이는 **부동산/기업의 trialing 완료 우회**를 허용하므로 **금지**한다. role별로 다음을 반영한다:

- 입력은 **서버 권위 데이터**만: 세션 `role`·`verifyStatus`, `GET /status`의 `plan`·`status`(또는 §5.1 `GET /api/signup/onboarding-status`의 `stage`). 클라이언트 보유 `intendedRole`/`step`은 화면 복구 힌트일 뿐 권한 근거가 아니다.
- 완료 조건(클라 라우팅용, 서버 §4 규칙과 동일 결과):
  - PERSONAL: 역할 설정 완료 → 완료(플랜은 선택 사항, 미결제여도 앱 접근 가능).
  - RENTAL_BIZ: `verified` → 완료(FREE 허용). 유료 선택 시 active면 유료 완료.
  - REALESTATE/BUSINESS: `verified` && `plan==="PREMIUM"` && `status==="active"`일 때만 완료. **`trialing`/`grace`/FREE/PRO는 완료 아님.**
- 개인 흐름은 **인증(2) 단계를 생략**한다. `maxStep`/`actionStep` 산출을 role로 분기한다.
- **클라 가드(`maxStep`)는 서버 접근 통제를 대체하지 않는다.** 보호 기능 접근 차단은 서버(§4.5·기존 `requireMemberEntitlement`)가 담당한다.

### 7.2 플랜 선택 화면 (`Step3PlanSelect`) 렌더 규칙
- 노출 유료 카드 = `ROLE_ALLOWED_PLANS[서버 role]` (프론트는 `useMemberPricing(role).allowedPlans` 사용).
- "무료로 시작" CTA = `ROLE_FREE_ALLOWED[서버 role] === true`일 때만.
- **부동산/기업:** PREMIUM 카드 단독, 무료·건너뛰기·**체험 완료 버튼 없음**, "가입 완료를 위해 PREMIUM 결제가 필요합니다" 안내. PREMIUM이 자동 선택돼도 기간·총액 확인과 명시적 결제 동의는 필요.
- 월 기준가는 월 자동청구가 아니며, 선택 기간의 **실제 선불 총액**(`amount`)을 함께 표시한다.
- **체험(trialing) 완료 경로 제거:** 신규 통합 가입에서 체험으로 완료·건너뛰기를 제공하지 않는다. 기존 체험 API(`POST /trial`)의 다른 진입점 계약은 유지하되 가입 위저드에 연결하지 않는다.
- 역할 미확정·현황 조회 실패 중에는 **구매·무료 완료를 실행하지 않고** 로딩/재시도를 표시한다.

### 7.3 재진입·모바일 복귀 라우팅 (`stage` → 경로 매핑, 프론트 책임)
- 매핑: `role` → 유형/역할 설정, `verify` → 사업자 인증 단계, `plan` → 플랜 선택 단계, `pay` → 결제 단계, `complete` → `/home`(앱).
- 실제 미해결 주문이 있으면 **기존 주문 조회·복구(`useMemberOrderFlow`)를 우선**한다. 모바일 결제 복귀는 기존 `redirectPath: "/renewal/pricing"`과 복구 훅을 **변경하지 않고** 재사용하며, 복구가 끝난 뒤 가입 연결 계층에서 서버 온보딩 조건을 확인한다.
- URL·쿠키·sessionStorage가 유실돼도 DB의 role·requestedRole·인증·구독·주문 상태로 안전하게 재개한다. 서버에 없는 플랜 선택은 추정 복구하지 않고 다시 선택하게 한다.
- **실패를 성공으로 이동시키지 않는다:** `setup-role`/결제 실패·이탈을 자동 FREE 전환이나 완료 화면으로 처리하지 않고, 현재 단계에서 재시도를 제공한다(현 `signup/complete`의 "기타 에러 → /home" 이동을 교정).

---

## 8. 구현 순서 (백엔드 → UI)

기획 §6 우선순위(전부 P0, 1~6은 출시 차단)를 따른다. 백엔드 정책/가드를 먼저 확정·검증한 뒤 UI를 연결한다.

| 순서 | 담당 | 작업 | 완료 기준(검증 가능) |
| --- | --- | --- | --- |
| 1 | 공통 | 보호 경계·신규/기존 판정·FREE 완료 의미 확인 | 변경 허용 범위 확정, 결제 계약 변경 0 |
| 2 | 백엔드 | `pricing.ts` 상수 변경(§3) | 단위 테스트: REALESTATE/BUSINESS PRO 주문 `plan_not_allowed`, 미인증 `verification_required`. 기존 부동산/기업 PRO 기준선 회귀 無 |
| 3 | 백엔드 | `onboarding.ts` 신규(`decideOnboarding`·`requiresPaidToComplete`·`resolveOnboardingState`·`requireOnboardingComplete`) + 타입 가산(§2.2) | 순수 함수 단위 테스트(규칙표 7행 + 엣지), trialing/grace/paid-단독/누락정책 우회 전부 미완료 판정 |
| 4 | 백엔드 | `GET /api/signup/onboarding-status` 신규(§5.1) | 인증 필수, 서버 권위 응답, release 비활성 안전응답. 기존 `/status` DTO 불변 |
| 5 | 백엔드 | 보호 접근 가드 결선(`requireOnboardingComplete` 라우팅 가드) | REALESTATE/BUSINESS 미결제 신규 계정 앱 진입 차단, 복구 경로 열림 유지, 기존 `requireMemberEntitlement` 중복 미구현 |
| 6 | 프론트 | 가입 의도 확장(`signup-intent.ts`, §6) | `intendedPlan` 보존/검증, 금지 값 미저장 |
| 7 | 프론트 | 위저드 role 일반화(`deriveWizard`·셸·컨텍스트, §7.1) | 개인 인증 단계 생략, trialing 완료 우회 제거, 서버 상태 기준 재진입 |
| 8 | 프론트 | 플랜 선택 UI(`Step3PlanSelect`, §7.2) | 허용 카드만 렌더, 개인·임대만 무료 CTA, 부동산·기업 결제 필수 문구 |
| 9 | 프론트 | 가입 진입·OAuth 복귀 연결(`signup/page`·`complete/page`) + 결제 단계(§7.3) | 플랜 단계 연결, 실패 시 성공 이동 금지, 기존 결제 훅·API 무변경 |
| 10 | 공통 | 보안·호환·보호 회귀, 문구/진행바 UX 정리 | 직접 API 우회 차단, grandfather 보존, 보호 파일 diff 0 |

- 각 백엔드 단위는 `npm run test`(회원 테스트 설정 포함)로, 프론트 단위는 `npm run build`로 단계별 검증 후 다음 단계로 이동한다.
- 교차검증은 오케스트레이터(멀티모델)로 **백엔드↔프론트 독립 적대검토**를 수행한다.

---

## 9. 견고성 자문 4문 (완료 선언 전 필수)

| 질문 | 본 설계의 답 |
| --- | --- |
| **규모(100×)** | `resolveOnboardingState`는 요청당 `resolveEffectiveEntitlement` 1회(단일 user 조인)만 수행. `GET /onboarding-status`는 읽기 rate limit(120/분). 목록·반복 조인·N+1 없음. KDF·암복호화 재연산 없음(권한 판정은 메모리 계산) |
| **수명주기** | 온보딩은 **생성하는 영속 상태가 없다**(파생 판정). 따라서 고아·삭제 경로 신설 없음. FREE는 레코드 미생성. 유료 주문/구독의 생성·취소·만료·복구는 기존 `member-subscription/*` 수명주기 그대로 |
| **비정상 경로** | 재시도·동시요청·멱등은 기존 주문/콜백/복구 계약 유지. IDOR은 `ownedOrder`+userID 귀속 판정. 입력 위조(role/plan/step/completed/금액/active)는 서버 미신뢰. `pay`만 처리하고 `complete` 쓰기 엔드포인트 부재로 완료 위조 불가. release 비활성·env 누락 시 안전응답(복구 경로 미차단) |
| **적대적 자문** | trialing/grace/paid-단독/상태문자열-active/누락정책(grandfather 폴백)으로 신규 결제필수 완료를 만들 수 있는가 → 전부 규칙표에서 미완료. 상수 축소가 기존 부동산/기업 PRO 기준선을 훼손하는가 → §4.4 `isNewSignup` 분리 + 회귀 테스트로 차단. 구현 후 병렬 코드리뷰로 재검토 |

---

## 10. 절대규칙 준수 체크리스트 (설계 기준)

| # | 원칙 | 본 설계의 반영 |
| --- | --- | --- |
| 1 | **페이지 500줄 제한** | 신규 `onboarding.ts`·엔드포인트는 소형. 위저드 일반화는 hook/shell/step 분리로 각 파일 500줄 이하 유지. 400줄 초과 예상 시 대장 보고 후 진행 |
| 2 | **단일 책임** | 순수 판정(`decideOnboarding`) / DB 조립(`resolveOnboardingState`) / 가드 / 엔드포인트(조립만) / UI(step) / 상태(hook) 분리. UI·상태·비즈니스·API 혼재 금지 |
| 3 | **서버 검증·보안** | 완료 판정 전부 서버 DB 기준, 클라 값 미신뢰. 상수 변경으로 PRO 위조 주문 거절. CSRF(`validateOrigin`/`assertMemberOrigin`)·멱등·소유권·공급자 재검증·금액 재계산 기존 방어 유지. 비밀/서명/imp_uid 저장 금지 |
| 4 | **성능** | 요청당 단일 entitlement 조회, 중복 `/status` 호출은 기존 `BusinessWizardContext` 공유 패턴 유지, N+1 없음, 읽기 rate limit |
| 5 | **폴더 구조** | 로직 `lib/member-subscription/`, API `app/api/`, 타입 `types/`, UI는 라우트 하위 `components/`/`steps/`, 상태 `hooks/`, 공용 유틸 `lib/signup-intent.ts` |

**보호 경계 diff 0 확인 대상:** `lib/guest-monitoring/*`, `portoneV1Provider`, 비회원 흐름, `app/api/member-subscription/*` 구현, 재사용 훅·회원 API 클라이언트, 기존 결제 DTO·`MemberPlan` 타입.

**검증 전제(후속 구현 단계):** `npm run lint`/`npm run test`/`npm run build` 통과 + 회원/비회원 회귀(테스트 완화 금지) + 보호 파일·훅·API diff 0 + **t-vestra 무출금 검증** 후 대장 승격. 본 설계 문서 단계에서는 구현·결제 테스트를 수행하거나 통과했다고 주장하지 않는다.
