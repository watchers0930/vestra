# SMS 프론트엔드 교차검수

- 검토일: 2026-10-15
- 기준: `git status --short`, `git diff`의 미커밋 변경 및 미추적 신규 파일, `docs/02-design/features/sms.design.md`, Platform Development Standard
- 판정: **수정 후 재검토 필요 — HIGH 1건 / MED 2건 / LOW 1건**
- 코드 수정 없음. 이 보고서만 추가했다. 커밋·배포·실제 SMS 발송·DB 접근은 수행하지 않았다.

## 검토 범위

직접 검토한 변경 파일:

- `app/(personal-home)/renewal/monitoring/guest/apply/GuestApplyClient.tsx`
- `app/(personal-home)/renewal/monitoring/guest/status/GuestStatusClient.tsx`
- `app/(personal-home)/renewal/monitoring/guest/guestApi.ts`
- `app/(personal-home)/renewal/monitoring/hooks/useGuestApply.ts`
- `app/(personal-home)/renewal/monitoring/hooks/useGuestStatus.ts`
- `app/(personal-home)/renewal/monitoring/hooks/useGuestOtp.ts` — 미추적 신규 파일
- `app/(personal-home)/renewal/monitoring/components/guest/GuestOtpForm.tsx` — 미추적 신규 파일
- `types/guest-monitoring.ts` — 공용 API 타입 계약

최상위 `components/`, `hooks/`와 `page.tsx`에는 미커밋 변경이 없었다. 기존 신청·조회 폼, 라우트, provider, CSS 및 서버 start/verify 구현은 연결 흐름과 API 계약 확인을 위해 참조했다. 백엔드 전체 보안 검수는 이번 범위에 포함하지 않았다. 아래 라인은 검토 시점 working tree 기준이다.

## 지적 사항

### 1. [심각도 HIGH] OTP 취소·재발송 실패 후 신청 폼의 신원 입력이 소실되고 잠긴다

- **파일:라인:** `app/(personal-home)/renewal/monitoring/guest/apply/GuestApplyClient.tsx:84`
- **관련 위치:** 같은 파일 `:162`, `hooks/useGuestApply.ts:198`, `hooks/useGuestApply.ts:260`, `components/guest/GuestApplyForm.tsx:39`, `components/guest/GuestApplyForm.tsx:47`, `components/guest/GuestApplyForm.tsx:197` (모두 monitoring 하위).
- **문제:** OTP 진입 시 `GuestApplyForm`을 제거하고 `GuestOtpForm`으로 교체하므로 기존 폼의 이름·전화번호·주소·파일·동의 상태가 사라진다. OTP 취소는 draft를 유지한 채 `ready`로 돌아간다. 재요청도 `verifying`로 바뀌면서 신청 폼을 다시 만들고, 발송 실패 시 그대로 `ready`가 된다. 새 신청 폼의 이름·전화는 빈 문자열이지만 `draft.extractionOk` 때문에 입력이 잠긴다. 사용자가 동의 후 인증을 다시 누르면 `onProceed("", "")`가 호출되어 인증 API 검증에 실패한다. 기존 초안으로 인증을 재개할 수 없고 “다시 입력” 후 PDF 분석까지 반복해야 한다.
- **재현:** 정상 분석 → OTP 발송 → 취소 → 빈 이름·전화 입력이 disabled인지 확인 → 동의 후 인증 재시도. 별도로 OTP 재요청을 429/503으로 실패시켜 같은 상태를 확인한다. 격리 렌더에서도 기존 draft를 전달한 새 폼의 두 입력은 `value=""`, `disabled=true`였다.
- **수정 제안:** 입력 폼의 데이터 수명을 OTP 화면보다 상위로 옮기거나 폼 인스턴스를 유지해 취소·재발송 실패 후 같은 입력으로 복귀하게 한다. 전화번호를 수정하는 경우에는 설계대로 초안을 무효화하고 재분석하도록 분리한다. 입력을 폐기하는 정책이라면 draft도 함께 폐기하여 빈 입력이 잠기는 상태를 없앤다. 성공·취소 시 OTP 코드와 대기 상태를 비우는 정책은 유지한다.
- **근거/우선순위:** 설계 §5.3 입력 단계 복귀·초안/전화번호 변경 처리, 실패 후 복구 가능성. **P0**.

### 2. [심각도 MED] 화면 이탈 후에도 지연된 OTP 성공 응답이 주문 생성을 시작한다

- **파일:라인:** `app/(personal-home)/renewal/monitoring/hooks/useGuestOtp.ts:70`
- **관련 위치:** 같은 파일 `:32`, `:72`, `hooks/useGuestApply.ts:236`, `hooks/useGuestApply.ts:248` (monitoring 하위).
- **문제:** 세대 번호는 `beginOtp`, `resetOtp`, 새 검증에서만 바뀌고 언마운트 시 무효화되지 않는다. 인증 확인 중 다른 페이지로 이동해도 성공 응답은 현재 세대로 판정된다. 이미 언마운트된 `verifyApplyOtp`가 이어서 `startOrder`를 호출하므로 사용자가 신청 화면을 떠난 뒤 주문 API 호출과 결제 실행이 발생할 수 있다. React 상태 갱신이 무시되어도 HTTP 요청·저장소 갱신·provider 실행 같은 부수 효과는 남는다.
- **재현:** `/identity/verify-otp` 응답을 지연 → 신청 컴포넌트 언마운트 → 200 응답 반환. 실제 훅 소스를 실행한 격리 하네스에서 언마운트 이후 `createOrder` 호출 **1회**를 확인했다. 이는 DOM E2E 검증은 아니다.
- **수정 제안:** 공통 훅의 effect cleanup에서 세대를 무효화하고, 언마운트된 흐름은 성공 DTO를 후속 처리로 전달하지 않게 한다. 필요하면 AbortController를 함께 사용하되 서버가 이미 소비한 인증을 취소한 것으로 간주하지 않는다. 주문 생성·결제 실행 직전에도 해당 신청 흐름이 유효한지 확인한다.
- **근거/우선순위:** 설계 §5.3 비동기 세대 관리, 예외 흐름의 부수 효과 통제. **P1**.

### 3. [심각도 MED] 같은 렌더에서 중복 검증 호출이 들어오면 정상 인증 성공을 버린다

- **파일:라인:** `app/(personal-home)/renewal/monitoring/hooks/useGuestOtp.ts:61`
- **관련 위치:** 같은 파일 `:67`, `:72`, `components/guest/GuestOtpForm.tsx:60`, `components/guest/GuestOtpForm.tsx:97`, `components/guest/GuestOtpForm.tsx:119` (monitoring 하위).
- **문제:** `submitOtp`에는 동기적인 in-flight 잠금이 없다. 호출마다 세대를 증가시키고 별도 검증 요청을 보낸다. 같은 렌더의 콜백이 연속 실행되면 두 요청이 모두 발송된다. 서버의 1회 소비 계약에 따라 첫 요청만 성공하면, 클라이언트는 첫 성공을 구세대 응답으로 버리고 두 번째 `verification_failed`만 보여준다. 이미 소비한 코드는 다시 확인할 수 없다. `busy`에 따른 버튼 비활성화는 다음 렌더 이후의 UI 입력을 막지만 훅 자체의 재진입은 막지 못한다.
- **재현:** 동일한 pending 상태의 `submitOtp("000001")`를 렌더 사이 갱신 없이 두 번 호출 → 첫 응답 200, 두 번째 응답 400. 격리 하네스 결과는 API 호출 **2회**, 반환값 `[null, null]`, 최종 오류 `verification_failed`였다. 일반적인 더블클릭만으로 항상 발생한다고 확인한 것은 아니며, 동일 렌더 내 중복 호출 조건에서 재현했다.
- **수정 제안:** ref 기반 동기 잠금 또는 진행 중 Promise 공유로 동일 세션의 검증 요청을 1개로 제한한다. 중복 제출 때문에 성공 응답의 세대를 무효화하지 않도록 요청 세대와 재진입 제어를 분리한다. begin/reset 및 실패에서 잠금 수명도 함께 관리한다.
- **근거/우선순위:** 설계 §5.1 중복 제출 차단, §6 1회 소비, 플랫폼 중복 API 호출 방지. **P1**.

### 4. [심각도 LOW] 남은 시간 전체가 매초 스크린리더 알림 대상이 된다

- **파일:라인:** `app/(personal-home)/renewal/monitoring/components/guest/GuestOtpForm.tsx:106`
- **관련 위치:** 같은 파일 `:54`, `:98`, `:110`.
- **문제:** 1초마다 바뀌는 “남은 시간” 문구에 `aria-live="polite"`가 있고 입력의 설명으로도 연결되어 있다. 따라서 보조기기에 매초 상태 변경 알림을 요청하며, 코드 입력 중 반복 낭독 또는 알림 누적이 발생할 수 있다. 정확한 낭독 방식은 스크린리더별 실기 검증이 필요하다.
- **수정 제안:** 매초 카운트다운은 live region에서 제외하고, 별도 상태 영역에서 만료 임박·만료 등 의미 있는 전환만 알린다. 입력 설명은 고정 안내와 연결하고 오류에는 식별자를 부여해 `aria-describedby`/`aria-invalid`로 연결한다.
- **근거/우선순위:** 접근성, 설계 §5.1 연결된 입력·오류 안내. **P2**.

## API 계약 및 구조·성능 확인

| 항목 | 확인 결과 |
| --- | --- |
| 인증 시작 | `POST /api/guest-monitoring/identity/start`, status/apply purpose 및 apply draftId 전달이 설계와 일치한다. |
| OTP 확인 | `POST /api/guest-monitoring/identity/verify-otp`, `{ verificationId, code }` 및 6자리 문자열 처리가 서버·설계와 일치한다. 앞자리 0을 유지한다. |
| HTTP·세션 | 공통 postJson이 `credentials: "same-origin"`, `cache: "no-store"`를 사용한다. 비-2xx는 실패로 분기하며 토큰을 응답 바디에서 읽지 않는다. |
| 조회 전이 | OTP 대기 중 목록 조회를 시작하지 않는다. 성공 후 목록 갱신, 단건 자동 선택, 다건 선택 및 기존 빈 상태 UI로 연결된다. 실행 검증은 아래 누락에 명시했다. |
| 신청 전이 | OTP 분기에서 pendingIdentity를 제거하고 verify 성공 후 결합 draftId로 주문을 호출한다. 인증 성공을 감시 활성화 완료로 표시하지 않는다. |
| 다날 분기 | status의 provider 우선 실행, apply의 기존 리다이렉트 및 복귀 처리 경로를 정적으로 확인했다. 실제 다날 회귀 검증은 수행하지 않았다. |
| 민감정보 | 신규 OTP 코드·이름·전화 대기는 메모리에서 관리한다. 변경 프론트 코드에 해당 값의 URL/스토리지 저장 또는 로그 추가는 보이지 않았다. |
| 책임·규모 | UI/흐름 훅/HTTP/타입이 분리됐다. 변경 UI·훅은 최대 377줄로 500줄 이하이며 설계의 400줄 분리 트리거에도 도달하지 않았다. |
| 렌더·fetch | 타이머는 OTP 폼 내부만 매초 갱신하며 cleanup으로 interval을 제거한다. 타이머에 의해 fetch가 발생하는 effect는 없다. 일반 단일 호출 경로의 중복 목록·달력 fetch는 발견하지 않았다. 중복 검증은 지적 3에 해당한다. |

## 검증 결과: 누락·위험·우선순위

### 수행한 검증

- 대상 프론트 7개 파일과 공용 타입 파일에 대한 ESLint: **통과**.
- `npx tsc --noEmit --incremental false`: **통과**.
- 실제 TS/TSX를 메모리에서 transpile하여 mock React hooks/JSX 및 지연 API Promise로 격리 실행: 중복 검증 응답 유실, 언마운트 후 주문 호출, 기존 draft로 새로 만든 폼의 빈 값 잠금을 확인했다. 소스·테스트 파일을 저장하거나 수정하지 않았다. 실제 React DOM 수명주기·브라우저 검증을 대체하지 않는다.
- `__tests__`, `lib/guest-monitoring/tests`에서 `useGuestOtp`, `GuestOtpForm`, `verifyApplyOtp`, `verifyStatusOtp` 참조 검색: **없음**. 루트 Vitest는 `__tests__/**/*.test.ts`, guest Vitest는 서버 테스트 디렉터리의 `.test.ts`만 포함한다.

### 누락

- 설계 F9/§8의 프론트 흐름 자동 테스트가 확인되지 않았다. 정상 인증·오답·429·만료·취소·재전송 실패·언마운트·새로고침·초안 변경·status 0/1/N건·OTP 성공 후 주문 503을 실제 React 환경에서 추가 검증해야 한다.
- 실제 브라우저, 키보드 포커스 이동, 모바일 OTP 자동완성, 스크린리더 낭독 및 t-vestra 실환경 검증은 수행하지 않았다.
- 리뷰 범위상 전체 서버 테스트·API 보안 감사·프로덕션 빌드는 실행하지 않았다. ESLint/타입 검사 통과를 전체 기능 인수 통과로 보지 않는다.

### 위험 및 우선순위

| 우선순위 | 위험 | 완료 기준 |
| --- | --- | --- |
| P0 | 취소·재발송 실패 후 인증 재개 불가 | 기존 초안으로 복귀할 때 필요한 신원 입력이 유지되거나, 초안도 함께 무효화되어 정상 재입력이 가능하다. 빈 값이 잠긴 상태에서 인증 API를 호출하지 않는다. |
| P1 | 이탈 후 주문 생성, 중복 확인 시 성공 유실 | 언마운트 후 주문·provider 호출 0회. 동시 제출은 검증 HTTP 1회이며 성공 후 후속 처리도 1회다. |
| P1 | 프론트 흐름 테스트 누락 | 설계 F9/§8 시나리오를 React 테스트 또는 E2E로 검증하고 정상·실패·빈 상태·회귀 결과를 남긴다. |
| P2 | 매초 접근성 알림 | 타이머는 시각적으로 갱신하고 보조기기에는 의미 있는 전환만 알리는지 확인한다. |

플랫폼 표준 위반은 복구 가능한 실패 흐름, 비동기 수명주기·중복 호출 방지 및 검증 누락에 집중된다. 구조·500줄 제한 위반은 이번 변경 범위에서 발견하지 않았다.
