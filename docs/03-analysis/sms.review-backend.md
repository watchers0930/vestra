# 비회원 등기감시 SMS OTP — 백엔드 교차검수 (Codex 구현분)

> 검수자: 크로미(Claude) · 작성일: 2026-10-15
> 대상 범위: `app/api/guest-monitoring/**`, `lib/guest-monitoring/**`, `lib/solapi-client.ts`, `types/guest-monitoring.ts`, `schemas`/`errors`
> 기준 문서: [`docs/02-design/features/sms.design.md`](../02-design/features/sms.design.md)
> 방식: 커밋 안 된 변경분(`git diff` / 신규 파일) 정적 리뷰 + 테스트·감사 스크립트 실제 실행. **코드 미수정, 리뷰만.**

---

## 0. 총평

전반적으로 설계서(§2~§8)를 충실히 구현했고, 보안 핵심(타이밍세이프 비교·조건부 1회 소비·브라우저 바인딩·digest 도메인분리·평문코드 비노출·다날 우회·발송실패 세션 폐기)이 모두 들어가 있다. 신규 OTP 단위 테스트가 설계 §8 항목을 거의 1:1로 커버하며 **로컬 테스트 104 passed(통합 28 skipped — DB 미설정)** 로 통과했다.

단, **배포를 막는 HIGH 1건**(audit 게이트 미등록)과 설계 레벨에서 재검토가 필요한 **MED 1건**(전역 일일 cap 선소모)이 있다. 아래 참조.

| 심각도 | 건수 | 요약 |
| --- | --- | --- |
| HIGH | 1 | `audit:api` ALLOWLIST에 verify-otp 미등록 → 감사 스크립트 exit 1 (실행 확인) |
| MED | 1 | 전역 일일 cost cap이 draft 검증/실제 발송 이전에 소모 — 무발송 요청으로 cap 고갈 가능 |
| LOW | 4 | 제어흐름 가독성·중복 연산·검증 DoS(경미)·모드 중복 호출 |

---

## 1. HIGH

### [HIGH] verify-otp가 `audit:api` ALLOWLIST에 미등록 — 감사 게이트 실패
- **파일:** `scripts/audit-api-auth.mjs:30-42` (ALLOWLIST 블록, `identity/start`만 존재 / `verify-otp` 없음)
- **관련:** `app/api/guest-monitoring/identity/verify-otp/route.ts:8` (`endpoint(...)` POST, `auth()` 신호 없는 공개 변이 핸들러)
- **문제:** 설계 B7(§1.2)·§7은 verify-otp를 ALLOWLIST에 등록하도록 **필수**로 규정한다. 그러나 `scripts/audit-api-auth.mjs`에는 변경이 없다(`git diff` 비어 있음). 실제로 돌려보면:
  ```
  $ node scripts/audit-api-auth.mjs
  ❌ 인증 없는 변이 핸들러 1건 발견:
     - guest-monitoring/identity/verify-otp/route.ts  {POST}
  exit code: 1
  ```
  즉 `npm run audit:api`가 **실패**한다. CLAUDE.md "배포 전 필수 API 보안 체크리스트"와 설계 완료 조건을 모두 위반하며, 감사를 CI/배포 전 단계에 넣었다면 배포가 차단된다.
- **수정 제안:** `ALLOWLIST`에 아래 1줄 추가(설계 B7 사유 그대로).
  ```js
  "guest-monitoring/identity/verify-otp/route.ts":
    "비회원 OTP 확인 — endpoint(): CSRF + IP·verificationId·nonce rate limit + 브라우저 바인딩 + 조건부 1회 소비",
  ```

---

## 2. MED

### [MED] 전역 일일 cost cap이 draft 검증·실제 SMS 발송보다 먼저 소모됨
- **파일:** `app/api/guest-monitoring/identity/start/route.ts:16-20` (cost cap) → `lib/guest-monitoring/sms-otp.ts:28`(draft 검증)·`:45`(sendSms)
- **문제:** `identity-cost`는 **날짜 단일 키의 전역 카운터**(기본 100/일)다. 이 카운터는 `startOtp`의 draft 유효성 검사(apply일 때 404)와 실제 `sendSms` 호출보다 **앞서** 증가한다. 따라서 공격자가 유효하지 않은 `draftId`(apply)나 발송이 보장되지 않는 요청을 반복하면 **SMS 비용은 0원인데 전역 일일 cap만 고갈**되어, 그날 정상 사용자의 본인인증(다날·OTP 공통)이 전면 차단될 수 있다. IP(5/10분)·신원(3/10분)·전화(3/10분) 제한이 선행하나, IP·신원·전화를 회전시키면 전역 cap(100)은 비교적 적은 노력으로 소진 가능하다. "cost cap = 실제 발송 비용 보호" 의도와 어긋난다(무발송 요청이 예산을 깎음).
- **주의(스펙 일치 여부):** 현재 구현은 설계 §3.2 처리순서(cap=6 → startOtp=7, 그리고 startOtp 내부 draft 검사가 선두)를 **정확히 따른 것**이다. 즉 코드가 스펙을 위반한 게 아니라 **스펙 자체의 순서가 이 부작용을 내포**한다. 설계 §0 규칙("스펙에 어긋나면 문서를 먼저 고친다")에 따라 **코드가 아니라 설계 레벨에서 재검토**가 필요한 사안으로 올린다.
- **수정 제안(택1, 설계 반영 후):**
  1. cost cap을 **실제 발송 직전**으로 이동(발송에 도달한 요청만 카운트) — 비용과 카운터를 일치. 또는
  2. apply draft 검증을 cost cap **이전**으로 당겨, 무효 draft가 전역 예산을 깎지 못하게 함.
  - 어느 쪽이든 IP/신원/전화 제한(선차단, 발송 전)은 유지한다.

---

## 3. LOW

### [LOW] startOtp 발송 실패 처리를 try 내부 throw→빈 catch에 의존
- **파일:** `lib/guest-monitoring/sms-otp.ts:44-51`
- **문제:** `sendSms` 결과가 mock/`success!==true`이면 `unavailable()`를 **try 블록 안에서** throw하고, 바로 아래 `catch {}`가 이를 받아 세션 revoke 후 다시 `unavailable()`를 던진다. 동작은 정확하며 테스트(`success:false`/`sms_mock`/`throw` 3경로 모두 revoke)가 통과하지만, "유일한 revoke 지점이 catch"라는 암묵적 제어흐름이라 이후 로직 추가 시 revoke 누락 회귀를 유발하기 쉽다. 또 `catch`가 revoke 과정의 prisma 오류까지 삼켜 500으로 뭉갤 수 있다.
- **수정 제안:** 발송 성공/실패를 명시적으로 분기(예: `try { result } catch { result = fail }` 후 단일 지점에서 `if (!ok) { await revoke; unavailable(); }`)해 revoke 경로를 하나로 드러낸다. 기능 변경은 아니며 가독/회귀안전성 개선.

### [LOW] 브라우저 바인딩 digest 중복 계산
- **파일:** `lib/guest-monitoring/sms-otp.ts:65` 및 `:76` (`binding(req, browser)` 2회), `startOtp`도 1회 계산 후 재사용
- **문제:** `verifyOtp`에서 `binding(req, browser)`(SHA-256)를 비교용·updateMany where용으로 각각 재계산한다. 동일 입력이므로 결과는 같다. 성능 영향은 무시할 수준이나, 한 번 계산해 재사용하면 "같은 값으로 비교·소비"가 코드상 더 명확해진다.
- **수정 제안:** `const bind = binding(req, browser);` 1회 계산 후 65·76행에서 재사용.

### [LOW] verificationId 기반 검증 제한의 경미한 타깃 DoS 여지
- **파일:** `lib/guest-monitoring/sms-otp.ts:58` (`guestLimit("otp-verify-id", input.verificationId, 5, 600_000)`, 세션 조회 이전)
- **문제:** verificationId별 5회/10분 제한이 세션 존재·소유 확인보다 앞서므로, 공격자가 피해자의 verificationId를 안다면 그 세션의 정당한 검증을 10분간 잠글 수 있다(검증 DoS). 단 verificationId는 응답으로만 전달되는 랜덤 ID라 외부 추측이 어렵고, 설계 §3.3 처리순서(선 제한)를 정확히 따른 것이라 실질 리스크는 낮다. 정보성으로 기록.
- **수정 제안:** 현 설계 의도(새 IP/쿠키로 카운터 초기화 방지)가 우선이므로 **변경 불필요**. 추후 필요 시 nonce 기반 제한(이미 존재, §3.3 step4)과의 역할 구분만 문서화.

### [LOW] `resolveIdentityMode()` 요청당 중복 호출
- **파일:** `app/api/guest-monitoring/identity/start/route.ts:10` → `lib/guest-monitoring/session.ts:20` → `lib/guest-monitoring/sms-otp.ts:25` (start 1요청에 3회)
- **문제:** env 1개 비교라 비용은 사실상 0. 삼중 가드(라우트/startIdentity/startOtp) 자체는 "다날 우회"를 확실히 보장하는 긍정 요소다. 다만 호출 중복은 의도된 설계인지만 확인.
- **수정 제안:** 유지해도 무방. 과하다고 판단되면 라우트에서 1회 산출해 하위로 전달.

---

## 4. 설계 스펙 일치 확인 (양호 — 회귀 없음)

아래 항목은 설계와 **일치**하며 테스트로 검증됨. 참고용으로 기록.

| 항목 | 설계 | 구현 | 비고 |
| --- | --- | --- | --- |
| 다날 우회(핵심) | §4 B5, §3.1 | `start/route.ts:10` `=== "danal"`일 때만 `getDanalProvider()`; `session.ts:20` sms_otp면 선반환; `sms-otp.ts:25` 재확인 | 테스트 "bypasses unavailable Danal"(route/direct) provider 호출 0회 확인 |
| 타이밍세이프 비교 | §3.3-7 | `sms-otp.ts:70` `/^[a-f0-9]{64}$/` 길이 가드 + `timingSafeEqual` | 손상 digest(`otp:broken`) 길이불일치 throw 방어까지 추가 — 스펙보다 견고 |
| 조건부 1회 소비 | §3.3-10·11, §6 | `sms-otp.ts:74-83` 원 `providerTxId`·바인딩·null 상태 where로 `updateMany`, `count!==1`→실패 | 동시요청 1건만 200, 재생 400 테스트 통과 |
| 코드/PII 비노출 | §6 | 평문 code는 생성·메시지·발송 메모리에만. DB=`otp:<digest>`, 응답=launch DTO만 | 테스트가 `data`/`result.data`에 code·이름·전화 미포함 단언 |
| mock 로깅 회피 | §6 | `solapi-client.ts:113` `requireReal`면 `console.info` 마스킹 로그 **이전** 조기 반환 | `sms-otp.ts:46`에서 `requireReal:true` 전달 |
| 발송 실패 세션 폐기 | §3.2 g, §0-5 수명주기 | `sms-otp.ts:47-50` mock/false/예외 → revoke + 503 | 3경로 revoke 테스트 통과 |
| 재요청 시 이전 미완료 폐기 | §5.4 | `sms-otp.ts:35-38` 같은 purpose·신원·바인딩의 `otp:` 미완료만 revoke(검증 세션 불변) | |
| digest 도메인 분리 | §2.3 | `sms-otp.ts:13-15` `["sms_otp_v1", nonce, inputIdentityHash, code]` JSON 직렬화 SHA-256 | |
| 모드 resolver 엄격 매핑 | §3.1 | `identity-mode.ts:4` 정확히 `"sms_otp"`만, 빈값·`"danal"`·오입력·`"SMS_OTP"`·`"sms_otp "`→danal | 테스트 each 통과 |
| start 처리순서 | §3.2 | 라우트 danal가드→ipLimit→parse→identity→identity-phone→cost→분기, 순서 일치 | §2 MED 제외 |
| verify 처리순서 | §3.3 | 모드가드(404)→parse(400)→id제한→조회→nonce제한→바인딩→상태→digest→draft재검→소비 | 순서 일치 |
| 스키마 `.strict()`·문자열 code | §3.3 | `schemas.ts:4-7` `resourceId`+`/^[0-9]{6}$/`, 부가필드 거부 | 숫자형 `12345`·전각·null 거부 테스트 통과 |
| 쿠키 정책 | §3.3 Response | HttpOnly/prod Secure/prod SameSite=None/path·15분 | 기존 `cookieOptions` 재사용 |
| `sendSms` 시그니처 확장 호환성 | §참조 | `solapi-client.ts:104,113,127,129` `options?.correlationId` 게이팅 | 기존 호출자는 correlationId 필수였으므로 동작 불변 — 회귀 없음(sms-receipt 테스트 통과) |
| requireSession 통과 | §3.4 | OTP 완료 세션(verified/consumed/verifiedIdentityHash=input)이 기존 `requireSession` 통과 | 테스트 확인 |
| 결제 경계 | §6, §3.4 | OTP 성공과 다날 503(주문) 분리 — verify 성공 후 createOrder 503 별개 | "keeps payment provider failure separate" 테스트 통과 |

---

## 5. 검증 수행 내역

- `node scripts/audit-api-auth.mjs` → **exit 1** (HIGH-1 근거). 위반 1건: verify-otp.
- `npx vitest run --config lib/guest-monitoring/vitest.config.ts` → **8 passed / 2 skipped 파일, 104 tests passed / 28 skipped**. skipped는 `GUEST_TEST_DATABASE_URL` 미설정 통합 테스트(설계 §8 명시 — 미실행 사실 보고).
- DB·운영 미접촉. 비밀값·전화·코드 미열람(마스킹/해시만 확인).

## 6. 조치 우선순위

1. **HIGH-1** — ALLOWLIST 1줄 추가 후 `npm run audit:api` 재통과 확인(배포 전 필수).
2. **MED-1** — 설계서 §3.2 cost cap 위치 재검토(발송 직전 이동 또는 draft 선검증). 설계 수정 → 양측 반영.
3. LOW 3건(2·3·5) — 여력 시 가독/견고성 개선. LOW-4는 변경 불필요.
