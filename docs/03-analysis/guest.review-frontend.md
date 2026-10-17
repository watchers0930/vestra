# 회원 선불 구독 프론트엔드 교차검수

- 검토일: 2026-10-16
- 기준: `docs/02-design/features/guest.design.md`, 플랫폼 개발 표준 인덱스·요약·Claude 프롬프트.
- 범위: `git status --short`, `git diff`, `git diff --cached`로 확인한 미커밋 프론트엔드 32개 파일(기존 수정 2개, 미추적 신규 30개). `app/api`·`lib/member-subscription`·공용 타입·기존 가입/가격/프로필 코드는 호출 계약과 회귀 확인을 위해 읽기만 했다. 루트 `hooks/`에는 이번 변경이 없다. staged 변경은 없다.
- 방법: 정적 코드 및 정상·실패·빈 상태 경로 추적. 코드 수정, DB 접근, 결제 실행, 배포는 하지 않았다. 아래 재현 조건은 코드 경로에 근거하며 브라우저 실행 결과는 아니다.
- 판정: **수정 후 재검수 필요 — HIGH 3건, MED 9건, LOW 2건.**

## 지적 사항

### 1. [심각도 HIGH] 사업자 결제 단계가 가드에 의해 항상 차단됨

- **파일:라인:** `app/(personal-home)/renewal/pricing/hooks/useBusinessWizard.ts:60`, `app/(personal-home)/signup/business/BusinessWizardShell.tsx:35`
- **문제:** 인증 완료·유료 구독 미보유 사용자는 `serverStep=3`이다. 3단계에서 상품을 선택해 `step-4`로 이동해도 셸이 `4 > 3`으로 판단해 즉시 3단계로 돌려보낸다. `serverStep=4`는 이미 active/trialing인 사용자에게만 부여되어 최초 선불 결제를 완료할 수 없다. 또한 세션 로딩 중에도 미로그인으로 계산해 직접 접속/새로고침 시 2~4단계를 1단계로 돌려보낸다. 자식도 가드 완료 전에 렌더된다.
- **수정 제안:** 인증·구독 조회의 로딩/오류 상태를 명시하고 확정 전에는 리다이렉트와 자식의 결제 실행을 보류한다. 현재 해야 할 단계와 진입 가능한 최대 단계를 분리하고, 인증 완료 및 유효한 상품 선택 시 결제 단계 진입을 허용한다. 미구독 인증 사업자의 `3 → 4 → 결제`, 각 단계 새로고침을 검증한다. 설계 §4.8·§5.2 위반.

### 2. [심각도 HIGH] 결제 응답 유실 후 재시도가 조회만 반복하여 실제 복구를 실행하지 않음

- **파일:라인:** `app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow.ts:175`, `app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow.ts:286`
- **문제:** 콜백 POST의 503/네트워크 오류 또는 SDK 응답 유실은 `checkOrder`로 이동한다. 이후 `retry()`도 GET만 수행한다. GET은 저장된 주문을 읽을 뿐 공급자 재조회나 paid 미적용 주문의 활성화를 수행하지 않는다. `recoverOrder`는 모바일 최초 복귀와 `sendCallback`의 문맥 부재 분기에만 있고 일반 재시도에서 호출되지 않는다. PG 승인 후 콜백이 서버에 도달하지 않은 pending 주문, paid이나 미적용인 주문은 사용자가 재시도해도 복구되지 않는다. cron의 별도 처리를 기다리는 것이 유일한 진행 수단이 된다.
- **수정 제안:** 승인 불명확 재시도는 같은 `orderId`의 POST `/recover`로 공급자 재검증·적용을 요청하고 GET의 `paid && applied`로 완료를 확인한다. blocked/conflict는 자동 복구 대상에서 제외한다. 새 주문이나 새 결제창을 만들지 않는다. 설계 §3.4·§4.9의 복구 계약을 연결한다.

### 3. [심각도 HIGH] 401 뒤 재로그인 시 기존 주문 문맥을 잃음

- **파일:라인:** `app/(personal-home)/renewal/pricing/MemberSubscribeClient.tsx:33`, `app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow.ts:98`, `app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow.ts:302`
- **문제:** 401에서 `/home?auth=login`으로 이동하므로 훅이 언마운트되며 `activeRef`의 주문 ID·멱등키·요청이 사라진다. 돌아올 경로나 주문 재개 정보도 전달하지 않는다. 모바일 복귀는 쿼리를 즉시 제거한 뒤 세션 복구를 기다리지 않고 POST `/recover`를 실행한다. 이때 401이면 쿼리와 훅 상태가 모두 사라진다. 모듈의 `callbackMemory`에는 주문을 자동으로 재발견하는 경로도 없다. 설계의 “401 → 재로그인 후 기존 주문 재개”를 충족하지 않는다.
- **수정 제안:** 세션 복구가 끝난 뒤 본인 주문 복구를 실행한다. 로그인 복귀 경로와 안전한 내부 주문 식별자/요청 멱등성 문맥을 보존하거나, 서버에서 본인의 미완료 주문을 조회해 재개하도록 계약을 보완한다. 서명·nonce·imp_uid를 URL/웹 저장소에 보관하는 방식은 사용하지 않는다. 세션 만료 직전 승인 및 모바일 복귀 401을 검증한다. 설계 §4.9·§5.2 위반.

### 4. [심각도 MED] 주문 생성 실패 후 ‘다시 시도’가 아무 요청도 하지 않음

- **파일:라인:** `app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow.ts:261`, `app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow.ts:287`
- **문제:** 최초 POST `/orders`가 네트워크/429/503으로 실패하면 `retry_same`이지만 `active.orderId`는 빈 문자열이다. 재시도는 메시지만 지우고 `if (active.orderId)`를 건너뛰어 종료한다. phase는 failed에 남고 오류 안내도 사라진다. 사용자가 결제 버튼을 다시 누르면 `purchase()`가 새 UUID를 생성하므로 동일 멱등키 재전송 계약도 지켜지지 않는다.
- **수정 제안:** 주문 ID를 아직 받지 못한 `retry_same`은 저장한 동일 요청·멱등키로 주문 생성을 재전송한다. 주문 ID가 있는 실패는 기존 주문 복구로 분리하고 재시도 전체에 동시 실행 가드를 둔다. 설계 §3.1·§4.9 기준으로 응답 유실·429·503을 각각 검증한다.

### 5. [심각도 MED] 모바일 복귀 시 결제 진행·오류·완료 UI가 숨겨짐

- **파일:라인:** `app/(personal-home)/renewal/pricing/MemberSubscribeClient.tsx:36`, `app/(personal-home)/renewal/pricing/MemberSubscribeClient.tsx:125`
- **문제:** 결제 실행 정보의 복귀 경로는 `/renewal/pricing`이다. 모바일 리다이렉트 후 새 페이지의 `selectedPlan`은 null인데, `PaymentStateNotice`는 `selectedPlan`이 있을 때만 렌더된다. 훅이 recover를 실행해도 checking/failed/done 모두 보이지 않으며, 실패 시 복구 버튼도 없다. active 구독 카드가 갱신되더라도 결제 복귀 결과를 명시적으로 안내하지 못한다.
- **수정 제안:** 결제 상태 안내를 상품 선택 조건 밖에 렌더하고 복귀 주문의 상태를 독립적으로 표시한다. 상품을 선택하지 않은 초기 진입에서도 모바일 복구 성공·pending·503·404 결과와 재시도 동작을 확인한다. 설계 §4.9·§5.1 위반.

### 6. [심각도 MED] 실패·취소·환불 주문도 모두 ‘결제 결과 확인 중’으로 표시

- **파일:라인:** `app/(personal-home)/renewal/pricing/hooks/useMemberOrderFlow.ts:125`
- **문제:** GET 성공 응답이 `paid && applied`가 아니면 상태와 무관하게 `recheck`로 처리한다. 서버 DTO에 있는 failed/canceled/refunded까지 승인 대기로 표시하고 재시도를 계속 허용한다. 확정 취소와 승인 불명확을 구분하지 않으며 확정 실패 시 콜백 메모리도 정리하지 않는다.
- **수정 제안:** `OrderStatus`를 빠짐없이 분기한다. pending·paid 미적용은 복구, needs_review는 검토 대기, failed/canceled/refunded는 해당 확정 상태 안내와 메모리 정리로 처리한다. 재결제는 기존 거래 종료 확인 후 명시적인 새 구매로 분리한다. 설계 §2.3·§4.9 및 플랫폼의 예외 흐름 구분 기준에 해당한다.

### 7. [심각도 MED] status 실패·401 및 세션 변경을 처리하지 않아 잘못된 구매 화면/이전 사용자 현황이 남음

- **파일:라인:** `app/(personal-home)/renewal/pricing/hooks/useMemberSubscription.ts:47`, `app/(personal-home)/renewal/pricing/hooks/useMemberSubscription.ts:68`, `app/(personal-home)/renewal/pricing/MemberSubscribeClient.tsx:29`
- **문제:** GET `/status`의 401은 오류 없이 무시하고 `unauthenticated`는 NextAuth 상태에만 의존한다. NextAuth가 authenticated인 채 API가 401을 반환하면 로그인 유도 없이 빈 현황이 된다. 가격 화면은 loading/error를 아예 사용하지 않아 조회 실패에도 PERSONAL 기본 상품과 FREE 이용 안내를 제공한다. 로그아웃/재로그인 시 status/error를 초기화하지 않고 사용자 ID도 effect 의존성에 없어 이전 계정의 영수증·상품 적격성이 남거나 늦은 수동 refresh가 상태를 덮을 수 있다.
- **수정 제안:** 서버 401을 재인증 상태로 명시하고 조회 실패·재시도 UI를 제공한다. 미확정 역할에서는 구매를 보류한다. 사용자 ID/세션 세대별로 데이터·선택 상태를 초기화하고 이전 요청 응답을 폐기한다. 실패를 신규 구매 안내로 대체하지 않는다. 계정 전환, API 401, status 503, refresh 응답 순서 역전을 검증한다.

### 8. [심각도 MED] 1개월 유료체험 사용 여부를 상품 적격성에 반영하지 않음

- **파일:라인:** `app/(personal-home)/renewal/pricing/hooks/useMemberPricing.ts:76`, `app/(personal-home)/renewal/pricing/MemberSubscribeClient.tsx:30`
- **문제:** 가격 훅은 role만 받아 PERSONAL이면 paid_trial을 항상 활성화한다. GET `/status`가 `paidTrialEligible=false`를 반환해도 반영하지 않는다. 이미 유료체험을 사용한 사용자가 다시 선택·결제할 수 있는 것처럼 표시되며 서버 POST에서야 `trial_already_used`로 거부된다. 서버 권한 우회는 아니지만 화면 표시 계약 불일치다.
- **수정 제안:** 서버의 `paidTrialEligible`을 가격 표시 모델에 반영해 해당 상품을 제외하거나 사유와 함께 비활성화한다. 기존 선택 상품도 status 변경에 맞춰 재검증한다. 설계 §2.3·§4.8 기준으로 최초 적격/기사용 계정을 비교한다.

### 9. [심각도 MED] 무료체험 실패 결과가 버려져 사용자가 원인과 재시도를 알 수 없음

- **파일:라인:** `app/(personal-home)/renewal/pricing/MemberSubscribeClient.tsx:105`, `app/(personal-home)/signup/business/steps/Step3PlanSelect.tsx:48`
- **문제:** `beginTrial()`은 `{ok:false,message}`를 반환하지만 가격 화면은 반환값을 버리고 사업자 화면은 성공 여부만 검사한다. 401/403/409/503·네트워크 실패가 모두 아무 변화 없이 끝나며 로그인 유도나 오류 안내가 없다. 저장 실패를 사용자에게 드러내야 한다는 플랫폼 검증 기준을 충족하지 않는다.
- **수정 제안:** 체험 전용 결과 상태와 오류 안내를 두고, 401 재인증·409 현황 갱신·일시 장애 명시 재시도를 구분한다. 버튼 중복 실행 방지도 요청 단위로 유지한다. 체험 성공과 실패 모두 화면에서 확인할 수 있게 한다.

### 10. [심각도 MED] 사업자 단계 복원이 신청 상태와 연결되지 않고 기존 가입 흐름에서 이탈함

- **파일:라인:** `app/(personal-home)/signup/business/steps/Step2Verify.tsx:83`, `app/(personal-home)/renewal/pricing/hooks/useBusinessWizard.ts:51`, `app/(personal-home)/signup/business/steps/Step4Payment.tsx:77`
- **문제:** 새 위저드는 JWT `verifyStatus`와 구독 유무만 사용하고 설계 §5.2의 `MemberRoleApplication` ID/status를 조회·복원하지 않는다. 결제도 `roleApplicationId`를 전달하지 않는다. 인증 폼 링크는 기존 `/signup/complete`로 보내며 그 폼은 제출 성공 시 `/dashboard`로 이동한다(`BusinessInfoForm.tsx:105`). 돌아올 위저드 단계나 신청 연결 문맥이 없어 실제 신청→인증 대기→승인 후 재개 흐름이 이어지지 않는다. 현재 `/status` DTO에도 신청 복원 정보가 없으므로 FE/BE 계약 보완이 필요하다.
- **수정 제안:** 서버가 본인 신청 ID/상태와 재개 단계를 제공할 접점을 먼저 명시하고 프론트가 이를 사용하게 한다. 기존 가입 폼/OAuth 복귀를 위저드에 연결하고 최초 사업자 주문에 서버가 확인한 신청 ID를 전달한다. 기존 계정 전환·반려 후 재신청·재로그인을 검증한다. URL만 권한 근거로 사용하지 않는다.

### 11. [심각도 MED] 셸과 단계 화면이 독립적으로 같은 status를 중복 조회함

- **파일:라인:** `app/(personal-home)/signup/business/BusinessWizardShell.tsx:30`, `app/(personal-home)/signup/business/steps/Step3PlanSelect.tsx:21`, `app/(personal-home)/signup/business/steps/Step4Payment.tsx:26`
- **문제:** step-3/4에는 셸과 자식에 각각 `useMemberSubscription()`이 있다. 각 훅이 별도 상태와 effect로 같은 GET `/status`를 호출해 한 화면 진입에서 2회 조회한다(Strict Mode 재실행은 별개). 서버 status는 권한/구독·감시 count·주문·체험 이력 DB 조회를 수행한다. 자식에서 체험/결제 후 refresh해도 셸의 데이터는 갱신되지 않아 가드와 화면이 다른 시점을 본다.
- **수정 제안:** 위저드 상위에서 한 번 조회한 상태와 refresh/beginTrial을 context 또는 props로 전달한다. 화면 전환 후 필요한 재검증 정책을 명시하고 동일 시점 요청을 공유한다. 이 경로 외에 반복 렌더 자체가 대형 계산이나 무한 fetch를 일으키는 증거는 확인하지 못했다.

### 12. [심각도 MED] 기존 `/pricing`과 마이페이지 카드가 새 회원 가격·상태 계약과 함께 노출됨

- **파일:라인:** `app/(personal-home)/profile/components/ProfileTierPanel.tsx:38`, `app/(personal-home)/profile/components/ProfileTierPanel.tsx:125`, `app/(app)/pricing/page.tsx:8`
- **문제:** 새 패널을 추가한 뒤 기존 구독 카드도 그대로 렌더해 동일 마이페이지에서 신규 PRO 월 기준 9,900원과 기존 PRO 29,900원/BUSINESS 99,000원을 함께 안내한다. 기존 상태 배지는 cancelled 이외를 모두 활성으로 표시하므로 신규 trialing/expired/locked와도 충돌한다. 설계 §1.2·§6에 명시된 `/pricing`은 미변경 상태로 기존 가격·월/연 결제 안내를 계속 제공하며 신규 기간 선택/체험/결제 흐름이 없다. `/pricing` 자체는 기존 결함이 아니라 이번 요구사항의 연동 누락으로 분류한다.
- **수정 제안:** 회원 화면의 가격·상태 표시는 신규 계약으로 통일하고 레거시 구독을 표시해야 한다면 대상과 의미를 명시적으로 분리한다. 기존 SSOT 파일 자체를 바꾸지 말라는 보호 원칙을 유지하며 `/pricing` 진입도 신규 조합 화면 또는 명시적 연결로 전환한다. 만료·잠금 사용자의 재구독 후보도 가격 화면에서 확인 가능하게 한다(현재 재구독 카드는 active/trialing에만 노출됨).

### 13. [심각도 LOW] 링크 안에 실제 button을 중첩해 키보드 탐색 의미가 충돌함

- **파일:라인:** `app/(personal-home)/signup/business/steps/Step1Account.tsx:29`, `app/(personal-home)/signup/business/steps/Step2Verify.tsx:83`, `app/(personal-home)/signup/business/steps/Step4Payment.tsx:58`, `app/(personal-home)/profile/components/MemberSubscriptionPanel.tsx:38`
- **문제:** Next `Link` 안에 공용 `Button`을 배치했다. `components/common/Button.tsx`는 실제 `<button>`을 반환하므로 `<a><button>…</button></a>` 형태의 인터랙티브 요소 중첩이다. 링크·버튼의 역할과 포커스가 겹쳐 보조기기/키보드 조작을 일관되게 해석하기 어렵다.
- **수정 제안:** 이동 CTA는 스타일을 적용한 단일 Link로 렌더하거나 링크 렌더링을 지원하는 버튼 API를 사용한다. Tab 포커스 한 번, Enter 활성화, 스크린리더 링크 역할을 확인한다.

### 14. [심각도 LOW] 결제 결과 알림과 현재 단계/선택 상태의 접근성 정보 누락

- **파일:라인:** `components/member-subscription/PaymentStateNotice.tsx:34`, `components/member-subscription/WizardProgress.tsx:36`, `app/(personal-home)/signup/business/steps/Step3PlanSelect.tsx:63`
- **문제:** 비동기 결제 진행/완료/오류가 일반 div로만 바뀌어 스크린리더에 상태 변경을 알리지 않는다. 진행바 현재 단계에는 `aria-current="step"`이 없고, 사업자 플랜 버튼의 선택 여부는 색으로만 표시된다. 기간 버튼은 `aria-pressed`가 있어 이 문제와 구별된다.
- **수정 제안:** 유지되는 live 영역에서 진행/완료는 `role="status"`, 오류는 적절한 alert로 알리고 재시도 후 포커스를 관리한다. 진행바에 현재 단계, 플랜 선택에 `aria-pressed` 또는 native radio 의미를 제공한다.

## 누락·위험·우선순위

| 구분 | 내용 | 우선순위 |
| --- | --- | --- |
| 위험 | 최초 사업자 결제 차단, 승인 불명확 주문 복구 미실행, 401 후 주문 재개 유실(1~3) | P0: 결제 인수 전 수정 |
| 누락 | 주문 생성 재시도, 모바일 결과 UI, terminal 상태, status/체험 실패 안내, 유료체험 적격성 반영(4~9) | P1 |
| 누락 | 서버 신청 기준 위저드 재개 및 기존 가격 화면 통합(10, 12) | P1 |
| 위험 | 중복 status fetch 및 셸/자식 상태 불일치(11) | P1 |
| 누락 | 링크·버튼 의미, 비동기 알림·단계·선택 접근성(13~14) | P2 |
| 검증 누락 | 신규 프론트 DOM 테스트 및 실제 PC/모바일 무출금 결제·재로그인 회귀 증빙 | P0: 출시 완료 판정 전 필요 |

## API·구조 및 검증 기록

- HTTP 래퍼의 orders POST, order GET, callback POST, recover POST, trial POST, status GET 경로·메서드·요청 필드는 설계 §3과 일치한다. same-origin credentials/no-store를 사용하고 주문 요청에 금액을 전달하지 않는다. 완료 판정도 `paid && applied`를 사용한다. 문제는 래퍼 정의보다 호출 시점·복구 연결·결과 표시에서 발생한다.
- 가격은 서버와 공유하는 순수 `pricing.ts`를 사용한다. 서버 전용 스키마나 비회원 도메인 서비스를 신규 프론트가 import하는 변경은 확인하지 못했다. 다만 서버 적격성의 일부를 화면에 반영하지 않는 문제는 7~8번에 기재했다.
- 변경 대상의 `page.tsx`는 10~16줄로 500줄 기준을 충족한다. 최대 파일은 `useMemberOrderFlow.ts` 338줄이며 설계의 훅 목표 ≤300줄은 초과한다. 복구·리다이렉트 책임을 분리할 여지가 있지만 파일 길이만으로 별도 기능 결함을 추가하지 않았다.
- **실행 통과:** 변경된 프론트 32개 `.ts/.tsx` 파일 대상 로컬 ESLint, 전체 `tsc --noEmit --incremental false`(모두 종료 코드 0).
- **미실행:** 전체 lint/test/build, DOM/접근성 도구, 브라우저 네트워크/렌더 프로파일링, 실제 데이터 저장/수정/삭제, PC/모바일 SDK 결제. 타입·린트 통과는 위 상태 전이의 정상 동작 증거가 아니다. 현재 기본 Vitest 설정은 node 환경의 `__tests__/**/*.test.ts`를 대상으로 하며 이번 프론트 변경에는 새 DOM 회귀 테스트가 없다.
- 후속 검증 완료 기준: 인증 전/대기/반려/인증 완료 사업자와 PERSONAL/ADMIN/LAWYER, 체험 적격/기사용 계정의 UI 차이 확인; 주문 생성 응답 유실·콜백 503·401·pending·failed/canceled/refunded·paid 미적용·모바일 복귀를 fixture로 재현; 동일 주문 복구와 결제/영수증 1회 적용 확인; `/pricing`·`/renewal/pricing`·마이페이지 가격/상태 일치 확인. 실제 무출금·격리 환경의 저장 결과 검증 전 결제 완료를 선언하지 않는다.
- 이 리뷰에서 생성한 파일은 본 문서뿐이며 기능 코드는 수정하지 않았다.
