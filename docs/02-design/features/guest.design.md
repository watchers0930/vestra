# 회원 선불 구독 연동 설계서 (공용 계약서)

> 프로젝트: VESTRA
> 작성일: 2026-10-16
> 상태: Design — 백엔드(Codex)·프론트엔드(Claude) **공용 계약**. 구현·DB 변경·마이그레이션·env·실결제·배포 **미수행**
> 상위 문서: [`docs/01-plan/features/guest.plan.md`](../../01-plan/features/guest.plan.md)
> 기준 코드(읽기): `prisma/schema.prisma`(`Subscription`/`Payment`/`User`), `lib/pricing-plans.ts`, `lib/subscription-plan.ts`, `lib/subscription-guard.ts`, `lib/auth.ts`(`ROLE_LIMITS`), `app/api/subscription/*`, `lib/csrf.ts`, `lib/danal/iamport-rest.ts`, `lib/danal/portone-v1-config.ts`
> 패턴 참조(차용만, 재사용 금지): `lib/guest-monitoring/*`, `lib/danal/portone-v1.ts`의 `portoneV1Provider`, `app/api/guest-monitoring/payment/*`
> 관련 설계: [`portone.design.md`](./portone.design.md) (비회원 V1 결제 — **이 문서가 참조하는 패턴의 원본**. 본 문서는 그와 **분리된** 회원 전용 경로를 정의한다)

---

## 0. 이 문서의 사용 규칙

- 이 문서는 **계약서**다. 경로·메서드·요청/응답 DTO·타입·함수 시그니처·상수·상태 매핑·에러 코드는 **스펙 고정**이며 백엔드와 프론트엔드가 동일하게 구현한다.
- 양측(클라이언트↔서버)의 접점은 아래 5가지뿐이다. 이 경계를 넘는 가정(**클라이언트가 금액/할인/한도/역할/기간/승인 여부를 판정**, **서버가 브라우저 전달 `imp_uid`/`merchant_uid`/`success`/금액/시각을 신뢰**)은 **금지**다.
  1. `POST /api/member-subscription/orders` 응답의 `payment` 객체 (V1 SDK 실행 정보 + 서명된 콜백 문맥)
  2. `POST /api/member-subscription/payment/callback` 요청/응답
  3. `GET /api/member-subscription/orders/[orderId]` 응답의 주문 상태 (`applied` 판정의 유일 근거)
  4. `GET /api/member-subscription/status` 응답 (구독/체험/grace/잠금/영수증 요약 — 화면 표시의 유일 근거)
  5. `POST /api/member-subscription/trial` 응답 (7일 체험 시작 결과)
- 스펙에 어긋나는 구현을 발견하면 **구현을 바꾸지 말고 이 문서를 먼저 고친 뒤** 양측에 반영한다.

### 0.1 절대 보호 경계 (기획서 §1.1 — 위반 시 즉시 중단·보고)

- **비회원 자산 전면 읽기 전용.** `GUEST_SINGLE_MONITORING`(1건·1개월·10,000원·`priceVersion="2026-10-15"`), `GuestMonitoringOrder` 및 비회원 테이블, `lib/guest-monitoring/*`, `lib/danal/portone-v1.ts`의 `portoneV1Provider`·비회원 API/SDK/다날 단건 흐름은 **수정·삭제·되돌림·공용화 리팩터링 금지**. diff 0건이 인수 기준이다.
- **재사용 허용은 저수준 plumbing만.** `lib/danal/iamport-rest.ts`(V1 토큰·REST GET/POST), `lib/danal/portone-v1-config.ts`의 공개 env/config 함수, CSP 설정만 **읽어** 재사용한다. 이를 재사용한다는 이유로 비회원 동작·테스트 게이트·채널 allowlist를 바꾸지 않는다. 회원 코드가 비회원 **도메인 서비스**(`lib/guest-monitoring/*`, `portoneV1Provider`)를 import 하는 것은 금지.
- **회원 전용 신규 경로에만 로직 작성.** 회원 가격·주문·검증·활성화·정책·체험·만료는 `lib/member-subscription/*`, `app/api/member-subscription/*`에 둔다. 비회원 주문 서비스·공급자 selector·서명 헬퍼를 호출해 회원 주문을 처리하지 않는다.
- **`iamport-rest.ts`의 내부 비회원 오류 클래스 의존성은 현상 유지.** 회원 경계에서 외부 오류를 회원용 오류 코드(§3)로 **정규화**한다. 보호 파일의 전이 의존성을 제거하려고 보호 파일을 수정하지 않는다.
- **본 설계 단계에서 실행하지 않는 것:** Prisma 스키마 적용·SQL·마이그레이션·env 추가·실결제·운영 DB 변경·기능 코드 변경. §2의 DB 모델은 **후속 상세 설계용 필드 계약**이며 실행 가능한 마이그레이션이 아니다(운영 적용은 §9 절차·대장 확인 후 별도 작업).

### 0.2 테스트/실결제 분리 (기획서 §9 — 코드보다 먼저)

**테스트 자격증명 보유 · 테스트 코드 통과 · 무출금 테스트 성공 · 회원 운영 실결제 가능은 각각 다른 완료 조건이다.** 현재 `verifiedV1TestChannels=[]`이며 config 게이트가 미등록 채널을 **503**으로 차단한다(키가 있어도). 따라서:

- 회원 결제 어댑터는 허용된 `iamport-rest.ts`/config 인터페이스와 **격리 fixture/DB**로 설계·검증한다. 코드·테스트가 통과해도 **"회원 V1 결제 실동작 완료"로 보고하지 않는다.**
- 회원 **live 설정**을 전달하는 plumbing 계약은 §9.3의 별도 선행 작업이다. 현재 `getPortoneV1Config()`가 공용 테스트 게이트에 묶여 있으므로, **공용 설정을 바꿔 비회원 테스트 채널·키·상태 판정이 함께 전환되는 방식은 금지**한다. 비회원 인터페이스/채널을 보존할 수 없으면 출시를 보류하고 별도 범위 결정을 받는다.

---

## 1. 아키텍처 및 컴포넌트 구조

### 1.1 레이어 책임 (절대규칙 §단일책임·§폴더구조)

```
[클라이언트: app/(personal-home)/renewal/pricing, /pricing, /profile?tab=tier, 사업자 4단계 위저드]
  components/member-subscription/*   UI (표시·입력)                 ← JSX·버튼 상태 (결제 프로토콜·가격산정 금지)
  hooks/useMemberPricing             가격표 조회·역할별 허용 상품 필터  ← 서버 status/pricing 표시 상태
  hooks/useMemberOrderFlow           주문→결제→콜백→상태 확정          ← 결제 상태머신
  hooks/useMemberSubscription        현황·만료·재구독·체험 시작         ← status 세션·갱신 상태머신
  hooks/useBusinessWizard            사업자 4단계 진행·재개            ← 서버 신청 상태 기반 step 복원
  member/memberPayment               결제 실행 헬퍼 (V1 SDK)          ← provider 분기·request_pay·콜백 결과
  member/portoneV1Loader             V1 CDN script 로더               ← script 수명주기·IMP 공유·재시도 초기화
  member/memberApi                   HTTP 클라이언트                  ← fetch·same-origin·no-store·결과 래핑
  member/paymentFailure              실패 분류 순수 함수               ← blocked/recheck/conflict
        │ (HTTP, HttpOnly NextAuth 세션 쿠키)
        ▼
[서버: app/api/member-subscription]
  orders/route.ts                    POST 주문 생성 (로그인·금액입력 불허)
  orders/[orderId]/route.ts          GET 본인 주문·적용 여부 조회
  orders/[orderId]/recover/route.ts  POST 본인 주문 재조회·복구(새 결제 아님)
  payment/callback/route.ts          POST 로그인·CSRF·서명·소유권·재검증
  trial/route.ts                     POST 적격 7일 trialing 원자적 1회 시작
  status/route.ts                    GET 구독/체험/grace/잠금/영수증 요약
[서버: app/api/cron]
  member-subscription-lifecycle/route.ts  인증 cron: 회원 만료·복구·알림 전용
        │
        ▼
[서버 서비스: lib/member-subscription]
  pricing.ts         상품 SSOT·정수 가격 산정·역할/기간 허용표 (클라/서버 공용 순수 데이터)
  orders.ts          회원 소유 주문 생성·TTL·멱등키·스냅샷·미완료 주문 재사용
  provider.ts        회원 SDK 실행 정보·V1 live/test config 해석(허용 plumbing 경유)
  verification.ts    V1 서버 재조회·응답 검증·두 번째 조회 대조
  callback-context.ts 회원 전용 HMAC purpose·키 도메인·nonce 발급/검증
  schemas.ts         strict Zod DTO (주문/콜백/복구/체험/status)
  record-payment.ts  PAID 원자 기록·nonce 소비·거래 중복 차단
  activation.ts      Subscription 생성/연장 + Payment(completed) + 적용기간/appliedAt 멱등 트랜잭션
  recovery.ts        paid&&appliedAt=null 재적용, merchant_uid 후보 탐색
  policy.ts          유효 권한 계산(role/인증·이용상태·grandfather·신규신청)
  trial.ts           7일 체험 적격성·원자적 1회 소비
  lifecycle.ts       달력 개월 계산·만료·grace·locked 전이
  errors.ts          회원 전용 오류 코드·메시지(외부 오류 정규화)
        │
        ▼
[공급자 plumbing: lib/danal — 읽기 재사용만]
  iamport-rest.ts        V1 토큰·REST GET/POST (불변)
  portone-v1-config.ts   공개 env/config 함수 (불변)
```

### 1.2 신규/변경 파일 목록과 파일 분리 계획 (500줄 제한 — 절대규칙 §1)

#### 서버 (Codex) — 전부 신규, 각 파일 책임 1개·목표 ≤200줄

| 파일 | 책임 | 비고 |
| --- | --- | --- |
| `lib/member-subscription/pricing.ts` | 상품 SSOT·`computeAmount`·역할/기간 허용표 | 순수 데이터+순수 함수, prisma 의존 없음 |
| `lib/member-subscription/schemas.ts` | strict Zod DTO | 클라에 import 금지(서버 전용 refine 포함) |
| `lib/member-subscription/orders.ts` | 주문 생성·TTL·멱등·스냅샷·재사용 | |
| `lib/member-subscription/provider.ts` | 회원 config 해석·SDK 실행 정보 | `portone-v1-config` 읽기만 |
| `lib/member-subscription/verification.ts` | V1 재조회·검증·두 번째 조회 | `iamport-rest` 읽기만 |
| `lib/member-subscription/callback-context.ts` | HMAC purpose·nonce 발급/검증 | 회원 purpose 고정 |
| `lib/member-subscription/record-payment.ts` | PAID 원자 기록·nonce 소비 | |
| `lib/member-subscription/activation.ts` | 구독 생성/연장 트랜잭션 | |
| `lib/member-subscription/recovery.ts` | 복구·후보 탐색 | |
| `lib/member-subscription/policy.ts` | 유효 권한 계산 | 기존 `subscription-guard`는 **불변**, 신규 판정만 추가 |
| `lib/member-subscription/trial.ts` | 체험 적격성·1회 소비 | |
| `lib/member-subscription/lifecycle.ts` | 달력 개월·만료·grace·lock | |
| `lib/member-subscription/errors.ts` | 오류 코드·정규화 | |
| `app/api/member-subscription/orders/route.ts` 외 6개 route | 얇은 핸들러(검증→서비스 위임) | 각 ≤120줄 |

#### 프론트 (Claude) — 라우트 하위 분리

| 파일 | 책임 |
| --- | --- |
| `member/memberApi.ts`, `member/memberPayment.ts`, `member/portoneV1Loader.ts`, `member/paymentFailure.ts` | HTTP·결제실행·로더·실패분류 |
| `hooks/useMemberPricing.ts`, `hooks/useMemberOrderFlow.ts`, `hooks/useMemberSubscription.ts`, `hooks/useBusinessWizard.ts` | 상태·흐름 (각 ≤300줄, 초과 시 헬퍼 분리) |
| `components/member-subscription/*` | 가격 카드·기간 선택·요약·진행바·마이페이지 패널 등 (UI만) |
| `app/(personal-home)/renewal/pricing/*`, `app/(app)/pricing/page.tsx` | **조합·진입만** — `lib/pricing-plans.ts`는 수정하지 않고 회원 화면만 신규 SSOT 참조로 전환 |
| `app/(personal-home)/signup/business/step-[1..4]/page.tsx`(안) | 사업자 4단계, 각 분리 라우트. 한 페이지에 가입·인증·선택·결제 폼 병치 금지 |

> ⚠️ **신규 `page.tsx` 생성·300줄 이상 수정이 예상되면 구현 시작 전 파일 분리 계획을 대장에게 보고**(절대규칙 강제 트리거). 작성 직후 400줄 초과 시 보고 후 분리.

---

## 2. 데이터 모델

> 아래는 **후속 상세 설계용 필드 계약**이다. 실행 가능한 Prisma/SQL 변경이 아니며, 실제 타입·enum 도입·인덱스 이름·백필·적용은 §9 절차와 대장 확인 후 별도 작업이다. 보호 대상 `GuestMonitoringOrder` 등 비회원 테이블은 변경 대상에서 **제외**한다(기획서 §8).

### 2.1 신규 `SubscriptionOrder` (설계 계약)

| 필드 | 타입/제약(안) | 목적 |
| --- | --- | --- |
| `id` | cuid PK | 내부 키 |
| `orderId` | String unique | 회원 전용 `merchant_uid`, prefix `msub_` |
| `userId` | String, FK(User)+index | 소유권, 사용자별 직렬화 |
| `subscriptionId` | String? nullable FK(Subscription) | 최초 결제 시 구독 미존재 허용, 적용 시 연결 |
| `purpose` | `initial` \| `renewal` | 최초 구독·연장 구분 |
| `plan` | `PRO` \| `PREMIUM` | 구매 상품 스냅샷 |
| `durationMonths` | Int (1·3·6·9·12·24) | 기간 스냅샷 |
| `monthlyPrice` | Int | 월 기준가 스냅샷(KRW 양의 정수) |
| `discountPercent` | Int (0·10·15·20·30) | 할인율 스냅샷 |
| `amount` | Int | 선불 총액(KRW 양의 정수) = `monthlyPrice*months*(100-discount)/100` |
| `currency` | String default `KRW` | 통화 |
| `priceVersion` | String | 가격 SSOT 버전 스냅샷 |
| `policyVersion` | String | 회원 정책 버전 |
| `roleAtOrder` | String | 주문 시점 역할 적격성 근거 |
| `roleApplicationId` | String? nullable FK(MemberRoleApplication) | 신규 전환 신청 결합 |
| `productKind` | `standard` \| `paid_trial` | 1개월 PRO 유료 체험 구분 |
| `status` | `pending`\|`paid`\|`needs_review`\|`failed`\|`canceled`\|`refunded` | 결제·운영 상태 |
| `providerMode` | `portone_v1` | 공급자 고정 |
| `channelEnvironment` | `test` \| `live` | 환경 혼용·주문 중 채널 변경 차단 |
| `merchantConfigVersion` | String | 가맹점 설정 버전 |
| `providerTransactionId` | String? unique | 검증한 `imp_uid`, 거래 재사용 방지 |
| `idempotencyKey` | String, **unique(userId, idempotencyKey)** | 같은 요청의 상품 불일치 검증 포함 |
| `callbackNonceHash` | String | 원문 nonce 미저장(해시만) |
| `nonceConsumedAt` | DateTime? | 원자적 1회 소비 |
| `verificationEvidence` | Json/Text? | 정제한 서버 검증 결과·시각, PII/원문 제외 |
| `paidAt` | DateTime? | 승인 시각 |
| `expiresAt` | DateTime | 대기 TTL |
| `appliedPeriodStart` / `appliedPeriodEnd` / `appliedAt` | DateTime? | 적용 구간·중복 적용 방지 |
| `createdAt` / `updatedAt` | DateTime | 감사·복구 |

**필수 인덱스:** `(userId, status)`, `(status, expiresAt)`, `(status, appliedAt)`.
**사용자별 미완료 주문 1개 정책**은 트랜잭션/행 잠금으로 보장하며, 필요 시 PostgreSQL 부분 unique 인덱스(`status='pending'` 조건)를 별도 DDL로 검토한다.
**연쇄 삭제 금지:** 영수증/거래 이력은 cascade 삭제 대상이 아니다(계정 삭제·보관 정책은 §9 별도 검토).

### 2.2 기존 모델 확장 및 정책 기록 (호환 분기 — 레거시 보존)

| 대상 | 설계 변경(안) | 호환 원칙 |
| --- | --- | --- |
| `Subscription` | 신규 `plan="PREMIUM"`, 신규 `status="trialing"`, `trialStartedAt`/`trialEndsAt`, `graceEndsAt`/`lockedAt`, `policyVersion`, `orders SubscriptionOrder[]` 관계 추가 | `price`는 **월 기준가** 의미 유지, 선불 총액은 Order/Payment에 저장. 레거시 `plan="BUSINESS"`·`endDate=null` **보존**. `startDate`는 재결제 시 보존 |
| `Payment` | `subscriptionOrderId String? unique FK`, 정제 `receiptUrl` 기록 경로 | 기존 `orderId unique` 유지, 과거 결제 **재작성 금지**. paid 주문 적용 시 정확히 **1개** `status="completed"` 영수증 |
| `User` 관계 | `subscriptionOrders`, `membershipPolicy`, `roleApplications` 관계 추가 | **`role`은 결제 상품에 의해 자동 변경하지 않음** |
| 신규 `MemberSubscriptionPolicy` | `userId unique`, `policyVersion`, `grandfatheredAt?`, `legacyEntitlementsSnapshot Json`, `trialUsedAt?`, `createdAt/updatedAt` | 기존 권한 기준선·체험 1회 소비 기록. 스냅샷은 **필요 최소 값**만 |
| 신규 `MemberRoleApplication` | `id`, `userId`, `requestedRole`, `requestedAt`, `policyVersion`, `status`(pending\|verified\|rejected\|completed\|canceled), `verifiedAt?`, `completedAt?` | 도입 **전** 대기 신청과 도입 **후** 새 신청 구별. 기존 `User.requestedRole`/`verifyStatus`와 연결 |

**DB 불변식(상세 설계에서 DB 제약/트랜잭션으로 분배):**
- `status="paid"` → `providerTransactionId`·`paidAt`·`verificationEvidence` 필수.
- `appliedAt != null` → `appliedPeriodStart/End`·`subscriptionId`·`status="completed"` Payment 1건 존재.
- `endDate > startDate`. 주문의 `amount`/`durationMonths`/`channelEnvironment`는 생성 후 클라이언트 요청으로 바뀌지 않음.
- `trialing`·FREE는 `Payment` 영수증을 만들지 않음. FREE 개인은 `Subscription` 없어도 `status.plan="FREE"`로 조회 가능.
- `trialUsedAt`은 `Subscription` 삭제/변경으로 초기화되지 않는 `MemberSubscriptionPolicy`에 보존.

### 2.3 타입 정의 (프론트·백 공용 — `types/member-subscription.ts`)

```ts
export type MemberPlan = "PRO" | "PREMIUM";
export type DurationMonths = 1 | 3 | 6 | 9 | 12 | 24;
export type ProductKind = "standard" | "paid_trial";
/** 회원 역할 코드 — lib/auth.ts와 일치(일괄 BUSINESS 치환 금지) */
export type MemberRole = "PERSONAL" | "RENTAL_BIZ" | "BUSINESS" | "REALESTATE";
export type OrderStatus = "pending" | "paid" | "needs_review" | "failed" | "canceled" | "refunded";
export type SubStatus = "trialing" | "active" | "grace" | "locked" | "expired" | "canceled";

/** 서버→클라 표시용 상품(가격 스냅샷). 클라는 이 값을 표시만, 결정 금지 */
export interface MemberProductView {
  plan: MemberPlan;
  durationMonths: DurationMonths;
  productKind: ProductKind;
  monthlyPrice: number;        // 월 기준가 (표시)
  discountPercent: number;
  amount: number;              // 선불 총액 (표시)
  currency: "KRW";
  monitoringLimit: number;     // PRO 5 / PREMIUM 20
  priceVersion: string;
  eligibleForCurrentRole: boolean;
  disabledReason?: string;     // 부적격 사유(표시용)
}

/** GET /status 응답 */
export interface MemberSubscriptionStatus {
  plan: MemberPlan | "FREE";
  status: SubStatus;
  role: MemberRole | "ADMIN" | "LAWYER";
  isGrandfathered: boolean;
  startDate: string | null;    // ISO, 표시 Asia/Seoul
  endDate: string | null;      // ISO
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  lockedAt: string | null;
  monitoring: { used: number; limit: number };
  trialEligible: boolean;      // 7일 무료체험 적격
  paidTrialEligible: boolean;  // 1개월 유료 체험 적격(개인 PRO)
  renewalCandidate: { plan: MemberPlan; durationMonths: DurationMonths } | null;
  receipts: Array<{ orderId: string; plan: MemberPlan; amount: number; paidAt: string; receiptUrl: string | null }>;
}
```

### 2.4 서버 가격 SSOT (`lib/member-subscription/pricing.ts` — 계약 고정)

```ts
export const MEMBER_PRICE_VERSION = "<출시 시 확정, 예: 2026-10-16>";
export const MEMBER_POLICY_VERSION = "<출시 시 확정>";
export const MEMBER_MONTHLY_BASE: Record<MemberPlan, number> = { PRO: 9900, PREMIUM: 29900 };
export const MEMBER_MONITORING_LIMIT: Record<MemberPlan, number> = { PRO: 5, PREMIUM: 20 };

/** 역할별 선택 가능 플랜 (기획서 §3.1 — RENTAL_BIZ 누락 금지) */
export const ROLE_ALLOWED_PLANS: Record<MemberRole, MemberPlan[]> = {
  PERSONAL:   ["PRO"],                 // 개인: FREE(무결제) 또는 PRO. PREMIUM 구매 거부
  RENTAL_BIZ: ["PRO", "PREMIUM"],      // 사업자: FREE·1개월 유료체험 거부
  BUSINESS:   ["PRO", "PREMIUM"],
  REALESTATE: ["PRO", "PREMIUM"],
};

/** 허용 기간·할인 표 (standard) */
export const DURATION_DISCOUNT: Record<DurationMonths, number> = {
  1: 0, 3: 0, 6: 10, 9: 15, 12: 20, 24: 30,
};

/** 서버 금액 산정 — 정수 아니면 설정 오류(throw), 임의 반올림 금지 */
export function computeAmount(monthly: number, months: number, discountPercent: number): number {
  const raw = monthly * months * (100 - discountPercent);
  if (raw % 100 !== 0) throw new MemberConfigError("non_integer_price");
  return raw / 100;
}
```

**확정 가격표(계약 — §4.1에서 재검증):**

| 상품 | plan | months | discount | amount | 구매 조건 |
| --- | --- | ---: | ---: | ---: | --- |
| 1개월 유료 체험 | PRO | 1 | 0% | **9,900** | **개인 PRO 전용**(`productKind="paid_trial"`), 사업자 구매 불가 |
| 3개월 PRO | PRO | 3 | 0% | **29,700** | 해당 역할 허용 플랜 |
| 6개월 PRO | PRO | 6 | 10% | **53,460** | |
| 9개월 PRO | PRO | 9 | 15% | **75,735** | |
| 1년 PRO | PRO | 12 | 20% | **95,040** | |
| 2년 PRO | PRO | 24 | 30% | **166,320** | |
| 3개월 PREMIUM | PREMIUM | 3 | 0% | **89,700** | 사업자 전용 |
| 6개월 PREMIUM | PREMIUM | 6 | 10% | **161,460** | |
| 9개월 PREMIUM | PREMIUM | 9 | 15% | **228,735** | |
| 1년 PREMIUM | PREMIUM | 12 | 20% | **287,040** | |
| 2년 PREMIUM | PREMIUM | 24 | 30% | **502,320** | |

> PREMIUM 1개월은 **구매 불가**(표에서 제외). FREE는 기간 구매·결제 주문 없이 이용(주문·영수증 미생성). VAT 포함 표기를 기준으로 하되 출시 전 사업 담당자가 최종 표시 기준 확인(기획서 §3.2·§12).

### 2.5 서버 상수·환경변수 (신규는 §9.3 선행 전 미설정)

- 회원 주문 prefix `msub_`, TTL(회원 전용 값, 비회원 참조 금지), 콜백 purpose `member_subscription_payment_v1`, HMAC 키 도메인 `member_sub`.
- V1 live/test 설정 전달 plumbing은 §9.3 별도 설계 전 **미사용**. 미확정 상태에서는 어댑터가 **503**으로 차단한다(테스트 채널 증빙·live 채널 승인 전 실행 금지).

---

## 3. API 스펙

> 공통 게이트(모든 변이 엔드포인트): ① `auth()` 로그인 세션(없으면 **401**) → ② `validateOrigin(req)` CSRF(실패 **403**) + 회원 전용 **명시 허용 Origin** 추가 검증(Referer 우회 차단, 기획서 §6.4) → ③ 요청 본문 Content-Length 상한(16KB, 초과 **413**) → ④ 사용자/주문별 rate limit → ⑤ 서비스 위임.
> 모든 응답은 `Cache-Control: no-store`. 실패 응답 공통 형태 `{ "error": string, "code": string }` (원문 REST 응답·상세 결제정보·secret·`imp_uid`·토큰·서명·nonce·PII **미포함**).
> `app/api/cron/member-subscription-lifecycle`는 `Authorization: Bearer ${CRON_SECRET}` 검증(기존 `lib/csrf.ts:39` 패턴 재사용).

### 3.1 `POST /api/member-subscription/orders` — 주문 생성

- **인증:** 필요 (로그인 회원). **금액·할인·한도·역할·기간가격 입력 불허** — 클라이언트는 `plan`·`durationMonths`·`productKind`만 전달.
- **Request body** (`orderSchema`, `.strict()`):

```json
{ "purpose": "initial" | "renewal",
  "plan": "PRO" | "PREMIUM",
  "durationMonths": 1 | 3 | 6 | 9 | 12 | 24,
  "productKind": "standard" | "paid_trial",
  "roleApplicationId": "<resourceId, 신규 사업자 전환 결제 시>",
  "idempotencyKey": "<uuid v4>" }
```

규칙: `productKind="paid_trial"`이면 `plan="PRO" && durationMonths=1`만. `renewal`이면 `roleApplicationId` 불허. 서버는 금액 입력 필드를 **발견 즉시 거부**(`invalid_input`).

#### 처리 순서 (`orders.ts`)

```
1. auth() 로그인 → userId. validateOrigin + 회원 Origin 검증
2. orderSchema 파싱 실패 → 400 invalid_input (금액 등 금지 필드 포함 시 거부)
3. policy.resolveEffectiveRole(userId): DB role/인증·신규신청 결합 (JWT 단독 불신)
4. 적격성: plan ∈ ROLE_ALLOWED_PLANS[role] 아니면 403 plan_not_allowed
            paid_trial인데 role!=PERSONAL 또는 이미 사용 → 403/409
            durationMonths가 plan 허용표에 없으면 400 invalid_duration
5. 사용자별 잠금(advisory lock on userId) + 멱등키로 생성 요청 직렬화:
     - 같은 (userId, idempotencyKey)의 미완료 pending 주문이 동일 상품이면 재사용
     - 같은 멱등키 + 다른 상품/사용자 → 409 idempotency_conflict
6. 서버 SSOT로 amount 산정(computeAmount). 소수/음수/0 → 500 config_error(차단)
7. SubscriptionOrder 생성: orderId="msub_<uuid>", 스냅샷(plan/months/monthlyPrice/discount/amount/
     priceVersion/policyVersion/roleAtOrder/channelEnvironment/merchantConfigVersion), status=pending, expiresAt=now+TTL
8. callback-context: nonce 발급(해시만 저장) + HMAC(purpose=member_subscription_payment_v1,
     키도메인=member_sub) 서명 → payment 실행 정보 생성
9. json({ orderId, amount, currency, plan, durationMonths, status, payment }, 201)
```

#### Response — 성공 201

```json
{ "orderId": "msub_xxxx",
  "amount": 95040,
  "currency": "KRW",
  "plan": "PRO",
  "durationMonths": 12,
  "status": "pending",
  "payment": {
    "provider": "portone_v1",
    "impCode": "<imp code>",
    "pg": "danal_tpay.<MID>",
    "payMethod": "card",
    "paymentId": "msub_xxxx",
    "orderName": "VESTRA PRO 12개월",
    "amount": "95040",
    "currency": "KRW",
    "expiresAt": "<ISO-8601>",
    "redirectPath": "/renewal/pricing",
    "callbackContext": "<base64url>",
    "callbackSignature": "<hex>"
  } }
```

- `payment.paymentId === orderId` (= V1 `merchant_uid`). 이미 적용 대기/완료 주문 재사용 시 `payment`는 `{}`일 수 있고, 클라이언트는 `GET /orders/[orderId]`로 복구한다.

#### Response — 실패

| 상황 | HTTP | code |
| --- | --- | --- |
| 입력 형식·금지 필드 포함 | 400 | `invalid_input` |
| 허용 안 된 기간 | 400 | `invalid_duration` |
| 로그인 없음·만료 | 401 | `unauthorized` |
| 역할 부적격 플랜(개인 PREMIUM·사업자 FREE/1개월) | 403 | `plan_not_allowed` |
| 인증 미완료 사업자 결제 | 403 | `verification_required` |
| 유료 체험 재구매·체험 이력 충돌 | 409 | `trial_already_used` |
| 멱등키 충돌(상품/사용자 불일치) | 409 | `idempotency_conflict` |
| 활성 구독 중 다른 플랜 변경 시도(MVP 금지) | 409 | `plan_change_not_allowed` |
| rate limit | 429 | `rate_limited` (+헤더) |
| 공급자 설정·채널 증빙 누락·환경 미확정 | 503 | `provider_unavailable` |
| 가격 SSOT 정수 오류 등 설정 오류 | 500 | `config_error` |
| CSRF Origin 누락·불일치 | 403 | `forbidden` |

### 3.2 `GET /api/member-subscription/orders/[orderId]` — 본인 주문·적용 조회

- **인증:** 필요. 서버 `userId`로 소유권 제한(타인 주문 **404**).
- **Response 200:** `{ "orderId", "status", "applied": boolean, "appliedPeriodStart", "appliedPeriodEnd", "plan", "durationMonths" }`.
- **완료 판정의 유일 근거:** `status==="paid" && applied===true`. 클라이언트 SDK 반환만으로 완료 화면 금지.
- 실패: 미로그인 401 / 타인·부재 404.

### 3.3 `POST /api/member-subscription/payment/callback` — 결제 콜백

- **인증:** 로그인 세션 필수(**401**) + `validateOrigin` + 회원 Origin(**403**) + 주문-사용자 소유권(**404**). 브라우저 콜백을 공급자 웹훅 CSRF 예외와 **혼용 금지**.
- **Request body** (`callbackSchema`, `.strict()`):

```json
{ "paymentId": "msub_xxxx",
  "imp_uid": "imp_1234567890",
  "callbackContext": "<base64url, 서버 발급 echo>",
  "callbackSignature": "<hex, 서버 발급 echo>" }
```

> `imp_uid` 스키마: `z.string().regex(/^imp_[0-9a-zA-Z]{1,40}$/)`(실제 형식 §9.3 확정, 기본값).

#### 처리 순서 (`payment-callback` 서비스)

```
1. auth()·Origin → userId. callbackSchema 파싱 실패 → 400 payment_failed
2. 소유권: SubscriptionOrder(orderId=paymentId, userId=session.userId, providerMode="portone_v1") 없으면 404 not_found
   ← purpose/plan 허용만으로 타인 주문 권한 부여 금지
3. verifyCallbackContext: 서명·문맥·주문·nonce·만료 검증 실패 → 400 payment_failed (nonce 미소비)
4. 브라우저 success/amount/merchant_uid 불신. imp_uid로 V1 서버 재조회(verification.ts, §4.2)
     · ready/가상계좌 등 미확정 → 409 payment_pending
     · failed/cancelled(paidAt 없음) → 두 번째 조회 후 terminal 기록(가짜 paidAt 금지)
     · REST 401/timeout/429/5xx/손상 → 503 provider_unavailable (확정 실패와 분리, nonce 미소비)
5. 승인 기록 직전 독립적 두 번째 REST 조회. 두 조회의 주문/거래/최종상태 불일치·부분취소·모호 → 활성화 금지
6. 교차중복 차단: imp_uid가 비회원 GuestMonitoringOrder 등에 점유되었는지 읽기 조회.
     회원 주문 prefix·서명·merchant_uid 정확 일치로만 적용(§4.3)
7. recordPayment: providerTransactionId(imp_uid) unique + 현재상태 조건부 갱신으로
     nonce 소비·paidAt·증빙을 먼저 영속화 (§4.4)
8. activation: 사용자/주문 잠금 아래 Subscription 생성/연장 + Payment(completed) + 적용기간/appliedAt 를 단일 트랜잭션
9. return { ok: true }
```

#### Response — 성공 200: `{ "ok": true }`

#### Response — 실패

| 상황 | HTTP | code |
| --- | --- | --- |
| 형식·서명/문맥/주문 불일치·nonce 소비·금액/통화/PG/카드/MID/merchant_uid/imp_uid 불일치·취소내역 모순 | 400 | `payment_failed` |
| Origin 누락·불일치 | 403 | `forbidden` |
| 로그인 없음·만료 | 401 | `unauthorized` |
| 주문-사용자 소유권 불일치(IDOR) | 404 | `not_found` |
| 미확정 결제(ready/가상계좌) | 409 | `payment_pending` |
| 이미 needs_review 재적용 시도 | 409 | `payment_needs_review` |
| 교차중복(imp_uid 타 테이블 점유) | 409 | `transaction_conflict` |
| V1 REST 인증실패·timeout·429·5xx·손상 | 503 | `provider_unavailable` (nonce 미소비) |
| rate limit | 429 | `rate_limited` |

### 3.4 `POST /api/member-subscription/orders/[orderId]/recover` — 복구 (새 결제 아님)

- **인증:** 필요 + 소유권. **새 주문/결제창 자동 생성 금지.**
- **용도:** `imp_uid` 유실 pending 복구. `merchant_uid(=orderId)`로 V1 후보 거래 탐색 → 단건 재조회·전체 검증 → `recordPayment`(멱등) → `activation`.
- **Request body:** `{ }` 또는 `{ "imp_uid": "<옵션>" }`(있으면 재검증, 없으면 merchant_uid 후보 탐색).
- **Response 200:** `{ "status", "applied" }`. 후보가 복수·모호하면 `status="needs_review"`(임의 선택 금지).
- 실패: 401 / 404 / 409 `payment_needs_review` / 503 `provider_unavailable`.

### 3.5 `POST /api/member-subscription/trial` — 7일 무료체험 시작

- **인증:** 필요. **결제 승인 없는 `trialing` 권한**이며 Payment/paid 주문을 만들지 않는다.
- **Request body** (`trialSchema`): `{ "plan": "PRO" | "PREMIUM" }`(개인=PRO, 사업자=PREMIUM 등 역할 허용 플랜). 사업자는 인증 완료(§3.1 verified) 선행.
- **처리:** `trial.ts`에서 `MemberSubscriptionPolicy.trialUsedAt`을 **원자적 조건부 갱신**(이미 값 있으면 거부). 성공 시 `Subscription.status="trialing"`, `trialEndsAt=now+168h`.
- **Response 201:** `{ "status": "trialing", "plan", "trialEndsAt", "monitoringLimit" }`.
- 실패: 401 / 403 `verification_required` / 403 `plan_not_allowed` / 409 `trial_already_used`.

> **동시 요청·역할 변경·중복 요청에도 계정당 1회**. 재가입 이외의 경로로 체험을 재발급하지 않는다. 재가입 악용 식별 기준은 §9 후속 확정(기획서 §3.3·§12). 자동청구·카드/빌링키 수집 **없음**.

### 3.6 `GET /api/member-subscription/status` — 현황 요약

- **인증:** 필요. **잠금(`locked`) 중에도 접근 가능**(본인 데이터·재구독 CTA용).
- **Response 200:** §2.3 `MemberSubscriptionStatus`. 서버가 요청 시점 현재 시각으로 유효 권한(§4.5)·만료·grace·잠금을 계산(cron 지연 무관). `monitoring.used`는 상한 쿼리로 조회(N+1 금지).
- grandfather 회원은 `isGrandfathered=true`, 구독 미보유를 **오류/잠금으로 표시하지 않는다**.

### 3.7 `GET /api/cron/member-subscription-lifecycle` — 만료·복구·알림 (인증 cron)

- **인증:** `Authorization: Bearer ${CRON_SECRET}`만 허용(브라우저 접근 403). **회원 전용** — 비회원 만료 메시지·작업 큐·배치를 사용하지 않는다.
- **처리:** `status="paid" && appliedAt=null` 재적용(`take` 상한, §0-5 규모), 만료→grace→locked 전이(`lifecycle.ts`), 만료 임박/만료 알림(회원 전용 만료 기준 멱등키로 중복 차단). **자동 결제·자동 환불·승인 없는 성공 표시 금지.**
- **Response 200:** `{ "recovered": n, "expired": n, "locked": n, "notified": n }`(민감정보 없는 집계만).

### 3.8 기존 엔드포인트 — 최소 변경·회귀 금지

| 엔드포인트 | 처리 |
| --- | --- |
| `POST /api/subscription` | **유료 402 차단 유지.** FREE 다운그레이드만 허용. `PLAN_CONFIG`의 role 승격(PRO→BUSINESS 등)은 **유료 경로에서 호출되지 않음**(현재 402로 차단) — 이 결합을 회원 유료 활성화에 **사용하지 않는다**. 사업자 FREE 우회·무결제 역할 승격 차단 |
| `POST /api/subscription/cancel` | 기존 즉시 canceled·role PERSONAL 강등 동작을 **신규 선불 구독에 그대로 연결하지 않는다**(§7.3). 신규 해지 정책은 별도 경로 |
| `GET /api/subscription` | 조회 유지. 신규 status는 `/member-subscription/status` 사용 |
| `lib/subscription-guard.ts`·`subscription-plan.ts` | **불변.** 신규 판정은 `policy.ts`에 추가하고 레거시 BUSINESS 20건/PRO 5건 호환 분기 보존 |

---

## 4. 핵심 설계 디테일

### 4.1 가격 산정·스냅샷 (서버 SSOT)

- 클라이언트는 `plan`·`durationMonths`·`productKind`만 요청한다. **amount·할인율·한도·역할·시작/종료일은 서버가 결정.** 클라이언트 전달 금액을 발견하면 거부.
- `computeAmount`는 정수만 허용(소수 발생 시 `config_error`로 차단, 임의 반올림 금지). §2.4 표의 11개 조합은 모두 정수임을 테스트로 고정한다.
- 주문 생성 시 `priceVersion`·`monthlyPrice`·`discountPercent`·`amount`를 **스냅샷**으로 저장. 이후 가격이 바뀌어도 해당 유효 주문은 스냅샷으로 검증한다(과거 주문 재계산 금지).

### 4.2 V1 서버 재조회 확정 조건 (고정 — 허용 plumbing 경유)

`iamport-rest.ts`를 **읽기 재사용**해 `GET https://api.iamport.kr/payments/{encodeURIComponent(imp_uid)}`(`Authorization: {access_token}`, `cache:"no-store"`, timeout, 봉투+zod 검증). 아래 **전부** 충족해야 `paid` 저장·활성화.

| 검증 대상 | 통과 조건 |
| --- | --- |
| `imp_uid` | 요청 거래 ID 일치 + 다른 주문 `providerTransactionId`와 충돌 없음 |
| `merchant_uid` | 서명된 서버 주문 `orderId`(prefix `msub_`)와 정확 일치 — **소유권 핵심 결합** |
| `amount` | 정수, DB 주문 `amount` === `computeAmount` 재계산값 |
| `currency` | 주문·응답 모두 `KRW` |
| `pg_provider` | `danal_tpay` (본인인증 `danal`과 혼동 금지) |
| `pay_method` | `card` |
| MID | 응답 MID === 검증된 회원 채널 MID(공개 imp 코드와 혼용 금지) |
| `channelEnvironment` | 주문의 test/live === 응답 환경. **운영에서 테스트 승인 적용 불가**(503) |
| `status` | 적용은 `paid`만. `ready`→pending, `failed`/`cancelled`→terminal(가짜 paidAt 금지) |
| `paid_at` | `createdAt ≤ paidAt ≤ expiresAt` 및 `paidAt ≤ now` |
| 취소 내역 | `cancel_amount>0`·부분취소를 단순 `paid`로 활성화 금지 |

불일치는 **명시 거부**(`payment_failed`), 활성화 없음. 승인 기록 직전 **독립적 두 번째 조회**로 두 응답의 주문/거래/최종상태 일치를 재확인(불일치·모호 → `needs_review`).

### 4.3 회원·비회원 교차중복 차단

- 각 테이블 unique만으로 교차중복이 막힌다고 보지 않는다. 회원 검증 시 비회원 거래 점유 여부는 **읽기 조회만** 하고(비회원 테이블에 쓰지 않음), **회원 주문 prefix(`msub_`)·서명·`merchant_uid` 정확 일치**로만 적용한다.
- 동일 `imp_uid`가 비회원/회원 양쪽에 재사용되는 시나리오를 `transaction_conflict`(409)로 거부. 비회원 결제 테이블에 회원 거래를 **삽입 금지**.

### 4.4 nonce 원자 소비·멱등 (`record-payment.ts`)

- `verifyPayment → 두 번째 조회 → recordPayment` 순서. **nonce 소비는 결제 기록 경계**에 연결(검증 단독 소비 금지).
- `recordPayment`는 사용자/신원 잠금 트랜잭션 내 **조건부 갱신**: `where { id, callbackNonceHash=현재 미소비, status notIn [paid,needs_review,refunded,canceled], appliedAt=null }` → `status="paid", paidAt, providerTransactionId=imp_uid, nonceConsumedAt=now`. `count===1`만 성공, 아니면 동시 콜백 선처리로 보고 멱등 재조회.
- **일시 장애(503)에서는 recordPayment 미도달 → nonce 미소비** → 동일 문맥·멱등키 재시도 가능.
- **소비 후 재전송**(응답 유실)은 `providerTransactionId`·`nonceConsumedAt` 일치로 기존 결과 **멱등 반환**(재활성화 없음). `needs_review`는 콜백 재전송으로 **해제되지 않음**(수동 큐 보존).
- `providerTransactionId` unique(P2002)로 서로 다른 신원의 동시 청구 → `payment_failed`.
- **기록(paid)과 적용(appliedAt)은 분리 커밋**: 적용 실패해도 `paid` 유지 → cron/`recover`가 재적용. 영수증·기간 중복 증가는 unique·잠금·`appliedAt`으로 차단.

### 4.5 유효 권한 계산 (`policy.ts` — UI·API·감시 공통)

유효 권한 = `resolveEffectiveEntitlement(role/인증, 유료/체험 이용상태, grandfather 기준선, 신규 역할 신청 정책)`을 **독립 조회 후 계산**. 원칙:

- **결제로 역할/인증을 승격하지 않는다.** PRO 결제가 PERSONAL→BUSINESS 승격, PREMIUM 결제가 중개사 인증 대행을 **하지 않음**. 역할 승인은 기존 인증 경로(`admin/verify`)에서만.
- **UI 이동 제한만으로 게이트 금지.** 회원 신규/변경 API·사업자 기능 API·감시 등록·회원 감시 배치가 **같은 유효 권한**을 사용. JWT의 과거 plan/role/dailyLimit을 단독 승인 근거로 쓰지 않는다.
- **레거시 호환:** 기존 `plan="BUSINESS"` 구독 문자열·기존 감시 한도(PRO 5/BUSINESS 20)는 `subscription-guard.ts` 그대로 보존. **새 주문만 `PREMIUM`** 사용. 과거 플랜 rename·가격 재계산 금지. 레거시 보유 권한에 새 만료 가드를 일괄 적용해 축소하지 않는다.
- `ROLE_LIMITS`(`lib/auth.ts`) 전역 변경·비회원 배치 공통 경로 개편 금지.

### 4.6 grandfather·신규 전환 게이트 (기획서 §5)

- 도입 시점 `policyEffectiveAt`·버전 `policyVersion` 고정. 도입 전 생성 회원 전원에게 `MemberSubscriptionPolicy.grandfatheredAt`·`legacyEntitlementsSnapshot` 기록(§9 백필). **임의 날짜 부여 금지**(출시 시 확정).
- 기존 회원은 강제구독·grace·잠금 **제외**, 자발적 구매는 grandfather 포기로 해석하지 않음(만료 후 보호된 기준선 복원).
- **신규 사업자 전환 신청**(도입 후)에만 새 게이트 적용. 과거 계정 생성일로 우회 불가. 도입 **전** 대기 신청의 늦은 승인은 새 게이트 **미적용**. 취소·재신청·개인↔사업자 반복 전환으로 무료체험·grace를 **초기화하지 않는다**(`MemberRoleApplication`로 구별).
- 인증 승인 ≠ 결제 완료. 인증 역할과 사업자 유료 기능 접근은 **별도 서버 가드**로 결합.

### 4.7 기간·만료·grace·잠금 (`lifecycle.ts`)

- 최초 적용: `startDate=now`, `endDate=now+개월`, `status=active`. **달력 개월** 계산(30일 고정 곱 금지), 월말은 대상 월 마지막 유효일 보정. 7일=168시간. 저장/비교 **UTC**, 표시 **Asia/Seoul**, 유효 경계 `now < endDate`.
- 만료 전 **동일 플랜** 재결제: `startDate` 보존, `max(now, 기존 endDate)`부터 기간 추가. 만료 후 재구독: `now` 시작(공백 소급 과금 금지). 적용 구간은 주문(`appliedPeriodStart/End`)에 별도 기록. **MVP는 동일 플랜 연장만**(활성 중 다른 플랜 변경·차액 정산·중첩 구독 금지 → `plan_change_not_allowed`).
- 상태 전이:

| 대상 | 만료 처리 | 권한·데이터 |
| --- | --- | --- |
| 신규 개인 유료/무료체험 | `endDate`/`trialEndsAt` 도달 시 FREE | 데이터 보존. 유료 감시 실행·신규 등록 중지, 기존 결과 조회 가능 |
| 새 정책 사업자 유료/무료체험 | 만료일+7일 `grace`, 이후 `locked` | grace 동안 기존 이용 유지. grace 종료 후 사업자 기능·회원 감시 실행 중지 |
| grandfather 기존 회원 | 새 강제 만료/잠금 제외 | 자발적 구독 종료 시 보호 기준선 복원 |
| grandfather의 신규 사업자 전환 권한 | 해당 신청에 새 정책 | 새 권한에 grace/lock, 기존 개인 기준선 보존 |

- `graceEndsAt = (endDate | trialEndsAt) + 168h` **고정**(로그인/배치 지연/재접속으로 연장 금지). cron 지연 시에도 **요청 시점 현재 시각**으로 잠금 판정.
- **잠금 = 해당 사업자 유료 기능 제한**(계정 로그인 금지 아님). 로그인·마이페이지·본인 데이터 읽기/내보내기·결제/재구독·고객지원은 유지. 재결제 적용 즉시 새 만료일로 잠금 해제. **UI·서버 API·회원 감시 배치가 같은 정책 적용.**
- 등기감시 대상·분석·자산·이력 **삭제 금지**. 한도 초과(20건→PRO 5건 재구독 등) 시 사용자가 활성 5건 선택, 나머지 보관/중지·신규 등록 차단. grandfather 감시 권한은 축소 금지. 감시 공백에 소급 완료 표시 금지.

### 4.8 체험 (`trial.ts`)

- **7일 무료체험**: 계정당 1회(`trialUsedAt` 원자적 소비). 개인=`/pricing` 명시 신청, 사업자=인증 완료 후 4단계 체험 선택. Payment/paid 주문 미생성. 종료 시 자동결제 없음. 체험 중 결제 시 남은 체험을 유료 뒤에 더하지 않고 **결제 적용 시점부터 유료 기간 시작**(결제 전 전환일·종료일 안내).
- **1개월 PRO 유료 체험**(9,900원, `productKind="paid_trial"`): 7일 무료체험과 **별개**. 개인 PRO 계정당 1회(취소/실패 주문은 사용 미계산). 재구매 허용 여부는 §9 후속 확정.
- 사업자 4단계는 기본 **선불 결제** 단계이며, **최초 7일 체험 선택 시에만** 결제 유예하고 `trialing`으로 위저드 완료 허용(카드/빌링키 미수집).

### 4.9 결제 장애·복구 (기획서 §6.3)

- SDK 로드/init 실패(`request_pay` 전) → 같은 주문·멱등키 재시도(`retry_payment`). `request_pay` 이후 응답 유실/닫기/네트워크 → **승인 불명확 → 서버 조회부터**(새 주문/결제창 자동 생성 금지).
- 모바일 복귀의 `imp_uid`·`merchant_uid`는 **미신뢰 입력**: 세션 복구 후 본인 주문 대조·서버 재검증, 식별자 쿼리는 처리 후 제거. 서명·nonce·PII를 URL/웹 저장소에 **보관 금지**.
- `imp_uid` 유실 → `recover`에서 `merchant_uid` 후보 탐색 후 단건 조회·전체 검증. 복수 후보 → `needs_review`(임의 선택 금지).
- 세션 401 → 재로그인 후 기존 주문 재개. pending 409/429/503/네트워크 → 재조회. 400/403/404 영구 거부 → **안내 보존**(GET pending이 영구 거부를 승인 대기로 덮어쓰기 금지).

### 4.10 보안 (기획서 §6.4)

- 모든 주문/조회/복구에서 **서버 `userId` 소유권** 제한. 클라이언트 `userId`·`requestedRole`·`step` 불신.
- 상태 변경 CSRF: `validateOrigin` + 회원 **명시 허용 Origin**(잘못된 Origin을 Referer로 우회 허용하지 않는 추가 검증). 세션 쿠키·SameSite·strict 스키마 병용.
- HMAC·nonce 유효기간/1회 소비. 만료/소비 문맥 재전송은 동일 거래 멱등 복구만 허용. 공급자 웹훅과 브라우저 콜백 CSRF 예외 혼용 금지(웹훅 추가 시 별도 공급자 인증 + 동일 서버 재조회 선행).
- 서버 조회는 허용 REST 호스트·timeout·no-store. 영수증 URL은 검증된 공급자 값만(허용 스킴/호스트 확인, 임의 URL 서버 fetch 금지).
- 로그/분석/URL에 PII·REST 원문·`imp_uid`·토큰·서명·nonce·시크릿 **미기록**. 내부 주문 식별자·정제 상태·실패 사유만 감사 기록.
- 테스트/mock 거래는 운영 회원 유료 권한 **생성 불가**. 테스트는 격리 DB·계정, 운영은 미확인 채널/환경 **503** 차단.

---

## 5. 프론트 흐름 계약 (요약 — 구현 코드 아님)

> UI 구현 코드는 본 문서에 작성하지 않는다. 아래는 상태머신·접점 계약만 명시한다.

### 5.1 결제 실행 (`member/memberPayment.ts`)

`PaymentOutcome` 판별 유니온(비회원 패턴 차용, 회원 전용 구현):

```ts
type PaymentOutcome =
  | { kind: "redirected" }                                          // 모바일 리다이렉트 — 복귀 effect가 재개
  | { kind: "confirm"; callback: MemberPaymentCallbackRequest }     // 인라인 성공 → 콜백 POST(imp_uid 포함)
  | { kind: "recover" }                                             // 실행정보 없음 → 주문 상태 조회
  | { kind: "canceled" }                                            // 사용자 닫기/취소 → 재조회(새 결제 금지)
  | { kind: "unavailable"; message: string }                        // request_pay 호출 전 중단 → retry_payment
  | { kind: "error"; message: string };                             // 호출 후 예외/실패 → 재조회 먼저
```

- 실행 정보(`impCode`/`pg`/`payMethod`/`paymentId`/`callbackContext`/`callbackSignature`) 하나라도 비면 `unavailable`. `amount`는 `/^\d+$/` 검증 후 `Number()`로만 사용(서버 금액 재결정이 원천).
- `portoneV1Loader.load()` → `window.IMP` 실패/timeout/미존재 → `unavailable`(로더가 rejected Promise 초기화, 영구 실패 금지).
- `IMP.request_pay({ pg, pay_method:"card", merchant_uid: paymentId, name: orderName, amount:Number, m_redirect_url })`. `m_redirect_url = ${origin}${payment.redirectPath}`(same-origin 고정).
- 콜백 `success===true` → `imp_uid` 필수 + `merchant_uid===paymentId` → `confirm`. `success===false` → 닫기성이면 `canceled`, 아니면 `error`(원문 `error_msg` UI/로그 노출 금지). 리다이렉트 이탈 → `redirected`.
- SDK 필드·서명·`imp_uid`를 URL/localStorage/sessionStorage에 저장 금지(메모리 전달).

### 5.2 상태머신

- **주문/결제**(`useMemberOrderFlow`): `createOrder → runPayment → (confirm)paymentCallback(imp_uid) → GET /orders/[id] 재조회`. `confirm`·일시 실패는 재조회, 영구 거부(payment_failed/403/404)는 `paymentFailure`로 차단, `unavailable`은 `retry_payment`.
- **재구독**(`useMemberSubscription`): `GET /status`의 `renewalCandidate`로 마지막 적격 플랜/기간 미리 선택 → 결제 확인. 가격 변경 시 현재 총액 재확인 후 **명시적 결제**(클릭 즉시 과금 아님).
- **사업자 4단계**(`useBusinessWizard`): 서버 `MemberRoleApplication` 상태로 step 복원(URL/sessionStorage의 `intendedRole`/`step`은 **화면 복구 힌트일 뿐 권한 근거 아님**). 새로고침/OAuth 복귀/재로그인에도 재개. 기존 계정 전환은 1단계 완료 표시 후 2단계 시작.
- **done 판정은 서버 주문 상태(`paid && applied`)가 유일 근거.** 승인 불명확은 먼저 재조회.

---

## 6. 구현 순서 (백엔드 → UI)

기획서 §10 우선순위를 그대로 따른다. 각 단계는 다음 단계 착수 전 해당 테스트·`npm run build` 통과를 조건으로 한다. **한 번에 한 파일**, 각 파일 완료 후 빌드 확인. 동시에 여러 대형 파일 수정 금지(절대규칙 §구조).

| 순서 | 우선순위 | 담당 | 작업 | 완료 조건 |
| --- | --- | --- | --- | --- |
| 1 | P0 | 대장+BE | 보호 범위·기존 데이터·도입 기준·체험/기간 정책 확정 | 비회원 무변경 경계, grandfather/신규신청 판정표 확정 |
| 2 | P0 | BE | `pricing.ts`(SSOT·`computeAmount`·역할/기간 허용표)·`policy.ts` 판정 계약 | §2.4 전체 가격표 일치, 개인 PREMIUM·사업자 FREE/1개월 거부 (단위 테스트) |
| 3 | P0 | 대장+BE | DB 상세 설계·baseline/preview·백필 계획(§9) | 대장 검토 가능한 DDL diff·검증/백업/중단 계획 (운영 적용은 보류) |
| 4 | P0 | BE | `orders.ts`·`provider.ts`·`verification.ts`·`callback-context.ts`·`record-payment.ts`·`activation.ts`·`recovery.ts` + orders/callback/recover 라우트 | 서버 검증 없이 active 불가, 승인 1건당 영수증/기간 1회, 교차중복 차단 |
| 5 | P0 | BE | `policy.ts` grandfather 가드·기존 API 우회 차단·`lifecycle.ts` 만료/grace/잠금 + status/cron 라우트 | 기존 회원 현상 유지, 새 사업자 게이트·7일 경계 서버 보장 |
| 6 | P1 | FE | 개인 무료 가입·사업자 4단계·`/renewal/pricing`·`/pricing`·마이페이지 패널 | 진행바·재개·역할 제한·총액·만료일·재구독 사용 가능 |
| 7 | P1 | FE+BE | `trial.ts`·trial 라우트·수동 갱신·알림·결제 장애 복구(모바일/중복) | 1회 적격 체험, 자동청구 없음, 모바일/중복 요청 복구 |
| 8 | P0 출시조건 | 대장+BE | 테스트 증빙·기존 회귀·실결제 별도 선행(§9.3) | 테스트 완료와 live 가능 구분, 승인 전 실결제 비활성 |
| 후속 | P2 | — | 기간 중 플랜 변경 정산·일반 환불 UI·운영 통계 | 별도 요구·정책 확정 후 착수 |

> **병렬 구현:** 서버(2·4·5)와 프론트(6·7)는 본 계약의 DTO·상태 매핑·에러 코드 표·`MemberProductView`/`MemberSubscriptionStatus` 타입을 공통 고정점으로 병렬 가능. 단 각자 파일 단위로 빌드 확인 후 다음 파일로 이동.

### 6.1 테스트 계약 (요약 — 기획서 §11)

- **서버 단위/통합**(격리 fixture/DB): 가격(11개 조합 총액·할인·소수 거부·클라이언트 amount 거부·스냅샷 검증), 역할(개인 FREE/PRO·사업자 PRO/PREMIUM만·RENTAL_BIZ 누락 없음·결제로 role/인증 우회 불가), 검증(위변조·주문/imp_uid/PG/카드/통화/MID/환경 불일치·ready/failed/cancelled/부분취소/모순·두 조회 사이 상태변경·미승인 paidAt 미생성), 멱등(중복 클릭·동시 콜백·동시 갱신 1회·소비 후 재전송 멱등·needs_review 재전송 불해제), 기간(월말·윤년·1/3/6/9/12/24개월·만료 전 잔여 보존·만료 후 now 시작·재시도 불변), 만료(개인 FREE·데이터 유지·사업자 만료+7일 후 잠금·cron 지연에도 서버 차단·잠금 중 본인 데이터/재결제 접근), 체험(7일 trialing·1개월 유료 분리·동시 요청 1회·Payment 없는 active 불가), 교차중복(회원·비회원 imp_uid 재사용 거부).
- **프론트 회귀**(별도 DOM 환경): 가입 결제 강제 없음, 사업자 4화면·진행바·인증대기·재로그인 재개·URL 단계 조작 거부, 모바일 복귀·중복 요청 복구. 서버 fixture 통과로 프론트 회귀를 대체하지 않는다.
- **보호 회귀(읽기 실행):** 비회원 `GuestMonitoringOrder`·`lib/guest-monitoring/*`·`portoneV1Provider` 가격/주문/검증/활성화 불변. **기존 테스트 수정으로 통과시키지 않음.** diff 0건 확인.
- **검증 명령:** `npm run lint`, `npm test`, `npm run build`, `npm run audit:api`(신규 변이 핸들러 인증·dead code 점검).

### 6.2 범위 제외

비회원 결제 변경, 자동결제·빌링키·자동청구, 다른 PG 도입, 기존 회원 강제 이관·일괄 재인증·일괄 잠금, 활성 중 플랜 변경 정산, 일반 환불 UI, 운영 DDL/마이그레이션 실행, 채널 실결제 전환. 본 단계는 **정적 코드 분석·문서 검토만** 수행한다.

---

## 7. 절대규칙 준수 체크리스트

> 본 설계가 플랫폼 5대 원칙·절대규칙을 어떻게 만족하는지(설계 단계 자체 점검). 구현 완료 보고 시 각 항목을 실제 결과로 재점검한다.

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (설계 기준)
─────────────────────────────────────────────────
1. 페이지 500줄 제한 : ✅ 설계상 준수 — 서버 서비스 책임별 ≤200줄 분할(§1.2),
                        사업자 4단계는 step별 분리 라우트, 가격/현황은 조합 page + components/hooks 분리.
                        신규 page.tsx·300줄+ 수정은 착수 전 분리 계획 보고(강제 트리거)
2. 단일 책임        : ✅ pricing=산정, orders=주문, verification=재조회, callback-context=서명/nonce,
                        record-payment=기록, activation=트랜잭션, policy=권한, lifecycle=만료,
                        로더=script, 어댑터=프로토콜. UI/상태/로직/API 혼재 없음(§1.1)
3. 서버 검증·보안   : ✅ 승인=서버 SSOT+V1 재조회, 클라 금액/success/imp_uid 불신,
                        로그인+Origin+소유권(IDOR)+HMAC+nonce+거래중복+교차중복, 시크릿/PII 미노출(§4.10)
4. 성능(중복·N+1)   : ✅ 가격 순수함수(렌더 경로 밖), status monitoring.used 상한 쿼리,
                        cron take 상한, 토큰 재사용(iamport-rest), 멱등키 재사용으로 중복 호출 차단(§3·§4)
5. 폴더 구조        : ✅ 서비스=lib/member-subscription, 라우트=app/api/member-subscription,
                        타입=types/, 클라=route 아래 member/hooks/components, 공급자 plumbing=lib/danal(읽기)
─────────────────────────────────────────────────
위반 항목: 없음(설계 기준). 신규 page.tsx 생성 시 §1.2 트리거로 착수 전 분리 계획 보고
─────────────────────────────────────────────────
```

### 7.1 최우선 절대규칙(0번) 매핑

| 규칙 | 설계 반영 |
| --- | --- |
| 0-1 로컬≠운영 | 결제·env·외부연동·DB → t-vestra 무출금 실환경·실화면 검증 전 "완료" 선언 금지. 채널/환경 미확인 시 제약 보고(§0.2·§9.3) |
| 0-2 '확인됨' 재검증 | imp코드/MID/secret/채널·`verifiedV1TestChannels=[]`·운영 Prisma Migrate 미관리를 이름/메모리로 신뢰하지 않고 §0.1·§9에서 실검증 |
| 0-3 땜빵 금지 | 단일 공급자 경로·조용한 fallback 금지(충돌/미확정 503), 보호 파일 리팩터링 금지, 공용 게이트 임의 개방 금지 |
| 0-4 자기 과신 금지 | 미확정(§8·§9)을 제안으로 명시, 실결제/완료 선언을 설계에 포함하지 않음 |
| 0-5 규모 | cron `take` 상한, status 상한 쿼리, 가격 순수함수 캐시 가능, N+1 차단 |
| 0-5 수명주기 | 주문 TTL·nonce 소비·만료·grace·locked·해지, **삭제 경로 금지 자산**(감시/영수증/거래) 명시, 연쇄 삭제 금지 |
| 0-5 비정상 경로 | 재사용·재시도·동시 콜백·IDOR·입력 위조(금액/imp_uid)·모바일 복귀·한쪽 경로(신청↔연장) 대칭 처리 |
| 0-5 적대적 | 구현 후 §6.1 위변조·보안·교차중복 테스트 + 병렬 코드리뷰(보안·결제·DB·마이그레이션 회귀 피해 큼) |

### 7.2 API 보안 코드 리뷰 체크리스트 (CLAUDE.md 필수)

- **인증 없는 변이 핸들러:** 신규 `POST` 전부 `auth()` 로그인 + `validateOrigin`/회원 Origin + 소유권 + (콜백)nonce 1회 소비. `cron`은 `CRON_SECRET`. `audit:api` ALLOWLIST 사유 갱신 없이는 실패하도록 구성.
- **dead code endpoint:** `orders`→`useMemberOrderFlow`, `callback`→`memberPayment confirm`, `recover`→복구 흐름, `trial`→체험 시작, `status`→마이페이지/재구독, `cron`→Vercel cron에서 실제 호출. 미사용 라우트 생성 금지.
- 변경 파일 외 `app/api/` 전체에 신규 미인증 변이 없음 확인. 기존 `/api/subscription` 유료 402·FREE 다운그레이드만 유지(무결제 역할 승격 경로 추가 금지).

---

## 8. 미확정 · 후속 (기획서 §12)

| 항목 | 현재 제안 / 필요한 결정 |
| --- | --- |
| 무료체험 대상 | 계정당 최초 1회, 개인 선택·사업자 인증 후. 기존 회원 포함 여부·재가입 식별 기준 확정 |
| 1개월 유료 체험 | 개인 PRO 계정당 1회 제안. 재구매 허용 여부 확정 |
| 사업자 체험 완료·만료 | 결제 단계 최초 trial 예외, 체험 종료 후 7일 grace 제안 → 확정 필요 |
| 달력·잔여기간 | 달력 개월/월말 보정·동일 플랜 잔여 보존·체험 중 결제 now 시작 제안 → 월말·윤년 테스트로 고정 |
| 플랜 변경·해지·환불 | 활성 중 동일 플랜 연장만, 선불 기간 보존. 실제 환불·권한 정산·PG 취소 확인 절차 확정 |
| 사업자 잠금 범위 | 사업자 유료 기능·감시 중지, 본인 데이터/재구독 유지. **API별 적용 목록 확정** |
| grandfather 기준선 | 배포 시 실제 역할/구독/한도·도입 전 신청 상태 읽기 검증, 권한 보존 스냅샷 정의 |
| VAT·영수증 | VAT 포함 표기 기준 가격/영수증 계약 최종 확인 |
| `MEMBER_PRICE_VERSION`/`policyEffectiveAt` | 출시 시 확정(임의 날짜 금지) |
| `imp_uid` 형식·MID 응답 필드명·취소 필드·`pg.MID` CDN 호환 | §9.3에서 공식 V1 명세·테스트 채널로 확정(기본 regex는 임시) |

필수 요구와 제안을 혼동하지 않는다. 미확정 정책을 후속 구현 편의로 운영 데이터·보호 코드에 임의 적용하지 않는다.

---

## 9. 운영 DB 적용·실결제 선행조건 (실행 금지 — 대장 확인 후 별도 작업)

### 9.1 DB 적용 전 절차 (기획서 §8.3)

1. **대장 확인 전 운영 변경 금지.** 운영 DB는 Prisma Migrate 미관리·`prisma/migrations`/baseline 없음 전제를 실제 상태와 대조. 구조 변경 명령 자동 실행 금지.
2. 운영 스키마·제약·인덱스·기존 구독/대기 역할 데이터를 **읽기 전용** 현황으로 확인하고 코드 스키마 차이 기록. baseline SQL 작성, Migrate 전환 vs 승인된 수동 SQL 별도 결정(과거 테이블 생성 SQL 재실행 금지).
3. 운영과 분리된 **preview DB**에서 baseline 재현 → DDL diff → nullable/기본값·unique 충돌·쿼리 계획·구버전 호환 검증. **비회원 테이블 DDL/데이터 무변경 확인.**
4. 기존 회원 분류·권한 기준선·도입 전 대기 신청 **백필 dry-run**. 도입 경계 동시 가입/신청 누락 방지(배포 플래그·기준 시각·정책 레코드 생성 순서). 미분류 기존 회원을 신규 잠금 대상으로 취급 금지.
5. 백업/스냅샷·적용/검증/중단 계획 준비 후 대장 확인받고 운영 DDL/백필 **별도 실행**. 실제 결제 기록 삭제 롤백 금지. 장애 시 신규 주문 중지·기록 보존. 비회원 코드 되돌림 금지.
6. 테스트 배포에서 권한/결제/기존회원 회귀 검증 후 운영 승격은 별도 지시. **본 작업에서 위 절차를 실행하지 않는다.**

### 9.2 배포 규칙 (CLAUDE.md)

- `main` 커밋 → `deploy vestra`(t-vestra preview) → test 브랜치 동기화 → 대장 확인 → `deploy vestra promote`(재빌드 없이 동일 deployment 승격). **바로 운영 배포 금지.** 배포 전 `lint`/`test`/`build`·smoke(`/`,`/login`,`/api/health`) 통과.

### 9.3 회원 실결제 선행 작업 (별도 범위)

- 회원 선불 상품용 운영 계약/채널/MID·수단·운영 자격증명·테스트/운영 응답 판정 기준 확인.
- `getPortoneV1Config()`·REST가 공용 테스트 게이트에 묶여 있으므로, **비회원 동작을 보존하며 회원 live 설정을 전달하는 plumbing 계약**을 별도 설계·검토. 현재 구현 그대로 live 호출 가능하다고 가정하지 않는다.
- 공용 설정 변경으로 비회원 테스트 채널·키·상태 판정이 함께 전환되는 방식 **금지**. 보존 불가 시 출시 보류·별도 범위 결정.
- 운영 회원 권한이 테스트/mock 승인으로 생성되지 않는 환경 차단, 회원 전용 기능 플래그, 가격·취소/환불·약관/동의·영수증 표시 확정, 운영 DB 절차 완료.
- preview에서 PC/모바일 결제·중단·복구·재구독·CSP 확인, 운영 채널 검증 계획·대장 확인. **현 설계는 실결제 활성화 권한·완료 선언을 포함하지 않는다.**
