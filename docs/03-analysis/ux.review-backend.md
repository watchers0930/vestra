# 전세 UX 감사 잔여결함 8건 — 백엔드 교차검수 (Claude → Codex 구현분)

> 프로젝트: VESTRA · 작성일: 2026-10-21 · 검수자: Claude(크로미)
> 대상 커밋: 작업트리 미커밋 변경분(`git diff`/`git status`)
> 대상 경로: `app/api/`, `lib/`, `schemas/`, `prisma/` (supabase·actions 해당 없음 — 본 프로젝트는 Prisma/Neon)
> 계약서: [`docs/02-design/features/ux.design.md`](../02-design/features/ux.design.md)
> 검토 관점: 보안(인증·CSRF·입력검증·IDOR·PII)·버그·성능(N+1·중복·규모)·설계 스펙 일치

---

## 0. 총평

핵심 P0(①위험산정·등급 보정)와 ④체크리스트 서버 계약의 **보안·동시성·PII 설계는 매우 견고**하다.
IDOR 방어(세션 userId 강제·타인/없음 동일 404), CSRF(`validateOrigin` 선검사), 16KB 바이트 기반 본문 제한(Content-Length 스푸핑 방어),
blind index(`addressKey=hashForSearch`)·암호문 검색 배제, 복호화 실패(`v2:` 잔존) 가드까지 2026-09-10 PII 사고 교훈이 반영되어 있다.
감점표·85% 고위험·단조성·중복가중 제거(mortgage ratio ↔ 합산채권 단일화)도 설계와 일치하며, 작성된 57개 테스트가 이를 입증한다.

다만 **검증 배선에 결정적 공백**(신규 테스트가 CI에서 실행되지 않음)과, 성능 상한 부재·주소 파서 덮어쓰기 회귀 소지 등 수정 권고 항목이 있다.

| 심각도 | 건수 |
| --- | --- |
| HIGH | 1 |
| MED | 3 |
| LOW | 5 |

> **검증 규율 경고:** 아래 H1은 "초록불·0건 불신" 규율의 전형이다. 테스트가 존재하고 품질도 좋지만 **CI 경로가 수집하지 않아** `npm run test`의 통과는 85% 고위험·단조성·IDOR 회귀를 전혀 보증하지 못한다.

---

## HIGH

### [HIGH] 신규 핵심 불변식 테스트가 CI(`npm run test`)에서 실행되지 않음
- **파일:** `lib/ux-tests/vitest.config.ts:4` · `vitest.config.ts:8` (루트)
- **문제:**
  신규 테스트 57개(`lib/ux-tests/policy.test.ts`·`routes.test.ts`·`checklist-service.test.ts`)는 85% 고위험 하한·단조성·IDOR·입력검증·바이트제한 등 설계 §6.1의 **완화 불가 회귀 조건**을 담고 있다. 그러나
  - 루트 `vitest.config.ts`의 `test.include = ["__tests__/**/*.test.ts"]` 뿐이라 `lib/ux-tests/*`를 수집하지 않는다.
  - 이 테스트들은 `lib/ux-tests/` 아래 **별도 config**로만 실행된다.
  - 실측: `npx vitest list -c vitest.config.ts | grep -c ux-tests` → **0건**. 즉 `npm run test`(=`vitest run`)는 이 테스트를 **한 개도 돌리지 않는다.**
  - 반면 `npx vitest run -c lib/ux-tests/vitest.config.ts` → **57 passed** (로직 자체는 정상).
  결과적으로 CI 초록불이 이 8건 기능의 핵심 안전장치를 전혀 보호하지 못한다(거짓 초록불). 설계 §6.1은 "기존 Vitest 기반(`__tests__/...`)"을 명시했는데, 산출물은 CI 바깥에 격리되었다.
- **수정 제안:** 테스트를 `__tests__/` 아래로 이동하거나(권장: 루트 config가 수집), 루트 `test.include`에 `"lib/ux-tests/**/*.test.ts"`를 추가해 `npm run test` 한 번으로 실행되게 한다. 별도 config를 유지한다면 `package.json`의 `test` 스크립트가 두 config를 모두 실행하도록 묶는다. 배선 후 `npm run test`로 57건이 실제 수집·통과되는지 눈으로 확인한다.

---

## MED

### [MED] 이력 상세 `includePrevious` — 동일 type 이력 전체를 무제한 순회·복호화
- **파일:** `app/api/user/analyses/[id]/route.ts:28-39`
- **문제:**
  `includePrevious=1`이면 본인·동일 type·이전 시각 후보를 `take:100` 배치로 **매칭될 때까지 끝없이** 순회한다(`while(true)` + cursor). 각 후보마다 `select`에 `data`(암호화 `@db.Text`, 건당 수십 KB 가능)를 포함해 로드하고, `sameProperty`→`snapshotIdentity`에서 `JSON.parse` + 주소 복호화/정규화를 수행한다. 매칭 물건이 없는 회원은 **동일 type 전체 이력**을 전수 복호화·파싱한다. 상한(total cap)이 없어 규모(규칙 0-5 ①: 1000배)에서 요청당 비용이 선형 증가한다.
  추가로 `sameProperty(row, candidate)`는 매 반복마다 **현재 `row`를 재파싱**(`snapshotIdentity(a)`)한다 — N회 중복 연산.
- **수정 제안:**
  1. 총 스캔 상한(예: 최근 300~500건) 도입 후 초과 시 "직전 결과를 찾지 못함"으로 종료(목록은 어차피 `my-analyses` take:30).
  2. 현재 `row`의 `snapshotIdentity`를 루프 밖에서 1회 계산해 재사용.
  3. 가능하면 저장 시 정규화 키(blind index) 컬럼을 두어 DB where로 직접 매칭(향후 과제, DB 변경이라 별도 작업).

### [MED] `parseTitle`이 신규 주소 파서 결과로 legacy 주소를 무조건 덮어씀 (주소 소실 회귀 소지)
- **파일:** `lib/registry/title-parser.ts:144-147`
- **문제:**
  `const result = parseLegacyTitle(raw)`로 주소를 얻은 뒤, `result.address = parseTitleAddress(raw).address`로 **조건 없이 덮어쓴다.** `parseTitleAddress`는 후보를 못 찾으면 `address:""`를 반환(설계상 "없는 주소 생성 금지"로 의도적)하는데, 이 경우 legacy가 찾았을 주소까지 공백이 된다. `analyze-service.resolvePropertyAddress`가 user 입력으로 폴백하지만, **등기 텍스트만 있고 사용자 주소가 없는 흐름**에서는 표시·시세조회 주소가 소실될 수 있다.
- **수정 제안:** 신규 파서 결과가 비어 있으면 legacy 결과를 보존하도록 폴백(`result.address = parseTitleAddress(raw).address || result.address`). unitNumber/lotAddress도 동일 폴백 검토. fixture에 "신규 파서 실패 + legacy 성공" 케이스 추가.

### [MED] `analysisInputSchema.rawText`에 길이 상한 없음 — POST 본문 무제한 적재(비대칭)
- **파일:** `schemas/analyze-unified.ts:3` · `app/api/analyze-unified/route.ts:155,162-164`
- **문제:**
  체크리스트 PUT은 `readChecklistBody`로 **16KB 바이트 상한**을 엄격히 둔 반면, analyze POST는 `rawText: z.string()`에 `.max()`가 없고 `req.json()`이 본문 전체를 메모리에 적재한 **뒤에야** `sanitizeInput`의 `truncateInput(…, 50000)`로 자른다. 즉 거대한 rawText(수 MB)가 truncate 전에 그대로 파싱된다. Rate limit(10)·Daily usage로 완화되나, 바이트 단위 입력 상한이 한쪽에만 적용된 비대칭이다.
- **수정 제안:** `rawText: z.string().max(60000)` 등 상한을 스키마에 추가(truncate 한도와 정합). 또는 analyze POST에도 `readChecklistBody`류의 바이트 제한을 적용해 두 변이 경로의 입력 상한 표준을 일치시킨다.

---

## LOW

### [LOW] `propUid`가 어디서도 채워지지 않아 §4.3 propUid 우선 매칭이 비활성
- **파일:** `lib/registry/title-parser.ts:19` (항상 `propUid:""`) · `lib/analysis/normalize-record.ts:23`
- **문제:** `parseTitle`/`parseTitleAddress` 어디서도 부동산 고유번호를 추출하지 않아 `parsed.title.propUid`는 항상 `""`. `snapshotIdentity`의 `propUid`는 `stringValue("")→null`이 되어 **항상 주소 기반 매칭으로만** 동작한다. 레거시에서도 미설정이라 신규 결함은 아니나, 설계가 전제한 "고유식별자 우선" 경로는 사실상 죽은 코드다.
- **수정 제안:** 표제부 `[고유번호 1101-…]` 추출을 추가하거나, 설계서에 "현 단계 propUid 미지원(주소 매칭만)"을 명시해 계약과 구현을 일치시킨다.

### [LOW] 기능 비활성 응답이 500(서버오류)로 반환 — 503이 의미상 정확
- **파일:** `app/api/user/jeonse-checklists/route.ts:8` (`disabled()`)
- **문제:** DB 미적용으로 `checklistPersistenceEnabled()===false`일 때 500을 반환한다. 정상적인 "준비 중(미활성)" 상태가 서버 오류로 집계되어 모니터링상 거짓 에러 스파이크를 유발할 수 있다.
- **수정 제안:** 503(Service Unavailable)로 변경. 사용자 메시지는 유지.

### [LOW] SQL 파일 경로가 설계서 §2.1 지정과 다름
- **파일:** `prisma/manual/2026-10-21-add-jeonse-checklist.sql`
- **문제:** 설계서는 `scripts/sql/2026-10-21-add-jeonse-checklist.sql`을 지정. 실제는 `prisma/manual/`에 위치. 내용은 스키마와 1:1 일치(테이블·컬럼·FK ON DELETE CASCADE·`UNIQUE(userId,addressKey)`·`INDEX(userId)`·`revision` 기본값)이며 "작성 전용, 실행 금지" 주석도 준수 — 계약 위반은 경미.
- **수정 제안:** 경로를 설계서와 일치시키거나 설계서를 실제 경로로 갱신(계약 단일화).

### [LOW] 선순위 factor.detail에 반올림 전 비율이 그대로 삽입
- **파일:** `lib/risk/claims-policy.ts:50`
- **문제:** `시세 대비 ${ratios.ratioToMarket ?? "미확인"}%`가 `85.23456789%`처럼 긴 소수로 저장·표시될 수 있다. 설계 §4.1은 "반올림 전 판정, 화면 반올림"을 요구 — 판정은 올바르나 **lib 산출 문자열**에 원시 소수가 남는다.
- **수정 제안:** detail 생성 시 `.toFixed(1)` 적용(판정 로직은 원시값 유지).

### [LOW] `evaluateMultipleMortgages`(-10)와 `evaluateClaimRatios` 간 근저당 부담 중복 가중 소지
- **파일:** `lib/risk-scoring.ts:116-123` · `lib/risk/evaluators.ts`(`evaluateMultipleMortgages`)
- **문제:** 설계 §4.1은 "근저당비율·합산채권은 **최대 감점으로 묶고** 중복 가중 제거, 압류·경매 등 **독립 위험만** 추가 감점"을 요구한다. 근저당 3건↑에 -10을 더하는 `evaluateMultipleMortgages`는 '건수' 축이라 독립으로 볼 여지도 있으나, 동일 '근저당 부담'을 ratio 감점과 **이중으로** 반영할 소지가 있다.
- **수정 제안:** 다수 근저당을 claims 계열의 '최대 감점 묶음'에 포함할지, 독립 위험으로 유지할지 설계 판단을 명시하고 테스트로 고정(현재 `policy.test.ts`에 다수 근저당 케이스 없음).

---

## 설계 스펙 일치 — 확인된 준수 항목 (근거)

- **IDOR/본인권한(§3,§5.2,§7.2):** `analyses/[id]`는 `findFirst({where:{id,userId}})`, 없음/타인 동일 404. 체크리스트는 `userId_addressKey` 복합키. 클라 `userId/id/updatedAt` 무시(스키마가 스트립, `routes.test.ts`로 입증). ✅
- **CSRF/no-store(§3):** PUT `validateOrigin` 선검사 후 401, 거부도 `Cache-Control:no-store`. 개인 응답 전부 no-store. ✅
- **입력검증(§3.3,§7.2):** Zod `state` 키 `"0"~"14"`·boolean 한정(잘못된 키/타입/버전/과대본문 테스트 통과), `userDeposit` 유한·정수·0 이상·범위. 16KB 바이트 제한은 Content-Length 미신뢰·실제 UTF-8 바이트 측정. ✅
- **PII/blind index(§2.1,§5.2):** `PII_FIELDS.JeonseChecklist=["address"]`·`MODEL_RELATIONS` 등록. 조회·유일성은 `addressKey=hashForSearch(정규화주소)`로만, 암호문 검색 없음. 복호화 실패(`v2:` 잔존) 시 throw로 암호문 노출 차단. `normalizePropertyAddress`는 NFKC+공백정리로 **멱등** → GET/PUT 키 일치 확인. ✅
- **85% 고위험·단조성·감점표(§4.1,§7.2):** `claimsDeduction`가 설계 표와 일치(60→15/70→30/80→45/85→51/100→71), 85%에서 safety≤49·D|F·`decisiveHighRisk≠null`. `safety-diagnosis`·`aiOpinion`이 결정적 고위험을 상쇄 불가로 선반영. 중복가중 제거(mortgage ratio deduction 미반영, claims 단일화). `policy.test.ts` 경계/단조성/말소·부기 제외 통과. ✅
- **DB 미적용 계약(§2.1,§6,§7.2):** `schema.prisma`+SQL **작성만**, 런타임은 `JEONSE_CHECKLIST_ENABLED` feature flag로 비활성(미설정 시 비활성), SQL↔스키마 1:1. 금지된 `db push`/`migrate`/`db execute` 실행 흔적 없음. ✅
- **동시성/감사(§3.3,§5.2):** 낙관적 동시성(`expectedRevision` + `updateMany` 조건부 count + P2002 롤백 처리), 저장 성공 시에만 `auditLog`(PII 미포함). 조회를 같은 트랜잭션에서 수행해 응답 역전 방지. ✅
- **정규화 계층(§4.3):** `vScore.score` 우선·레거시 `finalScore` 폴백, `analyzable===false`·원문 손상 시 `null`(0 채움 금지), 요약문 수치 추정 없음. ✅

---
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (리뷰 산출물 + 검수 대상 코드)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 — 본 리뷰는 코드 미변경(문서만). 검수 대상 신규/수정 백엔드 파일 전수 ≤500줄 확인(section-parsers 483→348, analyze-service ~475, 최대 title-parser 154)
2. 단일 책임           : ✅ 준수 — 리뷰 문서 1건. (대상 코드: lib 산식 / schemas 검증 / app/api 계약 분리 적절)
3. 서버 검증·보안      : ✅ 해당 없음(문서) — 대상 코드 보안은 위 "확인된 준수 항목" 참조
4. 성능 (중복·N+1)     : ✅ 해당 없음(문서) — 대상 코드 성능 지적은 MED M1
5. 폴더 구조           : ✅ 준수 — `docs/03-analysis/ux.review-backend.md` (기존 `*.review-backend.md` 관례 일치)
─────────────────────────────────────────────────
위반 항목: 없음 (본 산출물). 검수 대상 코드의 지적은 HIGH 1·MED 3·LOW 5 — 위 본문 참조
─────────────────────────────────────────────────
</content>
</invoke>
