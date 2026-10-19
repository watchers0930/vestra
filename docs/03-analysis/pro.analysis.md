# pro 설계-구현 갭 분석 (교차수정 반영분)

> 분석자: 크로미
> 분석일: 2026-10-19
> 준거 설계: [`docs/02-design/features/pro.design.md`](../02-design/features/pro.design.md)
> 교차검수 원본: [`pro.review-backend.md`](./pro.review-backend.md) · [`pro.review-frontend.md`](./pro.review-frontend.md) · 백엔드 인계 [`PRO-IMPLEMENTATION.md`](../../lib/member-subscription/PRO-IMPLEMENTATION.md)
> 대상: working tree(미커밋) — `git status`/`git diff` 기준. 교차수정이 반영된 현재 코드.
> 성격: 리뷰·비교만 수행. **코드 수정·배포·실결제 검증 없음.**

---

## 0. 요약 (Executive Summary)

- **Match Rate: 약 85%.** SSOT 계약(타입·정책상수·판정규칙·API 형태·프론트 위저드 일반화·플랜 의도 보존)은 설계에 **고충실도로 구현**됐고, 프론트 교차검수 7건 중 P0·P1 6건이 **실제로 해소**됐다.
- **그러나 출시 차단급 미해소 2건이 남아 있다(모두 설계 §4.4/§4.5·§8 step5의 P0):**
  1. **[CRITICAL] 결제 필수 앱 진입 가드가 실제로 작동하지 않는다.** 교차수정으로 `onboarding-access.ts`(결선 헬퍼)가 신설·단위테스트까지 됐으나, `onboardingAccessResponse`를 **호출하는 진입점이 코드베이스 어디에도 없다**(`proxy.ts`·layout 미연결). dead code 위치만 `requireOnboardingComplete` → `onboardingAccessResponse`로 한 겹 이동했을 뿐 서버 차단은 여전히 미작동.
  2. **[CRITICAL] 미결제 주문만으로 신규 가드가 면제된다.** `createMemberOrder`가 결제 전 `ensurePolicy`로 `MemberSubscriptionPolicy` 레코드를 생성(`orders.ts:52` → `policy.ts:31`)하고, `onboarding.ts:51`의 `isNewSignup = !!release && !e.policy && …`는 그 레코드가 생기면 `false`가 된다. 결과적으로 신규 BUSINESS/REALESTATE가 **결제 없이 주문(pending)만 만들어도 `complete=true`** 가 되어 §4.4의 "결제 필수 완료" 계약이 깨진다. (백엔드 인계 P0 그대로 잔존)
- **완화 요인:** 유료 *기능* 실행은 기존 `requireMemberEntitlement`(`canUsePaidFeatures`, `monitoringLimit>0`)가 여전히 막으므로 "결제 전 유료 기능 남용"은 차단된다. 위 2건은 "보호 앱 **진입/완료 판정**" 통제의 결함이다.
- 나머지는 문서 정합화(403·§9 조회횟수·planIntent 위치)와 접근성(LOW) 수준.

---

## 1. Match Rate(일치율): 85%

| 설계 영역 | 일치 | 비고 |
| --- | --- | --- |
| 타입 SSOT(§2.2) — `OnboardingStage`/`OnboardingState` 가산, 기존 DTO 불변 | 100% | `types/member-subscription.ts:82-94`. `MemberPlan="PRO"\|"PREMIUM"` 유지, FREE 미추가 |
| 정책 상수(§3) — `ROLE_ALLOWED_PLANS` 축소 + `ROLE_FREE_ALLOWED` 신설 | 100% | `pricing.ts:8-14`. 가격·한도·할인 무변경 |
| 순수 판정 `decideOnboarding`(§4.2) — 규칙표 7행 | 90% | `premiumActive` 엄격판정·trialing/grace/paid단독 우회 차단 정확. 단 `stage="role"`은 구조상 **도달 불가(dead stage)** |
| 서버 조립 `resolveOnboardingState`(§4.3) — 단일 스냅샷·클라값 미신뢰 | 95% | RepeatableRead 트랜잭션·서버 DB 귀속. 단 User 조회 2회(설계 §9는 1회로 기술) |
| `isNewSignup`(§4.4) | 70% | 기준식은 §4.4와 일치하나, **주문생성 시 policy 레코드가 생겨 우회됨**(아래 Gap-2) |
| 접근 가드 `requireOnboardingComplete`(§4.5·§8 step5) | 40% | 함수·헬퍼·테스트는 존재하나 **진입점 미결선 = 미작동**(아래 Gap-1) |
| API `GET /onboarding-status`(§5.1) | 95% | 인증선처리·120 read·no-store·오류봉투 정확. 단 403 미문서화(계약표 미반영) |
| 재사용 결제/구독 API(§5.3) 무변경 | 100% | 주문·콜백·복구·상태·trial 구현 diff 0, onboarding 필드 미추가 |
| 가입 의도 보존(§6) | 95% | owner 귀속·형식검증·금지값 미저장 정확. 단 설계가 지정한 `lib/signup-intent.ts` 확장이 아니라 `app/.../signup/planIntent.ts` 신설 |
| 위저드 일반화 `deriveWizard`(§7.1) — trialing 완료 우회 제거·개인 인증단계 생략 | 100% | `useBusinessWizard.ts`. 서버 stage 기반, `plan!==FREE && (active\|\|trialing)` 우회 제거 |
| 플랜 선택 UI(§7.2) — 허용카드/무료CTA/결제필수 문구/체험제거 | 95% | `Step3PlanSelect.tsx`. 단 플랜 버튼 `aria-pressed` 미제공(LOW) |
| 재진입·복귀 라우팅(§7.3) — stage→경로, 실패≠성공 | 100% | 셸 `exitToHome`·complete→/home, 결제 실패 재시도, setup-role 실패 비이동 |

**산정 근거:** 구현 표면은 설계 SSOT에 매우 충실하다. 감점은 ① 가드 미결선(설계 P0, 약 ‑8%) ② `isNewSignup` 주문 우회(설계 §4.4 계약 위반, 약 ‑5%) ③ 문서/계약 드리프트·dead stage·접근성(합계 약 ‑2%).

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### [CRITICAL] Gap-1 — 결제 필수 앱 진입 가드 미결선 (설계 §4.5·§8 step5 P0)
- **설계:** REALESTATE/BUSINESS 신규 미결제 계정의 보호 앱 **진입을 서버에서 차단**(step5 = 출시 차단 P0).
- **구현:** `requireOnboardingComplete`(`onboarding.ts:82`) + 결선 헬퍼 `onboardingAccessResponse`/`isOnboardingProtectedPath`(`onboarding-access.ts`) + 단위테스트(`onboarding-access.test.ts`)까지 작성됨. **그러나 `onboardingAccessResponse`를 호출하는 진입점이 없다.**
  - `grep` 결과: 정의부·내부 import 외 호출 0건.
  - Next.js 16 미들웨어인 `proxy.ts`는 `/`·legacy→renewal·`/admin`·`/profile|/dashboard`만 처리하고 온보딩 가드를 **호출하지 않는다**.
  - 보호 route group의 `layout.tsx` 서버 체크도 없음.
- **결과:** 클라 위저드 가드(`maxStep`/`exitToHome`)만 남는다 — 설계 §7.1이 "클라 가드는 서버 접근 통제를 대체하지 않는다"고 못박은 바로 그 상태. 교차수정은 헬퍼를 추가해 **dead code 위치를 한 겹 옮겼을 뿐**, 서버 차단은 미작동.
- **완화:** 유료 기능은 `requireMemberEntitlement`가 여전히 차단(진입≠기능).

### [CRITICAL] Gap-2 — 미결제 주문으로 `isNewSignup` 가드 면제 (설계 §4.4 계약 위반)
- **경로(확인됨):** `createMemberOrder`(`orders.ts:52`) → `ensurePolicy(user, tx)`(`policy.ts:26`) → 신규 유저(`createdAt ≥ effectiveAt`)에 `memberSubscriptionPolicy.create`(`policy.ts:31-33`) → 이후 `onboarding.ts:51` `isNewSignup = !!release && !e.policy && …`에서 `!e.policy===false` → `isNewSignup=false` → `decideOnboarding` 규칙 #7로 **`complete=true`**.
- **결과:** 신규 BUSINESS/REALESTATE가 **PREMIUM 결제 없이 주문(pending)만 생성**해도 온보딩이 완료로 판정된다. `requireOnboardingComplete`는 `isNewSignup && !complete && requiresPaid`에서만 throw하므로, 설사 Gap-1을 결선해도 이 계정은 통과한다. `POST /trial`도 동일하게 policy를 만든다.
- **성격:** 설계 §4.4는 "membershipPolicy 존재 → 기존/backfill 계정"으로 전제했으나, 실제 주문 흐름이 **신규 계정에도 policy를 선생성**한다는 점을 반영하지 못한 **설계-구현 계약 충돌**. 보호 경계(`orders.ts`·`policy.ts` 무변경) 때문에 백엔드가 임의 수정하지 않고 설계 확정을 요청한 상태(인계 P0).

### [MED] Gap-3 — `stage="role"` dead stage + 403 미문서화 (설계 §2.2·§5.1)
- `decideOnboarding`(`onboarding.ts:24-26`)은 ROLE_ALLOWED_PLANS에 없고 ADMIN/LAWYER도 아닌 role을 `fail("forbidden")`로 먼저 거절한다. 따라서 `stage="role"`(line 39-41)은 ROLE_ALLOWED_PLANS에 있으면서 PERSONAL/BUSINESS_ROLES가 아닌 role에서만 도달하는데, 그런 role은 존재하지 않아 **구조상 도달 불가**.
- 교차수정으로 route 주석(`route.ts:5-9`)에 403이 설명됐으나, **설계 §5.1 실패 계약표는 여전히 401/429/503만** 명시 — 403 미반영. (프론트 교차검수의 "stage 매핑 합의 필요" 지적과 연결)

### [LOW] Gap-4 — 설계 §9 "요청당 User 조회 1회" 미정정
- 실제: `resolveEffectiveEntitlement`(내부 `resolveEffectiveRole`의 findUnique) + `requestedRole` 전용 findUnique = **고정 2회**(`onboarding.ts:46-47`). N+1 아님. 보호 경계(`policy.ts` 공용 select 수정 금지)로 인한 불가피 타협. 설계 §9 문구만 "2회"로 정정 필요.

### [LOW] Gap-5 — planIntent 파일 위치가 설계 파일계획과 상이
- 설계 §1.3/§6: `lib/signup-intent.ts` **확장**. 구현: `app/(personal-home)/signup/planIntent.ts` 신설(`lib/signup-intent.ts`는 미변경 잔존). 기능은 정확(owner 귀속·검증·정리). SSOT 파일계획과의 위치 불일치만.

### [LOW] Gap-6 — 플랜 버튼 접근성(aria-pressed) 미구현
- `Step3PlanSelect.tsx:131-148` 플랜 버튼은 선택을 색/테두리로만 표시, `aria-pressed`/radio 시맨틱 없음. 같은 화면 `PlanDurationPicker`는 제공. 프론트 교차검수 #7(P2) 미해소.

### [LOW] Gap-7 — 모바일 복귀 경로 plan 힌트 정리 누락
- 모바일 결제 복귀는 기존 `/renewal/pricing`+`useMemberOrderFlow`로 처리되어 `Step4Payment`의 `clearPlanIntent`(done) 정리를 거치지 않는다. owner 귀속으로 혼입 위험은 낮으나 가입 연결 계층의 정리 훅은 없음(프론트 교차검수에서 별도 지적한 범위).

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 (최대 complete/page 210줄, Step3 180, useBusinessWizard 161, onboarding.ts 86, onboarding-access.ts 45)
2. 단일 책임           : ✅ 준수 (순수판정/DB조립/가드/엔드포인트/UI step/상태 hook/context 분리)
                          └ 경미: complete/page.tsx가 setup-role 호출 로직까지 소유, planIntent가 lib 밖(Gap-5)
3. 서버 검증·보안      : ⚠️ 부분 (onboarding-status 인증선처리·no-store·서버권위·클라값 미신뢰 OK /
                          단, REALESTATE/BUSINESS 앱진입 가드가 서버에서 미작동(Gap-1)·우회(Gap-2))
4. 성능 (중복·N+1)     : ✅ 준수 (단일 entitlement+고정 2회 조회, context가 /status·/onboarding-status 1회씩, N+1 없음)
                          └ 경미: 공유 read 120 버킷 조기 429 가능성(QA 모니터링), §9 문구 정정(Gap-4)
5. 폴더 구조           : ✅ 준수 (lib/member-subscription, app/api/signup, types/, 라우트하위 components/steps/hooks)
                          └ 경미: planIntent 위치 설계와 상이(Gap-5)
─────────────────────────────────────────────────
위반 항목: 원칙3 — Gap-1·Gap-2(결제필수 앱진입 통제 미작동/우회). 코드로 해소 필요(설계 확정 선행).
─────────────────────────────────────────────────
```

- **보호 경계 diff 0:** `app/api/member-subscription/*`·`portoneV1Provider`·비회원 흐름·기존 결제 DTO·`MemberPlan` 타입·재사용 훅/API 클라이언트 **변경 없음** 확인. `git diff --stat` 변경 12파일 전부 설계 허용 범위(가격상수·타입가산·프론트 위저드·테스트).

---

## 4. 교차검수 지적사항 해소 여부

### 4.1 백엔드 교차검수(review-backend.md) — 6건

| # | 지적 | 심각도 | 현재 상태 | 근거 |
| --- | --- | --- | --- | --- |
| B1 | `requireOnboardingComplete` 가드 미결선(dead code) | HIGH | **부분 해소(실질 미해소)** | 결선 헬퍼 `onboarding-access.ts`+테스트 신설. 그러나 `onboardingAccessResponse` 호출부 0건 → **서버 차단 여전히 미작동**(Gap-1) |
| B2 | GUEST/미등록 role — "role" dead stage + 미문서화 403 | MED | **부분 해소** | `decideOnboarding`이 forbidden 선거절, route 주석에 403 명시. 단 설계 §5.1 계약표 미반영·stage="role" 여전히 도달 불가(Gap-3) |
| B3 | 요청당 User 조회 2회(§9는 1회) | LOW | **미해소** | 코드 2회 유지, 설계 §9 문구 미정정(Gap-4) |
| B4 | 공유 read 429 가능성 | LOW | 설계의도대로 수용 | 구조 유지, QA 모니터링 과제 |
| B5 | PERSONAL 기본값/명시선택 미구분 → 조기 complete | LOW | 수용(한계) | `onboarding.ts:31-35` 주석으로 한계 명시, 안전방향(권한 축소) |
| B6 | planIntent 파일 위치 상이 | LOW | **미해소(정합화 안 됨)** | 여전히 라우트 하위 신설(Gap-5) |

> 추가로 백엔드 인계(PRO-IMPLEMENTATION.md)의 **P0 "미결제 주문 가드 면제"는 미해소**(Gap-2). P0 "진입점 결선 미수행"은 헬퍼만 추가(Gap-1).

### 4.2 프론트엔드 교차검수(review-frontend.md) — 7건

| # | 지적 | 심각도 | 현재 상태 | 근거 |
| --- | --- | --- | --- | --- |
| F1 | 최초 조회 실패가 무한 로딩으로 숨김 | HIGH/P0 | **해소** | `useOnboardingStatus.ts`가 `reqOwner`(요청 소유자)를 성공·실패·401 공통 기록(:73,:108) → 비401 실패도 오류·재시도 노출. 주석이 이전 버그 명시 |
| F2 | 결제 후 온보딩 갱신이 결제 컴포넌트 언마운트 → 완료상태 소실 | HIGH/P0 | **해소** | `refresh({background:true})` 신설(:95,:112-120, 공유 로딩 미점등). `Step4Payment` onApplied가 background 갱신(:42), 셸이 step4·`phase==="done"`을 가로채지 않음(Shell:53, Step4:64-66,82-105) |
| F3 | 현황 실패·미확정이 구매/무료완료 가드에서 빠짐 | MED/P1 | **대체로 해소** | 결제 역할 권위를 `onboarding.state.role`로 이동(Step4:33-35, PERSONAL 폴백 제거), 구매 카드는 서버 `allowedPlans`(Step3:42). 잔여: context `ready`는 `sub.loading/error` 미포함이나 권위가 온보딩으로 이동해 실피해 경로는 제거됨 |
| F4 | 서버 complete 재진입이 /home으로 미연결 | MED/P1 | **해소** | `exitToHome` 파생(useBusinessWizard:133) + 셸 complete→/home(Shell:49-60), step4 완료화면 예외 처리 |
| F5 | plan 힌트 계정 소유권·전환 정리 누락 | MED/P1 | **해소(잔여 LOW)** | `planIntent.ts` owner 귀속 저장·조회(:50,:70-82)·불일치 폐기. `clearPlanIntent`를 무료시작·결제 done에 연결. 잔여: 모바일 복귀 경로 정리(Gap-7) |
| F6 | 사업자 신청 200 → 구 세션기반 인증화면 불일치 | MED/P1 | **해소** | `Step2Verify`가 세션 대신 `onboarding.state.verifyStatus`(context) 사용(:26-28). complete/page가 사업자 200을 step3이 아닌 **step2로 라우팅**(:68-70) |
| F7 | 플랜 버튼 접근성(aria-pressed) | LOW/P2 | **미해소** | `Step3PlanSelect.tsx:131-148` aria-pressed/radio 미제공(Gap-6) |

**요약:** 프론트 교차검수 P0 2건·P1 4건 = **6건 모두 실질 해소**, LOW 1건(F7) 미해소 + 잔여 LOW(모바일 정리) 1건. 반면 백엔드 교차검수 HIGH 1건은 **헬퍼만 추가되고 실질 미작동**, 인계 P0(우회)도 미해소.

---

## 5. 종합 의견 및 남은 수정 우선순위

**종합.** 프론트엔드는 교차수정이 매우 충실하게 반영되어 P0/P1 결함이 실제로 복구됐고(상태 소유자 분리, background 갱신, 서버권위 역할, exitToHome, owner 귀속 힌트, Step2 서버 verifyStatus), 설계 SSOT와의 일치도가 높다. 반면 **백엔드 "결제 필수 앱 진입 통제"는 설계 P0 두 축(§4.5 결선 / §4.4 신규 판별)이 모두 실효화되지 못했다.** 헬퍼·테스트는 늘었으나 (a) 진입점 미결선으로 호출되지 않고(Gap-1), (b) 주문 생성이 policy를 선생성해 `isNewSignup`을 꺼버린다(Gap-2). 둘 중 하나만 있어도 REALESTATE/BUSINESS 결제 필수 완료가 서버에서 강제되지 않으며, 둘이 겹쳐 **진입 차단은 현재 전무**하다. 유료 *기능*은 `requireMemberEntitlement`가 막아 금전적 남용은 차단되므로 "데이터 유출/과금" 사고는 아니지만, **설계가 P0(출시 차단)로 규정한 완료 기준은 미충족**이다.

**남은 수정 우선순위:**

| 순위 | 항목 | 분류 | 조치 |
| --- | --- | --- | --- |
| **P0-1** | Gap-2 신규 판별 우회 | 설계 확정 선행 → 코드 | "신규 미결제" 판별을 policy 레코드 유무가 아닌 **실제 PREMIUM active + 미결제 주문 상태**로 재정의하거나, 주문 생성 시점의 `ensurePolicy`와 온보딩 판별을 분리할 기준을 설계에 확정. 보호경계(`orders.ts`·`policy.ts`) 수정 범위 대장 승인 필요 |
| **P0-2** | Gap-1 가드 결선 | 코드 | `onboardingAccessResponse`를 보호 앱 진입점(`proxy.ts` 또는 route group `layout.tsx` 서버체크)에 **실제 연결**. 열어둘 경로(로그인·가입재개·인증·플랜·결제/복구·/status·본인데이터·지원) 매칭 유지. DB 장애는 완료로 처리 금지(헬퍼는 이미 fail-closed) |
| P1 | Gap-3 403/계약 정합 | 문서+소폭 코드 | 설계 §5.1 실패표에 403 forbidden 추가, stage="role" 도달불가 명시 또는 GUEST 유도 경로 확정 |
| P2 | Gap-4 §9 조회횟수 | 문서 | 설계 §9를 "요청당 User 조회 2회"로 정정 |
| P2 | Gap-5 planIntent 위치 | 문서 또는 이동 | 설계 §1.3/§6을 라우트 하위로 정정하거나 `lib/signup-intent.ts`로 이동(기능 수정 불요) |
| P3 | Gap-6 aria-pressed | 코드 | 플랜 버튼 `aria-pressed`/radio 그룹 적용 |
| P3 | Gap-7 모바일 복귀 정리 | 코드 | 모바일 복귀 후 가입 연결 계층에서 plan 힌트 정리 |

**출시 판단:** P0-1·P0-2가 설계 P0 완료 기준(§8 step5)을 미충족하므로, **"결제 필수 가입(REALESTATE/BUSINESS) 출시 완료"로 선언 불가.** 두 항목의 설계 확정(특히 Gap-2는 보호경계 수정 범위 승인)과 결선·검증 후 t-vestra 무출금 검증을 거쳐야 한다. 개인/임대 FREE·유료 경로와 프론트 전반은 교차수정으로 품질이 확보되어 있다.

**검증 한계.** 본 분석은 정적 코드·테스트·설계 대조 기준이다. 실제 DB 저장·관리자 승인·실결제·브라우저 접근성 트리·권한별 E2E·t-vestra 무출금 검증은 수행하지 않았다(릴리스 전 별도 필요).
</content>
</invoke>
