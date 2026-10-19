# pro 프론트엔드 교차검수

- 검토일: 2026-10-19
- 판정: **수정 후 재검토 필요 — HIGH 2건 / MED 4건 / LOW 1건**
- 기준: Platform Development Standard, `docs/02-design/features/pro.design.md`, 검토 시점 working tree의 `git status --short`, `git diff`, 미추적 신규 파일.
- 코드 수정 없음. 이 리뷰 문서만 추가했다. 아래 파일:라인은 working tree 기준이다.

## 범위

직접 검토한 변경 파일은 다음과 같다.

- `app/(personal-home)/renewal/pricing/hooks/useBusinessWizard.ts`
- `app/(personal-home)/signup/business/BusinessWizardContext.tsx`
- `app/(personal-home)/signup/business/BusinessWizardShell.tsx`
- `app/(personal-home)/signup/business/steps/Step3PlanSelect.tsx`
- `app/(personal-home)/signup/business/steps/Step4Payment.tsx`
- `app/(personal-home)/signup/complete/components/BusinessInfoForm.tsx`
- `app/(personal-home)/signup/complete/page.tsx`
- `app/(personal-home)/signup/hooks/useOnboardingStatus.ts` — 미추적 신규 파일
- `app/(personal-home)/signup/planIntent.ts` — 미추적 신규 파일

최상위 `components/`, `hooks/`에는 미커밋 변경이 없었다. 공용 UI, 기존 단계 페이지, `Step1Account`, `Step2Verify`, 가입 진입, 회원 결제·현황 훅/API 클라이언트, `setup-role`, 신규 온보딩 API/서버 판정, 가격 상수·타입, 인증 JWT 동기화 코드는 연관 회귀와 계약 확인을 위해 읽었다. 백엔드 전체 보안 검수는 범위 밖이다. staged 변경은 없었다.

## 지적 사항

### 1. [심각도 HIGH] 최초 온보딩 조회 실패가 무한 로딩으로 숨겨진다

- **파일:라인:** `app/(personal-home)/signup/hooks/useOnboardingStatus.ts:90`
- **관련 위치:** 같은 파일 `:112`, `:114`, `:116`; `app/(personal-home)/signup/business/BusinessWizardShell.tsx:70`.
- **문제:** 최초 요청 또는 계정 전환 후 요청이 네트워크 오류·429·503 등으로 실패하면 `error`만 기록하고 `owner`는 갱신하지 않는다. 따라서 `owner !== userId`가 계속 참이고, 노출되는 값은 `error=null`, `loading=true`다. 셸의 오류/재시도 분기에 도달하지 못해 가입 전 단계가 로딩에 갇힌다. 401은 별도 분기에서 owner를 갱신하므로 이 문제는 비401 실패에 해당한다.
- **재현/근거:** 실제 훅 소스를 TypeScript로 변환해 React 훅·세션·fetch를 격리 모킹하고 첫 GET에 503을 반환했다. 비동기 완료 후 반환값은 `{"state":null,"loading":true,"error":null}`이었다. 브라우저 통합 테스트는 아니다.
- **수정 제안:** 실패 결과에도 요청 소유자를 기록하거나, 데이터 소유자와 오류/요청 소유자를 분리한다. 실패 요청이 종료되면 현재 계정의 오류와 재시도를 노출하되 이전 계정 데이터는 계속 가린다. 최초 네트워크 실패·429·503·계정 전환 직후 실패를 검증한다.
- **우선순위/계약:** **P0**, 설계 §5.1·§7.2의 조회 실패 시 재시도, 예외 후 복구 가능성.

### 2. [심각도 HIGH] 결제 후 온보딩 갱신이 결제 컴포넌트를 제거해 완료 상태를 잃는다

- **파일:라인:** `app/(personal-home)/signup/business/steps/Step4Payment.tsx:38`
- **관련 위치:** `app/(personal-home)/signup/hooks/useOnboardingStatus.ts:97`; `app/(personal-home)/signup/business/BusinessWizardContext.tsx:50`; `app/(personal-home)/signup/business/BusinessWizardShell.tsx:94`; 기존 `useMemberOrderFlow.ts:140`.
- **문제:** 주문 GET이 `paid && applied`를 확인하면 결제 훅은 pending orderId를 지우고 `phase="done"`으로 바꾼 뒤 `onApplied`를 호출한다. 새 콜백의 `onboarding.refresh()`는 즉시 `loading=true`를 만들고, 컨텍스트 `ready=false` → 셸이 자식을 `<Loading />`으로 교체한다. 이때 `Step4Payment`와 그 결제 훅 인스턴스가 언마운트된다. 조회 성공 후 다시 마운트된 결제 훅은 `idle`이고 복구할 pending orderId도 없다. 따라서 완료 UI 대신 기존 URL의 주문 요약/결제 버튼으로 돌아갈 수 있다. 조회가 실패하면 결제 성공 이후 오류 화면에 머무르며 같은 완료 상태를 잃는다. 서버 멱등성 때문에 이 현상만으로 이중 과금을 단정하지는 않는다.
- **수정 제안:** 초기 조회와 백그라운드 갱신을 구분해, 같은 계정의 유효한 기존 상태가 있으면 재조회 중에도 결제 컴포넌트를 유지한다. 또는 주문 결과 상태를 셸보다 상위에 보존한다. 권한·계정 변경 시 차단은 유지하고, 적용 완료 주문을 다시 결제 UI로 되돌리지 않도록 한다. 느린 온보딩 응답/실패 응답 모두에서 결제 완료 상태 유지와 새 주문 미생성을 검증한다.
- **우선순위/계약:** **P0**, 설계 §4.1·§7.1·§7.3의 결제 완료 후 서버 확인 및 복구 흐름.

### 3. [심각도 MED] 회원 현황 실패·미확정 상태가 구매 및 무료 완료 가드에서 빠졌다

- **파일:라인:** `app/(personal-home)/signup/business/BusinessWizardContext.tsx:50`
- **관련 위치:** `app/(personal-home)/signup/business/BusinessWizardShell.tsx:43`; `app/(personal-home)/signup/business/steps/Step3PlanSelect.tsx:37`; `app/(personal-home)/signup/business/steps/Step4Payment.tsx:33`.
- **문제:** `ready`는 온보딩 상태만 확인하고 `sub.loading/error/reauthRequired`를 무시한다. 온보딩 GET은 성공하고 회원 `/status`가 지연·실패·401이면 3단계가 그대로 열려 무료 완료와 결제 진입이 가능하다. 4단계는 역할을 `sub.status?.role`에서 가져오므로, 현황이 없으면 가격 훅이 PERSONAL로 대체한다. BUSINESS의 정상 PREMIUM URL도 개인용 구매 불가 사유로 비활성화되고 현황 재조회 버튼이 없어 해당 화면에서 복구할 수 없다. 서버 주문 권한 우회가 아니라 조회 장애 시 잘못된 UI와 복구 누락이다.
- **수정 제안:** 필요한 회원 현황의 초기 로딩·오류·401을 명시적으로 처리하고 재시도를 제공한다. 구매 역할은 서버 온보딩과 현황 중 일관된 권위 입력을 쓰며, 미확정 값을 PERSONAL로 대체해 결제 화면을 확정하지 않는다. 2번의 해결과 함께 백그라운드 갱신은 자식 제거 없이 처리한다.
- **우선순위/계약:** **P1**, 설계 §7.2의 역할 미확정·현황 조회 실패 중 구매/무료 완료 금지.

### 4. [심각도 MED] 서버 complete 재진입이 홈으로 연결되지 않는다

- **파일:라인:** `app/(personal-home)/renewal/pricing/hooks/useBusinessWizard.ts:123`
- **관련 위치:** `app/(personal-home)/signup/business/BusinessWizardShell.tsx:49`.
- **문제:** 서버가 `complete=true`를 반환한 PERSONAL/RENTAL_BIZ FREE 계정도 클라이언트는 `completed=false`, `actionStep=3`으로 바꾼다. 활성 유료 계정은 `completed=true`지만 셸은 이 값을 사용하지 않고 현재 단계가 상한을 넘는지만 검사한다. 따라서 가입 완료 계정이 이전 위저드 URL로 재진입해도 플랜/결제 화면에 남는다. 실제 소스의 격리 실행에서도 PERSONAL FREE complete 입력은 `actionStep=3`, `completed=false`였다. 최초 역할 설정 직후 선택적 업셀을 보여주는 요구와, 완료 후 재진입 복원을 구분하지 않은 상태다.
- **수정 제안:** 서버 완료 여부와 선택적 구매 진행 여부를 별도 상태로 관리한다. 최초 가입 직후의 플랜 선택은 명시적인 UI 흐름으로 열고, 일반 재진입에서는 서버 `complete`를 `/home`에 매핑한다. 미해결 주문 복구 중에는 복구를 먼저 끝내며, FREE 사용자의 앱 접근을 결제로 막지 않는다.
- **우선순위/계약:** **P1**, 설계 §7.1의 서버와 동일한 완료 조건, §7.3의 `complete → /home` 매핑.

### 5. [심각도 MED] 플랜 복구 힌트에 계정 소유권과 전환 시 정리 연결이 없다

- **파일:라인:** `app/(personal-home)/signup/planIntent.ts:42`
- **관련 위치:** 같은 파일 `:58`; `app/(personal-home)/signup/business/steps/Step3PlanSelect.tsx:57`.
- **문제:** `intendedPlan`은 탭 공통 sessionStorage 키에 플랜/기간만 저장한다. `clearPlanIntent` 호출은 무료 시작과 위저드 결제 done에만 있고 로그아웃·userId 변경과 연결되어 있지 않다. A가 PRO 24개월을 고른 뒤 결제하지 않고 로그아웃하고, 같은 탭에서 B가 로그인하면 역할이 같은 경우 A의 기간/플랜이 B에게 자동 선택된다. 모바일 결제 복귀는 `/renewal/pricing`의 기존 훅에서 처리되어 신규 `Step4Payment`의 done 정리도 거치지 않는다. 금액은 재계산되고 명시적 결제 버튼이 있어 권한 탈취는 아니지만 다른 계정의 구매 선택이 섞인다.
- **수정 제안:** 비민감 사용자 식별자로 힌트를 귀속시켜 소유자 불일치 시 폐기하고, 로그아웃/계정 전환 및 모바일 복구 완료 시 정리하는 연결 계층을 추가한다. 서버 role 불일치나 잘못된 형식으로 폐기한 값도 제거한다. 기존 결제 훅/저장소 계약은 보존한다.
- **우선순위/계약:** **P1**, 설계 §6의 정상 소비·완료·계정 전환 시 정리.

### 6. [심각도 MED] 사업자 신청 200 경로가 오래된 세션 기반 인증 화면으로 이어진다

- **파일:라인:** `app/(personal-home)/signup/complete/page.tsx:64`
- **관련 위치:** 같은 파일 `:67`; 기존 `app/(personal-home)/signup/business/steps/Step2Verify.tsx:25`; `lib/auth.ts:146`.
- **문제:** 이미 사업자 정보가 있는 계정의 `setup-role`은 200과 함께 DB에 `requestedRole/pending`을 기록한다. 변경된 성공 경로는 세션 갱신 없이 3단계로 보낸다. 새 셸은 최신 온보딩 GET의 `verify`를 읽고 2단계로 돌려보내지만, 2단계 화면은 여전히 `session.user.verifyStatus`만 읽는다. JWT의 DB 동기화는 60초 간격이므로 직전 세션이 `none`이면 실제 pending인데 재신청 화면이 나오고, 직전 세션이 `verified`이면 실제 pending인데 승인 완료/다음 버튼이 나온다. 다음 버튼을 눌러도 셸이 다시 2단계로 돌린다. 신규 셸의 권위 입력과 기존 단계의 표시 입력이 서로 다르다.
- **수정 제안:** 2단계도 컨텍스트의 서버 온보딩 `verifyStatus`를 사용하도록 연결하고, 신청 접수 성공 시 서버 상태에 따라 인증 단계로 이동한다. `update()`만으로 즉시 해결된다고 가정하지 말고 JWT의 60초 캐시 정책을 고려한다. 사업자 정보가 이미 있는 계정의 200 경로와 신규 폼 제출 경로를 각각 검증한다.
- **우선순위/계약:** **P1**, 설계 §5.2의 신청 접수와 verified 구분, §7.3의 서버 상태 기준 재진입.

### 7. [심각도 LOW] 플랜 선택 상태가 보조기술에 전달되지 않는다

- **파일:라인:** `app/(personal-home)/signup/business/steps/Step3PlanSelect.tsx:130`
- **문제:** PRO/PREMIUM 버튼은 선택 상태를 색/테두리로만 표시하고 `aria-pressed`나 라디오 그룹 의미를 제공하지 않는다. 임대사업자가 두 플랜 사이를 이동할 때 스크린리더 사용자는 현재 선택을 알 수 없다. 같은 화면의 기존 `PlanDurationPicker`는 `aria-pressed`를 제공한다.
- **수정 제안:** 버튼에 `aria-pressed={on}`을 제공하거나 이름 있는 라디오 그룹으로 구현한다. 키보드 선택 후 선택 상태가 접근성 트리에서 갱신되는지 확인한다.
- **우선순위/계약:** **P2**, 접근성·권한별 화면 검증.

## API 계약·구조·성능 확인

- 신규 GET 경로·메서드·same-origin credentials·no-store 설정과 `OnboardingState` 직접 응답 소비는 설계 §5.1 및 실제 라우트와 일치한다.
- `setup-role`의 POST body와 422 폼 표시, 실패 재시도는 계약에 맞는다. 200을 사업자 승인으로 간주해 주문하는 서버 권한 우회는 확인하지 않았다. 인증 화면 표시 불일치는 6번이다.
- 무료 시작은 주문/구독 생성 API를 호출하지 않는다. 허용 플랜·무료 CTA는 서버 온보딩 응답으로 필터링하고, 가입 3단계에서 trial API/체험 완료 CTA는 제거됐다.
- 회원 주문·콜백·복구 훅과 API 클라이언트, 기존 결제 DTO는 변경되지 않았다. 결제 단계는 기존 `purchase(product, { purpose: "initial" })`를 사용한다.
- 각 위저드 진입에서 컨텍스트가 `/status`와 `/onboarding-status`를 각각 조회한다. 단계 컴포넌트의 중복 현황 fetch나 렌더마다 반복되는 fetch는 확인하지 않았다. 결제 후 두 상태 재조회 자체는 목적이 있으나 자식 수명 관리가 잘못됐다(2번).
- 단계별 페이지가 각자 Provider를 생성하므로 라우트 이동 시 상태 두 종류를 다시 조회한다. 공통 layout으로 이동할 여지는 있으나 역할/승인 최신성을 위한 재조회와 구분해야 한다. 실측 병목이나 무한 중복 호출로 단정하지 않는다.
- 검토한 프론트 파일은 모두 500줄 이하(최대 253줄), 변경된 완료 페이지는 207줄이다. 셸·컨텍스트·단계 UI·상태 훅은 분리되어 있다. 다만 완료 페이지가 역할 설정 API/흐름 로직까지 소유하며, §6에서 지정한 `lib/signup-intent.ts` 확장 대신 라우트 하위 별도 저장 모듈을 추가했다. 후자는 위반 사실을 기록하되 5번의 실제 동작 문제와 별개 중복 지적으로 세지 않았다.

## 검증 결과 — 누락·위험·우선순위

| 구분 | 결과 | 우선순위 |
| --- | --- | --- |
| 위험 | 첫 조회 장애 시 복구 UI 차단, 결제 적용 후 완료 상태 소실 | P0: 1·2번 |
| 위험 | 현황 실패 가드, 완료 재진입, 계정별 힌트, 사업자 인증 화면 불일치 | P1: 3~6번 |
| 누락 | 플랜 버튼의 접근 가능한 선택 상태 | P2: 7번 |
| 누락 | `markSignupIntent`의 플랜 인자 확장, 단계 전체에 대한 일관된 stage 매핑이 구현 계획과 다름. `pay`는 선택 단계로 매핑하며 `role`의 실제 역할 설정 화면 연결도 보완 필요 | 설계 §6·§7.3과 구현 의도 합의 후 검증 |
| 누락 | 모바일 복귀 경로는 기존 `/renewal/pricing`을 유지하지만, 그 화면에는 온보딩 재조회/가입 연결과 신규 플랜 힌트 정리가 없음 | §7.3 가입 연결 계층 검증 필요; 기존 결제 복구 자체는 유지 |
| 검증 한계 | 실제 DB 저장·승인·실결제·브라우저 접근성 트리·권한별 E2E는 수행하지 않음 | 릴리스 전 별도 검증 |

실행한 검사:

- 변경·신규 프론트 9개 파일 대상 `npx eslint …`: 통과.
- `npx tsc --noEmit --incremental false`: 통과.
- `npx vitest run --config lib/member-subscription/vitest.config.ts`: **15개 파일 통과 / 1개 스킵, 191개 테스트 통과 / 9개 스킵**. 회원 정책·라우트 회귀 검사이며 프론트 렌더/E2E 통과를 의미하지 않는다.
- `git diff --check`: 통과.
- 실제 훅 소스의 격리 모킹 실행으로 최초 GET 503 무한 로딩 및 FREE complete의 클라이언트 완료값 불일치 확인. 테스트 파일을 추가하거나 코드를 수정하지 않았다.
- 전체 `npm run build`, 전체 저장소 lint/test, t-vestra 무출금 검증은 미수행. 빌드·운영·실결제 검증까지 완료했다고 주장하지 않는다.

재검수 완료 기준은 1~6번 재현 경로가 복구되고, 개인/임대 FREE·유료 선택, 사업자 pending/rejected/verified, PREMIUM active/trialing/grace, 현황 401/429/503, 계정 전환, 결제 적용 후 느린 GET, 모바일 복귀를 구분해 확인하는 것이다. 저장·수정·승인은 실제 테스트 데이터에서 확인하고 결제 복구·회원/비회원 보호 경계의 회귀를 함께 검증해야 한다.
