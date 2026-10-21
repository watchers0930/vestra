# 전세 UX 감사 잔여결함 8건 — 설계↔구현 갭 분석 (교차수정 반영 후)

> 프로젝트: VESTRA · 작성일: 2026-10-21 · 작성자: 크로미
> 기준 계약서: [`docs/02-design/features/ux.design.md`](../02-design/features/ux.design.md)
> 상위 기획: [`docs/01-plan/features/ux.plan.md`](../01-plan/features/ux.plan.md)
> 교차검수: [`ux.review-backend.md`](./ux.review-backend.md) · [`ux.review-frontend.md`](./ux.review-frontend.md)
> 대상: 작업트리 미커밋 변경분 + 신규 파일(교차수정 반영 후 현재 상태)

---

## 0. 분석 방법과 검증 범위 (먼저 명시)

- 설계서(계약서)의 타입·필드명·API 스펙·상수·배치 순서를 기준으로, **실제 구현 파일을 직접 열어 한 건씩 대조**했다.
- 교차검수 지적(백엔드 HIGH1·MED3·LOW5, 프론트 HIGH4·MED6)이 "해소됐다는 말"을 믿지 않고 **코드에서 반증을 시도**했다.
- 테스트는 "초록불 불신" 규율에 따라 실제로 실행해 확인했다: `npx vitest run lib/ux-tests __tests__/risk-scoring.test.ts __tests__/v-score.test.ts` → **6파일 93건 통과**(2026-10-21 실행). 루트 `vitest.config.ts`가 `lib/ux-tests/**`를 수집함도 `vitest list`로 확인(77건 수집).
- **이 분석의 한계(규칙 0-1):** 본 분석은 **정적 코드 대조 + 단위테스트** 수준이다. **운영 실화면·실데이터·교차기기 저장·360px 모바일·실제 PDF 파일 생성/다중페이지·스크린리더·실제 등기/주소 데이터**는 검증하지 않았다. 양측 리뷰도 동일하게 미검증으로 명시했다. 따라서 "완료"가 아니라 **"코드/단위검증 수준에서 설계 일치"** 로 보고한다.

---

## 1. Match Rate (일치율): **약 94%**

기능별 가중 평가(계약서는 타입·API·상수까지 못박은 계약 수준이며, 핵심 P0와 교차검수 HIGH/MED가 전부 해소된 점을 반영).

| 기능 | 우선순위 | 일치율 | 근거 요약 |
| --- | --- | --- | --- |
| ① 위험산정·등급 보정 | P0 | ~99% | 감점표(60→15/70→30/80→45/85→51/100→71) 설계 1:1, 85% 고위험·단조성·중복가중 제거·버전 저장·파생모델 선반영 전부 구현 |
| ⑤ 점수/경고 배치 | P0 | ~99% | `HighRiskSummary → RightsScoreCard → … → VScoreExplainPanel` 순서, `analyzable===false` 보호 분기, 게이지 공용 색상정책 주입 |
| ⑥ 전용면적 파싱 | P1 | ~95% | `title-area-parser` 분리·단위 정규화·전유부분 우선. 시세필터 전달 연결 |
| ⑦ 주소 완전표시 | P1 | ~90% | `title-address-parser` 분리·legacy 폴백 복구. 단 `propUid` 미추출(설계가 가정한 고유식별자 우선 경로는 사실상 비활성) |
| ② V-Score 설명 | P1 | ~95% | `VScoreExplainPanel` 서버 DTO 표시 전용, 축별 score/weight/contribution/dataAvailable 구분 |
| ⑧ 그래프·종합위험도 | P1 | ~96% | 부기등기 독립노드 제외, 노드 클릭/키보드 펼침·근거열람, 말소 토글, 위험지수 패널 분리 |
| ③ 상세·비교·PDF | P1 | ~98% | 본인 상세 API·직전비교·버전차이·종류별 분기·위험요인 내용표시·PDF 클론 캡처 |
| ④ 체크리스트 서버저장 | P1 | ~85% | 서버 API(인증·CSRF·Zod·blind index·낙관적동시성)·스키마·SQL 작성 완료, DB 미적용(의도). 단 프론트 서버연동·일회성 가져오기 미구현(의도된 DB 미적용 범위 내) |

> 미달분(약 6%)의 대부분은 **설계가 명시적으로 "DB 미적용·별도 작업"으로 유보한 ④의 교차기기 저장**과, **교차검수 LOW 5건(전부 경미)**, 그리고 ⑦의 `propUid` 미지원이다. 완화 불가 6조건(85% 고위험·단조성·본인권한·입력검증·500줄·DB 미적용)은 **전부 준수**됐다.

---

## 2. Gap 목록 (설계 대비 누락/불일치)

### 해소되지 않은 항목 (실제 코드로 확인)

| # | 심각도 | 위치 | 설계 요구 | 현재 구현 | 상태 |
| --- | --- | --- | --- | --- | --- |
| G1 | LOW | `app/api/user/jeonse-checklists/route.ts:8` | 기능 비활성은 "준비 중" 의미 | `disabled()`가 **500** 반환(503 아님). 모니터링상 거짓 에러 스파이크 소지 | ❌ 미해소 (백엔드 L2) |
| G2 | LOW | `lib/risk/claims-policy.ts:50` | 반올림 전 판정, **화면 반올림** | `detail`에 `시세 대비 ${ratioToMarket}%` 원시 소수 그대로 삽입(`85.2345…%`) | ❌ 미해소 (백엔드 L4) |
| G3 | LOW | `lib/risk-scoring.ts:116,121` | 같은 채권계열은 최대감점 묶음, 독립위험만 추가 | `evaluateMultipleMortgages`(-10)와 `evaluateClaimRatios`가 공존 — 근저당 부담 이중가중 소지. 설계 판단 미명시·테스트 부재 | ❌ 미해소 (백엔드 L5) |
| G4 | LOW | `lib/registry/title-parser.ts:19` | §4.3 `propUid` 우선 매칭 | `propUid`가 항상 `""` → 항상 주소 기반 매칭. 설계가 가정한 고유식별자 경로는 죽은 코드 | ❌ 미해소 (백엔드 L1) |
| G5 | LOW | `prisma/manual/2026-10-21-add-jeonse-checklist.sql` | §2.1 경로 `scripts/sql/...` | 실제는 `prisma/manual/`. 내용은 스키마와 1:1 일치·실행금지 주석 준수. **계약서(설계 §2.1 115·150행)가 아직 `scripts/sql` 명시** → 경로 계약 불일치 | ❌ 미해소 (백엔드 L3, 경미) |
| G6 | MINOR | `app/(personal-home)/renewal/jeonse/hooks/useJeonseChecklist.ts` | §4.5 레거시 키의 **일회성 가져오기** 제공 | 계정 네임스페이스 키로 격리(HIGH 해소) + 레거시 자동적용 차단. 단 "대상 주소 확인 후 일회성 import" UI는 미구현 | ⚠️ 부분 (DB 미적용 범위 내 유예 가능) |
| G7 | — | ④ 전반 | 교차기기 저장 E2E | 프론트 GET/PUT 미연동·실제 DB 미적용 | ⚠️ **의도된 유보**(설계 §6 단계6·7이 "코드/SQL 산출 vs 운영활성화 구분보고" 명시) |

> G1~G5는 모두 **LOW**이며 출시 차단이 아니다. G6·G7은 설계가 DB 미적용을 전제로 유예한 범위라 "결함"보다 "남은 작업"에 가깝다(설계·기획 모두 명시).

### 설계 대비 **초과 충실** (참고)

- 신규 입력검증 테스트 `lib/ux-tests/analyze-input.test.ts` 추가(설계 §6.1엔 없던 rawText 상한 회귀까지 포함).
- `ScoreGauge`에 `colorPolicy` prop을 신설해 **권리분석 게이지만** 공용 색상정책을 쓰고 타 모델(V-Score·사기위험) 게이지는 고유 의미 유지 — 설계 §5.1 "각 모델 고유 라벨 유지" 의도를 정확히 반영.

---

## 3. 플랫폼 절대규칙 위반 점검

```
─────────────────────────────────────────────────
📋 플랫폼 개발 원칙 점검 (설계 구현물 전수)
─────────────────────────────────────────────────
1. 페이지 500줄 제한   : ✅ 준수 — 전 변경·신규 파일 ≤500. 최대 analyze-service.ts 477, safety-diagnosis.ts 447,
                          RightsInputCard 424, useRightsAnalysis 406, RightsResult 404, JeonseRenewalContent 398.
                          설계가 지목한 분리선행 대상(RightsGraphView 500→96, section-parsers 483→348) 모두 해소
2. 단일 책임           : ✅ 준수 — UI(components)/상태(hooks)/산식·파서(lib)/API(app/api)/스키마(schemas) 분리.
                          컴포넌트는 서버값 표시 전용(RightsScoreCard·VScoreExplainPanel 재계산 없음)
3. 서버 검증·보안      : ✅ 준수 — 신규 3개 API 전부 auth() 본인조건 + 변경요청 validateOrigin + Zod + Cache-Control:no-store.
                          IDOR 방어(findFirst{id,userId}·userId_addressKey 복합키·타인/없음 동일 404),
                          blind index(hashForSearch)·암호문 검색 배제, 16KB 바이트 제한, rawText z.max(60000),
                          클라 제공 userId/id/updatedAt 무시
4. 성능 (중복·N+1)     : ✅ 준수 — includePrevious 스캔 상한 300·identity 루프밖 1회 계산,
                          상세는 모달 열 때만 조회(렌더 fetch 없음), 비교는 서버 조회(필요 컬럼만 select)
5. 폴더 구조           : ✅ 준수(경미 예외 1) — 라우트전용 components/·hooks/, 공용 lib/·schemas/ 정위치.
                          단 SQL이 prisma/manual/(설계는 scripts/sql/) → G5
─────────────────────────────────────────────────
위반 항목: 없음(출시 차단 기준). 경미 불일치 G5(SQL 경로 계약) 1건 → 경로 통일 또는 설계서 갱신 권고
─────────────────────────────────────────────────
```

**완화 불가 6조건 (설계 §7.2) 전수:**
- ✅ 85% 고위험 — `claimsDeduction(85)=51` → safety≤49·D/F, `decisiveClaimRisk` 85%↑ 반환, aiOpinion 선반영(상쇄 불가)
- ✅ 단조성 — 계단식 단조 + `max(C/V, C/D)` 채택. risk-scoring/policy 테스트 통과(실행 확인)
- ✅ 본인 권한 — 전 신규 조회/갱신 세션 userId 조건, IDOR 없음
- ✅ 입력 검증 — 음수·NaN·Infinity·과대본문(16KB)·허용 외 키/타입/버전 거부
- ✅ 500줄 — 전 파일 준수
- ✅ DB 미적용 — schema.prisma+SQL 작성만, `checklistPersistenceEnabled()` feature flag로 비활성, 금지 명령 흔적 없음

---

## 4. 교차검수 지적 해소 여부 (코드로 재확인)

### 백엔드 리뷰 (ux.review-backend.md) — HIGH1·MED3·LOW5

| 지적 | 내용 | 해소 여부 | 근거 |
| --- | --- | --- | --- |
| **HIGH** | 신규 테스트가 CI(`npm run test`)에서 미수집 | ✅ **해소** | 루트 `vitest.config.ts:8` include에 `"lib/ux-tests/**/*.test.ts"` 추가. `vitest list`로 ux-tests 77건 수집 확인, 실제 실행 93건 통과 |
| MED M1 | `includePrevious` 무제한 순회·복호화·row 재파싱 | ✅ **해소** | `route.ts:10` `PREVIOUS_SCAN_LIMIT=300` 상한, `:30` identity를 루프 밖 1회 계산 후 재사용 |
| MED M2 | 신규 주소파서가 legacy 주소 무조건 덮어씀 | ✅ **해소** | `title-parser.ts:146` `result.address = address.address || result.address`(폴백 보존), unitNumber도 ambiguous 가드 |
| MED M3 | `rawText` 길이 상한 없음(비대칭) | ✅ **해소** | `schemas/analyze-unified.ts:4` `rawText: z.string().max(60000)` |
| LOW L1 | `propUid` 미채움 → 매칭 비활성 | ❌ 미해소 | `title-parser.ts:19` 여전히 `propUid:""`. 설계서 주석화도 안 됨 → G4 |
| LOW L2 | 비활성 응답 500(503 권고) | ❌ 미해소 | `jeonse-checklists/route.ts:8` 여전히 500 → G1 |
| LOW L3 | SQL 경로 설계와 다름 | ❌ 미해소 | `prisma/manual/`에 존재, 설계 §2.1은 `scripts/sql/` → G5 |
| LOW L4 | detail에 반올림 전 비율 삽입 | ❌ 미해소 | `claims-policy.ts:50` 원시 소수 그대로 → G2 |
| LOW L5 | 다수 근저당 ↔ claims 이중가중 소지 | ❌ 미해소 | `risk-scoring.ts:116·121` 둘 다 가산, 설계 판단·테스트 미추가 → G3 |

→ **HIGH·MED 4건 전부 해소, LOW 5건 미해소(전부 경미).**

### 프론트 리뷰 (ux.review-frontend.md) — HIGH4·MED6

| 지적 | 내용 | 해소 여부 | 근거 |
| --- | --- | --- | --- |
| **F01 HIGH** | 미입력 보증금을 시장 전세가율로 대체 표시 | ✅ **해소** | `RightsScoreCard.tsx:37` `전세가율(D/V)`는 `claims.jeonseRatio`만, null은 "미확인". 시장치는 "시장 전세가율" 별도 라벨(`fmtPctPositive`로 0 미표시) |
| **F02 HIGH** | 리뉴얼 화면에 보증금 입력 미연결 | ✅ **해소** | `RightsRenewalClient.tsx:31` userDeposit 결선 → `RightsAnalysisForm.tsx:196-224` 만원 단위 입력(주소·파일 공통) |
| **F03 HIGH** | 계정·물건 구분 없이 레거시 체크 자동복원 | ✅ **해소**(핵심) | `useJeonseChecklist.ts:23` `vestra_jeonse_checklist_v1::{userId}` 네임스페이스, 세션 확정 후 해당 사용자분만 복원, 레거시 자동적용 차단. (일회성 import UI는 G6) |
| **F04 HIGH** | 계정 전환 후 모달 메타 잔류 | ✅ **해소** | `ProfileDashboardPanel.tsx:31` selected를 `{record, owner:userId}`로 귀속, `:40` userId 변경 시 setSelected(null)+close(), `:49` 렌더 가드 `owner===userId` |
| F05 MED | 부기등기 독립 채권노드 중복집계 | ✅ **해소** | `graph-types.ts:109·126` gapgu/eulgu 모두 `if(entry.isSupplementary) return`. claims-policy도 동일 제외 |
| F06 MED | 노드 포커스만 가능, 근거열람·말소토글 없음 | ✅ **해소** | `RightsGraphNode.tsx` button+aria-expanded, 펼침 패널(접수일·순위·원문), 말소 토글, 영향 힌트, 빈 상태 분기 |
| F07 MED | 640px 고정 리포트가 모달 초과·PDF 클리핑 | ✅ **해소** | `AnalysisCompareReport.tsx:91` 기본 `w-full max-w-[640px]` 유동, PDF는 `pdf` prop 고정 640px. `AnalysisDetailModal.tsx:159` 조상 overflow 밖 `position:fixed;left:-10000` 클론에서 캡처 |
| F08 MED | 게이지 색상이 기존 80/60/40 기준 유지 | ✅ **해소** | `ScoreGauge.tsx:34` `colorPolicy:"grade"`시 `grade-policy` 색상, RightsScoreCard가 주입. 타 모델은 기본 유지 |
| F09 MED | 공통 모달 교체로 계약·예측 상세요약 소실 | ✅ **해소** | `AnalysisDetailModal.tsx:40` `supportsComparison()`로 분기, 비대상 종류는 `record.summary` 일반텍스트 표시 |
| F10 MED | 위험요인 비교가 건수만 표시 | ✅ **해소** | `AnalysisCompareReport.tsx:22` `lookupFactors`로 ID→설명·심각도, null은 "비교 불가" 명시 |

→ **프론트 HIGH 4건·MED 6건 전부 해소.**

### 교차검수 총괄
- 두 리뷰의 **HIGH 5건(백1+프4)·MED 9건(백3+프6) = 전부 해소**.
- 미해소는 **백엔드 LOW 5건뿐**이며 모두 경미(모니터링 상태코드·표시 소수자릿수·이중가중 명시·죽은 식별자 경로·파일 경로).

---

## 5. 종합 의견 및 남은 수정 우선순위

### 종합 의견
교차수정이 반영된 현재 코드는 **설계 계약을 높은 수준(≈94%)으로 충족**한다. 특히 출시 차단 성격의 P0(①위험산정·⑤배치)와 보안·IDOR·PII·동시성(④서버계약)이 설계와 1:1로 구현됐고, **두 교차검수의 HIGH/MED 14건이 전부 해소**됐다. 플랫폼 5대 원칙·완화 불가 6조건도 전수 준수한다. 남은 것은 **경미한 LOW 5건**과 **설계가 의도적으로 유보한 ④의 DB 적용/교차기기 검증**이다.

단, 본 판정은 **정적 대조 + 단위테스트** 범위다. 규칙 0-1에 따라 아래 **운영·실데이터 검증 전에는 "완료"가 아니다.**

### 남은 수정 우선순위

**P1 — 배포 전 권장(저비용·저위험, 묶어서 처리)**
1. **G3(L5) 이중가중 결론 확정** — 가장 실질적. `evaluateMultipleMortgages`(-10)를 claims 계열 최대감점에 흡수할지/독립 유지할지 설계 판단을 명시하고 `policy.test.ts`에 다수근저당 케이스를 추가해 고정. (점수 신뢰성에 직접 닿는 유일한 LOW)
2. **G5(L3) SQL 경로 통일** — `scripts/sql/`로 이동하거나 설계 §2.1을 `prisma/manual/`로 갱신(계약 단일화). 계약 문서/코드 drift 제거.
3. **G1(L2) 503 전환** — `disabled()` 500→503. 모니터링 거짓 에러 방지.
4. **G2(L4) 표시 소수 정리** — `detail` 생성 시 `.toFixed(1)`(판정 원시값 유지).

**P2 — 설계 계약 정합(택1)**
5. **G4(L1) propUid** — 표제부 `[고유번호 …]` 추출을 추가하거나, 설계 §4.3에 "현 단계 propUid 미지원(주소 매칭만)"을 명시해 계약↔코드 일치.

**P3 — 운영/실데이터 검증(규칙 0-1, "완료" 선언의 전제)**
6. ①⑤⑥⑦ 보정을 `t-vestra` 테스트 배포 후 **실화면**에서 85% 사례 결론·면적·주소·게이지 색상 눈으로 확인 → 대장 승격 지시 전 운영 미반영.
7. ③ 모달/PDF를 **실제 브라우저**에서 360px·다중페이지·한국어 캡처 클리핑 확인(F07은 구현상 위험으로 분리된 상태).
8. ④ 교차기기 저장은 **승인된 DB 준비 이후** 별도 작업으로 E2E 검증(현재는 코드/SQL 산출 상태로 구분 보고 — 설계 §6 준수).
9. G6 일회성 가져오기 UI는 ④ 서버저장 활성화 시점에 함께 구현.

### 한 줄 결론
> 교차수정 후 **설계 핵심·보안·교차검수 HIGH/MED가 전부 반영된 견고한 상태**. 남은 것은 LOW 5건과 설계가 유보한 ④ DB 작업뿐. **LOW 4건(G1~G3·G5)을 묶어 정리한 뒤 테스트 배포 → 운영 실화면 확인**을 거쳐야 비로소 "완료"다. 현 시점은 **코드/단위검증 수준 완료, 운영 미검증**으로 구분 보고한다.
