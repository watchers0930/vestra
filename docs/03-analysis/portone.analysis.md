# PortOne V1(다날 카드) 테스트 결제 — 설계 ↔ 구현 갭 분석

> 프로젝트: VESTRA
> 작성일: 2026-10-15 · 작성: 크로미(Claude)
> 기준 설계: [`docs/02-design/features/portone.design.md`](../02-design/features/portone.design.md) (773줄, 공용 계약서)
> 교차검수: [`portone.review-backend.md`](./portone.review-backend.md) · [`portone.review-frontend.md`](./portone.review-frontend.md)
> 대상: 교차수정 반영 후 현재 워킹트리(미커밋) — `lib/danal/*`, `lib/guest-monitoring/*`, `app/api/guest-monitoring/payment/*`, `app/(personal-home)/renewal/monitoring/*`
> 방법: 설계서 전문 ↔ 실제 구현 코드 1:1 대조 + 교차검수 지적 해소 여부 재검증(현재 라인 재확인). 테스트·린트 실제 실행.
> 검증 실행: `npx tsc --noEmit` ✅ · `vitest(guest-monitoring)` ✅ 264 passed / 28 skipped / 13파일 · 변경 FE 7파일 ESLint ✅
> 범위 밖: §0.1 P0 증빙 미확정으로 실 REST/SDK는 503 차단 중 — 실브라우저/실PG 검증 미수행
>
> ⚠️ **본 파일은 과거 PortOne V2 분석을 대체한다.** 설계가 V2→V1으로 전면 갱신됨에 따라 V2 기준(npm SDK 설치·V2 채널·미분리 `useGuestStatus`) 서술은 모두 폐기했다.

---

## 1. Match Rate (일치율): **약 93%**

설계서는 경로·DTO·상태매핑·에러코드·보안모델·파일분리를 고정한 **계약서**다. 현재 구현은 이 계약의 핵심 — 승인=서버 V1 재조회 SSOT, HMAC+nonce 1회 소비, Origin+세션+IDOR, imp_uid↔merchant_uid 결합, V2→V1 전수 전환, 파일 책임 분리 — 을 **충실히 이행**했고, 교차검수 HIGH 2건·MED 2건 중 1건이 모두 해소됐다.

| 영역 | 일치 | 근거 |
| --- | --- | --- |
| §3.1 모드 resolver·안전게이트 | ✅ 100% | 충돌/미설정/V2 → 503, mock 격리 가드 유지 (`portone-v1-config.ts`, `index.ts`) |
| §3.2 주문 생성·결제문맥 발급 | ✅ 100% | 응답 `payment` V1화, CAS nonce 유지 (`order.ts`) |
| §3.3 콜백 처리순서(Origin→세션→소유권→verify→2차조회→record) | ✅ 100% | `route.ts`+`payment-callback.ts` |
| §3.4 재조회 대조·상태매핑 | ✅ 95% | `cancelled+paid_at` 분기가 설계 표 미반영(Gap-6) |
| §3.7 토큰/조회/취소 REST | ✅ 100% | 취소 어댑터 미연결=설계상 의도 |
| §4.4 nonce 원자 소비 | ✅ 100% | `updateMany` 조건부 1회 CAS + P2002 |
| §4.5 V2→V1 전수 전환 | ✅ 100% | callback/record/terminal/recovery 전건 |
| §4.6 imp_uid 유실 복구(인증 서버 진입점) | ✅ 100% | **교차수정으로 라우트 연결 완료** |
| §4.7 SDK 실행 전 실패·로더 재시도 초기화 | ✅ 100% | rejected Promise 리셋 (`portoneV1Loader.ts`) |
| §4.8 status 세션·영구 거부 보존 | ✅ 100% | 신청·연장·모바일 복귀 전 경로 분류 공유 |
| §5.1 `runPayment` V1 분기 | ✅ 100% | merchant_uid 엄격 대조로 수정됨 |
| §5.2 신청/연장 상태머신 | ✅ 100% | imp_uid 메모리 보존·재전송 |
| §1.2 파일 분리/감사 사유 갱신 | ⚠️ 85% | audit 사유 미갱신, `useGuestApply` 413줄(Gap-1·2) |
| §0.1 P0 선행(테스트 채널 증빙) | ⛔ 미이행 | 설계상 의도된 미결(게이트 닫힘) — **완료 아님** |

**차감 요인(≈7%)**: ① audit 사유 미갱신(MED, 문서/감사 정합성) ② §0.1 증빙 미확정으로 실동작 미검증(규칙 0-1) ③ LOW 4건(게이트 닫힘으로 현재 무해) ④ `useGuestApply.ts` 413줄(400줄 분리 트리거 초과, 500줄 한도 내). 깎인 부분은 대부분 **"로컬에서 됐다 ≠ 실제로 됐다"** 영역이며 핵심 로직 결함이 아니다.

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### Gap-1 [MED·미해소] 콜백 ALLOWLIST 사유가 변경된 인증 모델 미반영
- **파일**: `scripts/audit-api-auth.mjs:47`
- 설계 §1.2·§7.2가 "payment/callback ALLOWLIST 사유 갱신(status 세션 포함)"을 명시 요구했으나 사유 문자열은 여전히 `"비회원 결제 콜백(외부 PG) — HMAC + provider 재조회 금액검증 + nonce 1회소비 + IP rate limit"`에 머물러 있다. 이번 변경으로 추가된 **Origin 강제 + OTP 세션(apply/status/renewal) + 주문-세션 신원결합(IDOR 차단)** 이 빠졌다.
- 영향: `audit:api`는 allowlist 엔트리 존재로 통과(게이트 안 깨짐). 코드 동작엔 영향 없으나 **감사 근거 문서가 실제 방어와 불일치**. 교차검수 백엔드 MED 2건 중 유일한 미해소 항목.
- 조치: 사유에 `Origin 강제 + OTP세션(apply/status/renewal) + 주문-세션 신원결합(IDOR)` 추가(문구만, 동작 변경 없음).

### Gap-2 [LOW·구조] `useGuestApply.ts` 413줄 — 설계 400줄 분리 트리거 초과
- **파일**: `app/(personal-home)/renewal/monitoring/hooks/useGuestApply.ts` (413줄)
- 설계 §1.2·강제 트리거는 "작성 직후 400줄 초과 시 분리 보고"를 요구. 가장 무거운 서브머신(`useGuestOrderFlow.ts` 295줄)은 이미 분리됐으나 부모 훅이 400줄을 넘었다. **500줄 하드리밋 내여서 배포 차단 사유는 아니나 설계 자체 트리거 위반**이므로 보고 대상.
- 조치: 복귀 effect/세대관리 일부 헬퍼 분리 검토(선택).

### Gap-3 [LOW·무해] `sandbox` 필드 부재 시 비테스트 거래 미차단
- **파일**: `lib/danal/portone-v1-payment.ts:33` (`payment.sandbox === false`)
- `sandbox` optional → **명시적 false일 때만 거부**, undefined는 통과. 무출금 1차 방어선은 `verifiedV1TestChannels`(현재 빈 배열→닫힘)이라 지금은 무해하나, §0.1 증빙으로 게이트를 여는 순간 `sandbox` 없는 응답이면 defense-in-depth 공백(절대규칙 §0.3 "`test:true` 등 단일 필드로 무출금 간주 금지" 취지).
- 조치: §0.1에서 다날 V1 테스트 플래그 제공 여부·필드명 확정 후 "필드 부재=거부" 또는 "채널 증빙으로 무출금 보장"을 명문화.

### Gap-4 [LOW·무해] V1 응답 스키마 가정값 미확정
- **파일**: `lib/danal/iamport-schemas.ts` (`pg_id`=MID, findAll `{total,next,list}` 가정)
- §0.1·§8의 P0 선행(MID 필드명·취소 필드·주문번호 조회 응답 형태 공식 스키마 확정)이 미완. 가정이 틀리면 `mapPayment`/`findImpUidByMerchantUid`가 전건 오분류 가능. **증빙 전 게이트 닫힘으로 현재 영향 없음**(주석에도 명시). `portone.plan.md` 잔여 체크리스트로 "`pg_id`·findAll 응답형태 실응답 대조" 승격 권장.

### Gap-5 [LOW·성능] cron 복구 루프 내 `getDanalProvider()` 반복
- **파일**: `lib/guest-monitoring/recovery.ts:8-11`
- `for` 루프 안에서 주문마다 `getDanalProvider()`(env 파싱 + 채널 `find`) 재호출. 최대 50회라 실영향 미미하나 루프 불변식 → 루프 밖 1회 해석 후 재사용 권장. (N+1 쿼리 아님 — 주문당 1 REST 재조회는 설계상 의도된 재검증)

### Gap-6 [LOW·문서] `cancelled+paid_at` 분기가 설계 §3.4 표에 미반영
- **파일**: `lib/danal/portone-v1-payment.ts:45-62`
- 설계 §3.4/§2.4 표는 `cancelled → PortoneTerminalPayment`로 기술하나, 구현은 `paid_at` 있는 전액취소는 `PaymentResult{status:"canceled"}`로 **반환**하고 `paid_at` 없는 미승인 취소만 터미널로 던진다. 다운스트림(`recordPayment` 비-paid 분기)이 올바르게 처리하므로 기능 결함 아님(구현이 실무적으로 더 정확 — 승인취소/미승인취소 구분). **절대규칙(스펙 불일치는 문서를 먼저 수정)에 따라 설계 §3.4 표를 코드에 맞춰 보강** 권장.

> **의도된 미연결(결함 아님)**: `cancelPayment`/`cancelPaymentByImpUid`는 호출부 없음 → 설계 §3.7 "cron 자동 실행·공개 취소 UI 금지, 테스트 거래 취소만"에 부합. 운영 코드 미사용 확인.

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (설계↔구현 갭 분석)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ⚠️ 하드리밋(500) 전 파일 준수.
                         useGuestApply.ts 413줄 = 설계 400줄 분리 트리거 초과(Gap-2)
                         서버 어댑터 전부 ≤100줄(최대 record-payment.ts 78줄)
2. 단일 책임           : ✅ 로더=script, 어댑터=프로토콜, REST=통신, 콜백=서명/nonce,
                         훅=상태전이, HTTP=guestApi, applyFailure=순수분류. 혼재 없음
3. 서버 검증·보안      : ✅ 승인=서버 V1 재조회 SSOT. callback route Origin 강제(403)+
                         requireSession(apply/status/renewal)(401)+주문-세션 신원결합(IDOR 404)+
                         HMAC timingSafeEqual+nonce 조건부 1회 CAS+거래ID unique.
                         raw SQL 없음(Prisma 바인딩/advisory-lock 파라미터만). 입력 zod .strict()+정규식.
                         시크릿/토큰/imp_uid/원문 REST 로그·응답 미노출
4. 성능 (중복·N+1)     : ⚠️ 토큰 메모리캐시+single-flight+401 1회 재발급, cron take:50 양호.
                         recovery 루프 내 getDanalProvider 반복(Gap-5, LOW). N+1 없음
5. 폴더 구조           : ✅ 어댑터·REST·config·게이트=lib/danal, 서비스=lib/guest-monitoring,
                         라우트=app/api, 로더·실행·HTTP=route 하위 guest/, 훅=hooks/
─────────────────────────────────────────────────
위반 항목: 치명 0건 / 구조 트리거 1건(useGuestApply 413줄) / 성능 LOW 1건(recovery 루프)
          → 배포 차단 사유 아님. Gap-2·5 후속 정리 대상
─────────────────────────────────────────────────
```

**1. 500줄 제한** — 전 파일 500줄 이하. FE 최대 `useGuestApply.ts` 413, `useGuestRenew.ts` 370, `useGuestStatus.ts` 323, `guestPayment.ts` 313. 서버 어댑터 전부 ≤100줄. 단 `useGuestApply` 413줄은 설계 400줄 분리 트리거 초과(Gap-2).

**2. 단일 책임** — `portoneV1Loader.ts`=script 수명주기, `guestPayment.ts`=결제 프로토콜(UI·상태전이 없음), `guestApi.ts`=HTTP, 훅=상태전이, `applyFailure.ts`=순수 분류(React/DOM/네트워크 없음). 서버는 config/게이트·REST·응답매핑·어댑터·서명nonce 분할. 페이지에 결제 프로토콜 없음. ✅

**3. 서버 검증·보안** — 매우 견고:
- 승인 판단 전부 **서버 V1 재조회 SSOT**. 브라우저 금액/success/시각/주문번호 불신. `mapPayment`가 imp_uid·merchant_uid·amount(정수 10000)·currency·pg_provider(`danal_tpay`)·MID(pg_id)·pay_method(`card`)·상태·취소내역·paid_at 범위(`createdAt≤paidAt≤expiresAt`,`≤now`) 전수 대조.
- callback route: Origin 헤더 필수+allowlist 강제(`route.ts:13-18`, `!origin || validateOrigin(originOnly)` → 403, 극성 정확) + `requireSession(["apply","status","renewal"])`(401) + 주문-세션 신원결합(`payment-callback.ts`·`recover-pending-payment.ts`에서 `guestIdentityHash===session.verifiedIdentityHash` → IDOR 404).
- HMAC `timingSafeEqual` 상수시간 비교, nonce `updateMany` 조건부 1회 CAS + `P2002` 경합 처리, `needs_review`는 재전송으로 미해제.
- raw SQL 없음(Prisma 쿼리빌더 + advisory-lock 파라미터 바인딩만). 입력 zod `.strict()`+정규식(imp_uid·base64url·hex) 화이트리스트.
- 시크릿/토큰/imp_uid/원문 REST 로그·응답 미노출. `DANAL_CARD_ENC_KEY` REST 미사용. 삭제된 V2 모듈 잔존 import 0건.

**4. 성능** — 토큰 메모리캐시+single-flight+401 1회 재발급, cron `take:50`, 두 번째 조회는 §3.3/§4.4의 의도된 재검증(중복 아님), `recordPayment`는 REST 없이 DB 상태만. N+1 없음. ⚠️ Gap-5(recovery 루프 getDanalProvider 반복, LOW).

**5. 폴더 구조** — 공급자·REST·config·게이트=`lib/danal`, 서비스=`lib/guest-monitoring`, 라우트=`app/api`, 로더·실행·HTTP=route 하위 `guest/`, 훅=`hooks/`. ✅

**API 보안 체크리스트(CLAUDE.md):**
- 인증 없는 변이 핸들러: `app/api/` 전체 신규 미인증 변이 없음. `payment/callback`은 공개 콜백이나 V1 경로에 Origin+세션+IDOR+nonce 적용.
- dead code endpoint: 교차검수에서 "호출부 없음(MED)"으로 지적된 `recover-pending-payment.ts`가 **body-free `POST .../payment/callback?recoverOrderId=` 경로로 연결 완료**(`route.ts:22-28`, 세션 principal만 사용·JSON 금지). dead code 해소.
- ⚠️ audit ALLOWLIST 사유 미갱신(Gap-1) — 게이트는 통과하나 문서 계약 미이행.

---

## 4. 교차검수 지적사항 해소 여부

### 4.1 백엔드 (`review-backend.md` — HIGH 0 / MED 2 / LOW 5 / INFO 1)
| # | 심각도 | 지적 | 해소 | 근거(현재 라인) |
| --- | --- | --- | --- | --- |
| B1 | MED | §4.6 복구 경로 호출부 없음(미연결 dead code) | ✅ **해소** | `route.ts:8,22-28` 인증 서버 진입점(`?recoverOrderId=`) 추가, `recover-pending-payment.ts:14-15` 세션 principal 재확인·JSON 금지 |
| B2 | MED | audit ALLOWLIST 사유 미갱신 | ❌ **미해소** | `audit-api-auth.mjs:47` 문자열 그대로(Gap-1) |
| B3 | LOW | `sandbox===false`(undefined 통과) | ❌ 미해소(게이트 닫힘→무해) | `portone-v1-payment.ts:33`(Gap-3) |
| B4 | LOW | `pg_id`/findAll 응답 가정값 | ❌ 미해소(의도·무해) | `iamport-schemas.ts`(Gap-4) |
| B5 | LOW | recovery 루프 내 getDanalProvider | ❌ **미해소** | `recovery.ts:8-11`(Gap-5) |
| B6 | LOW | `cancelled+paid_at` 표현 불일치 | ❌ 미해소(문서 정정 권장) | `portone-v1-payment.ts:45-62`(Gap-6) |
| B7 | INFO | cancelPayment 미사용(의도) | — | 운영 코드 미호출 확인 |

→ **MED 2건 중 1건(B1) 해소, 1건(B2) 미해소. LOW 4건 미해소이나 전부 문서·가정·미세성능 수준이며 게이트 닫힘으로 현재 무해.**

### 4.2 프론트엔드 (`review-frontend.md` — HIGH 2 / MED 2 / LOW 1)
| # | 심각도 | 지적 | 해소 | 근거(현재 라인) |
| --- | --- | --- | --- | --- |
| F1 | HIGH | 콜백 일시실패 후 imp_uid/문맥 유실 → 승인 기록 복구 불가 | ✅ **해소** | `useGuestOrderFlow.ts:247` `rememberCallback`, `:179-180` `recallCallback`→`resendOrderCallback(impUid)`, `:201/:265` `forgetCallback`, + 서버 복구(B1) 연결 |
| F2 | HIGH | 미확정 연장 주문 재클릭이 SDK 재실행(이중출금 위험) | ✅ **해소** | `useGuestRenew.ts:262-268` 저장 주문·`sdkSafeRef` 확인 후 SDK 없이 `finalizeRenew`(재전송)만. SDK 재실행은 무출금 확정(cancel/unavailable/mock) 대상만 |
| F3 | MED | SDK 로딩 중 이탈해도 결제창 실행 취소 불가 | ✅ **해소** | `guestPayment.ts:96,110-121` `shouldCancel` 세대가드, 로더 await·init 후 `request_pay` 직전 확인→`aborted`. 언마운트 시 세대 증가 |
| F4 | MED | 모바일 복귀 영구거부·세션만료 미통지 | ✅ **해소** | `useGuestRenew.ts:306-324` reauth/api_error 분류, `:351-363` 재인증(`preserveOrders`)·오류 notice 표시 |
| F5 | LOW | merchant_uid 누락을 성공으로 허용 | ✅ **해소** | `guestPayment.ts:150-159` `imp_uid` 필수 + `merchant_uid !== paymentId` 엄격 거부 |

→ **프론트 HIGH 2 / MED 2 / LOW 1 전건 해소.** 로더 실패정리·rejected Promise 초기화(§4.7), DTO 4필드(`{paymentId,imp_uid,callbackContext,callbackSignature}`), localStorage 미사용·sessionStorage는 `{idempotencyKey,orderId}`만(imp_uid/서명/PII 없음), V2 SDK import 제거(CDN 로더로 대체), done=서버 `paid&&applied` 모두 확인.

---

## 5. 종합 의견 및 남은 수정 우선순위

### 5.1 종합
교차수정이 **프론트 HIGH 2건(승인 복구·이중출금)·MED 2건을 전건 해소**했고, 백엔드의 핵심 end-to-end 공백(§4.6 복구 미연결, B1)도 인증 라우트로 연결됐다. 보안 치명결함(인증 우회·IDOR·SQLi/XSS·시크릿 노출)은 없다. 승인 판단은 전부 서버 V1 재조회 SSOT에 근거하며 브라우저 전달 값(금액/success/시각/주문번호)을 신뢰하지 않는다. `tsc`·guest-monitoring vitest(264)·FE ESLint 전부 통과. 구현 품질은 **대표급(규칙 0)** 기준에 부합한다.

**단, "V1 다날 테스트 결제 실동작 완료"는 선언할 수 없다(절대규칙 0-1·§0.1).** `verifiedV1TestChannels`가 **빈 배열**이라 안전게이트가 닫혀 있어 실제 REST/SDK는 503으로 차단된다. 지금까지는 **fixture 기반 정적/단위 검증**일 뿐이다. 이는 설계가 예고한 미완 선행작업이며, 코드가 이를 숨기지 않고 fail-closed + 주석으로 명문화한 점은 규칙 0-1/0-4 준수다.

### 5.2 남은 수정 우선순위
| 순위 | 항목 | 분류 | 조치 |
| --- | --- | --- | --- |
| **P0** | §0.1 P0 증빙 확정 — imp 코드/MID/REST 키·시크릿이 실제 **무출금 V1 테스트 채널**에 연결됐는지 PortOne 콘솔·공식문서로 확인 후 `verifiedV1TestChannels` 등록. MID 필드명(`pg_id`)·취소 필드·주문번호 조회 응답형태(Gap-4) **실대조** | 선행 차단 | 확인 전 아래 모두 무의미(503). **값은 노출 없이** |
| **P1** | Gap-3 `sandbox` defense-in-depth — §0.1 결과로 테스트 플래그 기대값을 채널 증빙에 포함하거나 "필드 부재=거부" 명문화 | 보안(게이트 오픈 전 필수) | 실결제 차단 2차 방어선 |
| **P1** | Gap-1 audit ALLOWLIST 사유 갱신(Origin+OTP세션+IDOR) | 문서/감사 | `audit-api-auth.mjs:47` 문구만. **배포 전 반영 권장** |
| **P2** | Gap-6 설계 §3.4 표 보강(cancelled+paid_at 분기 명문화) | 문서 | 스펙 불일치는 문서 우선 수정 |
| **P2** | Gap-5 recovery 루프 getDanalProvider 호이스팅 | 성능 | `recovery.ts` |
| **P2** | Gap-2 `useGuestApply.ts` 413줄 추가 분리 검토 | 구조 | 400줄 트리거 |
| **P1** | 실환경 검증 — 게이트 오픈 후 t-vestra 무출금 테스트 결제 1회: 최초 콜백 유실/503/모바일 복귀 재시도에서 **동일 거래 콜백 전송·적용 1회·SDK 추가 호출 0회**, 미확정 연장 재클릭 SDK 0회 실브라우저 확인. 프론트 DOM/React 훅 회귀(§6.1 P1-01~08) 추가 | 실동작 | 완료 선언의 유일 근거 |

### 5.3 완료 판정 (규칙 0-1/0-5)
- ✅ 서버 위변조 거부·nonce 1회 소비·미확정 분리·V2 차단 — vitest 264건 통과로 확인
- ✅ SMS OTP 불변·파일당 500줄·운영 DB 미접촉
- ✅ 교차검수 프론트 HIGH 2/MED 2/LOW 1 + 백엔드 §4.6 복구 연결(B1) 해소
- ❌ **SDK/REST 실제 테스트 연동 성공** — §0.1 증빙 미확정으로 미달. **실환경(t-vestra) 무출금 다날 V1 테스트 채널 검증 전까지 "실동작 완료" 보고 금지**

> 본 분석은 정적 대조 + 단위테스트/린트 실행까지다. 실브라우저·실PG·운영 DB 검증은 미수행이며, 완료는 규칙 0-1에 따라 **대장 확인이 가능한 실환경 결과**로만 선언한다. 배포 전 최소 Gap-1(감사 사유) 반영을 권장하고, 나머지 LOW는 게이트 오픈과 함께 일괄 처리 가능하다.
