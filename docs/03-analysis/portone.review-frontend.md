# PortOne 프론트엔드 교차검수

- 검토일: 2026-10-15
- 판정: **수정 필요 — HIGH 2건, MED 2건, LOW 1건.**
- 기준: 검토 시점 `git status --short`, 추적 파일 `git diff`, 미추적 신규 파일 원문, `docs/02-design/features/portone.design.md` 및 Platform Development Standard.
- 변경 프론트: `app/(personal-home)/renewal/monitoring/guest/{guestApi.ts,guestPayment.ts,portoneV1Loader.ts}`, 같은 라우트 `hooks/{useGuestApply.ts,useGuestOrderFlow.ts,useGuestStatus.ts,useGuestRenew.ts}`. 신규 미추적 2파일도 포함했다.
- 루트 `components/`, `hooks/`, 페이지 엔트리에는 미커밋 변경이 없다. 미변경 신청/현황 UI와 서버 주문·콜백·복구 코드는 호출 계약 및 연관 기능 확인용으로 읽었다.
- 기존 리뷰는 V2 구현 기준이어서 현재 V1 변경 기준으로 갱신했다. 아래 경로는 저장소 루트 기준, 라인은 현재 워킹트리 기준이다. 이번에 구현 코드는 수정하지 않았다.

## 지적 사항

### 1. [심각도 HIGH] app/(personal-home)/renewal/monitoring/hooks/useGuestOrderFlow.ts:235 — 콜백 일시 실패 후 거래 ID를 버려 승인 기록 복구 불가

**문제:** 인라인 결제 성공의 `outcome.callback`은 최초 POST에만 사용한다. 네트워크 오류·503·429·`payment_pending` 이후에는 `advanceOrder(orderId)`로 조회만 하고, 다음 재시도도 `useGuestApply.ts:349`에서 `advanceOrder(orderId, draftId)`를 호출할 뿐 `imp_uid`나 콜백 문맥을 전달하지 않는다. `resendOrderCallback`은 메모리 문맥을 받도록 구현되어 있지만 실제 호출부가 `callback`을 전달하는 곳은 없다. V1에서는 서명 재발급만으로 거래 ID가 생기지 않아 `guestPayment.ts:249`의 콜백 구성 조건을 통과하지 못한다. 연장도 `useGuestRenew.ts:171` → `finalizeRenew`에서 같은 정보를 잃는다.

현재 `GET /orders/[orderId]`는 DB 조회뿐이다. 신규 `recoverPendingPayment()`는 존재하지만 테스트 외 실제 호출자가 없으며 공개 호출 계약도 없다. 따라서 PG 승인 후 서버 기록 전 콜백이 유실되면 GET·POST orders·GET을 반복해도 pending에서 진행되지 않는다. 모바일 복귀도 최초 시도가 실패한 뒤 쿼리를 제거하고 `impUid`를 보존하지 않으면 동일 문제가 생긴다. 설계 §4.6의 메모리 보존·거래 ID 유실 복구와 §4.8의 동일 콜백 재전송 계약 미충족이다.

**수정 제안:** 주문별 ref에 `imp_uid` 포함 콜백 문맥을 메모리로 보존하고, pending 재시도에 `ResumeContext.callback`을 전달한다. 모바일에서 받은 ID도 성공 또는 확정 종료까지 메모리에 유지한다. 새로고침 등 ID까지 유실된 경우는 인증된 서버 복구 호출 계약을 설계에 명시하고 연결한다. 서명·거래 ID를 저장소에 기록하거나 SDK를 다시 실행하는 방식으로 해결하지 않는다.

**검증/우선순위:** **P0.** 현재 헬퍼를 TypeScript 변환 후 API를 대체한 격리 실행에서 `resendOrderCallback`에 ID/문맥 없이 pending을 전달하면 **GET 2회, POST orders 1회, callback 0회**였다. 이는 실제 PG 테스트가 아니다. 완료 기준은 최초 콜백 유실/503/승인 지연 및 모바일 복귀 후 재시도에서 동일 거래 콜백이 전송되고 적용 1회·SDK 추가 호출 0회를 확인하는 것이다.

### 2. [심각도 HIGH] app/(personal-home)/renewal/monitoring/hooks/useGuestRenew.ts:135 — 미확정 연장 주문에 대한 재클릭이 SDK를 다시 실행

**문제:** `startRenew()`는 저장된 주문·이전 결제 실행 여부를 확인하지 않고 항상 POST orders → `runPayment()`를 실행한다. 취소·오류·콜백 일시 실패 뒤 서버가 pending이면 `finalizeRenew():107`은 busy를 해제하고 `finally:193`은 잠금을 해제한다. UI의 연장 버튼(`components/guest/GuestCalendarPanel.tsx:90`)은 다시 활성화된다. 사용자가 누르면 같은 pending 주문의 실행 정보가 반환되어 결제창을 재실행한다. 영구 거부 뒤에도 동일 버튼이 같은 실행 경로로 들어간다. 주문 row 멱등성만으로 승인 불명확 상태에서의 결제창 재실행을 막지는 못한다. 설계 §4.7·§4.8의 상태 우선 확인 및 확정 실패 이후 새 결제 정책과 불일치한다. 이 동작은 기존 연장 구현에도 있었으며 이번 신규 훅으로 이동한 코드에 그대로 남아 있다.

**수정 제안:** 연장에도 `retry_payment`(SDK 호출 전 실패), 승인 확인/콜백 재전송, 영구 거부, 서버 확정 실패를 구분한 상태를 둔다. 기존 주문의 승인 여부가 불명확하면 상태 확인·보존 문맥 재전송만 수행한다. SDK 재실행은 호출 전 실패가 확인된 동일 주문에서만 허용하고, 새 주문 결제는 서버 확정 실패 후 명시 동작으로 제한한다.

**검증/우선순위:** **P0.** `useCallback`만 대체하고 현재 훅 함수를 실행한 모의 검증에서 SDK canceled → 서버 pending → 연장 재클릭 시 **SDK 호출 2회**였다. 실제 중복 출금 발생을 확인한 것은 아니다. 완료 기준은 pending·503·영구 거부 후 재클릭에서 SDK 추가 호출 0회, SDK 로드 실패 뒤 명시 재시도에서는 같은 주문으로 1회 실행되는 것이다.

### 3. [심각도 MED] app/(personal-home)/renewal/monitoring/guest/guestPayment.ts:88 — SDK 로딩 중 화면을 떠나도 결제창 실행을 취소하지 못함

**문제:** 새 CDN 로더는 최대 10초 동안 비동기로 대기한다. 이 사이 사용자가 Next 라우트를 이동하거나 흐름을 초기화해도 로드 완료 직후 `IMP.init` → `request_pay(:108)`가 실행된다. 신청 훅의 세대 검사는 `runPayment()` 반환 후(`useGuestOrderFlow.ts:220`)에만 있어 창을 여는 부작용을 막기에는 늦다. 신규 연장 훅에는 언마운트/요청 세대 검사도 없다. 현재 페이지와 무관한 결제창이 나중에 열릴 수 있다.

**수정 제안:** 실행별 취소 신호나 유효성 검사 함수를 `runPayment`에 전달하고 로더 await 이후, `request_pay` 직전에 확인한다. 훅 언마운트·reset·세션 변경 시 해당 실행을 무효화한다. 공유 SDK script 로드와 개별 결제 실행 취소의 수명은 분리한다.

**검증/우선순위:** **P1.** 정적 await 경로 확인. CDN 응답을 지연시켜 신청/연장 화면 이탈 및 reset 후 로드를 완료했을 때 SDK 실행 0회인지 검증해야 한다. 실제 DOM/라우팅 재현은 미실행이다.

### 4. [심각도 MED] app/(personal-home)/renewal/monitoring/hooks/useGuestRenew.ts:223 — 모바일 복귀의 영구 거부·세션 만료를 사용자에게 알리지 않음

**문제:** `reconcilePendingOrders()`는 `resendOrderCallback()`의 `reauth`와 모든 `api_error`를 `continue`로 버린다. 직접 연장에서는 400/403/404/409를 분류해 표시하지만, 복귀 경로에서는 동일 거부를 받아도 오류·재인증 안내가 없다. 복귀 쿼리는 이미 제거되어 사용자는 결제 결과가 반영되지 않은 이유를 확인할 수 없다. 초기 목록 조회 성공 후 콜백 단계에서 세션이 만료되는 경우에도 인증 화면으로 전환하지 않는다. 설계 §4.8은 모바일 복귀에도 같은 오류 분류와 영구 거부 보존을 요구한다.

**수정 제안:** `reauth`는 기존 주문·멱등키를 보존하면서 재인증으로 전환하고, `api_error`는 분류한 오류를 화면에 유지한다. 대상별 복구 결과를 반환하거나 수집해 복수 주문 중 한 주문의 성공 안내가 다른 주문의 거부를 가리지 않게 한다. 현재 `handleSessionExpired()`가 `applyResume.clear()`를 호출하므로 재인증 연결 시 참조 보존 정책도 함께 조정한다.

**검증/우선순위:** **P1.** 정적 분기 확인. 모바일 복귀 callback 400/403/404/409에서 오류가 보존되고 pending 안내로 대체되지 않아야 한다. 401이면 재인증 안내와 기존 주문 참조 보존을 확인한다.

### 5. [심각도 LOW] app/(personal-home)/renewal/monitoring/guest/guestPayment.ts:125 — merchant_uid 누락을 성공 확인 신호로 허용

**문제:** `res.merchant_uid && res.merchant_uid !== paymentId` 조건은 `merchant_uid`가 없거나 빈 문자열이면 통과시킨다. 설계 §5.1은 `success===true`일 때 `imp_uid` 필수와 함께 `merchant_uid===paymentId`를 요구한다. 현재는 잘못된 SDK 응답도 confirm으로 바꿔 서버 콜백을 호출한다. 서버 REST 검증은 별도로 유지되므로 이것만으로 승인 위조가 가능하다는 뜻은 아니다.

**수정 제안:** `res.merchant_uid !== paymentId`이면 error로 처리하여 누락·공백·불일치를 모두 거부한다. 주문 확정은 계속 서버 조회만 근거로 한다.

**검증/우선순위:** **P2.** 격리 실행에서 `{success:true, imp_uid:...}`만 반환해도 현재 결과가 **confirm**임을 확인했다. 누락·빈 값·타 주문 ID는 error, 정확히 일치할 때만 confirm이 되는지 확인한다.

## 계약·구조·접근성·성능 확인

| 관점 | 현재 확인 결과 |
| --- | --- |
| API DTO | callback POST의 `paymentId`, `imp_uid`, `callbackContext`, `callbackSignature` 4필드는 설계 §2.4.1·§3.3 및 서버 스키마와 일치. same-origin 쿠키, no-store, 주문 ID URL 인코딩 유지. |
| 완료·권한 | 완료는 서버 `paid && applied`를 근거로 한다. callback 라우트는 apply/status/renewal 세션과 Origin을 검사한다. 실제 타인 주문·쿠키·브라우저 권한 검증은 미실행. |
| SDK 실패 | 로더는 단일 Promise 공유, 실패 script·이벤트·타이머 정리, rejected 캐시 초기화를 구현했다. SDK 호출 전 실패는 unavailable이며 신청/연장 모두 오류를 표시한다. 실제 CDN 재로드는 미검증. |
| 구조 | 페이지 변경 없음. UI·HTTP·SDK·script 로더·상태 훅 분리는 적절하다. useGuestApply 413줄, useGuestOrderFlow 270줄, useGuestStatus 319줄, useGuestRenew 246줄. 500줄 초과 없음. 설계의 400줄 초과 보고 트리거는 useGuestApply 413줄에 해당하며 추가 분리 검토가 필요하다. |
| 접근성 | 변경 JSX는 없다. 연장 에러는 기존 GuestCalendarPanel의 role=alert 영역으로 연결된다. 신청 결제 진행/복구/실패 영역과 현황 notice에는 live region·명시적 포커스 이동이 없어 상태 변경 알림은 회귀 확인 대상으로 남는다. 기존 UI 사항이며 신규 결함 건수에 포함하지 않았다. SDK 모달 키보드·포커스 복귀/스크린리더 검증은 미실행. |
| 렌더·요청 성능 | 새 렌더 계산이나 매 렌더 fetch/무한 effect는 확인하지 못했다. 로더 single-flight는 중복 script를 줄인다. 거래 ID 없는 복구의 불필요한 GET→POST orders→GET은 1번, 결제창 재실행은 2번에 기록했다. 실제 React Profiler 측정은 하지 않았다. |
| 보안 | 변경 프론트에서 이름·전화·서명·nonce를 저장소·URL·로그에 추가하는 코드는 발견하지 못했다. 공급자 error_msg 원문은 일반 사용자 메시지로 치환한다. 서버 보안 전체 통과를 의미하지 않는다. |

## 검증 결과 — 누락·위험·우선순위

### 수행한 검증

- git 상태/diff와 신규 프론트 파일, 설계 §2.4·§3·§4.6~4.8·§5·§6.1 대조. 서버 GET·주문 재사용·콜백·복구 서비스 및 미변경 UI 호출 경로 확인.
- 변경·신규 프론트 7파일 ESLint: **통과**.
- `git diff --check`: **통과**.
- `npx vitest run --config lib/guest-monitoring/vitest.config.ts lib/guest-monitoring/tests/portone.test.ts lib/guest-monitoring/tests/portone-boundaries.test.ts lib/guest-monitoring/tests/recover-pending-payment.test.ts`: **3파일 97테스트 통과**. 서버 경계·mock 테스트 결과다.
- 저장소 파일을 추가하지 않고 현재 TypeScript를 메모리 변환하여 모의 API/SDK/React useCallback으로 격리 실행: 거래 ID 없는 복구의 callback 0회, pending 연장 재클릭 SDK 2회, merchant_uid 누락 시 confirm 확인. React 렌더·브라우저 통합 테스트를 대체하지 않는다.

### 누락

- 변경분에 프론트 DOM/React 훅 회귀 테스트가 없다. 설계 §6.1의 로더 실패 후 재시도, 모바일 복귀, 콜백 일시 실패·영구 거부, status 세션 연장 시나리오 실행 증거가 필요하다.
- 빈 payment/mock, 저장 주문 없는 복귀, 세션 만료, 다중 물건 전환, 언마운트, 중복 클릭을 실제 브라우저에서 검증하지 않았다.
- 전체 lint/test/build, 실제 DB 저장·기간 연장, 실 SDK/PG·CDN, 접근성·프로파일링은 실행하지 않았다. 서버 97테스트 통과만으로 프론트 완료를 판정할 수 없다.

### 위험

- 승인 후 콜백 유실 시 사용자는 pending에 머물며 연장 재클릭으로 결제창을 다시 열 수 있다. 서버 복구 함수가 있어도 실제 사용자 호출 경로와 연결되지 않아 복구 완료를 보장하지 못한다.
- 외부 PG·운영 DB·실결제는 호출하지 않았다. 테스트 채널과 배포 환경 실동작은 이번 리뷰의 검증 범위 밖이다.

### 우선순위

1. **P0:** 거래 ID/콜백 메모리 보존과 ID 유실 서버 복구 연결, 미확정 연장 주문 SDK 재실행 방지(1~2번).
2. **P1:** SDK 로드 이후 실행 취소, 복귀 오류·재인증 안내 및 참조 보존(3~4번). 해당 경합과 실패 흐름을 DOM/브라우저에서 확인.
3. **P2:** SDK merchant_uid 엄격 대조(5번), 상태 알림 접근성 확인 및 파일 분리 검토.
