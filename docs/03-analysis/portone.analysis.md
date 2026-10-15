# PortOne V2 다날 테스트 결제 · 신청 복구 — 설계 대비 구현 갭 분석

> 프로젝트: VESTRA
> 작성일: 2026-10-15
> 작성자: Claude (크로미)
> 기준 설계: [`docs/02-design/features/portone.design.md`](../02-design/features/portone.design.md) (753줄, 공용 계약서)
> 교차검수: [`portone.review-backend.md`](./portone.review-backend.md) · [`portone.review-frontend.md`](./portone.review-frontend.md)
> 대상: 커밋 전 워킹트리(백엔드 Codex + 프론트 Claude, **교차수정 반영 후**)
> 방법: 설계서 전문 ↔ 실제 구현 코드 1:1 대조 + 교차검수 지적 해소 여부 재검증. 테스트·린트 실제 실행.
> 범위 밖: 다날 V2 테스트 채널 실연동(§0.1 P0 미확인으로 503 차단 중), 실브라우저/실PG 검증.

---

## 1. Match Rate (일치율)

| 영역 | 일치율 | 근거 요약 |
| --- | --- | --- |
| **백엔드 (lib/danal, lib/guest-monitoring, app/api)** | **96%** | §2~§4 서버 재검증·nonce 원자소비·Origin/세션/IDOR·fail-closed 전부 스펙대로. 잔여는 문서성 LOW(audit 사유·prisma 주석·상태코드 일관성) |
| **프론트엔드 (guest/, hooks/, types/)** | **90%** | §5·§6 복구 계약(401 분리·입력 보존·실패 분류·세대관리·모바일 복귀·콜백 재전송·연장) 전부 구현. 유일한 실행 차단은 **SDK 미설치(B11)** |
| **종합** | **≈ 92%** | 보안·로직 계약은 사실상 완전 일치. 미달은 전부 "설계가 별도 변경으로 분리한 선행작업(SDK 설치)"과 "문서성 미갱신"이며 핵심 로직 결함 아님 |

**해석:** 구현은 설계 계약을 **매우 충실히** 따랐다. 교차검수에서 지적된 백엔드 MED 3건 중 2건 해소·1건 설계 근거 명시, 프론트 HIGH 5건 중 4건 완전 해소·1건(SDK 설치)만 범위 밖 보류, MED 2건 모두 해소. 92%를 깎는 8%는 대부분 **"로컬에서 됐다 ≠ 실제로 됐다"(규칙 0-1)** 영역 — SDK 미설치·채널 미확인으로 **실동작은 설계 의도대로 503 차단된 상태**이며, 이는 결함이 아니라 미완 선행작업이다.

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### 2.1 실행 차단 — 선행작업 미완 (설계가 "별도 변경"으로 분리한 항목)

| # | 설계 근거 | 구현 상태 | 영향 |
| --- | --- | --- | --- |
| G1 | §1.2 B11 — `@portone/browser-sdk` 설치(package.json+lockfile) | **미설치.** `package.json`·lockfile·node_modules 모두 없음. `guestPayment.ts:69`의 동적 import는 `loadSdk()`에서 실패→`null` | PortOne 인라인 결제 실행 불가. 단, `loadSdk` 실패 시 `{kind:"unavailable"}`로 degrade하여 "승인 대기"로 숨기지 않고 오류 유지+재시도 유도(프론트 HIGH#1 지적 해소). 서버는 `verifiedTestChannels=[]`로 실행정보 발급 전 503 차단 |
| G2 | §0.1 P0 — 다날 V2 테스트 채널·payMethod 콘솔 증빙 확인 | **미확인.** `portone-test-channels.ts:14` 빈 배열. README에 "콘솔 증빙 없어 미확인, V1/타PG 대체 금지" 명시 | 설계 의도대로 **fail-closed**. 결함 아님. 채널 확인 전까지 "실동작 완료" 보고 불가(설계 §8 완료조건·규칙 0-1) |

> G1·G2는 설계가 **채널 확인과 독립**(§0.1, §7)으로 분리한 선행작업이며, 구현/README가 이를 명시적으로 범위 밖 처리했다. "코드 통과 = 완료"로 오인하지 않은 점은 규칙 0-1/0-4 준수.

### 2.2 문서성 미갱신 (기능 영향 없음)

| # | 설계 근거 | 구현 상태 | 비고 |
| --- | --- | --- | --- |
| G3 | §1.2 B12 / §9 — `audit-api-auth.mjs` payment/callback ALLOWLIST 사유 갱신(Origin+세션+IDOR+nonce 명시) | **미갱신.** `scripts/audit-api-auth.mjs:47` 사유 = 기존 "HMAC + provider 재조회 금액검증 + nonce 1회소비 + IP rate limit" 그대로. Origin·세션·IDOR 미언급 | `audit:api`는 ALLOWLIST 존재로 통과하므로 게이트는 안 깨짐. **문서 계약 미이행**(백엔드 LOW 미해소) |
| G4 | §2.1 / 백엔드 LOW#8 — prisma 주석 `providerMode`/`providerReceipt`에 portone 반영 | **미갱신.** `schema.prisma`: `providerMode // mock \| danal`, `providerReceipt // 격리 목의 서명된 서버 재조회 증빙` 그대로 | 컬럼은 문자열이라 **DB 변경 없음(§2.1 준수)**. 주석만 미반영 |

### 2.3 설계 파일목록과의 구조 차이 (정당한 확장 — 결함 아님)

| 항목 | 설계 §1.2 | 실제 | 판정 |
| --- | --- | --- | --- |
| 서버 어댑터 분할 | config/callback/rest/portone 4파일 | + `portone-payment.ts`(findPaymentOrder/mapPayment/PortoneTerminalPayment), `portone-test-channels.ts` 추가 분할 | ✅ 단일책임 강화. 각 파일 ≤76줄 |
| 서비스 분할 | activation.ts 변경 | + `payment-callback.ts`, `record-payment.ts`, `record-terminal-payment.ts` 분리 | ✅ activation.ts 52줄 유지. §4.4 기록경계 명확화 |
| 프론트 훅 | `useGuestApply` ≤470줄, 초과 시 `applyFailure.ts` 분리 | `useGuestApply` 408줄 + **신규 `useGuestOrderFlow.ts`(268줄)**로 주문/결제/복구 상태머신 분리 + `applyFailure.ts`(64줄) | ✅ 설계 "분리 트리거"(§1.2) 정신에 부합. 500줄·단일책임 준수 |
| 연장 흐름 | §11 "공용 orders/provider 호환만 확인, 신규 UI 범위 밖" | `useGuestStatus.ts`를 `runPayment`/`resendOrderCallback`로 수정(프론트 HIGH#4 대응) | ⚠️ 설계 파일목록엔 없으나 **교차검수가 회귀로 요구** → 올바른 확장 |

### 2.4 미세 중복 (정리 권장, LOW)

- **G5. `GuestPaymentCallbackRequest` 타입 2중 정의.** 설계 §2.4.1은 `types/guest-monitoring.ts`에 추가하라 했고 실제로 추가됨(`types/guest-monitoring.ts:87-91`). 그런데 `guestApi.ts:40-44`가 동일 타입을 프론트 레이어에 **다시 선언**("공유 타입 안 건드린다" 주석). 소비처(`guestPayment.ts`)는 `guestApi`쪽을 import → `types/`의 정의는 **사실상 미사용 중복**. 기능 영향 없으나 SSOT 원칙상 한쪽으로 정리 권장.

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수
2. 단일 책임           : ✅ 준수
3. 서버 검증·보안      : ✅ 준수 (상태코드 일관성 LOW 1건)
4. 성능 (중복·N+1)     : ✅ 준수 (의도된 2회 REST 재조회 — 설계 §3.3 명시)
5. 폴더 구조           : ✅ 준수
─────────────────────────────────────────────────
위반 항목: 없음 (LOW 개선권고 3건은 아래)
─────────────────────────────────────────────────
```

**1. 500줄 제한** — 전 파일 500줄 이하. 최대 `useGuestStatus.ts` 476, `useGuestApply.ts` 408, `useGuestOrderFlow.ts` 268, `guestPayment.ts` 240. 서버 어댑터 전부 ≤76줄. ✅

**2. 단일 책임** — UI(components, 미변경)/상태·로직(hooks)/결제 프로토콜(`guestPayment.ts`)/HTTP(`guestApi.ts`)/실패 분류(`applyFailure.ts` 순수함수) 분리. 서버는 config/서명/REST/어댑터/기록경계 분할. 페이지에 결제 프로토콜 없음. ✅

**3. 서버 검증·보안** — 매우 견고:
- 브라우저 금액·상태 **불신** → REST 재조회로 금액·통화·상점·채널(TEST)·`isForTest`·`pgProvider`·시각 **전수 재검증**(`portone-payment.ts:29-49`).
- HMAC `timingSafeEqual`(`portone-callback.ts:43`), canonical 키순서 서명, 전용 파생키(`SEARCH_INDEX_KEY||AUTH_SECRET` 기반, secret 미노출).
- nonce **조건부 1회 소비** CAS `updateMany count===1` + `P2002` 경합 처리(`record-payment.ts:56-66, 75`).
- 브라우저 경로 **Origin 재검증(Referer 폴백 차단)** + OTP 세션 + 주문-신원 결합 IDOR 차단(`route.ts:11-16`, `payment-callback.ts:14-21`).
- 오류에 원문 REST·secret·PII 미포함. SSRF 방지(`redirect:"error"`, 고정 호스트).
- ⚠️ LOW: `route.ts:16` `requireSession(req,["apply","renewal"])`가 purpose=status 세션에 **404**를 먼저 던져, 서비스층 401(`payment-callback.ts:14`)에 도달 못 함 → 설계 §3.3 표(세션=401, IDOR=404)와 상태코드 의미 불일치. 기능 차단은 정상.

**4. 성능** — 중복 호출 점검:
- 콜백 1건당 PortOne REST GET **2회**(`verifyPayment`→`getPaymentById`, 이어 `getPayment`→`getPaymentById`). 설계 §3.3/§4.4 "재조회 방어"에 따른 **의도된** 설계이며 `payment-callback.ts:28,42-43`에 근거 주석 추가됨(교차검수 MED#2 대응).
- `mapPayment`의 중복 transactionId 소유권 조회는 **제거**, 기록경계(`recordPayment`/`recordTerminalPayment`)로 일원화(`portone-payment.ts:50-52` 주석, 교차검수 MED#3 해소).
- 복구 `take:50` 상한, 기존 rate limiter 재사용. N+1 없음. ✅

**5. 폴더 구조** — 공급자=`lib/danal`, 서비스=`lib/guest-monitoring`, 라우트=`app/api/...`, 타입=`types/`, 클라=route 아래 `guest`/`hooks`. ✅

**API 보안 체크리스트(CLAUDE.md):**
- 인증 없는 변이 핸들러: `payment/callback`은 공개 콜백이나 portone 경로에 Origin+세션+IDOR+nonce 추가. 신규 미인증 변이 없음.
- dead code endpoint: `payment/callback`은 `guestApi.paymentCallback`→`startOrder`/`resendOrderCallback`에서 실제 호출. 미사용 아님.
- ⚠️ 단, **audit ALLOWLIST 사유 미갱신(G3)** — 게이트는 통과하나 문서 계약 미이행.

---

## 4. 교차검수 지적사항 해소 여부

### 4.1 백엔드 (review-backend.md)

| # | 심각도 | 지적 | 해소 여부 | 근거 |
| --- | --- | --- | --- | --- |
| B-1 | MED | REST 404를 일시장애와 구분 않고 `payment_failed`(400)로 축약 | ✅ **해소** | `portone-rest.ts:6-7` `PortonePaymentNotFound`가 이제 `provider_unavailable`(503) 상속 + `:28`에서 404시 throw → 호출부 재시도 가능한 503으로 전파. 중복결제 오분류 위험 제거 |
| B-2 | MED | 콜백당 REST GET 2~3회 중복 | ✅ **해소(설계 근거 명시)** | 2회는 §3.3/§4.4 의도된 재조회 방어임을 `payment-callback.ts:28,42-43` 주석으로 명시. 터미널 3회째도 "검증 후 상태 전이 가능"이라 유지. 교차검수 수정제안 1안(주석 명시) 채택 |
| B-3 | MED | `mapPayment` 중복 transactionId 조회 2~3회 | ✅ **해소** | 소유권 조회를 기록경계로 이동, `mapPayment`는 read-only(`portone-payment.ts:50-52` 주석). 중복 DB 왕복 제거 |
| B-4 | LOW | audit ALLOWLIST 사유 미갱신 | ❌ **미해소** | `audit-api-auth.mjs:47` 사유 미변경(G3). README에 "이번 작업 수정 허용 경로 밖" 명시 |
| B-5 | LOW | portone 결제 ↔ sms_otp 본인인증 모드 암묵 결합 | ⚠️ **부분** | `lib/danal/README.md` 신규 작성, "SMS OTP는 기존 경로 유지"(:4) 언급. 다만 "portone 결제=sms_otp 전제" **명시적 경고 문구는 없음**. 코드 변경 불필요건 |
| B-6 | LOW | 세션 purpose 불일치 시 401 아닌 404 | ❌ **미해소** | `route.ts:16` 그대로 → status 세션에 404 선반환(§3.3 표와 불일치, §3.3 본문의 LOW) |
| B-7 | LOW | `let session;` 암묵 any + `new Request` 우회 | ❌ **미해소** | `route.ts:9,14` 그대로. 로직은 정확(Origin 전용·Referer 폴백 배제) |
| B-8 | LOW | prisma 주석 미갱신 | ❌ **미해소** | G4 |

**백엔드 핵심(MED) 3건 전부 해소.** LOW 5건 중 1건 부분(README), 4건 미해소(전부 문서·타입·상태코드 수준, 기능 무영향).

### 4.2 프론트엔드 (review-frontend.md)

| # | 심각도 | 지적 | 해소 여부 | 근거 |
| --- | --- | --- | --- | --- |
| F-1 | HIGH | SDK 의존성 누락으로 결제 실행 불가 | ⚠️ **부분(설치 보류, degrade 해소)** | `@portone/browser-sdk` **여전히 미설치**(G1). 단 지적의 핵심인 "실패를 승인 대기로 덮어쓰기"는 해소: `loadSdk` 실패→`{kind:"unavailable"}`(`guestPayment.ts:102-106`)→`retry_payment`로 오류 유지·같은 주문 재실행 유도(`useGuestOrderFlow.ts:242-249`). 설치 자체는 범위 밖 보류 |
| F-2 | HIGH | 모바일 복귀 시 서명 문맥 재발급·콜백 누락 | ✅ **해소** | 복귀 effect가 `advanceOrder(orderId, draftId)`→`resendOrderCallback`로 **동일 멱등키 문맥 재발급 후 콜백 재전송**(SDK 재실행·새 주문 없음). `useGuestApply.ts:266-277`, `guestPayment.ts:189-240`. 연장은 `useGuestStatus.ts:170-203` 마운트 effect |
| F-3 | HIGH | 콜백 일시 실패 후 복구 문맥 폐기 | ✅ **해소** | `resend_callback` 분류 신설(`applyFailure.ts:15`), pending→동일 문맥 재전송(`useGuestOrderFlow.ts:135-144`). 401/영구거부(400/403/404)는 `applyFailureOutcome`로 **별도 분류**(승인 대기로 숨기지 않음, `:238-239`) |
| F-4 | HIGH | 연장 흐름에 공급자 전환 미반영(회귀) | ✅ **해소** | `useGuestStatus.startRenew`가 `runPayment(payment, GUEST_STATUS_PATH)`→confirm시 콜백→`finalizeRenew`로 확정(`:347-411`). mock/다날 경로 보존 |
| F-5 | HIGH | 조회 장애를 주문 생성 재시도로 처리해 SDK 재실행 | ✅ **해소** | ①`classifyApiFailure`가 생성/조회/콜백 실패 분리(`applyFailure.ts:30-40`) ②주문 존재 시 `advanceOrder`(GET만), 없을 때만 `startOrder`(`useGuestApply.ts:354-368`) ③`verifyApplyOtp`가 `existingOrderId` 확인 후 분기(`:222-227`) ④`payingRef` 동기 재진입 잠금(`:197-198`) |
| F-6 | MED | 세대 관리가 parse·인증발송·언마운트 미보호 | ✅ **해소** | `submitParse` 세대 캡처·비교(`:90-91,108`), `startIdentity`(`:159,169`), **언마운트 세대 무효화 effect**(`:72-76`), `goInput`의 `setBusy(false)`(`:139`) |
| F-7 | MED | 404·draft_expired 만료 재개 참조 잔존 | ✅ **해소** | `applyFailureOutcome` reparse 분기가 **해당 대상 주문·멱등키 폐기 + 세대++ + draft/orderState 정리**(`useGuestOrderFlow.ts:94-107`). 대상 단위 정리(전체 clear 아님) |

**프론트 HIGH 5건 중 4건 완전 해소, 1건(SDK 설치)만 범위 밖 보류(degrade 처리는 해소). MED 2건 전부 해소.** 린트 통과, 서버 mock/경계 테스트 **92건 전부 통과**(`npx vitest run`, 실행 확인).

---

## 5. 종합 의견 및 남은 수정 우선순위

### 5.1 종합

구현 품질은 **대표급(규칙 0)** 기준에 부합한다. 특히:
- **보안 계약 완전 이행** — 브라우저 불신·REST 전수 재검증·nonce 원자소비·Origin/세션/IDOR·fail-closed가 설계 그대로. 치명적 결함 없음.
- **교차검수 핵심 지적 대부분 해소** — 백엔드 MED 3/3, 프론트 HIGH 4/5(+degrade)·MED 2/2.
- **규칙 0-1 준수** — SDK 미설치·채널 미확인을 숨기지 않고 503 차단 + README 명문화. "코드 통과 = 완료"로 오인하지 않음.

**단, 현재 상태로는 "다날 V2 테스트 결제 실동작 완료"를 선언할 수 없다** — G1(SDK)·G2(채널)가 남아 실결제 경로가 의도적으로 차단돼 있다. 이는 설계가 예고한 미완 선행작업이다.

### 5.2 남은 수정 우선순위

| 순위 | 항목 | 분류 | 조치 |
| --- | --- | --- | --- |
| **P0** | G2 — 다날 V2 테스트 채널·payMethod **콘솔 증빙 확인** 후 `portone-test-channels.ts` 등록 | 선행 차단 | §0.1. 확인 전 아래 모든 것이 무의미(503 차단). **값은 노출 없이** |
| **P0** | G1 — `@portone/browser-sdk` 설치(package.json+lockfile, **별도 변경**) + 설치 후 타입으로 `guestPayment.ts`의 `@ts-ignore`/`any` 경계 교체 | 선행 차단 | §1.2 B11. lockfile 변경은 영향범위 먼저 확인 |
| **P1** | G3 — audit ALLOWLIST 사유 갱신(Origin+세션+IDOR+nonce 명시) | 문서 계약 | `audit-api-auth.mjs:47`. CLAUDE.md API 보안 체크리스트 이행 |
| **P1** | B-6 — 콜백 라우트 세션 purpose 불일치를 **401로 통일**(route/서비스 일원화) | 상태코드 일관성 | §3.3 표 준수 |
| **P2** | G4 — prisma 주석 `\| portone`·nonce 상태머신 반영 (DB 변경 없음) | 문서 | `schema.prisma` |
| **P2** | B-5 — README에 "portone 결제 활성화는 sms_otp 본인인증 전제" 경고 추가 | 문서 | 설정 조합 오류 방지 |
| **P2** | G5 — `GuestPaymentCallbackRequest` 2중 정의 한쪽으로 통일(SSOT) | 정리 | `types/` vs `guestApi.ts` |
| **P3** | B-7 — `route.ts` `session` 타입 명시 + Origin 전용 검사 헬퍼 추출 | 가독성 | 로직 정확, 선택적 |

### 5.3 완료 판정 (규칙 0-1/0-5)

설계 §8 완료조건 기준 현재 상태:
- ✅ 서버 위변조 거부·nonce 1회 소비·미확정 분리 — 테스트 92건 통과로 확인
- ✅ SMS OTP 불변·파일당 500줄·운영 DB 미접촉
- ✅ 두 복구 버그(401 재인증·입력 보존) + 추가 통합결함(모바일복귀·콜백재전송·연장·세대관리) 해소
- ❌ **SDK/REST 실제 테스트 연동 성공** — G1·G2로 미달. **실환경(t-vestra) 무출금 다날 테스트 채널 검증 전까지 "실동작 완료" 보고 금지**

> 본 분석은 정적 대조 + 단위테스트/린트 실행까지다. 실브라우저·실PG·운영 DB 검증은 미수행이며, 완료는 규칙 0-1에 따라 **대장 확인이 가능한 실환경 결과**로만 선언한다.
