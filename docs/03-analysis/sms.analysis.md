# 비회원 등기감시 SMS OTP — 설계 대비 구현 갭 분석 (교차수정 반영 후)

> 분석자: 크로미(Claude) · 작성일: 2026-10-15
> 기준 설계서: [`docs/02-design/features/sms.design.md`](../02-design/features/sms.design.md)
> 교차검수 보고서: [`sms.review-backend.md`](./sms.review-backend.md) · [`sms.review-frontend.md`](./sms.review-frontend.md)
> 대상 코드: `lib/guest-monitoring/*`, `app/api/guest-monitoring/*`, `app/(personal-home)/renewal/monitoring/*`, `types/guest-monitoring.ts`, `scripts/audit-api-auth.mjs`, `lib/solapi-client.ts`
> 방식: 미커밋 변경분·신규 파일 정적 비교 + `audit:api`·guest vitest 실제 실행. **코드 미수정, 분석만.**

---

## 1. Match Rate(일치율): **약 95%**

| 영역 | 일치율 | 근거 |
| --- | --- | --- |
| 백엔드 서비스/API (lib·app/api) | ~99% | 설계 §2~§3·§6 계약을 거의 1:1 구현. 교차검수 HIGH·MED 모두 해소. 잔여는 LOW 가독성 2건 |
| 프론트 상태·훅·컴포넌트 | ~93% | 흐름 계약(§5) 충실 구현, HIGH·MED 전부 해소. GuestStatusAuthForm 분리 방식 변경(기능 동일), 접근성 LOW 미반영 |
| 타입/스키마 계약 (types·schemas) | 100% | §2.4·§3.3 스펙과 완전 일치 |
| 테스트/인수 (§8) | ~75% | 백엔드 테스트 117 passed(§8 거의 전수 커버). **프론트 흐름 테스트(F9) 전무**, 통합 28건 skip(DB 미설정, 설계 명시), t-vestra 실환경 미검증 |

**종합 산정 근거:** 핵심 보안·데이터 계약(타이밍세이프·조건부 1회 소비·바인딩·digest 도메인분리·다날 우회·발송실패 세션 폐기·평문코드 비노출)이 전부 설계대로 들어갔고, 교차검수에서 지적된 배포 차단급(HIGH) 결함이 양측 모두 해소됐다. 감점은 ①프론트 자동화 테스트 누락 ②접근성/가독성 LOW ③구조 1건의 설계 문서와의 경미한 불일치에서 발생한다.

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### G-1. [구조·경미] `GuestStatusAuthForm.tsx` 2단계 분리 방식이 설계와 다름
- **설계:** §1.2 — `GuestStatusAuthForm.tsx`를 "요청/코드 2단계, `GuestOtpForm` 조합"으로 변경(76→≤160줄).
- **구현:** `GuestStatusAuthForm.tsx`는 **미변경**. OTP 대기 분기를 상위 `GuestStatusClient.tsx:97-109`에서 `GuestOtpForm`을 직접 렌더링하는 방식으로 구성.
- **판정:** 기능·계약 동일(인증 요청 폼 ↔ 코드 입력 폼 전이). apply 흐름(`GuestApplyClient.tsx:86`)과 동일한 "클라이언트 레벨 조합" 패턴으로 일관성이 오히려 더 좋음. **설계 문서의 파일 계획과만 불일치**이며 기능 결함 아님. 설계 §0 규칙상 "문서를 고쳐 맞추는" 수준의 경미한 사안.

### G-2. [테스트·P1] 프론트엔드 흐름 자동 테스트(F9/§8) 전무
- **설계:** §4 F9, §8 — launch=false OTP vs 다날, 성공·실패·취소·새로고침, status 단건/다건/빈, apply 주문실패·초안경합, 언마운트·중복제출을 React 테스트/E2E로 검증.
- **구현:** 추가된 테스트는 백엔드뿐(`lib/guest-monitoring/tests/sms-otp.test.ts`, `sms-otp.integration.test.ts`). `monitoring/**` 및 `__tests__`에 `useGuestOtp`·`GuestOtpForm`·`verifyApplyOtp`·`verifyStatusOtp` 테스트 **없음**(실행 확인).
- **판정:** 설계 완료 조건(§8 "필수 검증 통과")·프론트 교차검수 P1 누락 항목과 일치하는 **실제 미해소 갭**. 아래 §4-프론트에서 상세.

### G-3. [문서 주석·사소] `guestApi.ts` 헤더 주석이 잘못된 설계서 참조
- `guestApi.ts:4`가 `lib.design.md §3`를 가리킴(현재 기능 설계서는 `sms.design.md`). 기능 영향 없음, 주석 정정 권장.

### 불일치 **아님**으로 확인된 항목(설계대로)
- 요청/응답 DTO·경로·메서드·`otpVerifySchema`·`verification_failed` 메시지·쿠키 정책·상수(`OTP_TTL=5분`)·digest 규약·providerTxId 상태머신 — 전부 §2~§3과 일치.
- 다날 경로 불변(`session.ts:22-42`·`consumeIdentity`·callback) — OTP는 별도 함수, 공통 소비 추출로 인한 다날 회귀 없음.

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (SMS OTP 변경분)
─────────────────────────────────────────────────
1. 페이지/파일 500줄 제한 : ✅ 준수
2. 단일 책임              : ✅ 준수
3. 서버 검증·보안         : ✅ 준수
4. 성능 (중복·N+1)        : ✅ 준수
5. 폴더 구조              : ✅ 준수
─────────────────────────────────────────────────
위반 항목: 없음 (권고성 개선 LOW 3건만 잔존)
─────────────────────────────────────────────────
```

**1. 500줄 제한** — 변경·신규 파일 최대 `useGuestApply.ts` 391줄, `useGuestStatus.ts` 377줄, `GuestApplyForm.tsx` 223줄. 전부 500줄 이하이며 400줄 분리 트리거에도 미도달. 설계대로 `useGuestOtp`(115)·`GuestOtpForm`(134)를 분리해 기존 파일 비대화를 회피함. ✅

**2. 단일 책임** — UI(`components/guest/*`)/흐름(`hooks/useGuest*`)/HTTP(`guestApi.ts`)/검증·소비(`lib/guest-monitoring`) 분리. 페이지는 조합만. OTP 코드 비교·세션 소비는 서버 전용(`sms-otp.ts`). ✅

**3. 서버 검증·보안** — 모든 입력 서버 zod 검증(`otpVerifySchema` `.strict()`, 숫자형·부가필드 거부). CSRF(`endpoint()`)·IP/verificationId/nonce rate limit·브라우저 바인딩·타이밍세이프 비교(`sms-otp.ts:77`)·조건부 1회 소비(`updateMany count===1`)·평문코드 DB/응답/로그 비노출·mock 로깅 회피(`solapi-client.ts:113` requireReal 조기반환). 공개 변이 핸들러는 ALLOWLIST 등록(실행 통과 확인). ✅

**4. 성능** — 기존 공통 DB rate limiter 재사용(메모리 카운터 없음), 세션 단건 조회(`findUnique`), digest 경량, N+1 없음. 중복 API 호출 방지: 프론트 `submitLockRef` 동기 잠금 + 요청 세대 관리로 중복 검증 요청 차단. 목록은 기존 `take` 정책 유지. ✅
- 참고(비위반): verify에서 `binding()` 2회 재계산(LOW-2) — 동일 입력, 성능 영향 무시 수준.

**5. 폴더 구조** — 서버 `lib/guest-monitoring`·`app/api/...`, 타입 `types/`, 스키마 `schemas.ts`, 클라이언트 route 하위 `components/`·`hooks/`·`guest/`. 설계 §1.1·§5 폴더 역할과 일치. ✅

---

## 4. 교차검수 지적사항 해소 여부

### 백엔드 (`sms.review-backend.md`) — HIGH 1 / MED 1 / LOW 4

| ID | 지적 | 해소 | 근거 |
| --- | --- | --- | --- |
| **HIGH-1** | verify-otp가 `audit:api` ALLOWLIST 미등록 → 감사 exit 1, 배포 차단 | ✅ **해소** | `scripts/audit-api-auth.mjs:43`에 설계 B7 사유 그대로 등록. **재실행 `audit:api` 통과**(157 routes, 위반 0) |
| **MED-1** | 전역 일일 cost cap이 draft 검증·실제 발송보다 먼저 소모(무발송 요청으로 cap 고갈) | ✅ **해소(설계+코드)** | 설계 §3.2(line 229·235) "MED-1 검수 반영"으로 수정 → cap을 라우트에서 선소모하지 않음. 구현: `start/route.ts`에서 cap 호출 제거, `sms-otp.ts:46` draft 검증(`:29`) 후·`sendSms`(`:52`) 직전으로 이동. 다날은 `session.ts:34` draft 검증 후·`startVerification` 직전. **무효 draftId는 cap 도달 전 404** |
| LOW-1 | 발송 실패 revoke가 try 내부 throw→빈 catch 의존(회귀 취약·prisma 오류 은폐) | ⚠️ **미반영** | `sms-otp.ts:51-58` 여전히 try 안 `unavailable()` throw → `catch{}` revoke 후 재throw 패턴. 검수 제안(명시적 분기)은 미적용. 동작·테스트는 정상(3경로 revoke 통과) |
| LOW-2 | 브라우저 바인딩 digest 중복 계산 | ⚠️ **미반영** | `sms-otp.ts:72`(비교)·`:83`(updateMany where) `binding(req, browser)` 2회 재계산 유지 |
| LOW-3 | `resolveIdentityMode()` 요청당 3회 호출 | ➖ **유지(의도)** | route·startIdentity·startOtp 삼중 가드 — 검수가 "다날 우회 보장 긍정요소"로 판단, 변경 불필요 |
| LOW-4 | verificationId 기반 검증 제한의 경미한 타깃 DoS | ➖ **변경 불필요** | 검수 자체가 "현 설계 의도 우선, 변경 불필요"로 종결 |

> 백엔드 테스트: **117 passed / 28 skipped**(이전 104→117, 테스트 보강됨). skip은 `GUEST_TEST_DATABASE_URL` 미설정 통합 테스트(설계 §8 명시). **배포 차단급 지적(HIGH·MED) 전부 해소.**

### 프론트엔드 (`sms.review-frontend.md`) — HIGH 1 / MED 2 / LOW 1

| ID | 지적 | 해소 | 근거 |
| --- | --- | --- | --- |
| **HIGH-1 (P0)** | OTP 취소·재발송 실패 후 신청 폼 신원 입력 소실·잠김 → 빈 값으로 인증 API 호출 | ✅ **해소** | ①`useGuestApply.ts:379-380` `restoreName`/`restorePhone`(otpName/PhoneRef) 노출 → `GuestApplyForm.tsx:47-48` `initialName`/`initialPhone`로 입력 복원. ②`cancelApplyOtp`(`:271-276`)는 이름·전화 ref를 **비우지 않음**(주석 명시). ③`startIdentity`(`:191-195`) 빈 이름·전화 가드로 `onProceed("","")` 호출 차단 |
| **MED-2 (P1)** | 화면 이탈(언마운트) 후 지연된 OTP 성공이 주문 생성 트리거 | ✅ **해소** | `useGuestOtp.ts:40-46` 언마운트 effect cleanup에서 `genRef.current++` → in-flight `submitOtp`가 gen 불일치로 null 반환(`:91`), 후속 `startOrder` 미실행 |
| **MED-3 (P1)** | 동일 렌더 중복 검증 호출 → 1회 소비 계약상 첫 성공이 유실되고 두 번째 400만 노출 | ✅ **해소** | `useGuestOtp.ts:36` `submitLockRef` + `:83-84` 동기 재진입 잠금 → 두 번째 호출은 세대 증가·요청 발송 없이 null 반환(먼저 간 성공 응답 보존) |
| **LOW-4 (P2)** | 매초 카운트다운이 `aria-live`로 스크린리더에 반복 낭독 | ⚠️ **미반영** | `GuestOtpForm.tsx:102-111` 타이머 `<p>`가 매초 갱신되며 `aria-live="polite"` 유지. 오류는 `role="alert"`이나 입력과 `aria-describedby`/`aria-invalid` 연결은 타이머만 참조(`:98`) |
| **누락(P1)** | 프론트 흐름 테스트(F9/§8) 부재 | ⚠️ **미해소** | §2 G-2와 동일. 프론트 테스트 파일 없음(실행 확인) |

> ESLint·`tsc --noEmit`는 교차검수 시점 통과. 프론트 흐름의 **런타임 자동 검증(React/E2E)**과 t-vestra 실환경 검증은 여전히 미수행.

---

## 5. 종합 의견 및 남은 수정 우선순위

### 종합
설계서 계약을 높은 충실도로 구현했고(≈95%), 교차검수에서 **배포를 막던 결함(백엔드 HIGH-1 감사 게이트, 프론트 HIGH-1 입력 소실·잠김)과 데이터 안전성 결함(MED 전부)이 모두 해소**됐다. 보안 핵심(다날 우회·타이밍세이프·조건부 1회 소비·바인딩·digest 도메인분리·발송실패 세션 폐기·평문 비노출)은 테스트로 뒷받침된다. MED-1은 설계 §0 규칙대로 **코드가 아니라 설계서를 먼저 고친 뒤** 양측에 반영한 모범 사례다. 플랫폼 5대 절대규칙 위반은 없다.

다만 **"동작=완료"가 아니다(규칙 0-5).** 아래 두 가지가 남아 아직 "완료" 선언 조건(설계 §8)을 충족하지 못한다: ①프론트 흐름 자동 테스트 부재 ②t-vestra 실환경·실화면 검증 미수행(규칙 0-1).

### 남은 수정 우선순위

| 순위 | 항목 | 분류 | 조치 |
| --- | --- | --- | --- |
| **P1-a** | 프론트 흐름 테스트(F9/§8) 작성 | 누락 | OTP vs 다날 분기, 성공·실패·취소·재발송실패·언마운트·중복제출·새로고침, status 0/1/N건, apply 주문503·초안경합을 React 테스트/E2E로. 설계 완료 조건의 필수 검증 |
| **P1-b** | t-vestra 실환경 검증 | 검증 | `GUEST_IDENTITY_MODE=sms_otp`로 테스트 배포 후 실제 SMS 수신·입력·세션 발급·다날 모드 회귀를 **실화면**에서 확인(규칙 0-1). 운영 승격 전 필수 |
| P2-a | 프론트 LOW-4 접근성 | 품질 | 매초 카운트다운을 live region에서 제외, 만료 등 의미있는 전환만 알림. 오류에 id 부여 후 입력과 `aria-describedby`/`aria-invalid` 연결 |
| P2-b | 백엔드 LOW-1/LOW-2 | 품질 | 발송 성공/실패 명시적 분기로 revoke 단일화(회귀 안전), `binding` 1회 계산 재사용 |
| P3 | G-1·G-3 문서 정합 | 문서 | 설계 §1.2 `GuestStatusAuthForm` 계획을 "클라이언트 레벨 조합"으로 정정하거나 현 구조 수용 명기, `guestApi.ts:4` 참조 설계서명 정정 |

### 검증 수행 내역 (본 분석)
- `node scripts/audit-api-auth.mjs` → **통과**(route 157개, 미인증 변이 0, allowlist 17건). HIGH-1 해소 확인.
- `npx vitest run --config lib/guest-monitoring/vitest.config.ts` → **117 passed / 28 skipped**(DB 통합만 skip).
- 프론트 흐름 테스트 파일 탐색 → **없음**(F9 미해소 확인).
- DB·운영 미접촉, 비밀값·전화·코드 미열람(마스킹/해시만 확인).

> **결론:** 배포 차단급 결함은 모두 해소되어 **t-vestra 테스트 배포 가능 상태**다. 단 P1-a(프론트 테스트)·P1-b(실환경 검증)를 마치기 전에는 "완료" 선언 및 운영 승격을 하지 않는다.
