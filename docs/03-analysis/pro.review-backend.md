# pro 백엔드 교차검수 (Codex 구현분)

> 검수자: Claude (크로미)
> 검수일: 2026-10-19
> 대상 커밋: 미커밋 작업분 (`git status`/`git diff` 기준)
> 준거 설계: [`docs/02-design/features/pro.design.md`](../../02-design/features/pro.design.md)
> 검토 관점: 보안(인증·CSRF·입력검증·SQLi/XSS) · 버그 · 성능(N+1·중복호출) · 설계 스펙 일치
> **본 문서는 리뷰만 수행. 코드 수정 없음.**

---

## 0. 검수 대상 파일 (백엔드 범위)

| 파일 | 상태 | 비고 |
| --- | --- | --- |
| `lib/member-subscription/pricing.ts` | 수정 | `ROLE_ALLOWED_PLANS` 축소 + `ROLE_FREE_ALLOWED` 신설 |
| `lib/member-subscription/onboarding.ts` | 신규 | 온보딩 판정·조립·가드 |
| `app/api/signup/onboarding-status/route.ts` | 신규 | GET 읽기 엔드포인트 |
| `types/member-subscription.ts` | 가산 | `OnboardingStage`/`OnboardingState` |
| `app/(personal-home)/signup/planIntent.ts` | 신규 | 클라 전용 플랜 힌트 (참고) |
| `lib/member-subscription/tests/{onboarding,onboarding-route}.test.ts` | 신규 | 단위·라우트 테스트 |
| `lib/member-subscription/tests/{contracts,monitoring}.test.ts` | 수정 | 상수 변경 반영 |

`actions/`·`schemas/`·`supabase/`·`prisma/` 변경 없음(스키마·마이그레이션 무변경 — 설계 §2.1 준수). 보호 경계(`app/api/member-subscription/*`, `policy.ts`·`orders.ts`·`lifecycle.ts` 등, `portoneV1Provider`, 비회원 흐름) **diff 0** 확인.

---

## 1. 종합 판정

**구현 품질은 전반적으로 설계 SSOT에 충실하며, 보안 핵심(서버 권위 판정·클라값 미신뢰·우회 방어)은 정확하다.** 다만 **설계 §8 step5의 P0 산출물인 접근 가드(`requireOnboardingComplete`)가 어디에도 결선되지 않은 dead code** 상태이며, 이를 포함해 지적 6건(HIGH 1 / MED 1 / LOW 4)을 아래에 정리한다.

---

## 2. 지적 사항

### [HIGH] `requireOnboardingComplete` 가드 미결선 (dead code) — onboarding.ts:76

**문제.** 설계 §4.5·§8 step5는 "REALESTATE/BUSINESS 신규 미결제 계정이 보호 앱에 진입하는 것을 막는 **라우팅/접근 가드**"를 백엔드 P0(출시 차단) 산출물로 명시한다. 구현은 `requireOnboardingComplete(userId)` 함수를 작성하고 단위 테스트까지 갖췄으나, **전체 코드베이스(route/middleware/layout/app 진입점) 어디에서도 호출되지 않는다.**

```
grep -rn "requireOnboardingComplete" (node_modules 제외)
→ 정의부(onboarding.ts:76) + 테스트(onboarding.test.ts) 뿐. 호출부 0건.
```

`middleware.ts`도 리포지토리에 존재하지 않아, 설계가 의도한 "앱 진입 서버 차단"이 **실제로는 전혀 작동하지 않는다.** 클라이언트 위저드 가드(`maxStep`)만 남는데, 설계 §7.1이 "클라 가드는 서버 접근 통제를 대체하지 않는다"고 못박은 바로 그 상태다.

**영향(완화 포함).** 유료 **기능** 실행은 기존 `requireMemberEntitlement`(`policy.ts`, `canUsePaidFeatures` 게이트)가 여전히 막으므로 결제 전 유료 기능 남용은 차단된다(설계 §4.5의 보완 관계). 그러나 "보호 앱 **진입/라우팅** 차단"이라는 step5의 완료 기준은 미충족이며, 신규 미결제 REALESTATE/BUSINESS 계정이 위저드를 우회해 앱 셸로 직접 접근하는 경로에 대한 서버 방어가 없다.

**수정 제안.**
1. 이 가드를 보호 앱 진입점(해당 route group의 `layout.tsx` 서버 컴포넌트 또는 전용 서버 체크, 혹은 `middleware.ts` 신설)에 결선한다. 설계 §4.5의 "열어두어야 하는 경로"(로그인·가입 재개·인증·플랜·결제/복구·`/status`·본인 데이터·고객지원)는 가드 대상에서 제외하도록 매칭 범위를 좁힌다.
2. 혹은 이 결선이 **후속 단계(프론트 연결 포함)로 의도적으로 연기된 것**이라면, 현재 가드가 미작동임을 설계/런북에 명시하고 대장 승인 후 출시 범위를 확정한다.
→ **대장 확인 필요: 의도적 연기인가, 누락인가.**

---

### [MED] GUEST/미등록 role 처리 불일치 — "role" 단계 unreachable + 미문서화 403 — onboarding.ts:22-38 vs 54-55

**문제.** 두 함수의 role 처리가 어긋난다.
- `decideOnboarding`(:36 else 분기)는 PERSONAL/사업자/ADMIN/LAWYER가 아닌 role(=GUEST 등)에 대해 `stage="role"`을 반환하도록 작성됐고, 단위 테스트도 `[{ role: "GUEST" }, "role"]`로 이를 검증한다.
- 그러나 상위 `readOnboardingState`(:54-55)는 `ROLE_ALLOWED_PLANS`에 없고 ADMIN/LAWYER도 아닌 role을 **`fail("forbidden")`(403)으로 먼저 거절**한다.

결과적으로 **실제 엔드포인트에서 `stage="role"`은 절대 반환되지 않는 dead stage**이고, GUEST 세션 사용자는 유형 선택으로 라우팅되는 대신 403을 받는다. 또한 설계 §5.1 실패표는 401/429/503만 규정하며 **403 forbidden은 미문서화** 응답이다.

**영향.** 신규 사용자 기본 role은 PERSONAL(`schema @default`, `auth.ts:157` 폴백)이라 GUEST 세션은 실무상 드물어 실피해 가능성은 낮다. 그러나 (a) 단위 테스트가 production 도달 불가 경로를 검증 중이고, (b) 설계상 정의된 `OnboardingStage="role"`이 사실상 사문화됐으며, (c) 미문서화 상태코드가 노출되는 **계약 불일치**다.

**수정 제안.** 둘 중 하나로 정합화.
- GUEST를 유형 선택으로 유도할 의도면: `readOnboardingState`의 forbidden 가드가 GUEST를 통과시켜 `decideOnboarding`이 `stage="role"`을 돌려주게 하고, `allowedPlans=[]`/`freeAllowed=false`로 응답.
- 유도 의도가 없으면: `decideOnboarding`의 GUEST→"role" 분기와 해당 단위 테스트를 제거하고, §5.1 실패표에 403 조건을 명시.

---

### [LOW] 요청당 User 조회 2회 — onboarding.ts:43-44

**문제.** `resolveEffectiveEntitlement`가 내부적으로 `resolveEffectiveRole`에서 `user.findUnique`(id·role·verifyStatus·createdAt·subscription·membershipPolicy 조인)를 1회 수행하고, 그 직후 `requestedRole`만을 위해 `user.findUnique`를 **한 번 더** 호출한다. 설계 §9가 주장한 "요청당 `resolveEffectiveEntitlement` 1회(단일 user 조인)"와 불일치한다(테스트도 `f.find` 2회 호출을 전제).

**영향.** N+1은 아니며(고정 2회), RepeatableRead 트랜잭션 내 동일 user 2회 조회로 성능 영향 미미. 다만 보호 경계(`policy.ts` 수정 금지)로 인해 `resolveEffectiveRole`의 select에 `requestedRole`을 추가할 수 없어 발생한 불가피한 타협이다.

**수정 제안.** 코드 변경보다 **설계 §9 기술을 "요청당 User 조회 2회"로 정정**하는 편을 권장(보호 경계 유지가 우선). 추후 `policy.ts` 작업 시 `requestedRole`을 공용 select에 포함하면 1회로 축약 가능.

---

### [LOW] 공유 read rate-limit 버킷 조기 429 가능 — onboarding-status/route.ts:8

**문제.** `/api/signup/onboarding-status`, `/api/member-subscription/status`, `/api/member-subscription/orders/[orderId]`가 모두 동일 scope `"read"`(키 `sha256("read:"+userId)`, 120/분) **카운터를 공유**한다. `memberRateLimit`의 limit 인자는 임계값만 바꿀 뿐 증가는 호출마다 공통 카운터에 누적된다.

**영향.** 설계 §5.1 권장("read 스코프 재사용")과는 일치. 그러나 `BusinessWizardContext`가 한 진입에서 `/status`+`/onboarding-status`를 함께 조회하고, 모바일 결제 복귀 시 주문 상태 폴링이 겹치면 합산 120/분에 조기 도달해 위저드가 429를 받을 수 있다.

**수정 제안.** 현 구조 유지 시 **클라 폴링 간격·중복 호출 상한을 점검**(설계 §4 "중복 `/status` 호출은 `BusinessWizardContext` 공유 패턴"에 의존). 실결제 흐름 QA에서 429 발생 여부를 모니터링하고, 필요 시 온보딩 읽기를 별도 scope로 분리 검토.

---

### [LOW] PERSONAL 기본값과 명시 선택 미구분 → 재진입 시 조기 complete — onboarding.ts:28-32

**문제.** 스키마가 "default PERSONAL"과 "명시적 PERSONAL 선택"을 구분할 필드가 없어, `role==="PERSONAL" && !requestedRole`을 즉시 `complete`로 판정한다. 설계 규칙표 #1("PERSONAL 초기값 → stage `role`")은 이로써 실현 불가능하며, 코드 주석도 이 한계를 명시한다.

**영향(보안상 안전).** 재진입 edge: 사용자가 signup 페이지에서 BUSINESS를 선택(클라 intent)하고 OAuth 후 `setup-role` 전 새로고침하면, 서버는 PERSONAL/no-requestedRole → `complete` → `/home`으로 라우팅한다. 권한은 PERSONAL FREE로 **축소**되므로 권한 상승 위험은 없다(안전 방향). 설계 §2.1·§7.1이 "클라 intent는 힌트일 뿐"이라 수용한 한계와 일치하는 UX 제약이다.

**수정 제안.** 기능상 수용 가능. 다만 이 재진입 UX(의도 BUSINESS였으나 complete 처리)가 허용 가능한지 대장 확인 권장. 영속 "온보딩 완료 플래그" 신설은 설계가 후속 상세설계로 미룬 사항(§2.1).

---

### [LOW] 파일 배치가 설계 파일계획과 상이 — planIntent.ts

**문제.** 설계 §1.3/§6은 플랜 힌트 보존을 **`lib/signup-intent.ts` 확장**으로 지정했으나, 구현은 신규 `app/(personal-home)/signup/planIntent.ts`(`"use client"` 전용)로 분리했다.

**영향.** 기능 자체는 정확하다 — `isValid`로 `MemberPlan`/`DurationMonths` 형식 검증, sessionStorage 실패 폴백, 금지값(사업자번호·서명·imp_uid 등) 미저장, "힌트는 비권위" 원칙 준수(§6). 백엔드 신뢰 경계에 영향 없음(서버는 이 값을 읽지 않음). 단지 SSOT 파일계획과의 위치 불일치이며, 프론트(Claude) 영역에 더 가깝다.

**수정 제안.** 설계 파일계획과 실제 배치 중 하나로 정합화(문서 정정 또는 파일 이동). 기능 수정 불요.

---

## 3. 정상 확인(회귀·보안 OK) 항목

설계대로 올바르게 구현되어 **문제 없음**을 확인한 사항:

- **`premiumActive` 엄격 판정 + 우회 방어 정확 (onboarding.ts:52-53).** `e.plan==="PREMIUM" && e.state.status==="active"`에 더해 **실제 subscription 행 존재 + `sub.plan∈{PREMIUM,BUSINESS}` + `sub.status==="active"`**까지 요구. `subscriptionState(null)`가 `"active"`를 돌려주는 점(lifecycle.ts:33)과 grandfather 스냅샷이 `plan`을 PREMIUM으로 끌어올리는 경로(policy.ts)를 정확히 차단한다. trialing/grace/locked/expired/canceled/FREE/PRO/스냅샷-only는 전부 `premiumActive=false`(테스트 커버). 설계 §4.2 "SDK success·콜백 200·paid 단독으로 참 금지" 충족.
- **상수 축소의 서버 강제 효과 성립.** `ROLE_ALLOWED_PLANS`에서 REALESTATE/BUSINESS의 PRO 제거만으로, 기존 `assertPlanAllowed`(policy.ts:21-22) 경로가 PRO 주문을 **추가 코드 없이** `plan_not_allowed`로 거절. 미인증은 `verification_required`. 설계 §3.1 확인(contracts 테스트 검증).
- **`isNewSignup` 기준이 `status.ts`의 `newUnclassified`와 동일.** `release 활성 && !policy && createdAt >= effectiveAt`(onboarding.ts:48 vs status.ts:18). grandfather 폴백(`!policy`)이나 누락 정책으로 신규 계정이 가드를 우회하지 못하게 범위를 좁힘. 설계 §4.4 충족(테스트의 경계값 ±1ms 검증 포함).
- **release 비활성 시 안전 응답.** `memberReleaseConfig()` throw를 catch해 `release=null → isNewSignup=false`로 두어 **503 대신 읽기 유지**(복구 경로 미차단). 설계 §5.1 "읽기는 유지" 선호와 일치(onboarding.ts:46-47).
- **엔드포인트 보안 계약 준수 (route.ts).** `requireUser(await auth())` → `memberRateLimit` → `resolve` 순서로 **인증을 rate limit/데이터 읽기보다 선처리**(테스트로 401 선처리 검증). GET이라 CSRF/`memberMutation` 불필요(설계 §5.1 일치). `Cache-Control: no-store`. 내부 오류는 `memberEndpoint`가 `provider_unavailable`(503)로 마스킹 — 스택/쿼리 미노출.
- **단일 스냅샷 원자성.** `resolveOnboardingState`가 `$transaction(RepeatableRead, 5s)`로 entitlement + requestedRole을 한 스냅샷에서 읽어, "역할 승인 ↔ 구독 활성" 경합을 방지(onboarding.ts:70-72).
- **SQLi/XSS 무위험.** GET·쿼리파라미터 없음·원시 입력 미사용. rate limit `$queryRaw`는 태그드 템플릿 파라미터 바인딩. `planIntent`는 `JSON.parse` + 화이트리스트 검증.
- **테스트 완화 없음(회귀 강화).** `contracts.test.ts`·`monitoring.test.ts`는 새 제약(REALESTATE/BUSINESS=PREMIUM 단독)에 맞춰 수정됐고, "classified BUSINESS/REALESTATE PRO without legacy baseline → 거절" 회귀를 **추가**했다. 기존 부동산/기업 PRO grandfather 기준선은 `preserves %s legacy PRO baselines` 테스트로 보존 확인(설계 §3.1·§9 회귀 대상 충족).
- **보호 경계 diff 0.** 결제 DTO·`MemberPlan` 타입("PRO"|"PREMIUM")·주문/콜백/복구/상태 구현 무변경. 신규 타입은 가산만.

---

## 4. 요약 (누락 / 위험 / 우선순위)

| 구분 | 내용 | 우선순위 |
| --- | --- | --- |
| **누락** | `requireOnboardingComplete` 가드 미결선(앱 진입 서버 차단 미작동) [HIGH] | 출시 전 결선 또는 범위 재확정 |
| **위험** | GUEST role 처리 불일치(미문서화 403 + dead stage) [MED] | 계약 정합화 |
| **경미** | User 2회 조회(§9 문서 정정), 공유 read 429, PERSONAL 재진입 조기 complete, planIntent 파일 위치 [LOW×4] | 문서 정정·QA 모니터링 |

**출시 차단 판단:** HIGH 1건(가드 결선)이 설계 P0 완료 기준을 미충족하므로, **의도적 연기 여부에 대한 대장 확인** 전까지 "step5 완료"로 선언 불가. 나머지는 문서 정정·정합화·QA 모니터링으로 처리 가능.
