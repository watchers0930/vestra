# Renewal 설계↔구현 갭 분석 (교차수정 반영 후)

> 분석일: 2026-10-20
> 분석자: Claude (크로미)
> 기준 설계서: `docs/02-design/features/renewal.design.md`
> 대상 코드: `git status`/`git diff HEAD` 미커밋 변경분 + 신규 파일 (백엔드 교차수정 + 프론트 교차수정 반영 후)
> 교차검수 기준: `docs/03-analysis/renewal.review-backend.md`, `docs/03-analysis/renewal.review-frontend.md`
> 검증 한계: 정적 코드 대조 기준. 실브라우저 연속 스크린샷·실결제·테스트 배포 smoke는 **이번 분석에서 수행하지 않았다**(배포 전 필수 게이트로 남음).

---

## 0. 분석 전제 — 이 기능의 "구현"이 가리키는 것

설계서 §0이 못박은 대로, renewal 기능의 **실작업 범위는 프론트엔드**(가입 UI 표현·연결·재진입·오류·완료 표현)이고, 백엔드는 **계약 보존 + 회귀 기준 고정 + 서버 검증 재확인**이다(신규 API·DB·정책 상수 금지). 따라서 "구현 대비 설계 일치"는 두 축으로 본다.

- **프론트 축:** 설계 §1.2 공통 표현 계층·§1.4 단계 매핑·§2.4 완료 기준·§4.2 F-1~F-6이 코드로 구현됐는가.
- **백엔드 축:** 설계 §0 P0 불변 조건(보호 경계·계약·정책·DB 무변경)을 지키고 §4.1 B-1~B-4(회귀 고정·계약 대조·서버 판정 재확인)를 산출했는가.

---

## 1. Match Rate (일치율): **약 93%**

| 영역 | 가중 | 일치도 | 근거 |
|---|---:|---:|---|
| 백엔드 범위·계약 보존(§0·§4.1) | 25% | 100% | `app/api`·`actions`·`schemas`·`prisma` 소스 무변경. 산출물은 회귀 테스트 3종+감사 문서+교차수정 테스트. 보호 경계·member/guest 계약·정책 상수·DB·env 무변경 |
| 공통 표현 계층(§1.2 F-1) | 20% | 80% | `_shared/signup-theme.ts`·`RenewalSignupShell`·`RenewalStageBar`·`RenewalStatusPanels/`(7패널 단일책임)·`RenewalBrand` 전부 신설. 단 **Step4Payment·Step3·RenewalSignupModal은 공통 셸/토큰으로 미전환**(하드코딩 Tailwind 색 잔존) → F-1/F-4 "모달↔풀페이지 동일 표현" 부분 달성 |
| 단계 매핑·완료 기준(§1.4·§2.4 F-4) | 20% | 100% | `signup-stage.ts`가 "접근 가능(reachable)"과 "완료(completed)"를 분리, 완료는 서버 사실(`verified`/`premiumActive`)로만 확정하고 개인 세부유형 선택은 유보 |
| 상태 연결·재진입·오류(§4.2 F-3/F-5) | 20% | 100% | 최초 조회 실패→오류/재시도 분기, 수동 재확인 실패/재인증 구분, 포커스 복귀 갱신, 승인 후 setup-role 자동 재호출 제거, 세션 갱신 중 완료화면 보존 |
| 계약 문서 정합성(§3·§4.3) | 15% | 70% | §3.5 recover 상태코드 불일치가 **단일 진실 소스(설계서)에 미반영**. 코드 주석·회귀 테스트는 추가됐으나 설계서 §3.5는 여전히 409로 표기 |

**종합 ~93%.** 핵심 계약·동작·보호 경계는 설계와 **완전 일치**하고 교차검수 지적도 대부분 해소됐다. 미달 지점은 ① 공통 표현 승격의 범위(일부 결제/플랜 화면 미전환)와 ② 설계서 §3.5 문서 정정 누락이며, 둘 다 **기능 정확성이 아닌 완결성·문서 정합성** 문제다.

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### [GAP-1] 공통 표현 승격이 부분적 — 결제/플랜/모달 화면 미전환 (설계 §1.2·§4.2 F-1/F-4)
- **설계 의도:** `RenewalSignupModal`의 비주얼을 공통 표현 요소로 승격하고, `signup/complete`·`UserTypeSelector`·`BusinessInfoForm`·`business/steps/*`의 하드코딩 색(`bg-[#e8f8ee]` 등)을 renewal 토큰으로 교체해 **모달↔풀페이지 동일 표현**을 달성한다.
- **실제:** `complete/page.tsx`·`BusinessInfoForm`·`Step2Verify`는 `SIGNUP_THEME`/공통 셸로 전환 완료. 그러나 **`Step4Payment.tsx`는 여전히 하드코딩 Tailwind 색**(`border-[#e5e5e7] bg-white text-[#1d1d1f] text-[#6e6e73]`)을 쓰고 `RenewalSignupShell`/`SIGNUP_THEME`을 소비하지 않는다. `RenewalSignupModal`·`Step3`도 이번 변경분에서 공통 셸 전환 흔적이 없다.
- **영향:** 결제 단계만 톤이 어긋날 수 있다(디자인 회귀 아님, **완결성 미달**). 프론트 교차검수 "F-1/F-4 전체 완료 여부 별도 확인"과 동일 지적.
- **우선순위: P1(기능 외 완결성).** 실화면 연속 스크린샷 게이트에서 최종 확인 필요.

### [GAP-2] 설계서 §3.5 recover 상태코드가 코드와 불일치한 채 미정정 (설계 §3.5·§4.3)
- **설계 §3.5:** `payment_needs_review`·`payment_pending`을 **409 실패**로 명시(L211).
- **실제 코드(`recovery.ts`):** 이미 `needs_review`인 주문만 409(`fail`), **새로 발견한** `needs_review`/`pending`은 **200 상태 DTO**(`{ status, applied:false }`)로 반환. 교차수정으로 `recovery.ts`에 계약 주석이 추가되고 `recovery-http-contract.test.ts`가 신설돼 **코드·테스트는 정합**하다.
- **불일치:** 설계 §4.3은 "불일치 발견 시 **문서를 코드 기준으로 정정**"하라고 지시했으나, 설계서 §3.5 L211은 여전히 409로 적혀 있다. 성공(200) 라인(L210 `{ status, applied }`)은 포괄적이라 틀리진 않으나, **실패 409 라인이 오해를 유발**한다.
- **영향:** 현재 FE 복구 소비자(`useMemberOrderFlow`→`Step4Payment`)는 `needs_review`/`pending`을 재확인 상태로 처리하고 완료화면도 `onboarding.complete`를 재확인하므로 **실동작 위험은 낮다**. 다만 단일 진실 소스가 틀린 채 남아 향후 계약 드리프트 재발 위험.
- **우선순위: P1(문서 정정).** 설계서 §3.5를 코드 기준으로 정정(코드는 동결).

### [GAP-3] 잔존 LOW — no-store 헤더·admin 목록 무제한 (설계 §3 공통 헤더, 교차검수 재확인)
- `app/api/user/setup-role/route.ts`·`app/api/admin/verify/route.ts`·`app/api/health/route.ts`에 **`Cache-Control: no-store` 미설정**(member-subscription·onboarding-status는 설정). 민감 응답은 아니나 §3 공통 헤더 계약과 불일치.
- `admin/verify` GET `findMany`에 `take`/`cursor` 없음(무제한 배열 응답) — 대기자 급증 시 응답 비대. N+1 아님, 기존 코드.
- **우선순위: P2(기존 결함, 별도 작업).**

### 설계와 **일치 확인**된 핵심 항목(갭 아님)
- 신규 API·DB·마이그레이션·env·정책 상수·`MemberPlan` FREE 추가·0원 주문 쓰기 **없음** ✅
- 2A 보호 경계(`onboarding*`/`protected-paths`/`proxy`/`lib/auth` JWT)·agent·`monitoring-targets`·guest·결제 계약 **무변경** ✅
- `useMemberOrderFlow.ts` 459줄 **미수정**(신규 책임 미추가, §1.3 모니터링 유지) ✅

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (renewal 구현 전체)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수. 최대 complete/page.tsx 262줄, BusinessInfoForm 221,
                          useOnboardingStatus 216. 전 파일 500줄 미만.
                          useMemberOrderFlow 459줄은 미수정(모니터링 유지)
2. 단일 책임           : ✅ 준수. API 호출 로직을 useRoleSetup 훅으로 분리(page/form에서
                          제거), 상태 패널 7종 단일책임 분리, 이벤트 감지(useVisibilityRefresh)와
                          요청 소유(useOnboardingStatus) 분리
3. 서버 검증·보안      : ✅ 준수. setup-role가 role 화이트리스트·사업자번호 정규식·회사/대표자
                          길이를 서버 검증, auth+validateOrigin(CSRF) 적용. 승인 전 role 미승격
                          (requestedRole만 기록). onboarding GET이 완료/허용플랜 단일 권위.
                          admin/verify role 화이트리스트 검증(임의 role 승격 차단)
4. 성능 (중복·N+1)     : ✅ 준수. BusinessWizardContext 1회 조회 공유, useOnboardingStatus가
                          in-flight Promise 공유 + 최소간격(10s) + 실패 백오프(30s)로 중복
                          fetch 차단. 신규 목록 쿼리·N+1 없음
5. 폴더 구조           : ✅ 준수. _shared(공통표현)/hooks(상태·로직)/components(UI)/
                          lib·api(계약) 역할 분리 유지
─────────────────────────────────────────────────
위반 항목: 없음
잔존 모니터링: useMemberOrderFlow 459줄(미수정), setup-role/admin/health no-store 미설정(GAP-3)
─────────────────────────────────────────────────
```

- **500줄:** 위반 없음. 신규/수정 전 파일이 상한의 절반 수준이다.
- **단일책임:** 교차검수 프론트 #7(page/form에 API·상태·흐름 혼재) 지적이 `useRoleSetup` 추출로 해소됨. 페이지는 조합·라우팅만, 폼은 입력·검증·표현만 담당.
- **서버검증:** 모든 변이(POST setup-role)가 서버에서 role·사업자번호·필드 길이를 재검증하고 CSRF·인증을 적용. 클라 검증은 UX 보조. **인증 없는 변이 핸들러 없음**(setup-role=auth, admin/verify=withAdminAuth).
- **성능:** 중복 조회가 구조적으로 차단됨(컨텍스트 공유 + in-flight 공유 + 백오프). N+1 신규 도입 없음.
- **폴더구조:** `_shared` 공통 표현, `hooks` 상태/로직, 라우트별 `components` 배치 모두 규칙 부합.

---

## 4. 교차검수 지적사항 해소 여부

### 4.1 프론트엔드 교차검수 (HIGH 2 / MED 5 / LOW 1)

| # | 지적 | 해소 | 근거 |
|---|---|:--:|---|
| 1 | [HIGH] 최초 조회 실패가 영구 로딩에 가려짐(complete/page.tsx) | ✅ | 분기 순서를 **재인증→오류→로딩→상태없음→라우팅→폼**으로 재배치(L187-215). 로딩도 오류도 아닌데 state 없으면 복구 가능 오류로 처리 |
| 2 | [HIGH] 세션 갱신이 접수 성공 폼을 언마운트(BusinessInfoForm) | ✅ | `update()`를 자식에서 제거해 **상위 page가 소유**, `bizReceived` 상위 상태로 접수 패널 보존, `update().catch(()=>{})` best-effort 분리. `useOnboardingStatus.keepDuringRefresh`가 세션 loading 중 state 유지 |
| 3 | [MED] 수동 재확인 실패/세션만료 은폐(Step2Verify) | ✅ | `refresh({ background:true, force:true })`가 `RefreshResult` 반환, `recheckNotice`로 pending/조회실패/재인증 구분 표시 + "다시 로그인" 링크 |
| 4 | [MED] 서버 접근 stage를 선택 완료로 오해(signup-stage) | ✅ | 완료는 `premiumActive`(결제 역산) 또는 사업자 `verified`로만 확정, 개인 세부유형·무료 선택은 **유보**. 주석에 onboarding.ts 한계 명시 |
| 5 | [MED] 입력 포커스 표시 제거(BusinessInfoForm) | ✅ | `inputStyle`에 focus 링(boxShadow) 복원, `aria-invalid`/`aria-describedby` 연결, 제출 실패 시 첫 오류 필드로 focus 이동 |
| 6 | [MED] 포커스 갱신·수동 갱신 중복 fetch(useVisibilityRefresh) | ✅ | 중복 제어를 **요청 소유 훅**(useOnboardingStatus)으로 단일화: in-flight Promise 공유 + 최소간격 + 백오프. 이벤트 훅은 상태 복제 안 함 |
| 7 | [MED] page/form에 API·상태·흐름 혼재(단일책임 위반) | ✅ | `useRoleSetup` 훅 신설로 POST·잠금·오류 분리. page는 라우팅, form은 표현만 |
| 8 | [LOW] 진행바가 이동 불가 단계를 활성 버튼 표시(BusinessWizardShell) | ✅ | `onStageClick`이 `s<2` 무시 + `wiz.steps`에 실재하는 단계로만 라우팅(L114-116) |

**프론트 8건 전부 해소.** P0(1·2)·P1(3~7)·P2(8) 모두 코드에 반영됨.

### 4.2 백엔드 교차검수 (MED 2 / LOW 3)

| 지적 | 해소 | 근거 |
|---|:--:|---|
| [MED] §3.5 계약 불일치가 단일 진실 소스 미반영 | ⚠️ 부분 | 코드 주석(`recovery.ts`)·회귀 테스트(`recovery-http-contract.test.ts`) 추가로 **코드 측은 정합·고정**. 그러나 **설계서 §3.5 L211은 여전히 409** → 문서 정정 미완(§4.3 위반). **GAP-2로 잔존** |
| [MED] 기존 결함 3종 — 사업자번호 형식 | ✅ | `setup-role:90` `/^(?:\d{10}\|\d{3}-\d{2}-\d{5})$/` 정규식 추가 |
| [MED] 기존 결함 3종 — 예외 미처리(500) | ✅ | POST 전체 try-catch→503, `req.json().catch(()=>null)`→400. admin/verify도 try-catch·`unavailable()`(503) |
| [HIGH 권고] 기존 결함 3종 — PII 평문 감사 로그 | ✅ | **이중 방어**: ① setup-role detail에서 companyName/representName 제거(requestedRole·status만 기록) ② `audit-log.ts` `BUSINESS_PII_KEYS`로 companyname/representname/businessnumber 마스킹(`****`) + `audit-log-privacy.test.ts` 신설 |
| [LOW] admin/verify 임의 role 수용·분기 미커버 | ✅ | role 화이트리스트 검증 2중(`verify:40` 입력, `:57` approvedRole). `admin-verification-contract.test.ts` 신설 |
| [LOW] 500/예외 경로 테스트 미커버 | ✅ | 예외처리 보강과 함께 계약 테스트 신설(setup-role/admin/recovery/audit-privacy) |
| [LOW] no-store 헤더 누락(setup-role/admin/health) | ❌ 미해소 | 3개 라우트 여전히 미설정. **GAP-3로 잔존(P2)** |
| [LOW] admin 목록 무제한(take/cursor 없음) | ❌ 미해소 | `verify` GET findMany 무제한 유지. **GAP-3로 잔존(P2)** |

**백엔드:** MED 2건 중 기존 결함 3종(사업자번호·예외·PII)은 **전부 해소**(PII는 HIGH 권고대로 우선 처리됨). §3.5 문서 정정만 미완(GAP-2). LOW 중 role 화이트리스트·테스트는 해소, no-store·admin 목록 무제한은 잔존(GAP-3).

> 참고: 교차검수는 "소스 무변경"을 전제로 했으나, 교차수정 단계에서 **기존 결함 수정을 위해 `setup-role/route.ts`·`admin/verify/route.ts`·`audit-log.ts`·`recovery.ts`가 실제로 수정**됐다(별도 작업으로 분리·대장 승인 흐름에 해당). 이는 설계 §4.1 "변경이 필요한 결함은 별도 작업으로 분리" 지침과 부합하며, 신규 API/DB/정책은 여전히 미변경이다.

---

## 5. 종합 의견 및 남은 수정 우선순위

### 종합 의견
renewal 구현은 설계서 계약(§3 API·§0 P0 불변 조건)과 **정확히 맞물려** 있고, 프론트 교차검수 HIGH/MED 8건과 백엔드 기존 결함 3종(사업자번호·예외·PII)이 **모두 해소**됐다. 특히 CLAUDE.md 0번 절대규칙과 직결되는 **PII 평문 감사 로그가 이중 방어로 제거**된 점, **완료 체크를 서버 사실로만 확정**(maxStep 오용 제거)한 점, **중복 fetch를 요청 소유 훅으로 단일화**한 점은 견고성 4문(규모·수명주기·비정상경로·적대적 자문) 기준을 충족한다. 플랫폼 5대 원칙 위반도 없다.

남은 것은 **기능 정확성이 아니라 완결성·문서 정합성**이다: ① 결제/플랜/모달 화면의 공통 표현 승격(GAP-1), ② 설계서 §3.5 문서 정정(GAP-2), ③ no-store·admin 목록 무제한 보강(GAP-3). 그리고 설계·교차검수 양측이 공통으로 남긴 **실화면 연속 스크린샷·실결제·테스트 배포 smoke는 미수행**이며, 이것이 배포 전 최대 잔여 리스크다.

### 남은 수정 우선순위

| 순위 | 항목 | 분류 | 조치 |
|:--:|---|---|---|
| **P0** | 실화면 게이트 미수행 | 검증 공백 | `t-vestra` 무출금 테스트 배포 → smoke(`/`·`/login`·`/api/health`) → 1440/390/360px 연속 스크린샷 + 사업자 3종 pending→verified/rejected, 개인 2종, 무료/PRO/PREMIUM 결제복구 실동작. **운영 반영 전 필수** |
| **P0** | `vitest`(member config) 회귀 + `lint`/`build` 통과 재확인 | 검증 | 교차수정으로 소스가 변경됐으므로 회귀 재실행 |
| **P1** | GAP-1 공통 표현 승격 완결(Step4Payment/Step3/모달 → SIGNUP_THEME·셸) | 완결성 | 하드코딩 색 교체. 디자인 회귀 주의(소비자 깨지 않게) |
| **P1** | GAP-2 설계서 §3.5를 코드 기준(200+status)으로 정정 | 문서 | 코드 동결, 문서만 수정 |
| **P2** | GAP-3 no-store 헤더 3라우트 추가 + admin 목록 take/cursor | 기존 결함 | 별도 작업으로 분리 |
| **P2** | `app/api/` 전체 보안 스윕(인증 없는 변이·dead-code endpoint) | 배포 게이트 | CLAUDE.md API 체크리스트 — 변경 파일 외 전체 폴더 대상 |

> ⚠️ **로컬 '됐다' ≠ 운영 됐다(CLAUDE.md 규칙 0-1):** 본 분석은 정적 코드 대조 결과이며, 설계·구현 일치율 93%는 **코드 기준**이다. 사용자 눈으로 본 실화면·실결제 확인은 P0 게이트를 통과해야 "완료"로 선언할 수 있다.
