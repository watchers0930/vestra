# 가입↔구독 통합 + 유형별 플랜 차등 설계서

> 프로젝트: VESTRA
> 작성일: 2026-10-19
> 갱신일: 2026-10-20
> 상태: Renewal 통합 기획 반영 — 기존 정책·2A 구현을 기준으로 문서만 갱신. 이번 작업의 기능 구현·DB·env·실결제·배포 **미수행**
> 연계 기획: [renewal.plan.md](../../01-plan/features/renewal.plan.md) (현재 코드 분석·사용자 스토리·우선순위·인수 기준)
> 상위/관련 설계: [`guest.design.md`](./guest.design.md) (회원 선불 구독 연동 공용 계약 — 본 문서가 전제로 삼는 결제·주문·활성화 계약)
> 기준 코드(읽기): `lib/member-subscription/pricing.ts`(`ROLE_ALLOWED_PLANS`·`MEMBER_MONTHLY_BASE`·`MEMBER_MONITORING_LIMIT`·`DURATION_DISCOUNT`), `lib/member-subscription/policy.ts`·`status.ts`·`orders.ts`, `app/(personal-home)/signup/business/*`(위저드), `app/(app)/signup/page.tsx`, `app/(personal-home)/signup/complete/page.tsx`, `lib/auth.ts`(소셜 provider·signIn), `markSignupIntent`

---

## 0. 목적 / 범위

회원가입과 유료구독을 **분리된 두 단계에서 하나의 연속 흐름**으로 통합한다. 가입 유형(role)을 먼저 고르고 소셜 가입을 마치면, 그 유형에 맞는 플랜 선택·결제로 **끊김 없이 이어진다**. 유형별로 **선택 가능한 구독 종류를 차등**한다.

**이 문서에서 실행하지 않는 것:** Prisma 스키마 적용·SQL·마이그레이션·env 추가·실결제·운영 DB 변경·배포. 결제·주문·활성화·검증의 서버 계약은 `guest.design.md`를 그대로 따르며, 본 문서는 그 위의 **가입 연계 + 유형별 플랜 정책**만 정의한다.

**보호 경계(변경 금지):** 비회원 등기감시(`lib/guest-monitoring/*`, `portoneV1Provider`, 비회원 단건 흐름)와 기존 회원 결제 서버 계약(`app/api/member-subscription/*`의 주문/콜백/상태 판정)은 수정·되돌림 금지. 유형별 정책 상수와 2A 온보딩 완료 가드는 이미 구현돼 있으며 보존한다. 이번 renewal 후속 구현 범위는 **가입 UI 표현·연결·재개 흐름**이다.

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

### 1.1 기존 정책 상수 유지 (`lib/member-subscription/pricing.ts`)
```
// 유료 선택지 (FREE 제외)
ROLE_ALLOWED_PLANS = {
  PERSONAL:   ["PRO"],              // 현행 유지
  RENTAL_BIZ: ["PRO", "PREMIUM"],  // 현행 유지
  REALESTATE: ["PREMIUM"],         // 현행: PREMIUM만 허용
  BUSINESS:   ["PREMIUM"],         // 현행: PREMIUM만 허용
}

// 무료 시작 허용 여부 (이미 구현 — FREE를 유료목록과 분리)
ROLE_FREE_ALLOWED = {
  PERSONAL: true, RENTAL_BIZ: true, REALESTATE: false, BUSINESS: false,
}
```
- 현행 주문·정책 검증(`policy.ts` `assertPlanAllowed`, `orders.ts`)이 `REALESTATE`/`BUSINESS`의 PRO 주문을 `plan_not_allowed`로 거절한다. UI는 서버 허용 목록을 표시하며 정책 상수를 다시 변경하지 않는다.

---

## 2. 통합 가입 흐름 (유형별 분기)

```
[일반 PERSONAL]
  ① 유형 선택 → ② 소셜 가입/로그인 → ③ 세부유형(TENANT/LANDLORD) → ④ 플랜 선택(무료 / PRO) → ⑤(유료면) 결제 → 완료
      · 무료 선택 → 결제 건너뛰고 즉시 완료

[사업자 3종: 임대·부동산·기업]  (기존 signup/business 위저드 재사용)
  ① 유형 선택 → ② 소셜 가입 → ③ 사업자정보 입력·승인 대기 → verified 확인 → ④ 플랜 선택 → ⑤ 결제 → 완료
      · 임대: 무료/PRO/PREMIUM  → 무료 선택 시 결제 건너뜀
      · 부동산·기업: PREMIUM 단일, 무료·건너뛰기 없음 → 결제 완료해야 가입 완료(2A)
```

- 상위 표시 단계는 `회원 유형 → 소셜 가입 → 가입 정보 → 플랜 선택 → 결제`다. 개인은 가입 정보에서 세부유형을 선택하고, 사업자는 정보 제출·승인 대기·승인을 처리한다. UI 순번은 기존 step-1~4 라우트 및 서버 stage와 분리한다.
- 두 갈래의 **플랜 선택·결제 단계는 동일 컴포넌트/훅을 공유**(`Step3PlanSelect`·`Step4Payment`·`useMemberOrderFlow`·`useMemberPricing`·`useMemberSubscription`). 차이는 **인증 단계 유무**와 **선택지 필터**뿐.
- 현행 `useBusinessWizard`/`BusinessWizardContext`가 일반 흐름에서 사업자 인증을 생략한다. 이 서버 기반 가드는 유지하고, 가입 전후의 공통 renewal 표현 계층을 연결한다.

### 2.1 플랜 선택 화면 렌더 규칙 (`Step3PlanSelect` 일반화)
- 노출 유료 플랜 = `ROLE_ALLOWED_PLANS[role]`
- "무료로 시작" 버튼 = `ROLE_FREE_ALLOWED[role] === true`일 때만
- 부동산/기업: PREMIUM 카드 단독, 무료·건너뛰기 버튼 없음, "가입 완료를 위해 결제가 필요합니다" 안내

---

## 3. 온보딩 완료 판정 (서버 — 2A 핵심)

"가입 완료" 여부는 **서버 상태로만** 판정한다(클라 신뢰 금지).

| 유형 | 완료 조건 |
|---|---|
| 일반 (무료 허용) | 현행 역할 설정 후 기본 접근 가능. 위저드에서는 세부유형·무료/유료 선택을 계속 안내 |
| 임대 (무료 허용) | 사업자 `verified` 확인 후 완료. 승인 전에는 플랜 단계 잠금 |
| 일반·임대 (유료 선택) | 해당 구독 `active` = 완료 |
| 부동산·기업 | **PREMIUM 구독 `active` 여야 완료**. 미결제 시 **미완료** |

- `requiresPaidToComplete(role)` = `role ∈ {REALESTATE, BUSINESS}`.
- 미완료 상태 처리: 계정(OAuth User)은 생성되나, 부동산/기업이 PREMIUM 결제 전이면 **온보딩 미완료**로 간주해 위저드 결제 단계로 복귀시키고, 보호 기능 접근을 서버에서 제한한다(기존 `effectiveEntitlement`/`subscription-guard` 경로 활용, 클라만으로 통과 불가).
- 기존 `onboarding.ts`·`deriveWizard`의 role별 판정과 2A를 유지한다. 서버 접근 완료와 위저드 표시 완료를 구분하며, `maxStep`(접근 상한)을 실제 단계 완료 체크 근거로 쓰지 않는다. 부동산·기업의 신규 완료는 실제 PREMIUM active가 필요하다.

---

## 4. 가입 의도 보존 (OAuth 왕복)

- 기존 `markSignupIntent`의 가입 의도 쿠키(10분)와 역할 URL/sessionStorage 힌트를 유지한다. 플랜은 OAuth 및 사업자 승인 이후 선택하는 것이 기본이다.
- 재인증 왕복 시 플랜·기간은 기존 `signup/planIntent.ts`의 userId 귀속 sessionStorage 힌트를 재사용한다. 가입 의도 쿠키에 결제정보를 추가하지 않는다.
- `/signup/complete` 복귀 시 개인 세부유형 또는 사업자정보/심사를 거친다. 서버 상태가 허용하는 단계에만 복귀하며 힌트로 승인·완료·주문 적격성을 결정하지 않는다. 저장소 실패 시 재선택, 계정 변경·완료 시 힌트 정리.

---

## 5. 엣지케이스 / 견고성

- **결제 중단·이탈 후 재진입**: `deriveWizard`의 서버상태 기반 maxStep으로 정확한 단계 복원(결제 전이면 결제 단계, 완료면 완료). URL·sessionStorage는 힌트일 뿐 권위는 서버.
- **부동산/기업 미결제 우회 시도**: 서버가 PREMIUM active 아니면 보호 기능 거절 + 온보딩 미완료 유지(IDOR·클라우회 차단).
- **유형 변경**: 가입 후 역할 변경 시 허용 플랜이 달라짐 → 기존 구독과 새 역할의 정합성은 `effectiveEntitlement`가 판정(범위 밖 변경은 별도).
- **grandfather(기존 회원)**: `guest.design.md`의 grandfather 폴백 계약 유지 — 본 변경은 신규 가입 경로에 한정, 기존 회원 권한 급락 금지.
- **역행 방지**: `REALESTATE`/`BUSINESS`의 기존 PRO 구독자(있다면)는 grandfather로 보존하고 신규 제한만 적용.

---

## 6. 후속 UI 변경 파일 맵 및 보존 경계

| 영역 | 파일 | 후속 작업 |
|---|---|---|
| 가입 시작 | `renewal/_shared/RenewalSignupModal.tsx` | 상위 진행 표시·유형별 안내, 공통 renewal 표현 연결 |
| OAuth 복귀·정보 | `signup/complete/page.tsx`·`components/UserTypeSelector.tsx`·`BusinessInfoForm.tsx` | 구 UI 교체, 접수/대기 표현, 오류·로딩 포함 같은 셸 |
| 위저드 표현 | `signup/business/BusinessWizardShell.tsx`·`steps/Step1Account.tsx`·`Step2Verify.tsx`·`Step3PlanSelect.tsx`·`Step4Payment.tsx` | 표시 순번 매핑·연속 디자인·상태별 CTA |
| 진행바 | `components/member-subscription/WizardProgress.tsx` 또는 가입 전용 표현 | 접근 가능과 완료 표시 분리. 공통 소비자 회귀 방지 |
| 재사용 | `useBusinessWizard`·`BusinessWizardContext`·`useOnboardingStatus`·`signup/planIntent.ts` | 서버 권위·소유자/요청 세대·결제 후 갱신 유지 |
| 보호 경계 | `pricing.ts`·`onboarding.ts`·`onboarding-access.ts`·`protected-paths.ts`·`proxy.ts`·`lib/auth.ts`·agent routes·`monitoring-targets.ts` | 재설계 대상 아님. 기존 정책·2A·배치 감시 제한 보존 |
| 결제·비회원 | `lib/guest-monitoring/*`·`app/api/member-subscription/*`·기존 결제 훅 | 계약·동작 무변경 |

* 경로 앞부분 `app/(personal-home)/` 및 `lib/member-subscription/`는 해당 영역에 맞게 생략했다. 기능 코드는 이번 문서 작업에서 변경하지 않는다.

---

## 7. 구현 방식

- 인증·결제·정책을 건드리므로 **오케스트레이터(멀티모델) + codex 교차검증**(프론트·백엔드 독립 적대검증)으로 진행.
- 서버 검증 우선, 클라 필터는 UX 보조. 전 경로 `lint`/`test`/`build` 통과 + t-vestra 무출금 테스트 후 대장 승격.


---

## 8. Renewal 실화면 통합 요구사항 (2026-10-20)

### 8.1 표현·상태

- 모달에서 전체 페이지로 전환해도 같은 브랜드·단계명·카드·버튼을 사용한다. 인라인 style 중심의 `#1d1d1f`/`#6e6e73`, 흰 카드, 둥근 모서리를 기준으로 삼는다.
- `/signup/complete`·개인 세부유형·사업자 폼의 `text-muted`/`bg-card`·`VestraLogoMark` 등 구 표현을 교체한다. 정상뿐 아니라 로딩·Suspense·오류·재인증·완료도 포함한다.
- `Step2Verify`는 이미 서버 verifyStatus를 사용한다. 이 수정은 보존하고, 신청 폼의 “등록 완료” 및 녹색 체크는 “신청 접수 · 승인 대기”로 정리한다.
- `pending`은 대기 아이콘·문구로 표시한다. 인증 완료 체크·플랜/결제 CTA를 제공하지 않는다. `verified` 후에만 사업자 플랜 단계로 진행한다. PERSONAL 전용 신규 흐름에는 승인 절차가 없다.
- 승인 대기에서 “상태 다시 확인”, 재진입/포커스 복귀 갱신을 제공한다. none/rejected/조회 실패를 대기 또는 승인과 구분한다. 승인 뒤 setup-role 자동 재호출로 pending을 다시 만들지 않는다.
- 실제 완료 사실과 이동 가능 범위를 분리한다. 현재 진행바의 `step < maxStep`만으로 완료 체크하지 않는다. 무료 선택 시 결제를 생략하고 완료하며, 유료는 서버 주문 paid+applied 및 온보딩/활성화 재확인 후 완료한다.

### 8.2 Release 및 기존 동작

- `MEMBER_SUBSCRIPTION_ENABLED` off 또는 release 설정 미완비 시 통합 구독 스텝을 강제하지 않고 기존 가입·복귀 동작을 유지한다. pending 오표시 금지는 항상 적용한다.
- 기존 회원/진짜 grandfather snapshot 예외를 보존한다. 정책 레코드 생성만으로 신규 가입 가드를 면제하지 않는다.
- `monitoring-targets.ts`의 이미 분류된 회원 만료·한도 enforcement는 플래그와 독립적이다. off를 이유로 이를 해제하지 않는다.
- proxy는 안내용 JWT 가드이고 서버 데이터·감시 생성/재개·배치 대상 필터가 실질 보호 경계다. 가입/결제/복구 및 guest 예외 경로를 잠그지 않는다.
- 현재 온보딩 응답에는 requestedRole이 없다. `stage=verify`로 사업자 심사 흐름을 유지하며, 역할 힌트 유실 시 일반 “사업자 회원” 안내로 처리한다. 이번 UI를 위해 서버 계약을 확장하지 않는다.

### 8.3 인수 기준

- 모바일·데스크톱에서 모달→OAuth 복귀→정보→심사→플랜→결제→완료의 연속 스크린샷으로 디자인 일관성을 검수한다. 소스의 클래스 교체만으로 통과하지 않는다.
- pending 및 stale JWT verified 조합에서도 본문·진행바·CTA 어디에도 인증 완료가 표시되지 않아야 한다.
- 4유형의 허용 플랜, OAuth 실패/취소·저장소 실패, 승인 뒤 재개, 직접 단계 접근, 결제 취소/복구·세션 갱신, release off·기존/guest 경계 회귀를 검증한다.
- 사용자 제공의 Codex 7라운드 적대검증 통과분은 보존 대상으로 삼는다. 이번 기획 작업에서 재실행/재통과했다고 보고하지 않는다. 상세 AC 및 후속 검증 범위는 연계 기획서 §8을 따른다.
