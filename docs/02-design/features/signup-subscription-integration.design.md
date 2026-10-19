# 가입↔구독 통합 + 유형별 플랜 차등 설계서

> 프로젝트: VESTRA
> 작성일: 2026-10-19
> 상태: Design — 구현·DB 변경·마이그레이션·env·실결제·배포 **미수행**
> 상위/관련 설계: [`guest.design.md`](./guest.design.md) (회원 선불 구독 연동 공용 계약 — 본 문서가 전제로 삼는 결제·주문·활성화 계약)
> 기준 코드(읽기): `lib/member-subscription/pricing.ts`(`ROLE_ALLOWED_PLANS`·`MEMBER_MONTHLY_BASE`·`MEMBER_MONITORING_LIMIT`·`DURATION_DISCOUNT`), `lib/member-subscription/policy.ts`·`status.ts`·`orders.ts`, `app/(personal-home)/signup/business/*`(위저드), `app/(app)/signup/page.tsx`, `app/(personal-home)/signup/complete/page.tsx`, `lib/auth.ts`(소셜 provider·signIn), `markSignupIntent`

---

## 0. 목적 / 범위

회원가입과 유료구독을 **분리된 두 단계에서 하나의 연속 흐름**으로 통합한다. 가입 유형(role)을 먼저 고르고 소셜 가입을 마치면, 그 유형에 맞는 플랜 선택·결제로 **끊김 없이 이어진다**. 유형별로 **선택 가능한 구독 종류를 차등**한다.

**이 문서에서 실행하지 않는 것:** Prisma 스키마 적용·SQL·마이그레이션·env 추가·실결제·운영 DB 변경·배포. 결제·주문·활성화·검증의 서버 계약은 `guest.design.md`를 그대로 따르며, 본 문서는 그 위의 **가입 연계 + 유형별 플랜 정책**만 정의한다.

**보호 경계(변경 금지):** 비회원 등기감시(`lib/guest-monitoring/*`, `portoneV1Provider`, 비회원 단건 흐름)와 기존 회원 결제 서버 계약(`app/api/member-subscription/*`의 주문/콜백/상태 판정)은 수정·되돌림 금지. 본 작업은 **플랜 정책 상수 + 가입 UI 흐름 + 온보딩 완료 가드**에 한정한다.

---

## 1. 유형별 플랜 매핑 (확정 — 대장 지정)

| 유형(role) | 무료(FREE) | PRO | PREMIUM |
|---|:---:|:---:|:---:|
| 일반 PERSONAL | ✅ | ✅ | — |
| 임대사업자 RENTAL_BIZ | ✅ | ✅ | ✅ |
| 부동산/공인중개사 REALESTATE | — | — | ✅ |
| 기업 BUSINESS | — | — | ✅ |

- 가격·한도 기존 유지: **PRO 9,900원/월·등기감시 5건 / PREMIUM 29,900원/월·등기감시 20건**. 기간 할인 공통(6·9·12·24개월 = 10·15·20·30%).
- **FREE의 정의**: 유료구독 레코드 없이 **가입만으로 완료되는 기본 상태**(결제 단계 건너뜀). 기존 "구독 미보유(FREE)" 개념을 그대로 사용한다. `MemberPlan`(`"PRO"|"PREMIUM"`) 타입은 **바꾸지 않는다** — FREE는 "유료구독 선택 안 함"으로 표현한다.

### 1.1 정책 상수 변경 (`lib/member-subscription/pricing.ts`)
```
// 유료 선택지 (FREE 제외)
ROLE_ALLOWED_PLANS = {
  PERSONAL:   ["PRO"],              // 현행 유지
  RENTAL_BIZ: ["PRO", "PREMIUM"],  // 현행 유지
  REALESTATE: ["PREMIUM"],         // 변경: PRO 제거
  BUSINESS:   ["PREMIUM"],         // 변경: PRO 제거
}

// 무료 시작 허용 여부 (신설 — FREE를 유료목록과 분리해 결제검증 로직 오염 방지)
ROLE_FREE_ALLOWED = {
  PERSONAL: true, RENTAL_BIZ: true, REALESTATE: false, BUSINESS: false,
}
```
- `REALESTATE`/`BUSINESS`에서 PRO를 제거하면 기존 주문·정책 검증(`policy.ts` `assertPlanAllowed`, `orders.ts`)이 자동으로 PRO 주문을 `plan_not_allowed`로 거절한다 — **서버 강제는 상수 변경만으로 성립**(클라 필터와 이중 방어).

---

## 2. 통합 가입 흐름 (유형별 분기)

```
[일반 PERSONAL]
  ① 유형 선택 → ② 소셜 가입/로그인 → ③ 플랜 선택(무료 / PRO) → ④(유료면) 결제 → 완료
      · 무료 선택 → 결제 건너뛰고 즉시 완료

[사업자 3종: 임대·부동산·기업]  (기존 signup/business 위저드 재사용)
  ① 유형 선택 → ② 소셜 가입 → ③ 사업자 인증 → ④ 플랜 선택 → ⑤ 결제 → 완료
      · 임대: 무료/PRO/PREMIUM  → 무료 선택 시 결제 건너뜀
      · 부동산·기업: PREMIUM 단일, 무료·건너뛰기 없음 → 결제 완료해야 가입 완료(2A)
```

- 두 갈래의 **플랜 선택·결제 단계는 동일 컴포넌트/훅을 공유**(`Step3PlanSelect`·`Step4Payment`·`useMemberOrderFlow`·`useMemberPricing`·`useMemberSubscription`). 차이는 **인증 단계 유무**와 **선택지 필터**뿐.
- 일반 흐름은 사업자 위저드에서 **인증 단계를 제외한 변형**으로 구성한다(위저드 엔진 `useBusinessWizard`/`BusinessWizardContext`를 role로 일반화하거나 개인용 경량 셸 분리 — 구현 단계에서 500줄/단일책임 기준으로 결정).

### 2.1 플랜 선택 화면 렌더 규칙 (`Step3PlanSelect` 일반화)
- 노출 유료 플랜 = `ROLE_ALLOWED_PLANS[role]`
- "무료로 시작" 버튼 = `ROLE_FREE_ALLOWED[role] === true`일 때만
- 부동산/기업: PREMIUM 카드 단독, 무료·건너뛰기 버튼 없음, "가입 완료를 위해 결제가 필요합니다" 안내

---

## 3. 온보딩 완료 판정 (서버 — 2A 핵심)

"가입 완료" 여부는 **서버 상태로만** 판정한다(클라 신뢰 금지).

| 유형 | 완료 조건 |
|---|---|
| 일반·임대 (무료 선택) | 역할 설정(`setup-role`) 완료 = 완료 |
| 일반·임대 (유료 선택) | 해당 구독 `active` = 완료 |
| 부동산·기업 | **PREMIUM 구독 `active` 여야 완료**. 미결제 시 **미완료** |

- `requiresPaidToComplete(role)` = `role ∈ {REALESTATE, BUSINESS}`.
- 미완료 상태 처리: 계정(OAuth User)은 생성되나, 부동산/기업이 PREMIUM 결제 전이면 **온보딩 미완료**로 간주해 위저드 결제 단계로 복귀시키고, 보호 기능 접근을 서버에서 제한한다(기존 `effectiveEntitlement`/`subscription-guard` 경로 활용, 클라만으로 통과 불가).
- 완료 판정은 `useBusinessWizard`의 `deriveWizard`에 **role별 완료조건**을 추가해 maxStep/completed를 산출(기존 패턴 확장).

---

## 4. 가입 의도 보존 (OAuth 왕복)

- `markSignupIntent`를 확장: 기존 `intendedRole` + **`intendedPlan`(선택 플랜·기간)**을 쿠키+sessionStorage에 보존.
- 소셜 가입 복귀(`/signup/complete`) 후, 보존된 의도로 **플랜 선택/결제 단계로 자동 복귀**한다. 역할은 기존 `setup-role` 경로 유지.

---

## 5. 엣지케이스 / 견고성

- **결제 중단·이탈 후 재진입**: `deriveWizard`의 서버상태 기반 maxStep으로 정확한 단계 복원(결제 전이면 결제 단계, 완료면 완료). URL·sessionStorage는 힌트일 뿐 권위는 서버.
- **부동산/기업 미결제 우회 시도**: 서버가 PREMIUM active 아니면 보호 기능 거절 + 온보딩 미완료 유지(IDOR·클라우회 차단).
- **유형 변경**: 가입 후 역할 변경 시 허용 플랜이 달라짐 → 기존 구독과 새 역할의 정합성은 `effectiveEntitlement`가 판정(범위 밖 변경은 별도).
- **grandfather(기존 회원)**: `guest.design.md`의 grandfather 폴백 계약 유지 — 본 변경은 신규 가입 경로에 한정, 기존 회원 권한 급락 금지.
- **역행 방지**: `REALESTATE`/`BUSINESS`의 기존 PRO 구독자(있다면)는 grandfather로 보존하고 신규 제한만 적용.

---

## 6. 변경 파일 맵 (예상)

| 영역 | 파일 | 변경 |
|---|---|---|
| 정책 상수 | `lib/member-subscription/pricing.ts` | `ROLE_ALLOWED_PLANS` 수정 + `ROLE_FREE_ALLOWED` 신설 |
| 완료 판정 | `lib/member-subscription/status.ts`·`policy.ts`, `lib/member-subscription/current-entitlement`(또는 기존 경로) | role별 온보딩 완료조건, `requiresPaidToComplete` |
| 위저드 엔진 | `app/(personal-home)/signup/business/BusinessWizardContext.tsx`·`useBusinessWizard` | role 일반화(인증 단계 유무·완료조건 분기) |
| 플랜 선택 | `signup/business/steps/Step3PlanSelect.tsx` | `ROLE_ALLOWED_PLANS`+`ROLE_FREE_ALLOWED` 기반 렌더 |
| 가입 진입 | `app/(app)/signup/page.tsx`, `signup/complete/page.tsx` | 유형→소셜→플랜 연계, `intendedPlan` 복귀 |
| 의도 보존 | `markSignupIntent` 유틸 | `intendedPlan` 추가 |

* 결제/주문/콜백/현황 훅·API는 **재사용(무변경)**. 500줄/단일책임 준수로 컴포넌트 분리.

---

## 7. 구현 방식

- 인증·결제·정책을 건드리므로 **오케스트레이터(멀티모델) + codex 교차검증**(프론트·백엔드 독립 적대검증)으로 진행.
- 서버 검증 우선, 클라 필터는 UX 보조. 전 경로 `lint`/`test`/`build` 통과 + t-vestra 무출금 테스트 후 대장 승격.
