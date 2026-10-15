# PortOne V1(다날 카드) 백엔드 교차검수 보고서

> 대상: Codex 구현 백엔드 변경분 (커밋 전 `git diff`/`git status`)
> 범위: `app/api/`, `lib/danal/`, `lib/guest-monitoring/` (actions/types/schemas/supabase/prisma 변경 없음)
> 검토 관점: 보안(인증·CSRF·입력검증·SQLi/XSS)·버그·성능(N+1·중복호출)·설계 스펙([`docs/02-design/features/portone.design.md`](../02-design/features/portone.design.md)) 일치
> 작성일: 2026-10-15 · 검토자: 크로미(Claude) · **코드 미수정, 리뷰 전용**

---

## 0. 검증 실행 결과 (리뷰어 직접 실행)

| 항목 | 결과 |
| --- | --- |
| `npx tsc --noEmit` | ✅ 오류 0 (danal·guest-monitoring 관련 에러 없음) |
| `npx vitest run --config lib/guest-monitoring/vitest.config.ts` | ✅ 243 passed / 28 skipped(=DB URL 없을 때 `skipIf`로 건너뛰는 통합 테스트) / 12 파일 통과 |
| 삭제된 V2 모듈(`portone-config/payment/rest/test-channels/portone.ts`) 잔존 import | ✅ 없음 (grep 0건) |
| `@portone/browser-sdk` 서버측 import | ✅ 없음 (프론트 로더 주석 1건만) |
| 레거시 `mode "danal"/"portone"` 서버 참조 | ✅ 테스트 fixture(레거시 주문 차단 검증)만 존재, 운영 코드 0건 |

> ⚠️ **"완료" 아님(절대규칙 0-1·§0.1).** 위 통과는 fixture 기반 정적/단위 검증이다. `verifiedV1TestChannels`가 **빈 배열**이라 안전게이트가 닫혀 있어 실제 REST/SDK는 503으로 차단된다. 무출금 다날 테스트 채널 증빙(§0.1) 확정·실환경 검증 전까지 "V1 결제 실동작 완료"로 보고 불가.

---

## 1. 총평

전반적으로 **설계 계약을 충실히 구현했고 보안 결함(인증 우회·IDOR·SQLi/XSS·시크릿 노출)은 발견되지 않았다.** 승인 판단은 전부 서버 V1 재조회 SSOT에 근거하며, 브라우저 전달 금액/success/시각/주문번호를 신뢰하지 않는다. HMAC 서명·nonce 1회 소비·Origin·세션·소유권·거래ID 중복 방어가 모두 적용되어 있다. Prisma 파라미터 바인딩만 사용(raw SQL 없음)하여 SQLi 벡터 없음. 응답/로그에 원문 REST·토큰·secret·imp_uid를 싣지 않는다.

지적은 **HIGH 0건 / MED 2건 / LOW 5건**으로, 모두 설계 완결성·운영 미세조정 수준이며 보안 치명결함은 없다.

---

## 2. 지적 사항

### [심각도 MED] §4.6 "imp_uid 유실 복구" 경로가 호출부 없는 미연결 코드
- **파일**: `lib/guest-monitoring/recover-pending-payment.ts:15`
- **문제**: `recoverPendingPayment()`는 설계 §4.6의 "imp_uid까지 유실된 pending" 사용자 복구 경로(merchant_uid 조회 → 후보 imp_uid 탐색 → 단건 재검증)를 올바르게 구현했으나, **라우트·훅·cron 어디에서도 호출되지 않는다**(호출처 grep 결과: 테스트 파일만). 파일 주석도 "HTTP contract ... not specified ... do not add a public endpoint"로 의도적 미연결임을 밝히고 있다. 그 결과 **§4.6이 해결하려는 시나리오(모바일 복귀+메모리 문맥·imp_uid 동시 소실)가 실제 앱에서는 복구 불가**다. 설계 §4.6은 "인증된 서버 복구 경로에서 … 완결"을 전제하므로 end-to-end 공백.
- **수정 제안**: (a) 프론트 복구 effect가 호출할 **인증 서버 진입점**(기존 세션 재사용, request JSON 금지)을 §4.6/§7.2 dead-code 원칙에 맞게 추가하거나, (b) 이번 범위에서 의도적으로 미연결이라면 설계서에 "구현 보류(호출부 후속)"로 **명시**하고 `portone.plan.md` 잔여항목으로 승격. 현재는 "구현했으나 도달 불가"라 절대규칙 0-5(비정상 경로 완결성)와 어긋난다. 코드 자체는 정확하므로 연결만 필요.

### [심각도 MED] 콜백 ALLOWLIST 사유가 변경된 인증 모델을 반영하지 않음
- **파일**: `scripts/audit-api-auth.mjs:47`
- **문제**: 설계 §1.2·§7.2가 "payment/callback ALLOWLIST 사유 갱신(status 세션 포함)"을 명시 요구했으나, 사유 문자열은 여전히 `"... HMAC + provider 재조회 금액검증 + nonce 1회소비 + IP rate limit"`에 머물러 있다. 이번 변경으로 추가된 **Origin 강제검증 + OTP 세션(apply/status/renewal) + 주문-세션 신원결합(IDOR 차단)** 이 사유에 빠져 있다. `audit:api`는 allowlist 엔트리 존재로 통과하므로 게이트는 깨지지 않으나, 감사 근거 문서가 실제 방어와 불일치.
- **수정 제안**: 사유 문자열에 `Origin 강제 + OTP세션(apply/status/renewal) + 주문-세션 신원결합(IDOR)` 추가. 코드 동작 변경 아님(문구만).

### [심각도 LOW] `sandbox` 필드 부재 시 비(非)테스트 거래가 차단되지 않음
- **파일**: `lib/danal/portone-v1-payment.ts:33` (`payment.sandbox === false`)
- **문제**: `sandbox`는 optional이라 **명시적 `false`일 때만** 거부하고, **필드가 없으면(undefined) 통과**한다. 무출금 보장의 1차 방어선은 `verifiedV1TestChannels` 게이트(현재 빈 배열 → 닫힘)이므로 지금은 실결제가 원천 차단되나, 증빙 추가로 게이트를 여는 순간 응답에 `sandbox`가 없는 공급자라면 이 방어선은 무력하다. 절대규칙 §0.3(`test:true` 등 단일 필드로 무출금 간주 금지)의 취지상 defense-in-depth 공백.
- **수정 제안**: §0.1에서 다날 V1 테스트 응답의 `sandbox`(또는 등가 테스트 플래그) **제공 여부·필드명**을 확정하고, 테스트 채널 증빙에 해당 플래그 기대값을 포함해 "필드 부재=검증 불가=거부" 또는 "채널 증빙으로 무출금 보장"을 명문화. 현재 주석(§0.1 pending)에 이 한계를 1줄 추가.

### [심각도 LOW] V1 응답 스키마 필드가 §0.1 미확정 가정값으로 고정됨
- **파일**: `lib/danal/iamport-schemas.ts:7-25` (`pg_id`=MID 가정, `findAll` 응답 `total/next/list` 형태)
- **문제**: MID 필드명을 `pg_id`로, 주문번호 조회 응답을 `{total,next,list}`로 가정했다. 설계 §0.1·§8은 "MID 필드명·취소 필드·주문번호 조회 응답 형태를 공식 스키마로 확정"을 P0 선행으로 요구하며 아직 미확정이다(주석에도 명시). 가정이 틀리면 `mapPayment`/`findImpUidByMerchantUid`가 전건 `payment_failed`/오분류로 흐를 수 있다.
- **수정 제안**: 설계 의도대로 **증빙 전에는 게이트가 닫혀 있어 영향 없음**. §0.1 확정 시 스키마 1곳만 조정하도록 현 구조 유지 적절. 다만 `portone.plan.md` 잔여 확인항목에 "`pg_id`·findAll 응답형태 실응답 대조"를 체크리스트로 남길 것(현재 암묵적).

### [심각도 LOW] cron 복구 루프 내 `getDanalProvider()` 반복 호출
- **파일**: `lib/guest-monitoring/recovery.ts:11`
- **문제**: `for` 루프 안에서 주문마다 `getDanalProvider()`(→ `resolvePaymentMode()`+`getPortoneV1Config()`: env 파싱 + 채널 배열 `find`)를 재호출한다. 최대 50회라 실성능 영향은 미미하나 루프 불변식이라 불필요한 반복.
- **수정 제안**: 루프 진입 전 `const provider = getDanalProvider()` 1회 해석 후 재사용(게이트 닫힘 시 즉시 503 조기반환 효과도 동일). N+1 쿼리는 아님(주문당 1 REST 조회는 설계상 의도적 재검증).

### [심각도 LOW] "paid 후 전액취소" 결과를 터미널로 던지지 않고 PaymentResult(status:"canceled")로 반환
- **파일**: `lib/danal/portone-v1-payment.ts:45-62`
- **문제**: 설계 §3.4 상태 매핑 표는 `cancelled → PortoneTerminalPayment("canceled")`로 적혀 있으나, 구현은 `paid_at`이 있는 전액취소는 `PaymentResult{status:"canceled"}`로 **반환**하고, `paid_at` 없는 미승인 취소만 `PortoneTerminalPayment`로 던진다. 다운스트림(`recordPayment` 비-paid 분기)이 canceled를 올바르게 처리하므로 기능 결함은 아니나, 설계 표현과 코드가 축자적으로 불일치.
- **수정 제안**: 구현 분기가 실무적으로 더 정확(승인취소/미승인취소 구분)하므로 **설계 §3.4 표를 코드에 맞춰** "cancelled: paid_at 有 전액취소→canceled 결과 / paid_at 無→터미널"로 보강. 절대규칙(스펙 불일치는 문서를 먼저 고친다)에 따라 문서 측 정정 권장.

### [심각도 LOW/정보] 범위상 의도된 미호출 함수
- **파일**: `lib/danal/portone-v1.ts:60` (`cancelPayment`), `lib/danal/iamport-rest.ts:93` (`cancelPaymentByImpUid`)
- **내용**: 취소 어댑터는 호출부가 없다. 설계 §3.7 "cron 자동 실행·공개 취소 UI 금지, 이번 범위는 테스트 거래 취소만"에 부합하는 **의도된 미연결**이므로 결함 아님. §4.6 복구(MED 1건)와 달리 사용자 경로가 요구되지 않아 정보성 기록만 함.

---

## 3. 정상 확인 항목 (회귀·보안 긍정 결과)

- **인증·CSRF**: `payment/callback/route.ts:11-16` — portone_v1 경로에서 Origin 헤더 **필수 + allowlist 강제**(`!origin || validateOrigin(originOnly)` → 403), 이후 `requireSession(["apply","status","renewal"])`. `validateOrigin`은 유효 시 `null`, 무효 시 `NextResponse(403)` 반환이므로 조건식 극성 정확(우회 없음). callback 기본 Origin 예외를 브라우저 POST에 적용하지 않음(설계 §4.2 준수).
- **IDOR 차단**: `payment-callback.ts:17-21`·`recover-pending-payment.ts:19-22` — 소유권을 `providerMode="portone_v1" + guestMonitoring.guestIdentityHash === session.verifiedIdentityHash`로 결합. 브라우저 전달 identity hash 미수용. purpose 허용만으로 타인 주문 권한 부여 없음.
- **HMAC/nonce**: `portone-callback.ts:39-48` `timingSafeEqual` 상수시간 비교, 문맥 필드 전수 대조. `record-payment.ts:62-70` nonce 소비를 `updateMany`(providerReceipt 미소비값 + status notIn + appliedAt:null)로 **조건부 1회 CAS**, `count!==1` 시 멱등 재조회. 일시장애는 recordPayment 미도달 → nonce 미소비(재시도 가능). `needs_review`는 재전송으로 해제되지 않음(`record-payment.ts:46`).
- **동시청구/중복거래**: `providerTransactionId` unique + `P2002 → paymentFailed`(`record-payment.ts:82`), 타주문 거래 선점 시 `other.orderId !== current.orderId → paymentFailed`.
- **서버 재조회 SSOT**: `mapPayment`가 imp_uid·merchant_uid·amount(정수 10000)·currency·pg_provider(`danal_tpay`)·pg_id(MID)·pay_method(`card`)·상태·취소내역·paid_at 범위(`createdAt≤paidAt≤expiresAt`, `≤now`)를 **전부** 대조. 미승인 상태에 가짜 paidAt 생성 안 함(`:52-54`). ready→`payment_pending(409)`.
- **REST 견고성**: `iamport-rest.ts` — 호스트 고정, `cache:no-store`, `redirect:error`, 8s AbortController, 봉투+zod 검증, 토큰 메모리 캐시+single-flight(`:44-57`), 401 1회 재발급 후 503, 자격증명 fingerprint로 회전 시 타계정 토큰 재사용 차단(`:12-13,37`). 공급자 401을 세션 401로 노출 안 함.
- **게이트/모드**: `resolvePaymentMode`(두 selector 충돌 503), `getPortoneV1Config`(impCode/restKey/restSecret/MID/signingKey/검증채널 전수, 하나라도 누락 503), `index.ts` mock은 비운영+격리DB+32자 비밀키 전부 충족 시만. V1 실패 시 mock/V2 자동 우회 없음.
- **레거시 V2 보존**: `order.ts:53` `providerMode !== provider.mode → 503`으로 V2 주문 createPayment 전 차단. `recovery.ts:12` 모드 불일치 주문 skip. 재해석·덮어쓰기 없음(§4.9).
- **시크릿/PII**: 응답·`auditLog`에 내부 orderId·정제 상태만 기록(`record-payment.ts:71`, `record-terminal-payment.ts:21`, `portone-v1.ts:79`). 원문 REST·토큰·secret·imp_uid·전화 미노출. `DANAL_CARD_ENC_KEY`는 REST 요청/응답에 미사용.
- **SQLi/XSS**: Prisma 파라미터 바인딩만 사용, raw query 없음. 콜백 입력은 zod `.strict()` + 정규식(imp_uid·base64url·hex64)로 화이트리스트 검증.

---

## 4. 플랫폼 5대 원칙 점검 (백엔드 변경분)

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (백엔드 교차검수)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 서버 파일 전부 ≤100줄 (최대 record-payment.ts ~90줄)
2. 단일 책임           : ✅ config/게이트·REST통신·응답매핑·어댑터·서명nonce 분리
3. 서버 검증·보안      : ✅ 승인=서버 V1 재조회 SSOT, Origin+세션+IDOR+HMAC+nonce+거래중복
4. 성능 (중복·N+1)     : ⚠️ 토큰캐시+single-flight 양호 / recovery 루프 내 getDanalProvider 반복(LOW)
5. 폴더 구조           : ✅ 어댑터·REST·config=lib/danal, 서비스=lib/guest-monitoring, 라우트=app/api
─────────────────────────────────────────────────
위반 항목: 없음(치명) / 개선 LOW 1건(4번 recovery 루프)
─────────────────────────────────────────────────
```

---

## 5. 설계 스펙 일치 매트릭스 (요약)

| 설계 조항 | 구현 | 일치 |
| --- | --- | --- |
| §3.1 모드 resolver·안전게이트 | `portone-v1-config.ts`, `index.ts` | ✅ |
| §3.3 콜백 처리순서(Origin→세션→소유권→verify→2차조회→record) | `route.ts`+`payment-callback.ts` | ✅ |
| §3.4 재조회 대조·상태매핑 | `portone-v1-payment.ts` | ✅ (cancelled 표현 LOW 1건) |
| §3.7 토큰/조회/취소 REST | `iamport-rest.ts` | ✅ (취소 미연결=의도) |
| §4.4 nonce 원자 소비 | `record-payment.ts` | ✅ |
| §4.5 V2→V1 보호 전수 전환 | callback/record/terminal/recovery | ✅ |
| §4.6 imp_uid 복구 | `recover-pending-payment.ts` | ⚠️ 코드 有, **호출부 無(MED)** |
| §4.9 레거시 V2 차단·기록보존 | `order.ts`, `recovery.ts` | ✅ |
| §1.2 audit allowlist 사유 갱신 | `audit-api-auth.mjs` | ⚠️ **미갱신(MED)** |

---

## 6. 결론 및 권고

- **보안 치명결함 없음**, 설계 계약 충실 이행. 단위/타입 검증 전부 통과.
- **MED 2건**(§4.6 복구 호출부 연결, audit allowlist 사유 갱신)은 "동작하나 미완결"에 해당 → 배포 전 또는 설계서 명시로 정리 권장.
- **LOW 5건**은 §0.1 증빙 확정과 함께 일괄 처리 가능(게이트가 닫혀 있어 현재 실위험 없음).
- 절대규칙 0-1: **무출금 다날 테스트 채널 증빙(§0.1) 확정 + t-vestra 실환경 결제 1회 검증 전까지 "완료" 선언 금지.**
