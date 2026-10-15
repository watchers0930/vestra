# 비회원 등기감시 SMS OTP 임시 인증 어댑터 기획서

> 프로젝트: VESTRA  
> 작성일: 2026-10-15  
> 상태: Draft — 기획 전용, 기능 구현·DB 변경·배포 미수행  
> 목적: 다날 식별 채널 제공 전까지 교체 가능한 SMS 인증 수단 제공

## 1. 기능 개요

비회원 등기감시의 신청(`apply`)과 현황 조회(`status`)에서 문자 인증번호로 전화번호 수신 권한을 확인한다. 서버 환경변수 `GUEST_IDENTITY_MODE=sms_otp`일 때만 활성화하고, 미설정 또는 `danal`이면 기존 다날 인증 경로를 유지한다. 다날 식별 채널이 준비되면 환경변수 변경으로 기존 경로에 복귀할 수 있어야 한다.

6자리 인증번호는 서버에서 생성하고 기존 Solapi `sendSms`로 발송한다. DB에는 코드 원문 대신 기존 `GuestVerificationSession.providerTxId`에 `otp:` 접두사와 코드 검증용 해시만 임시 저장한다. 인증 성공 후에는 기존과 같은 브라우저 바인딩 세션과 HttpOnly 쿠키를 발급한다.

SMS OTP는 전화번호 수신 권한을 확인하는 임시 수단이다. 입력한 이름의 실명 여부나 CI/DI를 검증하지 않으므로 다날 실명 인증과 동일한 보증 수준으로 안내하지 않는다. 서비스의 기존 이름·전화 조합 해시를 유지하여 신청·조회 대상을 연결한다.

### 1.1 범위

| 포함 | 제외 |
| --- | --- |
| 서버 인증 모드 선택, OTP 발송·검증, 신청·조회 2단계 UI | 실제 다날 식별 채널 개발, `lib/danal` 어댑터 변경 |
| 기존 세션·쿠키·보안 래퍼·rate limit 재사용 | 결제 공급자 대체, OTP 성공만으로 신청 활성화 |
| 성공·실패·만료·재사용·시도 제한·모드 전환 테스트 계획 | 신규 DB 컬럼·테이블·마이그레이션 |
| 임시 인증 완료 식별자와 다날 복귀 정책 | 운영 DB 조회·변경, 실제 문자 발송·배포 |

이 단계의 산출물은 본 문서 하나다. 아래 파일 변경과 검증은 **후속 구현 단계의 계획**이며 이번 작업에서는 실행하지 않는다.

## 2. 기존 코드 분석

프론트 경로의 기준 디렉터리는 `app/(personal-home)/renewal/monitoring/`이다.

| 근거 파일 | 현재 동작 | 기획에 반영할 사항 |
| --- | --- | --- |
| `lib/danal/index.ts` | 격리된 개발 mock 조건 외에는 `getDanalProvider()`가 503 발생. production에서는 mock도 차단 | t-vestra의 미연동 상태에서 OTP 경로가 공급자를 호출하면 시작 불가 |
| `app/api/guest-monitoring/identity/start/route.ts` | 핸들러 첫 단계에서 공급자 호출 후 IP·신원·일일 비용 제한 적용 | OTP 모드에서 선행 공급자 호출 우회, 기존 발송 제한 유지 |
| `lib/guest-monitoring/session.ts` | `startIdentity`에서도 공급자 호출. 입력 신원 해시·nonce·브라우저 바인딩으로 세션 생성 | 라우트와 서비스 양쪽에서 우회 필요 |
| 동일 파일의 `consumeIdentity` | 다날 결과 검증 후 `updateMany` 조건부 갱신으로 한 번 소비, 토큰 해시 저장 | OTP도 같은 세션 불변조건과 원자적 소비 보장 |
| `lib/guest-monitoring/http.ts` | 기능·암호화 키 게이트, Origin 검증, IP 제한, 본문 크기 제한, `no-store` | OTP 검증은 일반 `endpoint()` 사용. callback 예외 사용 금지 |
| `lib/guest-monitoring/rate-limit-keys.ts` | `guestLimit`·`ipLimit`이 키를 해시하여 공통 DB rate limiter 사용 | 별도 메모리 카운터 대신 기존 제한 인프라 재사용 |
| `lib/solapi-client.ts` | `sendSms` 결과에 `success`·`channel` 포함. 설정 부재 시 `sms_mock` 성공 반환 | mock 성공을 실제 발송 성공으로 처리하지 않음. mock 전화 일부 로깅도 검토 필요 |
| `prisma/schema.prisma`의 `GuestVerificationSession` | nullable `providerTxId`, nonce·입력 신원·바인딩·만료·검증·소비·폐기 필드 존재 | 기존 필드만 사용, schema 변경 불필요 |
| `hooks/useGuestStatus.ts` | `launchProvider`가 false이면 즉시 `refreshProperties` 수행 | OTP는 코드 확인 전 미인증 상태를 유지하도록 분기 |
| `hooks/useGuestApply.ts` | URL 실행 실패를 인증 실패로 처리. 리다이렉트 복귀 마커로 주문 재개 | OTP 대기 단계 추가, 성공 응답 이후에만 `startOrder` 실행 |
| `guest/guestProvider.ts` | URL 또는 form action이 없으면 false 반환 | OTP launch에는 이동 필드 없이 모드와 verificationId만 제공 |
| `guest/guestApi.ts` | 공통 JSON POST, same-origin 쿠키, HTTP 상태 기반 결과 처리 | `verifyOtp` 추가. 실패는 비-2xx로 반환하여 성공 오인 방지 |
| `lib/guest-monitoring/order.ts` | 주문 생성은 여전히 `getDanalProvider()` 사용 | OTP 인증 성공 이후 결제 503은 별개. 신청 전체 완료를 보장하는 변경 아님 |
| `scripts/audit-api-auth.mjs` | 공개 변이 라우트는 사유가 있는 ALLOWLIST 등록 필요 | 새 검증 라우트 등록 및 보안 근거 명시 |

기존 인증 세션 TTL은 `SESSION_TTL=15분`이며 신청 초안은 30분이다. 현재 조회·신청 훅은 각각 322줄·294줄로, OTP 공통 로직을 분리하여 페이지와 관련 파일이 500줄을 넘지 않게 한다.

## 3. 사용자 스토리

| ID | 사용자 스토리 | 완료 조건 | 우선순위 |
| --- | --- | --- | --- |
| US-01 | 비회원으로 신청한 이름·전화번호를 입력하고 문자 인증 후 감시 기록을 조회하고 싶다 | 코드 확인 성공 후 목록 갱신, 단건은 기존 자동 선택으로 달력 진입 | P0 |
| US-02 | 비회원으로 PDF 분석을 마친 뒤 문자 인증으로 신청을 계속하고 싶다 | 해당 초안에 결합된 인증 성공 후 기존 주문 생성 단계 진행 | P0 |
| US-03 | 잘못된 코드·만료·요청 제한을 알기 쉬운 안내로 확인하고 싶다 | 오류 시 미인증 유지, 재입력 또는 재요청 가능 시점 안내 | P0 |
| US-04 | 운영자로서 다날 연동 전후에 설정만으로 인증 수단을 전환하고 싶다 | 미설정·danal은 기존 흐름, sms_otp만 신규 흐름. DB 변경 불필요 | P0 |
| US-05 | 문자 수신 실패 후 제한 범위 안에서 다시 인증을 요청하고 싶다 | 새 세션·코드 발급, 이전 코드와 혼용되지 않음 | P1 |

P0는 최초 제공의 필수 조건이고 P1은 재요청 UX 보완이다. P1을 뒤로 미뤄도 만료·실패 후 입력 단계에서 새 인증 요청은 가능해야 한다.

## 4. 기술 요구사항

### 4.1 모드 선택과 어댑터 경계

- 서버 전용 모드 resolver를 단일 기준으로 둔다. 정확히 `sms_otp`일 때만 OTP를 선택하며 미설정·빈 값·`danal`·기타 값은 기존 다날 경로로 처리한다.
- `identity/start` 라우트의 선행 `getDanalProvider()`와 `session.ts`의 `startIdentity` 내부 공급자 호출을 OTP 분기에서 모두 우회한다. 서비스 함수를 직접 호출하는 경우에도 우회가 보장되어야 한다.
- OTP 검증 경로에서도 다날 공급자와 `consumeIdentity`의 다날 결과 검증을 호출하지 않는다. 동일한 **소비 규칙**을 적용하는 별도 함수를 둔다.
- OTP 발송 실패 때 다날로 자동 fallback하거나, 다날 503 때 OTP를 자동 활성화하지 않는다.
- 기존 `lib/danal/*`, 다날 callback의 서명·nonce 검증, 결제 경로를 보존한다. 공통 소비 함수를 추출한다면 기존 다날 동작이 동일하다는 회귀 검증이 필수다.
- 클라이언트는 환경변수를 직접 판정하지 않고 서버가 반환한 `launch.mode`로 UI를 선택한다.

### 4.2 인증 시작: POST `/api/guest-monitoring/identity/start`

기존 요청 DTO `{purpose, guestName, guestPhone, draftId?}`와 최상위 응답 필드는 유지한다.

1. 기존 `endpoint()` 게이트와 입력 스키마 검증을 통과한다. `apply`는 입력 신원 해시와 일치하는 유효한 `pending_payment` 초안 및 `draftId`를 확인한다.
2. 발송 제한을 외부 SMS 호출 전에 적용한다. 현재 IP 5회/10분, 입력 신원 3회/10분, 전체 일일 `GUEST_IDENTITY_DAILY_LIMIT`을 유지한다. 일일 기본 100회, 설정 상한 1,000회 및 UTC 날짜 기준도 유지한다.
3. 이름 변경으로 동일 전화번호의 발송 제한을 회피하지 못하도록 정규화 전화번호 기준 제한을 추가한다. 제안값은 3회/10분이며 기존 `guestLimit`의 해시 키를 사용한다.
4. 암호학적 난수로 `000000`~`999999`의 6자리 숫자 문자열을 생성한다. `Math.random`은 사용하지 않는다.
5. 기존 browser cookie 또는 새 랜덤 브라우저 값으로 바인딩을 만들고, 별도 nonce 및 미인증 세션을 생성한다. `providerTxId`에는 `otp:` + digest만 저장한다.
6. digest는 기존 SHA-256 `digest`를 재사용하되, 코드만 단독으로 해시하지 않고 구분자 충돌이 없는 직렬화로 OTP 도메인·requestNonce·inputIdentityHash·code를 결합한다. 서로 다른 세션의 동일 코드가 같은 검증값이 되지 않게 한다.
7. `sendSms(정규화된 guestPhone, 인증번호 안내문)`를 호출한다. 평문 코드는 생성·메시지 구성·발송에 필요한 메모리에서만 사용하고 DB·응답·로그에는 기록하지 않는다.
8. `success === true && channel === 'sms'`를 확인한 경우에만 launch를 반환하고 `attachBrowser`로 브라우저 쿠키를 설정한다. SMS 접수 성공은 실제 단말 도착 보장과 구분한다.
9. 발송 실패·설정 부재·예외·mock 결과는 성공 처리하지 않는다. 생성한 세션은 폐기하여 검증 불가로 만들고 일반화된 503을 반환한다. 자동 재발송은 하지 않으며 발송 시도는 비용 제한에 포함한다.

응답 계약:

```json
{
  "verificationId": "<session-id>",
  "launch": { "mode": "sms_otp", "verificationId": "<session-id>" },
  "expiresAt": "<ISO-8601>"
}
```

OTP launch에는 URL·form action·리다이렉트 필드가 없다. 최상위와 launch 내부의 verificationId는 같아야 한다.

**만료 정책 제안:** 미인증 OTP는 5분 유효하게 하여 기존 `expiresAt`에 저장한다. 인증 성공 시 기존과 동일하게 세션 TTL 15분으로 갱신한다. 다날 경로의 15분 설정은 유지한다. 5분은 신규 기획값이며 코드에 공통 OTP 상수로 분리하고 서버 시간을 기준으로 판정한다.

### 4.3 OTP 확인: POST `/api/guest-monitoring/identity/verify-otp`

- 요청: `{verificationId: string, code: string}`만 허용한다. verificationId는 기존 `resourceId` 규칙, code는 ASCII 숫자 6자리 문자열로 서버 검증한다. 숫자형 입력이나 부가 필드는 거부하여 앞자리 0과 계약을 보존한다.
- 일반 `endpoint()`로 감싸 CSRF Origin 검사, IP 제한, 기능·키 게이트, 본문 크기 제한, `no-store`를 적용한다. `{callback: true}`는 금지한다.
- `scripts/audit-api-auth.mjs` ALLOWLIST에 `guest-monitoring/identity/verify-otp/route.ts`와 CSRF·IP 제한·브라우저 바인딩·시도 제한 근거를 등록한다.
- sms_otp 이외의 모드에서는 404로 비활성화하며 세션을 소비하지 않는다.
- 정상 형식 요청은 verificationId별 시도 제한을 먼저 적용하고, 조회한 세션의 nonce를 사용하여 추가 제한을 결합할 수 있다. 같은 세션/nonce에 대해 **10분 동안 최대 5회**, 6번째 요청부터 429를 반환한다. 성공·오답 모두 시도로 계산하며 새 IP·쿠키로 카운터를 초기화하지 못한다.
- rate limit 키에 코드·이름·전화 원문을 넣지 않고 기존 `guestLimit`·`ipLimit`을 사용한다. 여러 인스턴스에서도 같은 DB 제한이 적용되어야 한다.

검증·소비 순서:

1. 세션 존재, 지원 purpose, `providerTxId`의 `otp:` 접두사, 미검증·미소비·미폐기 상태, 서버 기준 `expiresAt > now`를 확인한다.
2. browser cookie와 User-Agent로 산출한 바인딩이 저장된 `browserBindingHash`와 일치하는지 확인한다.
3. 저장된 nonce와 `inputIdentityHash`를 포함해 코드 digest를 다시 산출하고 일정 시간 비교를 수행한다. 다른 요청의 신원값이나 클라이언트 제공 신원 해시로 덮어쓰지 않는다.
4. `apply`는 초안의 신원 해시가 `inputIdentityHash`와 일치하고 여전히 유효한지 재확인한다. `status`는 저장된 입력 신원 해시를 검증 결과에 결합한다. 별도 실명 공급자 결과가 생기는 것은 아니다.
5. 새 랜덤 세션 토큰을 만들고 조건부 `updateMany`로 소비한다. 조건에는 세션 ID, 원래 OTP 저장값, 입력 신원 해시, 바인딩, 미소비·미폐기·미검증, 만료를 포함한다. 조회와 갱신 사이 경합에도 성공 count가 1일 때만 인증 성공이다.
6. `tokenHash=digest(rawToken)`, `verifiedIdentityHash=inputIdentityHash`, `verifiedAt=now`, `consumedAt=now`, `expiresAt=now+SESSION_TTL`을 저장한다.
7. `providerTxId`의 OTP 해시를 지우고 서버가 발급한 실제 인증 완료 이벤트 식별자(예: `sms_otp_verified:<randomUUID>`)로 치환한다. 이는 다날 거래번호·실명 식별자·전화번호를 뜻하지 않으며 `otp:` 접두사와 겹치면 안 된다.
8. 기존 `attachSession`과 `attachBrowser`를 사용해 두 쿠키의 유효기간을 갱신한다. 브라우저 쿠키도 인증 세션 수명 동안 유지하고 `requireSession`의 기존 검증을 그대로 통과해야 한다.

성공은 HTTP 200 `{ok: true, purpose: 'status' | 'apply'}`로 반환한다. 원문 세션 토큰은 응답 바디에 넣지 않는다. 실패는 공통 `{error, code}` 형태의 비-2xx 응답으로 반환한다.

| 상황 | 응답 정책 | 세션·화면 |
| --- | --- | --- |
| 잘못된 요청 형식 | 400 `invalid_input` | 인증하지 않음 |
| 오답·미존재·만료·다른 브라우저·다른 신원·이미 소비 | 400 `verification_failed`, 상세 사유를 묶은 안내 | 쿠키 미발급, 미인증 유지 |
| 세션 시도 또는 IP 제한 초과 | 429 `rate_limited`, 기존 제한 헤더 | 추가 검증 차단 |
| CSRF Origin 누락·불일치 | 403 `forbidden` | DB 검증·소비 전 차단 |
| 기능 off 또는 OTP 모드 아님 | 404 | OTP 비활성 |
| SMS 공급자 미설정·발송 실패 | 시작 API에서 503 `provider_unavailable` | 해당 OTP 세션 폐기, 입력 단계 유지 |

`verification_failed` 사용자 메시지는 기존 오류 메시지 체계에 추가한다. 존재 여부나 불일치 필드를 응답에 노출하지 않는다.

### 4.4 기존 데이터와 모드 전환

| 단계 | providerTxId | 기타 상태 |
| --- | --- | --- |
| OTP 대기 | `otp:<digest>` | verifiedAt·consumedAt 없음, OTP 만료 적용 |
| OTP 인증 완료 | `sms_otp_verified:<서버 생성 식별자>` | 기존 verified/consumed 세션 상태와 동일 |
| 실패·폐기 | 기존 해시가 남더라도 revokedAt 설정 | 검증·소비 불가, 기존 정리 정책 적용 |
| 다날 대기·완료 | 기존 null / 다날 transactionId | 기존 동작 그대로 |

- Prisma schema·SQL·마이그레이션 수정 없이 기존 nullable 문자열 컬럼만 재사용한다.
- 미완료 OTP는 다날 모드 전환 후 검증할 수 없다. 재차 OTP로 전환해도 기존 만료·소비·폐기 조건을 모두 만족해야 한다.
- 이미 발급된 검증 세션은 기존 `requireSession` 정책에 따라 만료·폐기 시까지 유효하다. 모드 전환으로 기존 다날·OTP 완료 세션을 임의 재해석하지 않는다.
- 기존 스키마에 `renewal`도 존재한다. 필수 UI 범위는 status·apply이며 기존 renewal 계약을 제거하지 않는다. 서버 공통 인증에서는 동일한 OTP 규칙을 적용하되 별도 연장 인증 UI는 추가하지 않는다.

## 5. 프론트엔드 흐름

### 5.1 현황 조회

`이름·전화 입력 → 본인인증 요청 → 인증번호 입력·확인 → verifyOtp 성공 → refreshProperties → 물건 선택·달력`

- `useGuestStatus.startAuth`에서 `launchProvider(launch) === false && launch.mode === 'sms_otp'`이면 OTP 대기 상태를 설정한다. 이때 목록 갱신을 실행하거나 인증 완료로 표시하지 않는다.
- `GuestStatusAuthForm`을 요청·코드 확인의 두 단계로 확장하고 verificationId·만료 표시·확인 이벤트를 훅과 연결한다.
- 성공 후 `refreshProperties`를 호출한다. 한 물건이면 기존 `selectProperty` 경로로 달력 진입, 여러 건이면 선택 UI, 0건이면 기존 빈 상태를 표시한다.
- OTP 대기 중에는 신청 존재·주소·건수·감시 기간을 노출하지 않는다.

### 5.2 신청

`입력·PDF 분석 → ready → 인증 요청 → OTP 입력 → verifyOtp 성공 → startOrder(draftId) → 기존 결제 흐름`

- `useGuestApply`에 OTP 대기 단계를 추가하고 `GuestApplyClient`·`GuestApplyForm`에 코드 입력 UI를 연결한다. OTP 대기는 기존 단계 표시의 “인증·결제”에 속한다.
- OTP 분기에서는 리다이렉트 복귀 마커를 남기지 않거나 즉시 정리한다. 인증 전 새로고침을 주문 재개 신호로 오인하지 않게 한다.
- 확인 성공 후 현재 인증에 결합된 초안으로만 `startOrder`를 호출한다. 단순 launch 부재나 클라이언트 상태만으로 주문을 진행하지 않는다.
- 초안 수정·reset·취소·만료 시 대기 verificationId·코드·오류를 정리한다. 이전 비동기 응답이 새 초안의 주문을 시작하지 못하게 요청 세대를 확인한다.
- OTP 성공 후 주문 API의 다날 503은 기존 오류 흐름으로 안내한다. OTP 성공을 결제·감시 활성화 성공으로 표시하지 않는다.

### 5.3 공통 UX와 저장 정책

- `guestApi.verifyOtp({verificationId, code})`를 추가하고 기존 same-origin 쿠키·오류 처리 패턴을 사용한다.
- 코드 입력은 문자열, `inputMode="numeric"`, `autoComplete="one-time-code"`, 6자리 제한, 연결된 label과 오류 안내를 제공한다. 제출 중 중복 클릭을 막고 실패 후 입력 가능 상태로 복구한다.
- 코드·이름·전화·토큰을 URL·localStorage·sessionStorage에 저장하지 않는다. OTP 코드와 대기 상태는 컴포넌트/훅 메모리로 관리하고 성공·취소 시 비운다.
- 전화번호를 수정하면 인증 요청 단계로 돌아가 새 인증을 시작한다. 신청은 기존 초안 무효화·재분석 규칙을 유지한다.
- 재요청은 새 세션과 nonce·코드를 사용한다. 같은 브라우저·purpose·신원의 이전 미완료 OTP를 폐기하여 이전 문자로 완료되지 않게 한다. 재요청도 모든 발송 제한을 적용한다.
- countdown과 버튼 비활성화는 안내용이며 만료·시도 횟수·신원·권한의 최종 판정은 서버가 담당한다.

## 6. 보안·운영 요구사항

- 코드 평문·이름·전화번호는 서버/클라이언트 로그, 오류 객체 출력, 분석 이벤트에 남기지 않는다. OTP 및 입력 신원 해시도 불필요한 관측 로그에 기록하지 않는다.
- 기존 Solapi mock 경로는 전화번호 일부를 로깅한다. OTP에서 해당 경로가 실행되기 전 설정을 검사하거나, 필요 시 OTP 호출에 한정한 로그 억제 옵션을 설계한다. `sms_mock`를 거부하는 것만으로 로그 금지까지 충족한다고 간주하지 않는다.
- Solapi 설정은 기존 DB 설정 우선·환경변수 fallback 체계를 재사용한다. 실제 키·전화·코드·DB URL을 문서나 테스트 결과에 복사하지 않는다.
- 기존 기능·암호화 키 게이트, CSRF, 브라우저 바인딩, HttpOnly/Secure/SameSite/path 쿠키 정책을 유지한다.
- 발송·검증 제한을 각각 적용하고 rate limiter 장애 시 차단한다. t-vestra 검증 환경에서 `RATE_LIMIT_BYPASS`가 활성화되지 않도록 확인한다.
- 동시 확인·재전송·다중 탭에도 같은 OTP는 한 번만 소비되고 두 번째 요청에서 새로운 인증 쿠키가 발급되지 않아야 한다.
- OTP 구성 변경만으로 결제 공급자가 바뀌지 않는다. 실 다날 미연동 상태의 신청 전체 완료 검증은 격리된 결제 mock으로 수행하고 t-vestra에서는 인증 구간과 결제 제한을 구분한다.
- 후속 배포는 프로젝트의 t-vestra 선검증 절차를 따른다. 환경변수 변경은 서버 실행 환경에 반영되어야 하며 호스팅 방식에 따라 재배포가 필요할 수 있다.
- 운영 DB는 접촉하지 않는다. 검증은 mock 또는 명시적으로 격리된 로컬 테스트 DB만 사용한다.

## 7. 구현 대상과 우선순위

아래 신규 파일명은 설계 제안이며 기존 책임 경계를 유지하는 범위에서 확정한다.

| 우선순위 | 대상 | 책임 |
| --- | --- | --- |
| P0 | `lib/guest-monitoring/config.ts` 또는 `identity-mode.ts` | 서버 모드 선택, OTP TTL |
| P0 | `lib/guest-monitoring/sms-otp.ts` | 난수·digest·발송·검증 로직 분리 |
| P0 | `lib/guest-monitoring/session.ts`, 기존 start 라우트 | 두 공급자 호출 우회, 기존 세션 발급 계약 연결 |
| P0 | 신규 verify-otp 라우트, `schemas.ts`, `errors.ts` | 서버 입력 검증, endpoint 보안, 표준 응답 |
| P0 | `rate-limit-keys.ts` 재사용, `scripts/audit-api-auth.mjs` | 발송·검증 제한, 공개 라우트 감사 등록 |
| P0 | `types/guest-monitoring.ts`, `guest/guestApi.ts` | OTP 요청·응답 타입과 클라이언트 함수 |
| P0 | 두 useGuest 훅, 두 Auth/Apply 폼, 두 Guest Client | OTP 분기·입력·성공 후 재개 |
| P0 | `components/guest/GuestOtpForm.tsx` 등 공통 컴포넌트 | 코드 입력·확인 표시 분리, 파일당 500줄 이하 |
| P0 | `lib/guest-monitoring/tests/` | 인증·보안·모드 회귀 테스트 |
| P1 | 공통 OTP 상태 훅, 재요청 UX | 중복 로직 축소, 제한·만료 안내 개선 |
| P1 | 환경변수 예시·`lib/guest-monitoring/README.md` | 전환·복귀·발송 설정·결제 한계 운영 안내 |

UI는 표시·입력, 훅은 흐름 조정, 서버 서비스는 검증·세션 소비를 담당한다. 페이지에 인증 비즈니스 로직을 누적하지 않는다. `lib/danal` 수정, 패키지 추가, DB 구조 변경은 계획하지 않는다.

## 8. 테스트와 인수 기준

| 구분 | 필수 검증 | 기대 결과 |
| --- | --- | --- |
| 생성 | 6자리·앞자리 0·세션별 nonce와 digest | SMS mock 호출 인자에서만 코드 확인, 저장값은 `otp:` 해시 |
| 성공 | status·apply 각각 정상 OTP | verified/consumed 갱신, 해시 치환, 두 쿠키 발급, requireSession 통과 |
| 실패 | 오답·없는 ID·다날 세션·손상된 해시·잘못된 코드 형식 | 토큰 발급·검증 상태 변경 없음 |
| 만료 | 만료 전·동일 시각·이후, 초안 만료 | 경계 시각부터 거부, 서버 판정 우선 |
| 바인딩·신원 | 쿠키 누락·교체, UA 변경, 입력 신원 해시 변조, 다른 초안 | 검증·주문 거부 |
| 한 번 사용 | 동일 코드 재요청 및 동시 확인 | 조건부 소비 한 건만 성공 |
| 시도 제한 | 5회 오답 후 6번째 정답, IP 변경·동시 요청 | 6번째부터 429, nonce별 제한 공유 |
| 발송 제한 | IP·입력 신원·전화·일일 한도, 재요청 | 초과 요청에서 SMS 호출 없음 |
| 발송 장애 | success=false·예외·sms_mock·설정 부재 | 503, 대기 세션 폐기, 민감 로그 없음 |
| 보안 래퍼 | Origin 누락·교차 Origin·기능 off·키 부재 | 기존 403·404·503, 인증 DB 소비 전 차단 |
| 모드 | 미설정·danal·오입력·sms_otp, 양방향 전환 | OTP는 명시적 설정에만 활성, 다날 회귀 없음 |
| 핵심 우회 | production 조건에서 getDanalProvider가 503을 던지도록 spy | OTP start 라우트·직접 startIdentity·verify 모두 공급자 호출 0회 |
| 클라이언트 | launch=false인 OTP와 다날 각각, 성공·실패·취소·새로고침 | OTP만 입력 단계, 성공 전 조회·주문 재개 없음 |
| 흐름 재개 | status 단건·다건·빈 목록, apply 주문 실패·초안 수정 경합 | 기존 선택·달력·오류 흐름 보존, 잘못된 주문 생성 없음 |
| 결제 경계 | OTP 성공 후 다날 결제 503 | 인증 성공과 결제 실패를 구분, 감시 활성화 없음 |
| 비밀·개인정보 | DB 쓰기·응답·로그·브라우저 저장소 spy | 코드 원문·이름·전화·토큰의 금지 위치 노출 없음 |

후속 구현 검증 명령은 `npx vitest run --config lib/guest-monitoring/vitest.config.ts`, `npm run audit:api`, `npm run lint`, `npm test`, `npm run build`를 기준으로 한다. 루트 Vitest는 `__tests__`만 포함하므로 비회원 전용 테스트 실행을 생략하지 않는다. DB 통합 테스트는 기존 `GUEST_TEST_DATABASE_URL`의 격리된 루프백 가드를 유지하며 환경이 없으면 미실행 사실을 별도 보고한다.

최초 제공의 완료 조건은 P0 요구사항과 위 필수 검증 통과, 기능 파일 500줄 제한, 다날 모드 회귀 없음, 운영 DB 미접촉이다. 이번 기획 단계에서는 실행 결과를 주장하지 않으며 기능 코드·설정·테스트 파일을 수정하지 않는다.
