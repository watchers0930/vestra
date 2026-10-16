# PDF-only 비회원 신청 — 백엔드 교차검수 (Codex 구현분)

> **검수자**: 크로미(Claude) — Codex 백엔드 구현 교차검수
> **일자**: 2026-10-16
> **대상 커밋 상태**: 미커밋 변경분(`git diff` / `git status` untracked)
> **대상 경로**: `lib/guest-monitoring/`, `types/`, `prisma/`, `next.config.ts` (+ 라우트 영향 확인: `app/api/guest-monitoring/**`)
> **설계 계약(SSOT)**: `docs/02-design/features/pdf.design.md`
> **관점**: 보안(인증·CSRF·입력검증·SQLi/XSS)·버그·성능(N+1·중복호출)·설계 스펙 일치
> **방식**: 리뷰 전용(코드 미수정)

---

## 0. 요약

전반적으로 **설계 계약(pdf.design.md)에 충실한 구현**이다. 주소 입력·주소매칭 제거, 동/호 구조화, `role` 추가전용 컬럼, owner 대조 게이트(조기반환보다 앞), 활성화 방어검증 needs_review, 역할별 알림 단일 소스화, 비존재 컬럼 전개 금지까지 설계 의도를 정확히 반영했다. **명백한 HIGH 보안 결함은 발견되지 않았다.**

다만 **활성화 방어검증의 예외 포착 범위가 과도**하여 복호화/크립토 설정 실패(운영 PII 키 사고 유형)를 재시도 불가능한 `needs_review`로 잘못 전환시키는 MED 결함이 있고, 운영 `role` 컬럼 수동 적용 전 배포 시 ORM 런타임 에러가 나는 **배포 선후행 의존(설계 §2.4 명시)**이 코드에 그대로 존재한다. 나머지는 LOW 수준의 설계 이탈/정리 항목이다.

### 심각도 집계
| 심각도 | 건수 | 항목 |
|---|---|---|
| HIGH | 0 | — |
| MED | 2 | #1 활성화 예외 과포착, #2 role 컬럼 배포 선후행 의존 |
| LOW | 5 | #3 역할별 세부문구 dead branch, #4 bindDraftRole 순서 이탈, #5 strict-json 범위 확장, #6 추출 검사 순서, #7 schema 필드 배치 |

---

## 1. [MED] 활성화 방어검증이 복호화 실패까지 needs_review로 삼킨다

**파일**: `lib/guest-monitoring/activation.ts:16-25` (+ `lib/guest-monitoring/applicant-gate.ts:5-11`)

**문제**
`applyPaidOrder`의 initial 경로가 `assertApplicantRole(property)`를 `try/catch`로 감싸고, **모든 `GuestError`를 `needs_review`로 전환**한다.

```ts
if (order.purpose === "initial") {
  try { assertApplicantRole(property); }
  catch (error) {
    if (!(error instanceof GuestError)) throw error;
    // → 어떤 GuestError든 needs_review 로 전환
    await tx.guestMonitoringOrder.update({ ... status: "needs_review" ... });
    ...
    return { applied: false };
  }
}
```

그런데 `assertApplicantRole`은 owner일 때 내부에서 `assertDecrypted(property.guestName, property.ownerName)`를 호출하고(`applicant-gate.ts:8`), `assertDecrypted`는 값이 **null이거나 아직 암호문(`v\d+:` 접두)** 이면 `GuestError("provider_unavailable", 503)`을 던진다(`config.ts:16`).

결과적으로 **owner 레코드에서 복호화/크립토 설정이 일시적으로 깨진 상황**(= CLAUDE.md 규칙 0의 PII_ENCRYPTION_KEY 운영 사고 유형)이 활성화 시점에 발생하면:
- 설계가 의도한 "역할 미설정/소유자 불일치 → needs_review"가 아니라
- **복호화 실패(재시도 가능한 인프라 오류)까지 결제건을 `needs_review`로 고착**시키고 `reason: "provider_unavailable"` 감사로그만 남긴 채 조용히 끝난다.

또한 **owner/tenant 간 동작이 비대칭**이다. tenant는 `assertApplicantRole`이 `assertDecrypted`를 호출하지 않으므로, 동일한 복호화 실패가 이 블록을 통과해 뒤의 `assertDecrypted(property.ownerName, property.address)`(`activation.ts:26`)에서 **throw로 전파(재시도/실패)**된다. 즉 같은 크립토 실패가 owner면 needs_review, tenant면 throw로 갈린다.

설계 §3.6은 "`role` 미설정 또는 owner **불일치**가 발견되면 needs_review"만 규정한다. 복호화 실패를 needs_review로 돌리라는 요구는 없다.

**영향**: 운영 키/복호화 장애 시 정상 결제건이 재시도되지 못하고 수동검토 큐에 쌓이며, 장애 원인(크립토)이 "소유자 검토 필요"로 오분류된다. 규칙 0 사고의 재현 리스크.

**수정 제안**
- `needs_review` 전환 대상을 **역할 관련 코드로 한정**한다. 예: `catch`에서 `error.code === "owner_name_mismatch" || error.code === "invalid_input"` 일 때만 needs_review로 전환하고, `provider_unavailable`(복호화/크립토) 등 그 외 `GuestError`는 **그대로 throw**해 기존 재시도/실패 경로를 타게 한다.
- 또는 `assertApplicantRole`을 **복호화 단언과 역할 판정으로 분리**하여, 역할 판정 함수만 catch 대상으로 삼고 복호화는 기존 `activation.ts:26` 단언에 일임한다(owner/tenant 대칭 확보).

---

## 2. [MED] `role` 컬럼 미적용 상태 배포 시 ORM 런타임 에러 (배포 선후행 의존)

**파일**: `lib/guest-monitoring/precheck-adapter.ts:205`, `lib/guest-monitoring/calendar-dto.ts:58`, `lib/guest-monitoring/draft-role.ts:14`, `lib/guest-monitoring/draft.ts` 등 role read/write 전반 / `prisma/manual/guest-monitoring-role.sql`

**문제**
`precheck-adapter.ts`·`calendar-dto.ts`가 `select: { ..., role: true }`를, `draft-role.ts`/`order.ts`가 role read를, draft/update가 role write를 수행한다. 운영 DB에 `role` 컬럼이 아직 없으면 Prisma가 **런타임 에러**를 던진다. 이는 설계 §2.4가 명시적으로 경고한 지점이며, cron `registry-monitor`(precheck)와 `GET /properties/[id]/calendar`가 **전면 실패**할 수 있다.

구현 자체는 설계대로 올바르다(코드 결함 아님). 다만 **배포 순서가 코드가 아니라 사람 손에 달린 치명 전제**이므로 리뷰 결과에 명시한다. `prisma/manual/guest-monitoring-role.sql`은 `ADD COLUMN IF NOT EXISTS ... TEXT`로 add-only·안전하게 작성되어 있고 주석에 "code selecting role 배포 BEFORE 적용"이 적혀 있어 **방향은 정확**하다.

**영향**: 운영 수동 ALTER 누락/순서 역전 시 cron 감시·달력 API 장애. (CLAUDE.md 규칙 0-1: 로컬 통과 ≠ 운영 통과)

**수정 제안**
- 코드 수정 불필요. **배포 런북에 강제 게이트**로 못박는다: ① 테스트 DB ALTER → ORM 호환 확인 → ② 대장 운영 수동 ALTER → ③ role select/write 코드 배포. 이 순서가 깨지면 배포 금지.
- (선택) 운영 적용 검증 스크립트로 `information_schema.columns`에 `GuestMonitoring.role` 존재를 배포 전 확인.

---

## 3. [LOW] 역할·사건별 세부 경고 문구가 호출되지 않는 dead branch

**파일**: `lib/guest-monitoring/signal-message.ts:14-22` / 호출부 `precheck-adapter.ts:214,220`, `calendar-dto.ts:67`

**문제**
`buildSignalSummary(role, result, caseType?, phase?)`는 `phase === "completed"`이고 `caseType`이 근저당/소유권이전/압류일 때 세부 경고("내 물건에 근저당 감지 …")를 만들도록 설계됐으나, **모든 호출부가 `buildSignalSummary(property.role, result)`로만 호출**해 `caseType`/`phase`를 넘기지 않는다. 따라서 `kind`는 항상 `undefined`이고 세부 경고 분기는 **절대 실행되지 않으며**, 항상 일반 역할 문구로 귀결된다.

설계 §5 Phase 5가 `caseType` 플러밍을 필수로 못박진 않아 **계약 위반은 아니다**. 다만 구현된 분기가 죽어 있어 오해 소지가 있다.

**수정 제안**
- 세부 문구를 실제로 쓸 거면 precheck 결과(`fetchRegistryCaseStatus`가 반환하는 `caseType`/`phase`)를 `buildSignalSummary`에 전달하도록 플러밍을 완성한다.
- 당장 범위 밖이면 세부 분기/`caseLabels`를 제거하거나 주석으로 "미연결(향후 plumbing)"을 명시해 dead code임을 분명히 한다.

---

## 4. [LOW] bindDraftRole의 동일역할 조기반환이 진행주문 체크를 건너뜀 (설계 순서 이탈)

**파일**: `lib/guest-monitoring/draft-role.ts:16-22`

**문제**
설계 §3.2 step 2는 잠금 내에서 **① 진행 주문(pending/paid/needs_review) 존재 → 거부 → ② role null/동일 → 멱등 설정 → ③ 상이 → 거부** 순으로 기술한다. 구현은 순서가 다르다.

```ts
if (draft.role === role) return;        // 동일역할이면 진행주문 체크 전에 조기반환
if (draft.role !== null) notFound();    // 상이 → 거부
// (role === null 인 경우에만) 진행주문 조회 → 존재 시 거부
```

즉 **이미 같은 role이 설정되어 있고 진행 주문이 있는 상태에서 동일 role로 재요청**하면, 설계상으론 "진행 주문 존재 → 거부"지만 구현은 조기반환(OK)한다.

**영향**: 실질 보안 영향은 낮다. role이 바뀌지 않고(멱등 재인증), 중복활성은 `order.ts`의 `commUniqueNo` 기준 duplicate_active 가드가 별도로 막는다. 동작상 오히려 재인증 멱등성 측면에서 합리적이나 **설계 문서와 분기 순서가 어긋난다**.

**수정 제안**
- 설계 문구를 구현에 맞춰 갱신(멱등 재인증 허용 명시)하거나, 엄격히 설계대로라면 동일역할 조기반환 전에도 진행주문 조회를 둔다. 계약서 우선 원칙상 **둘 중 하나로 일치**시킬 것(가급적 설계 문서를 현 동작에 맞게 보정 권장).

---

## 5. [LOW] strict-json 도입은 pdf.design 범위를 넘어 모든 readJson에 적용됨 (범위 관찰)

**파일**: `lib/guest-monitoring/http.ts:56` + `lib/guest-monitoring/strict-json.ts`(신규)

**문제/관찰**
`readJson`이 `JSON.parse` → `parseStrictJson`로 교체되어 **중복 JSON 키를 `invalid_input`으로 거부**한다. 이는 `identity/start`, `orders`, `verify-otp` 등 **모든 비회원 JSON 엔드포인트의 동작을 넓히는 변경**으로, pdf.design.md에는 기술돼 있지 않다. 방어적·유익한 하드닝이나 설계 계약 밖 변경임을 기록한다.

토크나이저(`strict-json.ts`)는 검토 결과 **정상 JSON을 깨뜨리지 않는다**: ① `JSON.parse`로 먼저 형식 검증 후 토큰화하므로 유효 JSON만 통과, ② 문자열 토큰 규칙이 alternation 최우선이라 따옴표 안의 `:`·구분자는 키로 오인하지 않음, ③ 배열 스코프(`null`)에서는 키 추가를 거부, ④ `tokens[i+1] === ":"`는 유효 JSON에서 키에만 성립. 중복키 판정 로직은 건전하다.

**수정 제안**
- 기능적 수정 불필요. 단 **범위 외 변경**이므로 pdf.design 또는 lib.design(공통 http 계약)에 "readJson 중복키 거부"를 한 줄 기록해 계약서-구현 동기화(규칙 위반 방지)를 맞춘다.
- 회귀 관점: 기존 클라이언트가 중복키를 보내던 경로가 없는지 한 번 확인(정상적으로 없을 것으로 판단).

---

## 6. [LOW] 추출 검사 순서 — 주소 공란 체크가 필드 조립 뒤에 있음

**파일**: `lib/guest-monitoring/pdf-extraction.ts:179-183`

**문제**
```ts
const fields = registryPropertyFields(parsed.title);           // 먼저 title.address.trim() 사용
if (!parsed.title.address?.trim() || (fields.unitNumber.isAggregate && !fields.unitNumber.unitHo))
  throw new GuestError("extraction_incomplete");
```
`registryPropertyFields`(`property-fields.ts:16`)는 `title.address.trim()`을 **옵셔널 체이닝 없이** 사용한다. 현재 파서가 `address`를 항상 `""`로 초기화(`section-parsers.ts:24`)하므로 **런타임 TypeError는 발생하지 않고** 빈 주소도 이후 체크에서 `extraction_incomplete`로 안전히 걸린다. 그러나 `registryPropertyFields`가 이 불변식(`address`는 절대 null 아님)에 **암묵 의존**하며, 파서 계약이 바뀌면 graceful한 `extraction_incomplete` 대신 500으로 깨질 여지가 있다.

**수정 제안**
- 방어적으로 `extraction_incomplete` 조건(주소 공란·집합건물 호 미확정)을 `registryPropertyFields` 호출 **앞**에 두거나, `registryPropertyFields` 내부에서 `title.address ?? ""`로 방어한다. 동작 변화는 없고 견고성만 향상.

---

## 7. [LOW] Prisma `role` 필드가 `@id`보다 앞에 선언됨 (스타일)

**파일**: `prisma/schema.prisma:1160`

**문제**
`role String?`가 모델 최상단, `id String @id` **앞**에 추가됐다. 유효한 Prisma이지만 관례상 PK가 선두에 오는 다른 모델과 일관되지 않는다. add-only 의도는 맞다.

**수정 제안**
- 기능 영향 없음. 일관성을 위해 기존 컬럼 뒤(예: 모델 말미)로 이동 권장. 운영 ALTER는 컬럼 위치와 무관하므로 영향 없음.

---

## 8. 검증된 정상 구현 (positive — 회귀/보안 관점 확인 완료)

- **owner 대조 우회 차단**: 저장 `address/commUniqueNo/ownerName`은 PDF 추출 원본으로만 확정(`draft.ts`에서 `...fields` 전개 대신 `commUniqueNo/ownerName/address`만 명시 저장 → **비존재 dong/ho 컬럼 전개 금지 설계 §2.5 정확 준수**). 대조는 서버 저장 `guestName` vs PDF `ownerName`으로만 수행(`applicant-gate.ts:9`). 클라이언트가 ownerName을 덮어쓸 경로 없음.
- **게이트 배치**: `order.ts:25` — exact-idempotency 재요청 반환(§3.4-A) **뒤**, pending 재사용(§3.4-C) **앞**에 `assertApplicantRole` 배치. 설계 §3.4 순서 정확. owner 불일치 403, role 미선택 400(invalid_input), tenant는 대조 생략.
- **동/호 구조화**: `property-fields.ts` — 입력을 **`title.unitNumber`(표제부 파싱 결과)로 한정**(주석 명시), 접수번호/행정동/문서 전문 오인 차단. 호 정규식이 `호` 접미에만 매칭되어 **"층"을 "호"로 오인하지 않음**(설계 §2.6). dong/ho 접미 중복(`동동`) 방지 필터 존재.
- **owner-match 정규화**: `owner-match.ts` — NFKC·trim·내부공백 제거 완전일치. 설계 §2.5와 1:1 일치. `identity-hash`의 `normalizeGuestName` 불변(비교 전용 함수로 분리) — 기존 조회/주문 복구 안 깨짐.
- **인증/CSRF/레이트리밋 보존**: `parse-pdf`(upload·ipLimit·boundedBody 11MB·nodejs·maxDuration), `identity/start`(ipLimit·guestLimit×2), `orders`(requireSession) 래퍼·게이트 전부 유지. role 추가가 인증 경계를 바꾸지 않음.
- **role 멱등/불변·교체 거부**: `draft-role.ts` — 진행주문 시 교체 거부, 상이 role 교체 거부, OTP 발송 전 잠금 내 1회 저장. 설계 §3.2 핵심 충족(§4 항목은 순서만 이탈).
- **null role 중립 폴백**: `signal-message.ts` — role이 owner/tenant 아니면 기존 중립 문구 반환. 레거시/미선택 건 오거부 없음(설계 §2.4).
- **SQLi/XSS**: Prisma 파라미터 바인딩, 메시지는 고정 한글 상수, advisory lock은 tagged-template `$queryRaw`로 파라미터화. 신규 주입면 없음.
- **성능/N+1**: precheck/calendar는 기존 쿼리에 `role` 컬럼만 추가(신규 쿼리 없음). `bindDraftRole`은 루프 밖 단건 트랜잭션. owner 대조·동호 파싱은 단건 순수함수. 신규 N+1·중복호출 없음.
- **next.config.ts CSP**: PortOne(아임포트)·다날 도메인 추가는 결제 전환 관련이며 본 PDF 설계 범위와 독립. script/connect/frame-src에 한정 추가, 과도 와일드카드 아님(허용 범위 합리적).
- **validDraft 미제거**: `verifyOtp`가 여전히 사용(`sms-otp.ts:79`) → dead code 아님. apply 외 경로의 draft 검증 부재는 기존과 동일(회귀 없음).

---

## 9. 플랫폼 5대 원칙 점검 (검수 대상 코드 기준)

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (백엔드 변경분)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 (신규 lib 모듈 전부 <80줄, 순수함수 분리)
2. 단일 책임           : ✅ 준수 (property-fields/owner-match/signal-message/draft-role/applicant-gate/strict-json 책임 분리)
3. 서버 검증·보안      : ✅ 준수 (zod strict + 허용목록 + 중복키 거부 + 매직바이트 + 서버 enum + PDF-only 신뢰)
                         ⚠️ #1 활성화 예외 과포착(복호화 실패→needs_review) 보완 권장
4. 성능 (중복·N+1)     : ✅ 준수 (신규 쿼리 없음, 단건 순수함수, select 컬럼만 추가)
5. 폴더 구조           : ✅ 준수 (lib/guest-monitoring · types · prisma 규칙 일치)
─────────────────────────────────────────────────
위반 항목: 없음 (구조/보안 원칙 위반 아님)
주의 항목: #1(MED, 예외처리), #2(MED, 배포 선후행) — 코드/런북 보완 권장
─────────────────────────────────────────────────
```

---

## 10. 조치 우선순위

1. **#1 (MED)** — 활성화 `catch`를 역할 코드(`owner_name_mismatch`/`invalid_input`)로 한정, `provider_unavailable` 등은 throw 전파. owner/tenant 대칭 확보. **(코드 수정 권장 — 규칙 0 사고 재현 방지)**
2. **#2 (MED)** — 운영 `role` 컬럼 수동 ALTER를 배포 런북 강제 게이트로 고정(코드 수정 불필요).
3. **#4·#3 (LOW)** — 계약서-구현 동기화: bindDraftRole 순서/멱등 재인증을 설계에 반영, signal-message 세부분기 plumbing 완성 또는 dead code 정리.
4. **#5·#6·#7 (LOW)** — strict-json 범위 문서화, 추출 검사 순서 방어화, Prisma 필드 위치 정리.

> 본 리뷰는 코드를 수정하지 않았다. 위 항목은 대장 확인 후 별도 수정 작업으로 진행 권장.
</content>
</invoke>
