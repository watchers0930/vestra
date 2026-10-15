# PortOne V2 다날 테스트 결제 — 백엔드 교차검수 (Codex 구현분)

> 검수자: Claude (크로미) · 작성일: 2026-10-15
> 대상: 커밋 안 된 변경분 (`git diff` / 신규 untracked) 중 백엔드 경로
> 범위: `app/api/`, `lib/danal/`, `lib/guest-monitoring/`, `types/`, `prisma/`
> 기준 설계: [`docs/02-design/features/portone.design.md`](../02-design/features/portone.design.md)
> 관점: 보안(인증·CSRF·입력검증·IDOR)·버그·성능(N+1·중복호출)·설계 스펙 일치
> ⚠️ 코드는 수정하지 않았습니다. 리뷰·지적만.

---

## 0. 검수 대상 파일

**신규(untracked)**
- `lib/danal/portone-config.ts`, `portone-callback.ts`, `portone-rest.ts`, `portone.ts`, `portone-payment.ts`, `portone-test-channels.ts`
- `lib/guest-monitoring/payment-callback.ts`, `record-payment.ts`, `record-terminal-payment.ts`
- `lib/guest-monitoring/tests/portone.test.ts`(18), `portone-boundaries.test.ts`(12)

**변경(modified)**
- `app/api/guest-monitoring/payment/callback/route.ts`
- `lib/danal/index.ts`, `types.ts`
- `lib/guest-monitoring/activation.ts`, `errors.ts`, `order.ts`
- `types/guest-monitoring.ts`

---

## 1. 총평

전반적으로 **설계 계약(§0.1 fail-closed, §2~§4 서버 재검증, §4.4 nonce 원자소비)을 충실히 구현**했고, 보안 설계가 견고합니다. 특히:

- ✅ `verifiedTestChannels = []`로 **SDK 실행을 기본 차단**(§0.1 P0). env 이름만으로 무출금 보장하지 않음.
- ✅ 브라우저 금액·상태 불신 → REST 재조회로 금액·통화·상점·채널(TEST)·`isForTest`·시각 **전수 재검증**(§3.4).
- ✅ HMAC `timingSafeEqual`, nonce 조건부 1회 소비(CAS `updateMany` count===1), `P2002` 경합 처리(§4.4).
- ✅ 브라우저 경로 Origin 재검증(Referer 폴백 차단) + OTP 세션 + 주문-신원 결합(IDOR 차단)(§4.2).
- ✅ REST 고정 호스트 + `redirect:"error"`(SSRF 방지) + 8s timeout + 오류 분류(503 vs 404) + 원문/secret 미노출.
- ✅ 미확정(READY/PAY_PENDING/가상계좌)·PARTIAL_CANCELLED → 가짜 승인 미생성, `payment_pending`/거부 분리(§3.4).
- ✅ 파일당 500줄 이하, 책임 분리(config/callback/rest/adapter/record) 준수.

**보안을 깨는 치명적(Critical) 결함은 발견되지 않았습니다.** 아래는 설계 일치·견고성·성능 관점의 지적입니다.

---

## 2. 지적 사항

### [MED] REST 404를 일시장애와 구분하지 않고 `payment_failed`(400)로 축약

- **파일:** `lib/danal/portone-rest.ts:5-7, 27` · 사용처 `lib/guest-monitoring/payment-callback.ts:24-26`
- **문제:** `PortonePaymentNotFound`는 "내부적으로 구분 유지"라는 주석(`portone-rest.ts:4`)이 있으나 실제로는 `GuestError("payment_failed", 400)`을 상속만 하고, 호출부(`verifyPayment`→`paymentCallback`의 catch)는 `PortoneTerminalPayment`만 특별 처리하고 **404는 그대로 재던져 브라우저에 `payment_failed`(400)로 노출**됩니다. 설계 §4.1/§4.3은 "**404(결제 미존재)는 초안 API 404와 구분하여 승인 여부를 재확인**"하라고 명시(일시 전파 지연 대비). 현재 구현은 이 분기를 사실상 없앴습니다.
- **영향:** PortOne REST의 eventual consistency로 SDK 성공 직후 잠깐 404가 나면, 콜백이 "확정 실패"로 응답 → 프론트(§6.3)가 이를 "비401 결제 실패 → 새 결제"로 분류하면 **이미 성립됐을 수 있는 결제 위에 새 주문/멱등키 생성(중복결제) 위험**. (현재는 테스트 채널·무출금이라 금전 피해는 없으나, 운영 전환 시 실질 위험.)
- **수정 제안:** 404를 `payment_failed`가 아니라 **별도 전용 코드(예: 일시장애 → `provider_unavailable` 503, 또는 `payment_pending` 409)로 분류**해 "확정 실패"로 오분류되지 않게 한다. `PortonePaymentNotFound`가 `payment_failed`를 상속하는 대신 호출부에서 `instanceof` 분기해 재확인/재시도 경로로 보낸다.

---

### [MED] 콜백 1건당 PortOne REST GET이 최소 2회(최대 3회) — 중복 외부 호출

- **파일:** `lib/guest-monitoring/payment-callback.ts:24, 40` (`verifyPayment`→`getPaymentById`, 이어 `getPayment`→`getPaymentById`) · 추가로 `record-payment.ts`도 재조회 로직 포함
- **문제:** `verifyPayment`가 이미 `getPaymentById`로 전수 검증 후 `PaymentResult`를 반환하는데, 곧바로 `getPayment(verificationReference)`가 **동일 `paymentId`로 REST를 한 번 더** 호출합니다. 설계 §3.3의 "재조회 방어" 패턴을 따른 것이라 **스펙 위반은 아니나**, 동일 결제에 대한 외부 결제사 GET 2회는 지연·비용·레이트리밋 부담입니다. 터미널(failed/canceled) 경로에서는 `verify`(1) + `getPayment`(2)로 또 호출됩니다.
- **영향:** 기능상 정상. 성능/외부 의존도만 증가.
- **수정 제안:** 설계상 의도된 이중 재조회면 **설계 근거를 주석에 명시**하거나, `verifyPayment`가 반환한 결과를 신뢰하고 `recordPayment` 경계에서만 1회 재검증하도록 호출 횟수를 줄이는 방안을 §3.3와 함께 재검토. (설계 변경이 필요하면 코드가 아니라 설계서를 먼저 수정 — §0 규칙.)

---

### [MED] `mapPayment`의 중복 transactionId 조회가 콜백 경로에서 2~3회 반복

- **파일:** `lib/danal/portone-payment.ts:50` (`mapPayment` 내 `findUnique(providerTransactionId)`) · `lib/guest-monitoring/record-payment.ts:45` (동일 조회 재수행)
- **문제:** 같은 `transactionId` 중복결합 방어 쿼리가 `verifyPayment→mapPayment`, `getPayment→mapPayment`, `recordPayment` 각각에서 수행되어 **단일 콜백에 동일 DB 조회가 2~3회** 발생합니다. 결제 금액·통화·상점 재검증도 세 번 반복됩니다.
- **영향:** 정확성 문제는 없으나 불필요한 DB 왕복. (단건이라 N+1급은 아님.)
- **수정 제안:** 최종 권위 검증을 `recordPayment`(트랜잭션·CAS) 경계로 모으고, 상위 `mapPayment` 호출의 중복 검증은 경량화. 설계 §4.4가 "기록 경계 원자성"을 요구하므로 권위 검증은 그 경계 1곳이 자연스럽다.

---

### [LOW] `scripts/audit-api-auth.mjs` ALLOWLIST 사유가 PortOne 브라우저 경로 보호를 반영하지 않음

- **파일:** `scripts/audit-api-auth.mjs:47`
- **문제:** 설계 §9/B12는 "payment/callback ALLOWLIST **사유 갱신**(브라우저 경로 Origin+세션+IDOR+nonce 1회소비 명시)"를 요구하나, 현재 사유는 기존 "외부 PG — HMAC + 재조회 금액검증 + nonce" 문구 그대로입니다(Origin·세션·IDOR 미언급). `audit:api`는 키 존재로 통과하므로 게이트는 깨지지 않지만 **문서화 계약 미이행**.
- **수정 제안:** 사유 문자열에 "PortOne 브라우저 경로: `validateOrigin`(403)+`requireSession`(401)+주문-신원 결합(404)+조건부 nonce 1회소비" 추가.

---

### [LOW] `GUEST_PAYMENT_MODE=portone`와 본인인증 모드의 암묵적 결합

- **파일:** `lib/danal/portone.ts:13-16` (`identity.startVerification/verifyResult` → `unavailable()`) · `lib/guest-monitoring/session.ts:21-22`
- **문제:** PortOne `identity`를 의도적으로 503 차단(설계 §2.4 오용 방어)한 것은 올바르나, 이는 **본인인증 모드가 `sms_otp`임을 전제**합니다(`session.ts:21`에서 OTP면 `getDanalProvider()` 미호출). 만약 운영에서 `resolveIdentityMode()`가 `sms_otp`가 아닌데 결제만 `portone`으로 켜지면 **본인인증 시작이 503**으로 깨집니다.
- **영향:** 현재 임시 OTP 모드(최근 커밋 v5.199.1)라 실제 문제 없음. 운영 전환 시 설정 조합 주의 필요.
- **수정 제안:** README/배포 체크리스트에 "portone 결제 활성화는 `sms_otp` 본인인증 모드 전제" 명시. (코드 변경 불필요.)

---

### [LOW] 콜백 라우트의 세션 purpose 불일치 시 401이 아닌 404 반환 (일관성)

- **파일:** `app/api/guest-monitoring/payment/callback/route.ts:11`(`requireSession(req, ["apply","renewal"])`) · `lib/guest-monitoring/session.ts:80`
- **문제:** 유효하지만 `purpose`가 `status`인 세션은 `requireSession` 내부에서 `notFound()`(404)를 던집니다. 반면 서비스 계층 `payment-callback.ts:14`은 동일 상황을 `session_required`(401)로 처리하도록 작성돼 **라우트가 먼저 404를 던져 서비스의 401 분기에 도달하지 못함**. 설계 §3.3 표는 세션 문제를 401, IDOR를 404로 구분.
- **영향:** 기능 차단은 정상(어느 쪽이든 거부). 상태코드 의미만 불일치.
- **수정 제안:** 라우트/서비스 중 한 곳으로 세션 검증을 일원화하거나, purpose 불일치를 401로 통일.

---

### [LOW] `let session;` 암묵적 any + `new Request(req.url, …)` 우회 패턴

- **파일:** `app/api/guest-monitoring/payment/callback/route.ts:6, 10`
- **문제:** ① `let session;`은 타입이 암묵 any로 흐릅니다(런타임 영향 없음, 가독성·타입안전 저하). ② Origin만 검증하려고 `new Request(req.url, { headers:{origin} })`를 만들어 `validateOrigin`에 통과시키는 방식은 영리하나 **의도가 드러나지 않습니다**(Referer 폴백 배제 목적). 로직 자체는 정확(검증 실패 시 truthy 반환 → throw).
- **수정 제안:** `session`에 `Awaited<ReturnType<typeof requireSession>> | undefined` 명시. Origin 전용 검사는 전용 헬퍼(예: `requireAllowedOrigin(origin)`)로 추출해 의도를 명확히.

---

### [LOW] 스키마 주석(providerMode/providerReceipt) 미갱신

- **파일:** `prisma/schema.prisma:1199`(`// mock | danal`), `:1190`(`격리 목의 … 증빙`)
- **문제:** 코드가 `providerMode`에 `"portone"`을 기록하고 `providerReceipt`에 `portone_v1:` 상태머신을 저장하지만, 스키마 주석은 기존 mock/danal 설명 그대로입니다. (컬럼 자체는 문자열이라 **DB 변경 없음 — 설계 §2.1 준수**.)
- **수정 제안:** 주석에 `| portone`, "PortOne nonce 상태머신(§2.2) 재사용" 추가. 주석만 변경이므로 DB 영향 없음.

---

## 3. 설계 스펙 일치 여부 요약

| 설계 항목 | 구현 | 판정 |
| --- | --- | --- |
| §0.1 fail-closed(채널 미확인 시 차단) | `portone-test-channels.ts` 빈 배열 → `getPortoneConfig` 503 | ✅ |
| §3.1 공급자 resolver(충돌/미설정 503, portone/mock만) | `portone-config.ts:4-11` | ✅ |
| §2.3 HMAC 문맥·canonical 키 순서·전용 파생키 | `portone-callback.ts:12-16, 31-43` | ✅ |
| §3.4 REST 재조회 6개 조건 전수 검증 | `portone-payment.ts:29-51` | ✅ |
| §4.4 nonce 원자소비(CAS count===1·P2002) | `record-payment.ts:47-57, 66` | ✅ |
| §4.2 Origin 재검증+세션+IDOR 결합 | `route.ts:8-12` + `payment-callback.ts:13-21` | ✅ |
| §3.4 미확정/PARTIAL_CANCELLED 분리 | `portone-payment.ts:32, 38` | ✅ |
| §4.1 **404 구분 재확인** | `portone-rest.ts:27`에서 `payment_failed`로 축약 | ⚠️ **미흡(MED)** |
| §9/B12 audit ALLOWLIST **사유 갱신** | 사유 문자열 미변경 | ⚠️ **미이행(LOW)** |
| §2.1 DB 컬럼/마이그레이션 변경 없음 | 기존 컬럼만 재사용 | ✅ |
| §3.7 cron 자동취소/환불 없음 | `recovery.ts`에 `cancelPayment` 미호출 | ✅ |

---

## 4. 누락 · 위험 · 우선순위 (검증 규칙 형식)

**누락**
- REST 404 전용 처리(재확인 경로) — 설계 §4.1 요구사항 대비 미구현.
- audit ALLOWLIST 사유 갱신(§9/B12).
- 스키마 주석 갱신(기능 아닌 문서).

**위험**
- (MED) 404→`payment_failed` 축약으로 인한 운영 전환 시 중복결제 가능성(프론트 분류와 결합).
- (LOW) portone 결제 ↔ sms_otp 본인인증 모드 결합 — 설정 조합 오류 시 인증 503.

**우선순위**
1. **404 분류 재설계(MED)** — 설계서 §4.1/§4.3 기준으로 코드 아닌 설계 확정 후 어댑터/호출부 반영.
2. audit ALLOWLIST 사유 갱신(LOW, `npm run audit:api` 계약).
3. 중복 REST/DB 조회 정리(MED, 성능) — §3.3 재조회 방침 재검토와 함께.
4. 타입/주석/상태코드 일관성(LOW).

---

## 5. 검증 권고 (미수행 — 리뷰만)

- 본 리뷰는 **정적 코드 검토**입니다. 설계 §0-1/§0-5에 따라 "완료"는 **무출금 다날 테스트 채널 실연동 + t-vestra 실환경 확인**까지 필요하며, 현재 `verifiedTestChannels` 비어 있어 **실동작은 의도적으로 차단된 상태**입니다. 코드 통과만으로 "실결제 동작 완료"로 보고하지 마십시오.
- 추가 권고: `npm run lint` / `npx vitest run --config lib/guest-monitoring/vitest.config.ts` / `npm run audit:api` / `npm run build` 실제 통과 여부 확인(본 검수에서는 미실행).
</content>
</invoke>
