# 비회원 등기감시 단건 서비스 — 설계 대비 구현 갭 분석 (교차수정 반영 후)

> **분석자**: 크로미 (Claude)
> **일자**: 2026-10-15
> **기준 설계서**: `docs/02-design/features/lib.design.md`
> **교차검수 기준**: `docs/03-analysis/lib.review-backend.md`, `docs/03-analysis/lib.review-frontend.md`
> **대상**: 커밋 안 된 변경분 전체(백엔드 `lib/`·`app/api/`·`prisma/`·`types/` + 프론트 `app/(personal-home)/renewal/monitoring/`), **교차수정 반영분**
> **방법**: 설계 계약 항목 ↔ 실제 코드 대조 + 양측 교차검수 지적 14+11건의 실제 해소 여부를 원본 파일에서 재검증
> **한계(규칙 0-1)**: 로컬 정적 분석 기준. 격리 DB 실행·`npm run build`·실연동·실브라우저 E2E는 미수행. "해소됨" 판정은 코드 구조상 해소를 의미하며 운영 실동작 검증을 대신하지 않는다.

---

## 1. Match Rate (일치율): **95%**

설계서는 "계약서" 위상으로 데이터 모델·API 스펙·타입·상태전이·불변식을 명시했고, 구현은 이를 **충실히 따랐다.** 핵심 보안·멱등·암호화·IDOR 계약이 모두 구현됐고, 교차검수 지적 대부분이 교차수정으로 해소됐다.

| 설계 영역 | 일치 | 근거 / 편차 |
|---|---|---|
| 데이터 모델 (Prisma 5모델) | 100% | `GuestMonitoring/Order/CheckLog/VerificationSession/Message` + 인덱스·제약 구현 |
| PII 암호화 등록 (`pii-crypto-tree`) | 100% | GuestMonitoring 4필드 등록, `commUniqueNo`만 blind-where 위해 평문(설계 주석 일치) |
| 요금제 단건 SSOT (`pricing-plans`) | 100% | `GUEST_SINGLE_MONITORING` 상수 추가, 구독 enum 비혼입 |
| 공유 타입 (`types/guest-monitoring.ts`) | 100% | status/order enum·`CheckLogItem`·`GuestApiError` 일치 |
| API 스펙 (10개 라우트) | 100% 존재 / 동작 일치 | parse-pdf·identity(start/callback)·orders(+[id])·payment/callback·properties(+[id]/calendar)·session·cron 2종 전부 존재 |
| 핵심 불변식 (상태전이·IDOR·멱등·금액·기간) | ~95% | 전부 구현. 달력 KST 보정에 월 그리드 요일 오프셋만 로컬 Date 잔존(미세) |
| 파일 분리 계획 (§1.2) | ~90% | 아래 2.4 구조 편차 참조 |
| 수명주기 cron **운영 완결성** | 부분 | 라우트 핸들러 완성 but `vercel.json` 스케줄 미등록 → 플래그 ON 시 미동작 |

**감점 요인**: ① `vercel.json` lifecycle cron 미등록(운영 완결성 공백, -3), ② 구조 편차(설계 명시 `product.ts`·`danal/identity.ts`·`payment.ts` 미생성, 기능은 커버, -1), ③ 달력 월 그리드 요일 오프셋 로컬 Date 잔존·일부 계약 미세 불일치(-1).

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### 2.1 운영 완결성 공백 (HIGH)

- **G-1 [HIGH] 수명주기 cron이 `vercel.json`에 미등록** — 설계 §1.2/§3.5/구현순서 7단계 DoD가 "매시 스케줄 추가"를 명시했으나, `vercel.json` crons 배열에는 기존 8개만 존재하고 `/api/cron/guest-monitoring-lifecycle`가 없다. 라우트 핸들러는 완성됐지만 스케줄러가 호출하지 않아, **플래그 ON 시 만료 전이·만료 SMS·paid-but-unapplied 복구·초안/세션 TTL 정리·CheckLog 90일 정리가 전부 영구 미실행**이다. 결제 후 만료·안내가 조용히 누락되므로 발견이 늦다.
  - 설계/교차검수 모두 "F단계(운영 개방) 때 운영 DDL·플래그 ON과 묶어 반영"을 의도했으므로 **현 단계 의도적 보류일 수 있으나**, 플래그를 켜기 전 반드시 등록해야 하는 "빠진 산출물"로 추적 필요.

### 2.2 수명주기/보관정책 누락 (LOW·정책 연동)

- **G-2 [LOW] 만료(expired) 비회원 PII 무기한 잔존** — `cleanup.ts`는 `pending_payment`/`abandoned` 초안만 스크럽하고 `expired` 물건의 암호화 PII(guestName/phone/address/ownerName) 삭제 경로가 없다. 설계 §8이 보관기간 미확정이라 정책 확정 후 "만료 N일 경과분 스크럽" 경로가 필요(견고성 4문 "수명주기").

### 2.3 계약 미세 불일치 (LOW)

- **G-3 [LOW] `parse-pdf` 응답 `extractionOk` 항상 true** — 설계 §3.1 표는 추출 불완전 시 `extractionOk:false`(200) 가능성을 제시했으나, 구현은 불완전을 400(`extraction_incomplete`)으로 던지고 200에선 항상 true. **동작상 안전(결제 차단)**하나 설계표와 미세 불일치 → 설계표를 "400 통일"로 정정 권장.
- **G-4 [LOW] 완료화면이 미구현 "만료 전 안내" 약속** — `GuestApplyResult.tsx:34`가 "만료 전 연장 안내 문자를 보내드립니다"로 안내하나, 설계 §3.5/§2는 **만료 후** 안내이며 `pre_expiry`는 MVP 범위 밖(G등급 확장). 진입 공지("만료 시")와도 문구 불일치 → 만료 후 안내로 문구 통일 필요.
- **G-5 [LOW] 조회 인증 폼 레이블 미결속** — `GuestStatusAuthForm.tsx:37,49`의 이름/전화 입력이 `<div>` 레이블로 남아 `htmlFor`/`id`/`aria-label` 연결 없음(신청폼 `GuestApplyForm`은 해소됨). 접근성 보조기기 사용자에게 안정적 이름 미제공.

### 2.4 구조 편차 (설계 §1.2 대비 — 무해, 기능 커버됨)

- **G-6 설계 명시 파일 일부 미생성/통합**:
  - `lib/guest-monitoring/product.ts`(단건 상품 금액/기간 산출) **미생성** → `order.ts`/`activation.ts`가 `pricing-plans.ts`의 `GUEST_SINGLE_MONITORING`을 직접 참조. 기능 동일.
  - `lib/danal/identity.ts`·`payment.ts` **미생성** → `index.ts`/`mock.ts`/`types.ts`/`callback.ts`로 통합. **목(mock) 전용 단계**라 실어댑터 분리는 F단계(키 수령 후)로 자연 이연. 설계 의도(서버 전용 어댑터 경계)는 유지.
  - 반대로 설계 미명시 보강 파일 추가: `http.ts`(라우트 공통 가드), `config.ts`(플래그/503 게이트), `transaction.ts`, `outbox.ts`·`recovery.ts`·`cleanup.ts`(expiry 세분화), `pdf-extraction.ts`. → **단일책임 강화 방향**이라 긍정적.
  - 달력 KST 유틸은 설계상 "공통 시간 처리"를 `components/kstTime.ts`로 구현(위치 합리적).
- **판정**: 설계 "폴더 역할 분리" 원칙은 지켜졌고 편차는 전부 합리적 통합/세분화. 계약(API/타입/모델)에 영향 없음.

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (교차수정 반영 후 전체 코드 기준)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수
2. 단일 책임           : ✅ 준수
3. 서버 검증·보안      : ✅ 준수 (교차수정으로 콜백 rate limit·쿠키 SameSite 보완 완료)
4. 성능 (중복·N+1)     : ✅ 준수 (배치 쿼터 동적화·월범위·advisory lock·순수함수)
5. 폴더 구조           : ✅ 준수
─────────────────────────────────────────────────
위반 항목: 없음. 잔여 Gap은 운영 완결성(cron 등록)·정책(PII 보관)·접근성(LOW)이며 5대 원칙 위반 아님
─────────────────────────────────────────────────
```

**세부 근거:**

1. **500줄 제한 ✅** — 신규/수정 전 파일 500줄 미만. 최대: 비회원 기능은 `hooks/useGuestStatus.ts`(322), `useGuestApply.ts`(294), 백엔드 `tests/integration.test.ts`(428, 테스트). 기존 회원 코드 `MonitoringDetailView.tsx`(451)도 한도 내. 라우트 핸들러는 전부 ≤22줄(얇음).
2. **단일 책임 ✅** — route(검증·호출·직렬화) / lib(로직·상태전이·트랜잭션) / danal(외부연동) / hooks(상태) / components(UI) / types(계약) 분리. 교차수정으로 outbox/recovery/cleanup 등 수명주기 로직까지 책임 세분화.
3. **서버 검증·보안 ✅** — zod 서버 검증(`schemas.ts`), IDOR(세션+`id+verifiedIdentityHash`), CSRF(`validateOrigin`), 콜백 HMAC+nonce 1회 소비, PII 트리 암호화+blind index, 복호화 실패를 "일치"로 비판정(`assertDecrypted` `/^v\d+:/`), `no-store`, 플래그 OFF→404·키누락→503. **교차검수가 지적한 콜백 rate limit 부재(MED)·쿠키 SameSite 비대칭(MED)이 모두 해소.**
4. **성능 ✅** — rate limit 전 구간, **회원 배치 쿼터를 비회원 실처리 건수 비례 동적 차감**(`BATCH_SIZE - guest.processed`), 달력 월범위 쿼리(120건 상한 회피), advisory lock 직렬화, period/hash 순수함수, 주문 상태 조회로 재결제 억제. **교차검수 지적 "회원 배치 상시 15 축소"도 해소.**
5. **폴더 구조 ✅** — components/hooks/lib/actions(route)/types 역할 분리. 비회원 전용은 라우트 하위 `components/guest/`·`guest/{apply,status}/`로 격리.

---

## 4. 교차검수 지적사항 해소 여부

### 4.1 백엔드 (review-backend.md) — 11건 중 **해소 8 / 미해소 3**

| # | 지적 (등급) | 판정 | 핵심 근거 |
|---|---|---|---|
| 1 | 수명주기 cron vercel.json 미등록 (HIGH) | ❌ **미해소** | `vercel.json` crons에 lifecycle 항목 없음 (→ G-1) |
| 2 | 회원 재시도 로직 플래그무관 운영변경 (HIGH) | ✅ 해소 | `retry-targets.ts`가 `fetch_failed`만 반환, 미방문 백로그 합산 제거. `member-batch.test.ts` 검증 |
| 3 | paid-but-unapplied 409 무한루프 (MED) | ✅ 해소 | `activation.ts`가 충돌 시 `needs_review` 전이+auditLog 경보, `recovery.ts`는 `paid`만 조회해 루프 차단 |
| 4 | outbox send 전 실패 영구미발송 (MED) | ✅ 해소 | 선점 상태 `preparing` 신설, send 직전에만 `dead` 마커 → 발송전 실패는 재발송 |
| 5 | 콜백 rate limit 전무 (MED) | ✅ 해소 | `http.ts` 콜백 IP 120/분 + `activation.ts` 거래(orderId) 20 + `session.ts` nonce 20. `callback-boundaries.test.ts` |
| 6 | 비회원 0건 시 회원배치 15 축소 (MED) | ✅ 해소 | `memberBatchSize = BATCH_SIZE - guest.processed` 동적화. `registry-quota.test.ts` |
| 7 | solapi API 표면 검증 (MED) | ✅ 해소 | `solapi-sdk.test.ts`·`sms-receipt.test.ts` 2종으로 getMessages/showMessageList/customFields/MessageNotReceivedError 검증 |
| 8 | 콜백 쿠키 SameSite 비대칭 (MED) | ✅ 해소 | `session.ts` cookieOptions 운영 `none` 대칭화, 두 쿠키 동일. 테스트 검증 |
| 9 | 만료 비회원 PII 무기한 잔존 (LOW) | ❌ **미해소** | `cleanup.ts` expired 스크럽 경로 없음 (→ G-2, 정책 미확정 연동) |
| 10 | parse-pdf extractionOk 항상 true (LOW) | ❌ **미해소(의도적)** | `draft.ts:27` 하드코딩 유지, 동작 안전 (→ G-3) |
| 11 | 재시도 리스트 상한 불일치 (LOW) | ✅ 해소 | #2 해소로 take 불일치 원인 자체 소멸 |

> 설계 핵심 스펙 6항목(플래그 OFF→404, 키누락→503, IDOR 조건조회, 멱등 appliedAt, 금액 SSOT+provider 재조회, period KST 월말보정+테스트)은 **전부 코드로 일치 확인.**

### 4.2 프론트 (review-frontend.md) — 14건 중 **해소 11 / 부분 1 / 미해소 2**

| # | 지적 (등급) | 판정 | 핵심 근거 |
|---|---|---|---|
| 1 | 본인인증 복귀 재개 미연결 (HIGH) | ✅ 해소 | `useGuestApply.ts` 세션 발급 마커(`applyResume.setPendingIdentity`) 기반 재개, URL 부재를 인증완료로 비취급 |
| 2 | 입력 변경 후 이전 draft 결제 (HIGH) | ✅ 해소 | `GuestApplyForm.tsx` 분석완료 시 입력 잠금+"다시 입력"이 draft 무효화·재분석 강제 |
| 3 | 달력 응답 경합 race (HIGH) | ✅ 해소 | `useGuestStatus.ts` 세대번호 `calSeqRef`+응답-대상 id 일치검증+연장대상 일치검증 |
| 4 | 목록 실패 시 무한 로딩 (MED) | ✅ 해소 | 401 외 오류도 `authState="error"`로 checking 종료+재시도 버튼 |
| 5 | 세션만료·오류 화면 유실 (MED) | ✅ 해소 | 공통 `handleSessionExpired` 401 재인증 전환, 달력/연장 오류 패널 전달 |
| 6 | 로그아웃 실패 성공처리 (MED) | ✅ 해소 | `res.ok||401`만 종료, 그 외 `logoutFailed`로 민감화면 가림+재시도 |
| 7 | 멱등키 재사용 (MED) | ✅ 해소 | `orderTarget(purpose, id)` 결합키, 대상별 get-or-create·OrderMap 분리 |
| 8 | 결제 상태별 복구 불완전 (MED) | ✅ 해소 | `classifyOrderState` settling/failed/applied 3분기, paid-but-unapplied를 settling(재조회)로 교정 |
| 9 | 달력 로컬시간 계산 (MED) | ✅ 해소(미세잔존) | `kstTime.ts`(Intl Asia/Seoul)로 날짜키·오늘·정오/오후 슬롯 KST화. **월 그리드 요일 오프셋만 로컬 Date 잔존**(해외 기기 패딩 미세 어긋남 가능) |
| 10 | 플래그 OFF UI 노출 (MED) | ✅ 해소 | 서버 `guestMonitoringEnabled()` 확인: apply/status page `notFound()`, 랜딩은 `guestEnabled` prop 조건 렌더 |
| 11 | returnUrl 실행URL 오인 (MED) | ✅ 해소 | `guestProvider.ts` URL_KEYS에서 returnUrl 제외, form POST 필드로만 사용 |
| 12 | 키보드 PDF 선택 불가 (MED) | ✅ 해소 | 네이티브 `<button>` 트리거+aria 연결, 숨은 input `tabIndex=-1` |
| 13 | 입력 레이블/aria 없음 (LOW) | ⚠️ **부분해소** | GuestApplyForm 해소, **GuestStatusAuthForm 이름/전화 미결속**(→ G-5) |
| 14 | 완료화면 미구현 안내 약속 (LOW) | ❌ **미해소** | `GuestApplyResult.tsx:34` "만료 전 안내" 문구 잔존 (→ G-4) |

> 프론트 HIGH 3건 전부 해소(화면과 다른 물건 결제/연장, 인증 복귀, 입력 변경 후 오결제 — US-05/US-07 핵심 위험 제거).

---

## 5. 종합 의견 및 남은 수정 우선순위

### 종합 의견

교차수정은 **매우 충실하게 반영**됐다. 양측 교차검수가 제기한 HIGH 5건(백엔드 2 + 프론트 3) 중 4건이 완전 해소됐고, MED 15건은 전부 또는 사실상 전부 해소됐다. 특히 결제 멱등·IDOR·세션 복귀·응답 경합·요청 상태 복구처럼 **US-05(IDOR)·US-07(중복결제 방지) 핵심 위험이 코드 구조상 제거**됐으며, 플랫폼 5대 원칙 위반도 없다. 설계 계약(모델·API·타입·불변식) 일치율은 95% 수준으로 높다.

남은 미해소는 대부분 **① 설계 스스로 "F단계 운영 개방 시 반영"으로 이연한 항목(cron 등록)**, **② 설계 §8이 "정책 미확정"으로 둔 항목(PII 보관기간)**, **③ 동작상 안전한 계약 미세 불일치·접근성 LOW**다. 즉 "구현 결함"이 아니라 "운영 개방 전 체크리스트에 남은 산출물" 성격이 강하다.

단, **G-1(cron 미등록)은 유일한 운영 치명 공백**이다. 플래그만 켜면 만료·문자·복구가 조용히 미동작하므로, 플래그 ON 작업과 **절대 분리되지 않게** F단계 DoD에 못박아야 한다.

### 남은 수정 우선순위

| 순위 | 항목 | 등급 | 조치 | 시점 |
|---|---|---|---|---|
| 1 | **G-1** vercel.json에 `/api/cron/guest-monitoring-lifecycle` 매시 스케줄 등록 | HIGH | `{"path":".../guest-monitoring-lifecycle","schedule":"0 * * * *"}` 추가. 기존 등기cron KST 12·17시 정합 확인 | **플래그 ON 전 필수** (F단계, 운영 DDL과 동시) |
| 2 | **(백엔드 #2 후속검증)** 회원 재시도 로직 복구분의 실데이터 회귀 | HIGH→검증 | 코드는 해소됐으나, Tilko 호출량·maxDuration 180s 내 처리 실측 1회 | 테스트 배포 후 |
| 3 | **G-2** 만료 PII 보관기간 확정 + 스크럽 경로 | LOW→정책 | §8 보관정책 확정 후 cleanup에 "만료 N일 경과분" 추가 | F단계 (정책 확정 묶음) |
| 4 | **G-4** 완료화면 "만료 전 안내" 문구를 만료 후 안내로 통일 | LOW | `GuestApplyResult.tsx` 문구 수정(1줄) | 즉시 가능 |
| 5 | **G-5** `GuestStatusAuthForm` 이름/전화 `label htmlFor`/`id` 결속 | LOW | 접근성 보완 | 즉시 가능 |
| 6 | **G-3** 설계 §3.1 표를 "불완전=400 통일"로 정정(문서 수정) | LOW | 설계서 정합화 | 즉시 가능 |
| 7 | **(달력 #9 잔존)** 월 그리드 요일 오프셋도 KST 기준화 | LOW | `MonitoringActivityCalendar` 패딩 계산 KST화, 회원 화면 회귀 확인 | 선택 |
| 8 | **(백엔드 #7 후속)** solapi 실연동 격리 호출 1회 + `npm run build` 타입 통과 | 검증 | 실SDK shape 확정 | F단계 |

> **F단계(운영 개방) 전 게이트**: 1·2·3·8을 반드시 통과. 4·5·6은 즉시 반영 가능한 저비용 정리. 이 분석은 로컬 정적 분석 기준이며, cron 실행·실결제/실인증·실브라우저 E2E·회원 회귀는 **운영 반영 전 실환경 검증(규칙 0-1)이 별도로 남아 있다.**
</content>
</invoke>
