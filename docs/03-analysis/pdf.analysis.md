# PDF-only 비회원 신청 — 설계 대비 구현 갭 분석 (교차수정 반영 후)

> **분석자**: 크로미(Claude)
> **일자**: 2026-10-16
> **설계 계약(SSOT)**: `docs/02-design/features/pdf.design.md`
> **교차검수 기준**: `docs/03-analysis/pdf.review-backend.md`, `docs/03-analysis/pdf.review-frontend.md`
> **대상**: 백엔드(`lib/guest-monitoring/`, `types/`, `prisma/`) + 프론트(`app/(personal-home)/renewal/monitoring/**`) 미커밋 변경분
> **방식**: 정적 코드 추적(설계 계약 ↔ 구현 1:1 대조). 브라우저/운영 실환경 검증은 미실시(아래 §5 전제).

---

## 1. Match Rate (일치율) — **약 95%**

| 영역 | 일치율 | 근거 |
|---|---|---|
| **API 계약(§3)** | ~98% | parse-pdf 허용목록·중복키 거부·address 제거, identity/start role refine, orders 역할·소유자 게이트 배치 순서, 활성화 방어 needs_review까지 **런타임 계약 1:1 일치**. |
| **데이터 모델(§2)** | ~98% | `role String?` 추가전용, 공유 타입 `GuestMonitoringRole`·`unitNumber`·`role?` 전부 반영, owner-match 정규화 §2.5와 1:1. |
| **서버 순수로직(§2.5·§2.6·§4.7)** | ~95% | parseUnitNumber(층≠호)·isAggregate·중복접미사 방지·owner-match 완전일치 정확. signal-message 세부분기만 dead(§2-Gap #3). |
| **프론트 UX(§4)** | ~95% | 주소 입력 제거·PDF 단일 통합·추출 확인·역할 radio·소유자 불일치 alert·완료판정(paid&&applied) 전부 반영. 명암비·역할 고정·초안별 역할 초기화 **교차수정 완료**. |
| **단계 경계(§5·§7.3)** | ~90% | 코드는 설계대로. 단 운영 role 컬럼 수동 적용이 **코드 밖 배포 전제**로 남음(런북/검증SQL로 보강됨, §2-Gap #2). |

**총평**: 설계가 스스로 "계약서(SSOT)"로 규정한 **기능 계약은 사실상 완전 구현**됐다. 남은 5%는 전부 **LOW 등급의 dead code·문서-구현 순서 불일치·스타일·기술부채**이며, 보안·데이터·멱등·복구 계약을 깨는 항목은 없다.

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### ✅ 해소된 설계 핵심 (교차수정으로 정합)
- parse-pdf 허용목록 `[file, guestName, guestPhone]` + 키별 중복 거부 — `draft.ts:9-10` (§3.1 정확)
- address 수동입력·주소매칭 완전 제거 — `pdf-extraction.ts`의 `extractRegistryFields(text)`는 주소 비교 인자 없음 (§3.1·§6)
- 동/호 구조화 — `property-fields.ts` parseUnitNumber: `제\d+동`/`제\d+호` 경계 매칭으로 **"층"을 "호"로 오인 안 함**, 중복접미사(`동동`) 방지 (§2.6)
- owner 대조 게이트 — `order.ts:20-25`: exact-idempotency 반환(§3.4-A) **뒤**, pending 재사용(§3.4-C) **앞**에 `assertApplicantRole` 배치. 순서 설계 정확
- 활성화 방어 needs_review — `activation.ts:17-29` (§3.6)
- role 추가전용·null 중립 폴백 — `schema.prisma:1160`, `signal-message.ts:16`
- 완료판정 `paid && applied` 유일 근거 유지 — `useGuestOrderFlow.ts:143` (§4.4)

### ⚠️ 잔존 Gap (LOW)

| # | 항목 | 파일:라인 | 설계 대비 | 영향 |
|---|---|---|---|---|
| G1 | **signal-message 세부경고 dead branch** | `signal-message.ts:17-20` / 호출부 `precheck-adapter.ts:44,49`·`calendar-dto.ts:47` | 호출부가 전부 `buildSignalSummary(role, result)`로만 호출 → `caseType`/`phase` 미전달 → 근저당/소유권이전/압류 세부경고 분기 **절대 미실행** | 설계 §5가 plumbing을 필수로 못박진 않아 **계약 위반 아님**. 그러나 코드가 죽어 있어 오해 소지(리뷰-백엔드 #3 **미해소**) |
| G2 | **bindDraftRole 분기 순서 ≠ 설계 §3.2** | `draft-role.ts:16-21` | 설계: ①진행주문 존재→거부 ②role null/동일→설정 ③상이→거부. 구현: ①동일역할→조기반환 ②상이→거부 ③null일 때만 진행주문 조회 | 보안 영향 없음(중복활성은 order.ts `duplicate_active`가 별도 차단). 단 **설계 문서와 코드 순서 불일치**가 reconcile 안 됨 — 설계 또는 코드 중 하나로 일치 필요(리뷰-백엔드 #4 **미해소**) |
| G3 | **strict-json 범위 미문서화** | `http.ts`·`strict-json.ts` | readJson 중복키 거부가 identity/start·orders·verify-otp 전체로 확대됐으나 pdf.design/lib.design에 미기재 | 방어적 하드닝(토크나이저 안전 확인됨). **계약서-구현 동기화만 누락**(리뷰-백엔드 #5 **미해소**) |
| G4 | **추출 검사 순서 방어화 미적용** | `pdf-extraction.ts:26-27`, `property-fields.ts:16` | `registryPropertyFields`가 `title.address.trim()`을 옵셔널 체이닝 없이 사용. 현 파서는 `address`를 항상 `""`로 초기화해 **현재 런타임 에러 없음** | 파서 계약 변경 시 graceful `extraction_incomplete` 대신 500 가능성. 견고성 개선 미반영(리뷰-백엔드 #6 **미해소**) |
| G5 | **Prisma `role` 필드 위치** | `schema.prisma:1160` | `role`이 `id @id`(1161) **앞**에 선언 — 다른 모델(PK 선두) 관례와 불일치 | 기능/ALTER 무관. 스타일만(리뷰-백엔드 #7 **미해소**) |
| G6 | **공유 타입 중복 선언(기술부채)** | `guest/guestTypes.ts:13,26,32` | 공유 타입(`types/guest-monitoring.ts`)에 이미 `GuestMonitoringRole`·`unitNumber`·`role?`가 존재하는데, 프론트 `guestTypes.ts`가 동일 역할 타입 재선언 + 교차(intersection) 재확장 | 현재 런타임 일치(중복 무해). 향후 계약 변경 시 **양쪽 동기화 필요**(리뷰-프론트 "위험" 노트) |
| G7 | **`address_mismatch` 메시지 엔트리 잔존** | `errors.ts:18` | 설계 §3.1은 "다른 경로 사용 여부 확인 후 비회원 경로에서만 제거"로 보수적 처리 규정. 메시지 상수는 남아있고 **비회원 추출 경로 호출은 제거됨** | 설계 의도(확인 후 정리)와 부합. dead 여부는 타 경로 참조 전수 확인 권장(정보성) |

> **누락된 "기능" Gap 없음** — 역할 저장 시점(§6: identity/start apply에서 OTP 발송 전), owner 대조 위치(§3.4 orders), 마스킹 경계, 식별자 자유덮어쓰기 미채택(§6) 등 **설계 결정이 모두 코드에 반영**됨.

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (PDF-only 변경분 전체)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 (전 파일 <500) / ⚠️ 경보구역 있음
2. 단일 책임           : ✅ 준수
3. 서버 검증·보안      : ✅ 준수
4. 성능 (중복·N+1)     : ✅ 준수
5. 폴더 구조           : ✅ 준수
─────────────────────────────────────────────────
위반 항목: 없음
주의(경보구역): useGuestApply.ts 457줄 (400줄 초과 — 400 트리거 대상)
─────────────────────────────────────────────────
```

### 1. 500줄 제한 — ✅ 위반 없음, ⚠️ 400줄 초과 경보 1건
- 전 변경 파일 500줄 미만. 신규 lib 모듈 전부 ≤48줄, 신규 컴포넌트 전부 ≤71줄.
- **⚠️ `useGuestApply.ts` = 457줄**: 500줄 미만이나 글로벌 규칙의 **400줄 초과 보고 트리거**에 해당(설계 §1.2도 "400 근접" 경보 명시). 당장 분리 의무는 없으나 **후속 기능 추가 시 즉시 분리 대상**. (참고: `useGuestRenew.ts` 370, `useGuestStatus.ts` 323, `guestPayment.ts` 313, `useGuestOrderFlow.ts` 303 — 모두 400 미만)
- 설계가 요구한 분리는 이행됨: 확인패널/역할선택/드롭을 `GuestExtractionPanel`·`GuestRoleSelect`·`GuestPdfDropField`로, 주문/결제 상태머신을 `useGuestOrderFlow`로 분리.

### 2. 단일 책임 — ✅ 준수
UI(폼/패널/역할/드롭) · 상태(useGuestApply/useGuestOrderFlow/useGuestOtp) · 검증(schemas) · 추출(pdf-extraction/property-fields) · 대조(owner-match) · 저장(draft) · 주문게이트(order) · 알림(signal-message) 각 파일 분리. `GuestApplyForm`은 조합·진입 역할만 유지(로컬 역할 state 제거, controlled 전환).

### 3. 서버 검증·보안 누락 API — ✅ 위반 없음
- parse-pdf: zod strict + 허용목록 + 키별 중복거부 + instanceof File + type/확장자 + **매직바이트**(`validateMagicBytes`) + size 상한. (`draft.ts`)
- identity/start: strict + purpose별 role/draftId refine + **서버 enum 확정**(브라우저 라디오 불신). (`schemas.ts:15-19`, `draft-role.ts:9`)
- orders: `requireSession`(401) + 역할/소유자 **서버 저장값 기준** 판정. 클라이언트가 ownerName·role을 덮어쓸 경로 없음. (`order.ts:25`, `applicant-gate.ts`)
- 저장 식별자(`address/commUniqueNo/ownerName`)는 **PDF 추출 원본만** 확정, `...fields` 전개 대신 명시 저장으로 비존재 컬럼 전개 금지. (`draft.ts:20-24`)
- 세션: HttpOnly + 브라우저 바인딩 + 신원해시 일치 + 만료 검증. (`session.ts:64-74`)
- **인증 없는 변이 핸들러 점검**: parse-pdf/identity/start는 설계상 "인증 전"이 정상(초안·OTP 발송)이며 Origin·ipLimit·게이트로 보호. orders/payment 등 변이는 세션·서명·nonce 보존. 신규 무인증 변이 핸들러·dead endpoint 없음.

### 4. 성능(중복·N+1) — ✅ 준수
- parse-pdf 1회 호출 분석, PDF `destroy`(finally). owner 대조·동/호 파싱은 **단건 순수함수**.
- precheck/calendar는 기존 쿼리에 `role` 컬럼만 추가(신규 쿼리·N+1 없음), `take: GUEST_BATCH_SIZE` 상한 유지.
- 프론트: 새 역할/드롭 상태 갱신에 무거운 계산·중복 fetch effect 없음(genRef·SDK 재진입 잠금 보존).

### 5. 폴더 구조 — ✅ 준수
`components/`(UI) · `hooks/`(상태) · `lib/guest-monitoring/`(서버) · `types/`(타입) · `app/api/`(라우트) · `prisma/`(스키마) 규칙 일치.

---

## 4. 교차검수 지적사항 해소 여부

### 백엔드 (`pdf.review-backend.md`)

| # | 심각도 | 지적 | 해소 | 근거 |
|---|---|---|---|---|
| 1 | **MED** | 활성화 예외 과포착 — 복호화 실패까지 needs_review로 삼킴 | **✅ 해소** | `activation.ts:22-23` — `owner_name_mismatch`/`invalid_input`만 needs_review로 전환, 그 외 `GuestError`(provider_unavailable 등)는 **throw 전파**. owner/tenant 대칭 확보(crypto 실패 시 양쪽 모두 재시도 경로). 주석으로 의도 명시 |
| 2 | **MED** | role 컬럼 배포 선후행 의존 | **✅ 보강(코드 외)** | 코드 수정 불필요(설계대로 정상). `prisma/manual/guest-monitoring-role.sql`(add-only), `verify-guest-monitoring-role.sql`(READ ONLY 게이트 — type/nullable/default 검증, 빈 테이블도 실패), `README.md` 배포 런북 추가로 **강제 게이트화** |
| 3 | **LOW** | signal-message 세부 dead branch | **❌ 미해소** | 호출부 여전히 `buildSignalSummary(role, result)`만 호출(§2-G1). 계약 위반은 아니나 plumbing 완성 또는 dead 명시 권장 유지 |
| 4 | **LOW** | bindDraftRole 순서 이탈 | **❌ 미reconcile** | `draft-role.ts:16` 동일역할 조기반환 유지, 설계 §3.2도 미수정 — 둘 다 그대로(§2-G2) |
| 5 | **LOW** | strict-json 범위 확장 미문서화 | **❌ 미해소** | 설계 문서에 readJson 중복키 거부 미기재(§2-G3) |
| 6 | **LOW** | 추출 검사 순서 방어화 | **❌ 미해소** | `pdf-extraction.ts:26-27` 순서 유지(§2-G4). 현재 런타임 위험 없음 |
| 7 | **LOW** | Prisma role 위치 | **❌ 미해소** | `schema.prisma:1160` @id 앞 유지(§2-G5) |

**백엔드 결론**: **핵심 2건(MED) 모두 해소**(코드 수정 + 배포 게이트). LOW 5건은 전부 **기능 무영향**(문서 동기화·dead code·스타일·견고성 개선)으로 미반영 상태.

### 프론트엔드 (`pdf.review-frontend.md`)

| # | 심각도 | 지적 | 해소 | 근거 |
|---|---|---|---|---|
| 1 | **MED** | 인증 시작 후 변경 불가인 역할을 화면에서 변경 가능 | **✅ 해소** | 역할을 훅 단일 상태로 승격(`useGuestApply.ts:42-46`). `startIdentity`에서 `setRoleLocked(true)`(:190), `GuestRoleSelect`가 `locked` 시 radio disabled + "다시 입력" 안내(:56-61). 발송/네트워크 실패로 ready 복귀해도 잠금 유지 |
| 2 | **MED** | 만료 초안 재분석 시 이전 역할이 기본 선택으로 잔존 | **✅ 해소** | 역할이 폼 로컬 useState → **훅이 초안 수명주기에 결합**. `resetRole()`를 재파싱(`useGuestApply.ts:117`)·goInput(:154)·만료 reparse(`useGuestOrderFlow.ts:119`)·reauth input 복귀(:91)에서 호출. 같은 초안 OTP 취소·재발송에서는 보존. 폼은 controlled(`GuestApplyForm` 로컬 role state 제거) |
| 3 | **LOW** | 역할설명·정정안내 명암비 부족(~2.88:1) | **✅ 해소** | `guest.module.css` `.roleDesc`·`.panelNote`·`.roleLockNote` 색상을 `#5e6377`로 상향(약 6:1), 주석에 4.5:1 목표 명시 |

**프론트 결론**: **MED 2건·LOW 1건 전부 해소**. 역할 고정/초기화를 설계 §4.2·§4.4의 "초안 수명주기 기준" 처리로 정확히 구현.

> ⚠️ **교차검수에서 "미실시"로 명시한 검증은 이 분석에서도 실시하지 않음**: 브라우저/React 통합 회귀, 키보드·스크린리더·모바일 긴 파일명·실제 드롭, 운영 DB 저장/결제, 실제 문자 발송. §5 참조.

---

## 5. 종합 의견 및 남은 수정 우선순위

### 종합
교차수정 후 구현은 **설계 계약을 사실상 완전 충족**하며, **양측 교차검수의 MED 결함(백엔드 2 + 프론트 2) 전부 해소**됐다. 특히:
- 규칙 0(PII 키 사고) 재현 리스크였던 **복호화 실패 → needs_review 오분류**(백엔드 #1)를 역할 코드로 한정하고 owner/tenant 대칭을 확보한 점,
- 설계 §4.2·§4.4가 요구한 **역할의 초안 수명주기 결합**(프론트 #1·#2)을 훅 단일 상태로 정확히 구현한 점이 핵심 개선이다.

남은 7개 Gap은 **전부 LOW**로, 보안·데이터 무결성·멱등·복구 계약을 깨지 않는다.

### 수정 우선순위

**P0 — 배포 전 필수 (코드 수정 아님, 운영 게이트)**
1. **운영 `role` 컬럼 수동 ALTER 선적용**(§2-G2 배포 전제, 백엔드 #2). 순서: ① 테스트 DB ALTER → `verify-guest-monitoring-role.sql` 통과 → ② 대장 운영 수동 ALTER + verify → ③ role select/write 코드 배포. **이 순서가 깨지면 cron precheck·calendar API 전면 실패** → 배포 금지. (규칙 0-1)

**P1 — 계약서-구현 동기화 (다음 작업 단위)**
2. **bindDraftRole 순서 정합**(G2): 현 코드 동작(멱등 재인증 허용)이 합리적이므로 **설계 §3.2 문구를 코드에 맞게 보정** 권장. (또는 엄격히 설계대로 조기반환 전 진행주문 조회)
3. **strict-json 중복키 거부를 lib.design(공통 http 계약)에 1줄 기록**(G3).

**P2 — 견고성·정리 (비차단)**
4. **signal-message dead branch**(G1): caseType/phase plumbing 완성(세부경고 실사용) 또는 분기 제거/주석으로 dead 명시.
5. **추출 검사 방어화**(G4): `registryPropertyFields` 내부 `title.address ?? ""` 또는 공란 체크를 호출 앞으로 이동.
6. **공유 타입 중복 정리**(G6): `guestTypes.ts`의 role/unitNumber 재선언을 공유 타입 재export로 축소.
7. **Prisma role 위치**(G5)·**address_mismatch 메시지 타경로 참조 전수 확인 후 정리**(G7).

**P3 — 품질 게이트 (완료 선언 전, 규칙 0-5)**
8. 변경 폼/훅 대상 **브라우저 통합 회귀**: owner/tenant 각각 OTP 취소·재발송·발송실패·소유자불일치 복귀·`draft_expired 후 재분석` → 역할 잠금/초기화 실동작 확인. 키보드·스크린리더·모바일 긴 파일명·실제 드롭.
9. `npm run build` + 전체 타입체크 + 전체 테스트(현 리뷰는 부분 vitest만 통과 확인).
10. **운영 실환경·실화면 검증**(규칙 0-1): 운영 ALTER 후 실제 PDF 업로드→역할선택→인증→(테스트결제)→감시 시작까지 사용자 눈으로 확인. 로컬 통과만으로 완료 선언 금지.

---

> **이 분석은 코드를 수정하지 않았다.** 위 우선순위는 대장 확인 후 별도 작업으로 진행 권장.
> **단계 경계(설계 §7.3)**: 본 분석 단계에서 구현·테스트 실행·운영 DB ALTER·배포는 하지 않는다.
