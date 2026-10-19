# 회원가입·구독 통합 기획서

> 프로젝트: VESTRA
> 작성일: 2026-10-19
> 상태: 기획 완료 / 구현 미수행
> 준거 설계: [signup-subscription-integration.design.md](../../02-design/features/signup-subscription-integration.design.md)
> 결제 공용 계약: [guest.design.md](../../02-design/features/guest.design.md)
> 이번 작업의 산출물은 본 문서 하나다. 기능 코드·테스트 코드·DB·마이그레이션·환경변수·실결제·배포는 변경하거나 실행하지 않는다.

## 1. 기능 개요

회원가입을 **유형 선택 → 소셜 가입 → 사업자 인증(사업자만) → 유형별 플랜 선택 → 결제(유료 선택 시) → 완료**로 연결한다. 일반·임대사업자는 FREE로 결제 없이 가입을 마칠 수 있고, 신규 부동산·기업 회원은 PREMIUM 구독이 서버에서 `active`로 확인되어야 온보딩을 완료한다.

OAuth 계정 생성, 사업자 인증 승인, 구독 결제, 온보딩 완료는 서로 다른 상태다. 소셜 계정이 생성되거나 사업자 승인을 받았다는 이유만으로 결제 필수 유형의 가입을 완료하지 않는다. 화면 이동뿐 아니라 보호 기능의 서버 접근에서도 완료 조건을 강제한다.

### 1.1 확정 상품 정책

| 회원 유형 | role | 선택 가능 플랜 | 결제 없는 완료 | 유료 선택 시 완료 조건 |
| --- | --- | --- | --- | --- |
| 일반 | PERSONAL | FREE / PRO | 허용 | PRO active |
| 임대사업자 | RENTAL_BIZ | FREE / PRO / PREMIUM | 사업자 인증 후 허용 | 선택한 PRO 또는 PREMIUM active |
| 부동산·공인중개사 | REALESTATE | PREMIUM | 불허 | 사업자 인증 + PREMIUM active |
| 기업 | BUSINESS | PREMIUM | 불허 | 사업자 인증 + PREMIUM active |

- FREE는 유료구독을 선택하지 않은 기본 상태다. 유료 구독·주문·Payment 레코드를 생성하지 않으며 결제창을 열지 않는다.
- `MemberPlan = "PRO" | "PREMIUM"`은 유지한다. FREE를 유료 플랜 타입이나 주문 DTO에 추가하지 않는다.
- PRO 월 기준가 9,900원·등기감시 5건, PREMIUM 월 기준가 29,900원·등기감시 20건을 유지한다. FREE는 유료 등기감시 권한을 부여하지 않는다.
- 표준 선불 기간은 기존 3·6·9·12·24개월을 유지한다. 할인은 각각 0·10·15·20·30%다. 월 기준가는 월 자동청구 금액이 아니며, 선택 기간의 실제 선불 총액을 함께 표시한다.
- 기존 개인 전용 PRO 1개월 유료체험은 기존 계약으로만 제공하며, 사업자나 PREMIUM의 1개월 상품을 신설하지 않는다.
- 7일 무료체험의 `trialing`은 FREE와 다르다. 특히 부동산·기업의 PREMIUM trialing은 가입 완료 조건을 충족하지 않는다. 신규 통합 가입에서는 체험을 통한 완료·건너뛰기 경로를 제공하지 않으며, 기존 체험 API와 다른 진입점의 계약은 유지한다.

### 1.2 범위와 보호 경계

| 구분 | 범위 |
| --- | --- |
| 후속 구현 대상 | 역할별 플랜 정책 상수, 가입 진입·OAuth 복귀, 위저드 일반화, 플랜 선택 UI, 서버 온보딩 완료 판정·접근 가드 |
| 무변경 재사용 | 가격·현황·주문·결제 훅, 회원 API 클라이언트, 결제 실행·콜백·복구·주문 조회 API 및 서버 계약 |
| 수정·삭제·되돌림 금지 | `lib/guest-monitoring/*`, `lib/danal/portone-v1.ts`의 `portoneV1Provider`, 비회원 API·단건 결제·등기감시 흐름 |
| 범위 밖 | 자동결제·빌링키, 가격·한도·기간 변경, 새 PG, 기존 회원 강제 이관, 가입 후 유형 변경 정책 개편, 운영 DB·DDL·배포 |

가입 정책은 준거 설계의 확정 매핑과 완료 조건을 따른다. 과거 `guest.plan.md`·`guest.design.md`의 “모든 사업자 PRO 허용”, “사업자 FREE 불가”, “trialing으로 위저드 완료” 규칙은 이번 신규 가입 정책의 근거로 사용하지 않는다. 다만 결제·주문·검증·활성화·만료 및 grandfather 계약은 그대로 유지한다. 관련 기존 문서는 이번 단계에서 수정하지 않는다.

## 2. 기존 코드 분석

분석 기준은 현재 저장소 코드다. 운영 회원 데이터·PG·DB는 조회하지 않았다. 아래 차이는 구현 필요사항이며 이미 적용된 기능을 뜻하지 않는다.

| 근거 파일 | 현재 동작 | 기획 반영 사항 |
| --- | --- | --- |
| `app/(app)/signup/page.tsx` | 유형 선택 후 Google/Naver OAuth, 로그인된 사용자는 dashboard로 이동 | 신규 미완료 계정은 서버 판정 후 이어하기. 기존 회원의 정상 진입 보존 |
| `lib/signup-intent.ts` | 10분 가입 의도 쿠키와 sessionStorage의 intendedRole 보존 | intendedPlan·기간까지 복원 힌트 확장. 가입 의도 쿠키를 검사하는 인증 동작 유지 |
| `app/(personal-home)/signup/complete/page.tsx` | intendedRole 복원, 개인 userType 선택, setup-role 성공·일부 오류 모두 home 이동 | 유형별 플랜 단계로 연결. 실패를 성공처럼 이동시키지 않고 재시도 제공 |
| `app/api/user/setup-role/route.ts` | 개인은 즉시 역할 설정. 사업자는 requestedRole·pending 기록, 관리자 승인 전 현재 role 유지 | 역할 설정 경로 유지. 신청 성공을 사업자 인증 완료로 처리하지 않음 |
| `signup/business/steps/Step2Verify.tsx` | 기존 신청 경로 안내, pending 대기, verified 이후 플랜 이동 | 임대사업자를 포함한 사업자 3종에 동일 적용 |
| `renewal/pricing/hooks/useBusinessWizard.ts` | 인증이 있어야 진행, 유료 plan의 active 또는 trialing이면 완료 | 개인 인증 단계 생략, 무료 완료 및 역할별 엄격한 완료 조건 반영 |
| `signup/business/BusinessWizardContext.tsx`·`BusinessWizardShell.tsx` | 단일 현황 조회 공유, 클라이언트에서 maxStep 기반 화면 가드 | 공유 구조 유지. 이 가드는 서버 접근 통제를 대체하지 못함 |
| `signup/business/steps/Step3PlanSelect.tsx` | PRO/PREMIUM 버튼과 PREMIUM 무료체험 제공, FREE 없음 | 실제 허용 카드만 렌더, 일반·임대만 무료 CTA, 체험 완료 우회 제거 |
| `signup/business/steps/Step4Payment.tsx` | URL 상품 힌트 복원, 기존 주문 훅 호출, flow.done 표시 | 결제 로직은 재사용. 가입 완료 전 역할별 서버 완료조건 추가 확인 |
| `lib/member-subscription/pricing.ts` | 일반 PRO, 사업자 3종 PRO/PREMIUM 허용 | 부동산·기업에서 PRO 제거, ROLE_FREE_ALLOWED 분리 |
| `lib/member-subscription/policy.ts`·`orders.ts` | 서버 현재 role·verifyStatus로 주문 적격성 검사, 금액 재산정·멱등 처리 | 기존 검사 재사용. 역할 상수 변경으로 신규 부동산·기업 PRO 주문 거절 |
| `lib/member-subscription/status.ts`·`lifecycle.ts` | 현황·기간 상태 계산. 구독이 없어도 state.status는 active일 수 있음 | status 문자열만 검사 금지. 실제 구독·플랜·정책·인증을 함께 확인 |
| `lib/member-subscription/policy.ts` | canUsePaidFeatures는 trialing·grace 및 grandfather 기준선도 고려 | 유료 기능 권한과 신규 가입 완료조건은 별도 판정. 기존 함수를 완료조건으로 그대로 사용하지 않음 |
| `lib/subscription-guard.ts`·`member-subscription/legacy-guards.ts` | 구형 판정과 신규 entitlement 연결이 공존하며 환경 설정에 따라 분기 | 보호 기능의 실제 서버 호출 경로 점검. 구형 판정이나 클라이언트만으로 우회 불가 |
| `types/member-subscription.ts`·`renewal/pricing/member/memberApi.ts` | 주문·콜백·현황 DTO 및 회원 API 계약 고정 | 타입·요청·응답·에러 코드·경로 유지 |

표의 가입 화면·훅 경로는 각각 `app/(personal-home)/` 아래 경로다. 설계서의 예시 `current-entitlement` 파일은 현재 존재하지 않으며 실제 권한 조회는 `policy.ts`의 `resolveEffectiveEntitlement` 경로에 있다. 존재하지 않는 모듈을 구현된 것으로 전제하지 않는다.

## 3. 사용자 스토리

| ID | 사용자 스토리 | 인수 조건 | 우선순위 |
| --- | --- | --- | --- |
| US-01 | 일반 회원으로 유형 선택·소셜 가입 후 무료로 시작하고 싶다 | 개인 userType·역할 설정 후 FREE 선택, 주문·결제 호출 없이 완료 | P0 |
| US-02 | 일반 회원으로 가입하면서 PRO를 구매하고 싶다 | 사업자 인증 없이 PRO·기간 선택, 서버 결제 적용 및 active 확인 후 완료 | P0 |
| US-03 | 임대사업자로 인증 후 무료 또는 유료를 선택하고 싶다 | verified 전에는 플랜·결제 진행 불가. 인증 후 FREE/PRO/PREMIUM 제공 | P0 |
| US-04 | 부동산·기업 회원으로 필요한 플랜을 명확히 안내받고 싶다 | PREMIUM 카드만 제공, 결제 필수 문구, 무료·건너뛰기·체험 완료 버튼 없음 | P0 |
| US-05 | 사업자 인증이 대기·반려된 경우 다음 행동을 알고 싶다 | 대기는 인증 단계 유지, 반려는 사유 확인·정보 보완 안내. 결제 차단 | P0 |
| US-06 | 가입·결제 도중 이탈해도 이어서 진행하고 싶다 | OAuth 복귀·새로고침·재로그인·모바일 결제 복귀에서 서버 상태 우선 복원 | P0 |
| US-07 | 결제가 취소되거나 확인이 늦을 때 중복 결제를 피하고 싶다 | 불명확한 승인은 기존 조회·복구 사용, paid 미적용은 확인 중, 미완료 유지 | P0 |
| US-08 | 기존 회원으로 기존 이용 권한을 계속 유지하고 싶다 | grandfather·기존 부동산/기업 PRO 기준선 보존, 가입 강제 재진입·일괄 잠금 없음 | P0 |
| US-09 | 잘못된 링크나 만료된 세션에서도 안전하게 가입을 재개하고 싶다 | URL 조작으로 역할·구독·완료를 바꿀 수 없음. 재인증 후 서버 상태 재확인 | P0 |

## 4. 사용자 흐름과 화면 요구사항

### 4.1 유형별 정상 흐름

1. **일반:** 유형 선택 → 소셜 가입 → 기존 개인 userType·역할 설정 → 플랜 선택(FREE/PRO) → FREE면 완료, PRO면 기존 결제 → 서버 완료 확인.
2. **임대사업자:** 유형 선택 → 소셜 가입 → 기존 사업자정보 제출·관리자 승인 → 플랜 선택(FREE/PRO/PREMIUM) → FREE면 완료, 유료면 기존 결제 → 서버 완료 확인.
3. **부동산·기업:** 유형 선택 → 소셜 가입 → 기존 사업자정보 제출·관리자 승인 → PREMIUM·기간 선택 → 기존 결제 → PREMIUM active 확인 → 완료.

사업자 심사는 비동기일 수 있다. “통합”은 인증을 즉시 자동 승인한다는 뜻이 아니라, 심사 대기와 복귀를 포함해 다음 단계를 일관되게 안내하는 흐름이다.

### 4.2 공통 화면 규칙

- 플랜·결제 단계는 `Step3PlanSelect`·`Step4Payment`를 공유한다. 개인은 사업자 인증 단계를 생략하며 별도 결제 구현을 만들지 않는다.
- 유료 선택지는 `ROLE_ALLOWED_PLANS[서버 role]`, 무료 CTA는 `ROLE_FREE_ALLOWED[서버 role]` 기준으로 제공한다. 역할 미확정·현황 조회 실패 중에는 구매나 무료 완료를 실행하지 않는다.
- 부동산·기업은 “가입 완료를 위해 PREMIUM 결제가 필요합니다”를 표시한다. PREMIUM만 자동 선택되어도 기간·총액 확인과 명시적인 결제 동의는 필요하다.
- 개인·임대의 “무료로 시작”은 명시적인 선택이다. 유료 결제 실패·이탈을 자동 FREE 전환이나 성공 화면으로 처리하지 않는다. 사용자가 무료를 다시 선택하면 서버에서 무료 허용을 확인한다.
- 세션·서버 상태 확인 중에는 로딩을 표시하고 완료·결제를 보류한다. 오류는 현재 단계에서 재시도하도록 안내한다.
- `maxStep`은 진입 가능한 최대 단계, `actionStep`은 현재 필요한 행동으로 구분한다. 인증 완료 후 최초 결제에 진입할 수 있게 하되, 이 값으로 가입 완료를 대신 판정하지 않는다.

### 4.3 재진입·모바일 복귀

- 인증 미완료면 인증 단계, 인증 완료 후 선택 정보가 없으면 플랜 단계, 유효한 선택 정보가 있으면 결제 단계로 안내한다. 실제 미해결 주문이 있으면 기존 주문 조회·복구를 우선한다.
- 모바일 결제는 기존 `redirectPath: "/renewal/pricing"`을 유지한다. 복귀 화면에서 기존 훅의 복구가 끝난 뒤 가입 연결 계층에서 서버 온보딩 조건을 확인한다. 가입 복귀를 위해 결제 리다이렉트 계약이나 훅을 변경하지 않는다.
- URL·쿠키·sessionStorage가 유실되어도 DB의 role·requestedRole·인증·구독·주문 상태로 안전하게 재개한다. 서버에 없는 플랜 선택은 복구를 추정하지 않고 다시 선택하게 한다.
- 가입 의도와 플랜 힌트는 정상 소비·완료·계정 전환 시 정리해 다른 계정의 선택이 섞이지 않게 한다.

## 5. 기술 요구사항

### 5.1 서버 검증 우선과 완료 판정

`requiresPaidToComplete(role)`는 REALESTATE·BUSINESS에만 참이다. 서버 완료 판정은 로그인 사용자 ID에 귀속된 현재 DB 상태를 조회하며, 클라이언트가 전달한 role·completed·step을 신뢰하지 않는다.

| 신규 가입 서버 상태 | 완료 판정 / 다음 단계 |
| --- | --- |
| 역할 설정 전, 인증 신청 없음 | 유형·역할 설정으로 안내 |
| 사업자 requestedRole 존재, verifyStatus가 pending/rejected/none | 사업자 인증 미완료. 현재 role이 PERSONAL이어도 개인 무료 완료로 오인하지 않음 |
| PERSONAL 역할 설정 완료 + FREE 명시 선택 | 결제 없이 완료 |
| RENTAL_BIZ 역할 확정·verified + FREE 명시 선택 | 결제 없이 완료 |
| 일반·임대가 유료 선택, 해당 구독 미활성 | 결제·복구로 안내, 해당 유료 가입 흐름 미완료 |
| 일반·임대가 유료 선택, 허용된 해당 플랜 active | 완료 |
| REALESTATE/BUSINESS verified, 실제 PREMIUM 구독 active | 완료 |
| REALESTATE/BUSINESS FREE·PRO·trialing·grace·locked·expired·canceled 또는 구독 없음 | 미완료. 인증 완료 상태라면 PREMIUM 결제·복구로 안내 |

- 결제 완료와 온보딩 완료를 구분한다. 결제 훅의 완료 근거 `주문.status === "paid" && applied === true`를 유지하고, 이후 서버가 현재 역할·인증·구독을 다시 확인한다.
- 부동산·기업은 `canUsePaidFeatures`, `isPaidMember`, status 문자열만으로 완료 처리하지 않는다. 실제 PREMIUM·active 및 현재 유효기간을 확인해야 한다. SDK success·콜백 200·paid 단독도 충분하지 않다.
- 보호 화면의 서버 진입과 보호 API의 실행 지점에서 동일한 완료조건을 적용한다. 클라이언트 리다이렉트를 생략하거나 API를 직접 호출해도 신규 결제 필수 회원은 통과할 수 없어야 한다.
- 신규 가입 가드는 기존 entitlement를 조합하는 별도 온보딩 책임으로 둔다. 결제 상태머신·API 응답에 onboarding 필드를 추가하거나 기존 trialing/grace 권한 계약을 재정의하지 않는다.
- 로그인·가입 재개·사업자 인증·플랜·결제/복구·구독 현황·본인 데이터 읽기/내보내기·고객지원 접근을 유지해 복구 경로가 잠기지 않게 한다.

### 5.2 정책 상수와 주문 적격성

- `pricing.ts`의 유료 매핑은 PERSONAL=[PRO], RENTAL_BIZ=[PRO, PREMIUM], REALESTATE=[PREMIUM], BUSINESS=[PREMIUM]으로 변경한다.
- `ROLE_FREE_ALLOWED`는 PERSONAL/RENTAL_BIZ=true, REALESTATE/BUSINESS=false로 분리한다. FREE를 유료 주문 목록에 넣지 않는다.
- 기존 `assertPlanAllowed`와 `createMemberOrder`는 그대로 활용한다. 부동산·기업의 PRO 위조 요청은 정책 상수에 의해 기존 `plan_not_allowed`로 거절된다. 사업자 미인증은 기존 `verification_required`를 유지한다.
- 무료 완료도 서버에서 실제 역할과 인증 상태를 확인한다. FREE 완료를 위해 기존 구독 변경 API로 플랜이나 역할을 덮어쓰지 않는다.

### 5.3 무변경 재사용 계약

| 접점 | 유지할 계약 |
| --- | --- |
| `useMemberPricing` | 기존 가격 SSOT·상품·기간 파생. 허용 카드 필터는 가입 UI 호출부에서 수행 |
| `useMemberSubscription` | 기존 현황 조회·refresh·체험 기능을 그대로 사용. 통합 가입에서는 체험 완료 경로를 연결하지 않음 |
| `useMemberOrderFlow` | 주문 생성 → SDK → 서버 콜백 → 주문 조회·복구 및 멱등·중복 방지 유지 |
| `memberApi.ts`·`memberPayment.ts`·회원 SDK 로더 | 요청/응답·실행·리다이렉트·저장소·오류 처리 변경 없음 |
| `POST /api/member-subscription/orders` | 기존 purpose·plan·durationMonths·productKind·idempotencyKey 계약 유지 |
| `GET /api/member-subscription/orders/[orderId]` | 본인 주문과 paid/applied 확인 유지 |
| `POST /api/member-subscription/payment/callback` | 기존 서명·문맥·소유권·공급자 재검증 유지 |
| `POST /api/member-subscription/orders/[orderId]/recover` | 기존 승인 재조회·멱등 복구 유지 |
| `GET /api/member-subscription/status`·`POST /api/member-subscription/trial` | DTO·상태·에러·체험 계약 유지 |

`app/api/member-subscription/*` 및 그 주문·콜백·검증·결제기록·활성화·복구·기간 계산 구현을 수정·되돌리지 않는다. 준거 설계 §6의 `status.ts`·`policy.ts` 후보는 기존 계약 변경 허가가 아니다. 온보딩 전용 판정·호출부에서 보완하고, 기존 현황·entitlement의 의미는 보존한다.

### 5.4 OAuth 의도 보존과 보안

- `markSignupIntent`를 확장해 intendedRole과 intendedPlan(플랜·기간)을 쿠키·sessionStorage 복구 힌트로 보존한다. 기존 신규 소셜 가입 차단/허용용 signup_intent 검사와 유효기간을 유지한다.
- 신규 정상 흐름은 OAuth 후 플랜을 선택하므로 최초 intendedPlan은 비어 있을 수 있다. 이전 선택·재인증 왕복 시 유효한 값만 복원하며 선결제를 강요하지 않는다.
- 힌트는 허용된 역할·플랜·기간 형식으로 검증하고, 현재 서버 역할과 불일치하면 다시 선택한다. 쿠키를 서버가 읽더라도 권한 근거로 사용하지 않는다.
- 사업자번호·결제 서명·nonce·callbackContext·imp_uid는 가입 의도 저장소에 넣지 않는다. 결제 복구용 orderId 보존은 기존 구현 그대로 사용한다.
- 본인 주문 소유권, CSRF/Origin, 서버 금액 재계산, 멱등키, 공급자 재검증 등 기존 방어를 유지한다. 클라이언트가 보낸 할인·금액·인증·active 값으로 권한을 부여하지 않는다.

### 5.5 기존 회원 호환성과 구현 전 확인사항

- 신규 가입 경로에만 새 완료조건을 적용한다. 기존 회원의 grandfather 기준선·기존 PRO 권한·데이터를 축소하거나 일괄 재온보딩하지 않는다. ADMIN/LAWYER 등 비대상 역할의 기존 진입도 유지한다.
- 현재 grandfather 폴백은 정책 레코드 부재도 포함하므로, 이를 그대로 신규 가입 면제 근거로 삼지 않는다. 기존 정책 버전·도입 기준시각·grandfatheredAt·legacyEntitlementsSnapshot을 구분해 신규 계정이 누락 레코드로 우회하지 못하게 해야 한다.
- 역할 허용 상수는 주문뿐 아니라 기존 effectiveEntitlement에도 쓰인다. 상수 축소가 기존 부동산·기업 PRO 기준선을 훼손하지 않는지 회귀 검증한다. 보호 계약 변경이 필요하다면 임의 수정 없이 설계 보완 대상으로 기록한다.
- 현재 User에는 전용 온보딩 완료·무료 선택·선택 플랜 저장 필드가 확인되지 않는다. FREE 완료는 설계대로 역할 설정 완료를 기본 상태로 해석하고 유료구독을 만들지 않는다. 유료 선택 의도는 화면 복구 힌트이며 보안 근거로 삼지 않는다.
- 전용 영속 상태가 필요한지, 가입 대상과 기존 회원의 정확한 구분, 설정 비활성 상태에서의 신규 가입 가드, 유실된 선택의 재진입 판정은 후속 상세설계에서 확정한다. 이를 이유로 결제 DTO·스키마·환경변수를 이번 단계에서 바꾸지 않는다.
- 가입 후 유형 변경과 기존 PRO 보유자의 PREMIUM 전환은 기존 정책을 유지하는 별도 범위다. 신규 가입 요구를 근거로 기존 plan_change 제한을 해제하지 않는다.
- 위저드 일반화는 기존 엔진 확장 또는 개인용 경량 셸로 구성하되 공유 플랜·결제 단계는 유지한다. 파일 500줄 이하·단일책임을 준수한다.

## 6. 우선순위와 후속 실행 순서

| 순서 | 우선순위 | 작업 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | P0 | 보호 경계·신규/기존 판정·무료 완료 의미 확인 | 변경 허용 범위와 서버 판정표 확정, 결제 계약 변경 없음 |
| 2 | P0 | 서버 역할 정책 및 온보딩 가드 | PRO 위조·무료 우회·trialing/grace 우회 거절, 기존 회원 권한 보존 |
| 3 | P0 | OAuth 복귀·인증·가입 단계 연결 | requestedRole/pending 오인 방지, 오류 시 성공 이동 금지 |
| 4 | P0 | 공통 플랜 UI·개인/사업자 위저드 구성 | 확정 플랜 매핑 및 FREE 무결제 완료, 부동산·기업 필수 결제 |
| 5 | P0 | 기존 결제 연결·모바일 복귀·이탈 재개 | 훅·API 무변경, 서버 paid/applied와 active 확인, 중복 결제 방지 |
| 6 | P0 | 보안·호환·보호 회귀 | 직접 API 우회 차단, grandfather 보존, 보호 파일 diff 0 |
| 7 | P1 | 안내 문구·진행바·오류 UX 정리 | 유형별 단계와 실제 다음 행동이 명확함 |

P0는 출시 차단 조건이다. 일정이 줄어도 서버 강제·보호 경계·기존 회원 회귀 검증을 생략하지 않는다. 준거 설계 §7의 구현 단계 교차검증·t-vestra 무출금 검증·승격 조건은 후속 구현 단계에서 따른다. 이번 기획 단계에서는 구현이나 결제 테스트를 수행하지 않는다.

## 7. 검증 계획과 출시 인수 기준

| 검증 영역 | 필수 시나리오 |
| --- | --- |
| 유형별 정상 흐름 | 일반 FREE/PRO, 임대 FREE/PRO/PREMIUM, 부동산·기업 PREMIUM 각각 완료 |
| FREE | 주문·Payment·유료구독 생성과 SDK 실행 0회, 임대 인증 생략 불가 |
| 결제 필수 | 부동산·기업에 PREMIUM active가 없으면 완료 및 보호 기능 거절. 구독 없는 status=active도 거절 |
| 위조·직접 호출 | PRO 주문 조작, FREE 완료 직접 요청, 미인증 결제, 타인 주문 조회, step·쿠키·storage 조작 차단 |
| 체험·상태 | trialing·grace·paid 미적용·needs_review·실패·취소·만료로 신규 필수 결제 온보딩 완료 불가 |
| 복원 | OAuth 의도 유실, 저장소 불가, 새로고침, 재로그인, 계정 전환, 관리자 승인 후 복귀, 기존 모바일 리다이렉트 |
| 결제 회귀 | 승인 불명확 시 조회 우선, 중복 클릭·콜백의 기존 멱등 보장, 적용 전 성공 표시 없음 |
| 기존 회원 | grandfather 및 기존 부동산/기업 PRO·legacy BUSINESS 플랜 기준선 유지, 기존 만료·체험 계약 불변 |
| 보호 경계 | 비회원 단건 등기감시·portoneV1Provider와 회원 주문/콜백/상태 계약 및 재사용 훅·API 구현 무변경 |

후속 구현에서는 서버 정책·가드 단위/통합 검증을 먼저 수행하고, UI 흐름·직접 API 접근·모바일 복귀를 검증한다. 기존 `lib/member-subscription/tests/*`·`lib/guest-monitoring/tests/*`는 보호 회귀 근거로 사용하며 테스트를 완화해서 통과시키지 않는다. 신규 가입 정책 검증은 별도로 추가한다.

최종 인수는 `npm run lint`, `npm run test`, `npm run build` 및 별도 회원/비회원 테스트 설정의 필요한 회귀 통과, 보호 파일·훅·API diff 0 확인, t-vestra 무출금 검증을 전제로 한다. 이 문서 작성 단계에서는 해당 구현 검증을 실행하거나 통과했다고 주장하지 않는다.
