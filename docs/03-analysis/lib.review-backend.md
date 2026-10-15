# 비회원 등기감시 백엔드 교차검수 (Codex 구현분)

> **검수자**: Claude (크로미)
> **일자**: 2026-10-15
> **대상**: 커밋 안 된 변경분 중 백엔드 — `app/api/`, `lib/`, `prisma/`, `types/`
> **기준 설계서**: `docs/02-design/features/lib.design.md`
> **관점**: 보안 · 버그 · 성능(N+1·중복) · 설계 스펙 일치
> **주의**: 코드는 수정하지 않음. 지적 + 수정 제안만.

---

## 0. 검수 범위 파일

| 분류 | 파일 |
|---|---|
| 수정(추적) | `app/api/cron/registry-monitor/route.ts`, `lib/pii-crypto-tree.ts`, `lib/pricing-plans.ts`, `lib/solapi-client.ts`, `prisma/schema.prisma` |
| 신규 서비스 | `lib/guest-monitoring/*` (config, http, session, order, activation, identity-hash, period, draft, schemas, rate-limit-keys, errors, transaction, precheck-adapter, calendar-dto, expiry, outbox, recovery, cleanup, pdf-extraction) |
| 신규 어댑터 | `lib/danal/*` (index, types, mock, callback) |
| 신규 라우트 | `app/api/guest-monitoring/**`, `app/api/cron/guest-monitoring-lifecycle/route.ts` |
| 공용 유틸 | `lib/registry-monitor/retry-targets.ts`, `lib/registry-monitor/transition.ts` |
| 타입 | `types/guest-monitoring.ts` |

전체 흐름은 설계서 계약과 **대체로 충실히 일치**한다. 플래그 게이트(OFF)·격리 목·503 폐쇄·PII 트리 암호화·blind index·세션/멱등·IDOR(세션+identityHash)·콜백 서명검증 등 핵심 불변식이 구현돼 있다. 아래는 보완이 필요한 항목이다.

---

## 1. HIGH

### [HIGH] 수명주기 cron이 vercel.json에 미등록 — 만료·문자·복구·정리가 영구 미실행
- **파일**: `app/api/cron/guest-monitoring-lifecycle/route.ts` (전체) · `vercel.json:4-36` (미변경)
- **문제**: 설계 §1.2 `[수정] vercel.json 매시 스케줄 추가`, §3.5(신규 cron), 구현순서 7단계 DoD에 명시된 **lifecycle cron 스케줄 등록이 누락**됐다. `vercel.json`의 `crons`에 `/api/cron/guest-monitoring-lifecycle` 항목이 없다(기존 8개 cron만 존재). 라우트 핸들러는 만들어졌으나 스케줄러가 호출하지 않으므로, 플래그 ON 시 **만료 전이(expired)·만료 SMS·paid-but-unapplied 복구·초안/세션 TTL 정리·CheckLog 90일 정리가 전부 실행되지 않는다.** 결제받은 뒤 만료 처리와 안내가 동작하지 않는 치명적 공백이며, 플래그만 켜면 조용히 누락되므로 발견이 늦다.
- **수정 제안**: 운영 개방(F단계) 전에 `vercel.json`에 매시 스케줄 추가. 단, 현재 등기감시 cron이 KST 12·17시(`0,10,20,30,40,50 3,8 * * *`)에만 도는 점과 정합을 맞출 것.
  ```jsonc
  { "path": "/api/cron/guest-monitoring-lifecycle", "schedule": "0 * * * *" }
  ```
  (설계가 "시간당"이므로 매시 0분. 운영 DDL·플래그 ON 작업과 묶어 F단계에서 반영 권장 — 지금 당장 반영이 아니라 "빠진 산출물"로 추적.)

### [HIGH] 등기모니터 cron의 회원 처리 동작이 플래그와 무관하게 운영에서 변경됨 (범위·검증)
- **파일**: `app/api/cron/registry-monitor/route.ts:84-90`, `lib/registry-monitor/retry-targets.ts:19-26`
- **문제**: 비회원 기능은 플래그 뒤에 있지만, **회원 재시도 회차(:10~:50) 로직이 플래그와 무관하게 바뀌어 즉시 운영에 반영**된다. 기존에는 재시도 슬롯이 "이번 시간대 `fetch_failed` 물건"만 다시 호출했는데, `memberRetryTargetIds`가 여기에 **`lastCheckedAt`이 이번 시간대 이전인 미방문 active 회원(최대 BATCH_SIZE=50건)**을 합쳐서 반환한다(페이지 순회 의도). 결과적으로 재시도 슬롯이 더 이상 "가벼운 실패 재시도"가 아니라 회원 백로그 전체를 추가로 Tilko 호출한다. 회원 수가 배치 용량(50)을 넘으면 커버리지는 좋아지지만, **외부 Tilko 호출량·함수 실행시간·비용이 재시도 슬롯마다 증가**한다. CLAUDE.md "현재 동작 확인 없이 핵심 로직 변경 금지" 및 "배포와 무관한 변경 끼워넣기 금지" 관점에서, 회원 운영 경로 변경이 비회원 기능과 한 변경에 묶여 있다.
- **추가 확인**: `memberRetryTargetIds(now, BATCH_SIZE)`는 미방문 조회에 `BATCH_SIZE`(50)를 쓰지만, 실제 fetch는 `memberBatchSize`(플래그 ON 시 35)로 take한다 — 리스트 상한과 처리 상한이 어긋나 혼동 소지(동작엔 무해).
- **수정 제안**: ① 이 회원 로직 변경을 별도 커밋/별도 검증으로 분리하고 회귀 영향(일일 Tilko 호출 증가량, maxDuration 180s 내 처리 가능 여부)을 실데이터로 검증. ② 미방문 페이지네이션 자체가 필요한 변경인지(기존 :00 단일 배치로 충분했는지) 대장 확인. ③ `memberRetryTargetIds`의 take를 실제 처리 상한과 일치시키거나 주석으로 의도 명시.

---

## 2. MED

### [MED] 결제 완료 후 `duplicate_active`로 적용 실패 시 paid-but-unapplied 무한 루프 (환불·해소 경로 없음)
- **파일**: `lib/guest-monitoring/activation.ts:51-61`, `lib/guest-monitoring/recovery.ts:8-15`
- **문제**: `applyPaidOrder`의 initial 분기는 적용 직전 중복 active(`duplicate_active`, 409)와 이미 적용된 initial 주문을 재검사한다. 만약 결제 승인 **후** 이 검사에 걸리면 `recordPayment`는 주문을 `paid`로 둔 채 `applyPaidOrder`가 예외를 던져 `appliedAt=null`로 남는다. 이후 `recoverPayments`가 매 lifecycle마다 다시 `applyPaidOrder`를 호출하지만 **같은 409로 영구 실패**하고 `console.error`만 남긴다. 사용자는 **결제했으나 서비스 미적용 + 자동 해소/환불 경로 없음** 상태로 고착된다.
- **현실성**: `createOrder`가 생성 시점에 중복 active를 막고 동일(identity, commUniqueNo) 미완료 주문을 하나로 합치므로 트리거는 어렵다(주로 방어선). 그러나 동시성·경합 시 도달 가능하고, 설계 §8이 "자동환불 금지·환불 정책 미확정"이라 방치 시 운영 사고로 번진다.
- **수정 제안**: 복구가 N회 연속 `duplicate_active`로 실패하면 운영 알림 + 주문을 별도 상태(예: `needs_refund`/수동 처리 큐)로 전이시켜 무한 루프를 끊을 것. 환불 정책 확정 전에는 최소한 "자동 재시도 중단 + 가시적 경보"가 필요.

### [MED] outbox 1차 시도가 send 도달 전 예외/크래시로 실패하면 SMS가 영구 미발송
- **파일**: `lib/guest-monitoring/outbox.ts:16-62`
- **문제**: "외부 I/O 전 durable claim" 패턴상, 메시지를 먼저 `status="dead", attempts+1`로 선점한 뒤 send를 시도한다. 그런데 실제 발송은 **첫 시도(원래 `attempts===0`)에서 깨끗이 `sendSms`에 도달한 경우에만** 일어난다. 선점 직후 `assertDecrypted` 실패·`locked` 타임아웃(P2034 소진)·DB 오류·프로세스 크래시 등으로 send에 도달하지 못하면, 다음 회차에는 `status==="dead" && message.attempts>0` 분기로 들어가 **재발송 없이 영수증 조회(`findSmsReceipt`)만** 수행한다. 실제로 보낸 적이 없으므로 영수증은 영원히 없고, attempts 소진 후 `dead`로 종료된다 → **만료 안내 SMS가 한 번도 안 나간다.**
- **설계 의도와의 관계**: §3.5-3 "응답 유실 시 무조건 재발송 않고 상태 조회 우선"은 **send 이후 응답 유실**에는 올바른 안전장치다. 하지만 **send 이전 실패**까지 동일하게 "조회 전용"으로 처리돼 정상 알림이 누락된다. (중복 발송 회피를 위한 의도적 트레이드오프지만, 1차 시도의 일시 오류가 영구 누락으로 번지는 점이 과하다.)
- **수정 제안**: send 도달 여부를 상태로 구분(예: 선점 상태를 `sending`으로 두고, send 호출을 지난 경우에만 `dead`/`reconcile`로 전이)하여 "보내기 전 실패"는 재발송, "보낸 뒤 불명"만 조회 전용으로 가게 분리. 최소한 `reconciliation_required` 로그는 운영 경보로 승격.

### [MED] 공개 콜백 라우트(identity/payment callback)에 rate limit 전무 — DoS 표면
- **파일**: `app/api/guest-monitoring/identity/callback/route.ts`, `app/api/guest-monitoring/payment/callback/route.ts`, `lib/guest-monitoring/http.ts:25`(`callback` 분기에서 `ipLimit` 생략)
- **문제**: 설계 §3.6은 콜백에 "거래 단위" 제한을 명시하나, 구현의 `endpoint({callback:true})`는 Origin뿐 아니라 **rate limit도 건너뛴다.** 서명 검증(HMAC) 전까지 매 요청이 본문 파싱·HMAC 계산·(payment는 `verifyPayment`→`getPayment` DB 조회까지) 수행되므로, 인증 없는 외부 요청으로 비용을 유발하는 DoS 벡터가 된다. 서명은 위조 불가하나 "유효하지 않은 요청을 값싸게 거르는" 앞단 제한이 없다.
- **수정 제안**: 콜백에도 IP 단위(또는 orderId/nonce 추출 가능 시 거래 단위) 느슨한 rate limit을 추가하고, 서명 검증 실패분은 우선적으로 저비용 차단.

### [MED] 플래그 ON 시 비회원 0건이어도 회원 배치가 15 줄어듦
- **파일**: `app/api/cron/registry-monitor/route.ts:89`
- **문제**: `memberBatchSize = guestMonitoringEnabled() ? BATCH_SIZE - GUEST_BATCH_SIZE(15) : BATCH_SIZE`. 즉 **활성 비회원이 0건이어도** 플래그가 ON이면 회원 배치가 50→35로 고정 축소된다. `runGuestPrechecks`는 대상이 없으면 조기 반환하지만, 그만큼 회원 처리량을 양보한 상태가 상시 유지된다.
- **수정 제안**: 실제 비회원 처리 건수(`guest.processed`)에 비례해 회원 take를 동적 조정하거나, 비회원 쿼터를 "대상이 있을 때만" 차감. 당장은 영향 작지만 회원 백로그가 많을 때 손해.

### [MED] 외부 solapi API 표면(신규 사용) 런타임 검증 필요
- **파일**: `lib/solapi-client.ts:97-139`
- **문제**: `MessageNotReceivedError` import, `solapi.send(..., { showMessageList: true })`, `receipt.messageList?.[0]?.messageId`, `solapi.getMessages({ dateType, startKey, ... })`, `message.customFields?.guestOutboxId`, `response.messageList`(Object.entries)·`response.nextKey` 등 **기존 코드에 없던 solapi SDK 표면을 다수 새로 사용**한다. send 응답은 배열(`[0]`), getMessages 응답은 객체(`Object.entries`)로 **서로 다른 형태를 가정**하는데, 설치된 solapi 버전의 실제 타입과 일치하는지 미검증. 불일치 시 빌드/런타임 오류 또는 영수증 조회 무력화(reconciliation 실패) 위험.
- **수정 제안**: 설치된 `solapi` 버전의 `d.ts`로 `getMessages`/`showMessageList`/`customFields`/`MessageNotReceivedError`/응답 shape를 확인하고, 격리 환경에서 실제 호출 1회 검증. `npm run build`로 타입 통과 확인.

### [MED] 콜백 세션 쿠키 SameSite 비대칭 — 교차사이트 리턴 시 발급 신뢰성
- **파일**: `lib/guest-monitoring/session.ts:13, 38-39, 60-61`
- **문제**: `BROWSER_COOKIE`는 운영에서 `SameSite=None`으로 설정(교차사이트 전송 허용)되는데, `SESSION_COOKIE`(attachSession)는 `cookieOptions()`의 `SameSite=lax`를 그대로 쓴다. 다날이 콜백을 **교차사이트 top-level POST**로 되돌리는 흐름(설계가 302/200 둘 다 허용)에서는 Lax 세션 쿠키 발급·후속 전송이 브라우저/흐름에 따라 달라질 수 있다. 현재는 콜백이 JSON(`{ok,redirect}`)을 반환해 프론트(같은 출처) fetch로 소비한다는 전제라 동작하지만, 실다날 연동(F단계) 시 리턴 메커니즘에 따라 세션 미설정이 발생할 수 있다.
- **수정 제안**: 콜백 리턴 방식(프론트 fetch vs 다날 top-level POST)을 확정하고, 그에 맞춰 세션 쿠키 SameSite 정책을 명시적으로 결정(교차사이트 top-level이면 `None; Secure` 필요). 실다날 명세 확정(설계 §8) 시 함께 처리.

---

## 3. LOW

### [LOW] 만료(expired) 비회원 물건의 PII 보관기간 미정의 — 무기한 잔존
- **파일**: `lib/guest-monitoring/cleanup.ts:5-16`
- **문제**: cleanup은 `pending_payment`/`abandoned` 초안만 스크럽하고, `expired`로 전이된 물건의 암호화 PII(guestName/phone/address/ownerName)는 삭제 대상이 아니다(연장·SMS용 보존). 설계 §8이 보관기간 미확정이라 **만료 후 PII가 무기한 남는다.** 정책 확정 후 만료 N일 경과분 스크럽 경로 필요. (견고성 4문 "수명주기" 관점.)

### [LOW] `parse-pdf` 응답의 `extractionOk`는 항상 true
- **파일**: `lib/guest-monitoring/draft.ts:27`
- **문제**: 설계 §3.1은 추출 불완전 시 `extractionOk:false`(200) 가능성을 표로 제시했으나, 구현은 불완전을 400(`extraction_incomplete`)으로 던지고 성공 200에서는 항상 `extractionOk:true`를 반환한다. 동작상 안전(결제 차단)하므로 문제는 아니나, 프론트/설계 계약과 미세 불일치 — 설계표를 "400으로 통일"로 정정하거나 프론트가 `extractionOk` 분기를 쓰지 않도록 합의.

### [LOW] `commUniqueNo`는 평문 저장 (중복탐지 where 조건 때문)
- **파일**: `prisma/schema.prisma:159-163`, `lib/pii-crypto-tree.ts:27`
- **문제**: 중복 active 탐지(`where commUniqueNo`)를 위해 `commUniqueNo`는 PII_FIELDS에서 제외돼 평문 저장된다(비결정 GCM이면 where 불가하므로 설계상 불가피). 설계 모델 주석과 일치하나, 고유번호의 민감도를 고려하면 운영 DDL 단계에서 접근 통제/노출 금지 재확인 권장. (DTO·응답엔 마스킹만 노출돼 현재 유출 없음.)

### [LOW] 재시도 리스트 상한 불일치 (혼동 소지)
- **파일**: `lib/registry-monitor/retry-targets.ts:22` vs `app/api/cron/registry-monitor/route.ts:127,136`
- **문제**: `memberRetryTargetIds`가 미방문 조회에 `BATCH_SIZE`를 쓰나 실제 처리는 `memberBatchSize`로 제한 — H2에서 언급. 동작 무해, 주석/상수 정리로 의도 명확화.

---

## 4. 설계 스펙 일치성 요약

| 설계 항목 | 구현 | 비고 |
|---|---|---|
| 플래그 OFF → 전 라우트 404 (본문/DB 접근 전) | ✅ `http.ts` `requireEnabled` 선행 + 테스트 | |
| 키 누락 운영 → 503 (가짜 성공 금지) | ✅ `requireCrypto`, `getDanalProvider` 폐쇄 | |
| 격리 목만, 운영 mock 선택 불가 | ✅ `danal/index.ts` (loopback+격리DB+32자 시크릿) + 테스트 | |
| PII 트리 암호화 + blind index | ✅ `pii-crypto-tree` 등록, `prisma.$extends` 자동 암복호 | |
| 복호화 실패를 "일치"로 판정 금지 | ✅ `assertDecrypted` `/^v\d+:/` 검출 (decryptPII 실패 시 v2: 유지 확인) | |
| IDOR: 세션+`id+verifiedIdentityHash`, 무권한=동일 404 | ✅ order/calendar/properties 전부 identity 범위 조회 | |
| 멱등: `appliedAt` 재적용 차단, 거래 재전송 기간 미가산 | ✅ `activation.ts` | |
| 금액 SSOT 서버결정·provider 재조회 검증 | ✅ `recordPayment` 금액·통화·거래·가맹·시각 교차검증 | |
| 기간 1개월 KST 월말보정, UTC 저장, 재활성 소급 금지 | ✅ `period.ts`, 달력 interval로 gap 제외 | |
| 콜백 서명/nonce 검증, Origin 미적용 | ✅ `callback.ts` HMAC timing-safe + nonce 소비 | |
| 인증 없는 변이 없음 (parse/start는 Origin+ratelimit) | ✅ | |
| **lifecycle cron 스케줄(vercel.json)** | ❌ **누락 (HIGH)** | §1.2/§3.5/step7 |
| 콜백 "거래 단위" rate limit | ⚠️ **미구현 (MED)** | DoS 표면 |

---

## 5. 플랫폼 원칙 점검 (검수 대상 코드 기준)

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (백엔드 검수)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 — 최대 integration.test.ts 310줄, 로직 파일 ≤82줄. 라우트 핸들러 얇음
2. 단일 책임           : ✅ 준수 — route(검증·호출·직렬화) / lib(로직) / danal(외부연동) / types 분리
3. 서버 검증·보안      : ⚠️ 대체로 준수 — zod 서버검증·IDOR·CSRF·암호화 양호.
                          단 콜백 rate limit 부재(MED), 콜백 세션 SameSite(MED)
4. 성능 (중복·N+1)     : ⚠️ 대체로 준수 — 배치 쿼터·월범위·advisory lock·순수함수.
                          단 회원 배치 상시 15 축소(MED), 재시도 슬롯 Tilko 호출 증가(HIGH 범위)
5. 폴더 구조           : ✅ 준수 — components/hooks/lib/actions(route)/types 역할 분리
─────────────────────────────────────────────────
위반/보완 항목: HIGH 2건, MED 6건, LOW 4건 (상세 위 참조)
─────────────────────────────────────────────────
```

---

## 6. 총평 및 권고 순서

핵심 보안·멱등·암호화·IDOR 설계는 **충실히 구현**됐고, 격리/플래그/503 폐쇄 등 안전장치가 견고하다. 다만 **운영 반영 전 반드시 닫아야 할 공백**이 있다.

1. **(HIGH) vercel.json lifecycle cron 등록** — 없으면 플래그 ON 시 만료·문자·복구가 전부 미동작. F단계 체크리스트에 고정.
2. **(HIGH) 회원 cron 동작 변경 분리·검증** — 플래그 무관 운영 반영분. 실데이터로 Tilko 호출량·실행시간 회귀 확인 후 별도 승격.
3. **(MED) paid-but-unapplied 무한 루프 차단 + 경보/수동처리 큐** — 환불 정책 확정과 병행.
4. **(MED) outbox 발송전 실패 영구누락 구조 개선**, **콜백 rate limit 추가**, **solapi API 표면 타입 검증**.
5. LOW 항목은 운영 DDL·실다날 연동(F단계)에서 함께 정리.

> 본 검수는 로컬 코드 정적 분석 기준이며, 격리 DB 실행·`npm run build`·실연동 검증은 미수행(규칙 0-1). 위 지적 중 solapi 표면·회원 cron 회귀는 **실행 검증으로 확정**해야 한다.
</content>
</invoke>
