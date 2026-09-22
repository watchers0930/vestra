# Wiki Compile Log

## 2026-09-16 — 증분 컴파일 (세션 v5.166.0~5.167.6)

- 모드: codebase (deep_scan off — 코드 변경 위주 세션이라 세션 컨텍스트로 반영)
- 업데이트 토픽: 4개 (security, api, features, deployment) — 병렬 컴파일
- 신규 토픽/개념: 없음 (새 non-obvious 교차 패턴 없어 개념 미신설)
- 소스 스캔: 문서 소스 변경은 package.json(버전·xlsx CDN)·.env.example·vercel.json 등 인프라 파일; 코드 변경 다수(보안·cron·분리·삭제)는 세션 컨텍스트로 반영

### 이번 세션 반영 요약 (8개 커밋 v5.166.0~5.167.6)
- **security**: crypto NUL 바이트 제거+SAST 바이너리 검출 게이트 신설, CSRF 4곳, IDOR(agent properties 소유권 검증), PII env 등록·로그 마스킹, xlsx 취약점 해소(SheetJS 0.20.3, baseline advisory 2건 제거), 이중발급 낙관적 잠금, invite 실명 마스킹, rate limit
- **api**: findMany 상한 4곳, cleanup cron 신설, registry-monitor recordCheck 원자화(P1017), issue-order route/service 분리, dead endpoint 4종 삭제(sign·ai-trust·dart·reps)
- **features**: 등기감시 로그 유실 근본수정(P1017 $transaction 원자화, 운영검증), 가짜 임대인 시드데이터 제거, dead code 대량 정리(SCR 뷰어 29파일·컴포넌트 17·심볼 34), cleanup 정기정리
- **deployment**: cleanup cron(vercel.json, KST 04:00), registry-monitor maxDuration=60, xlsx CDN 의존성, prebuild 보안게이트 강화(바이너리 검출·verifyCronSecret 신호)

## 2026-09-15 — 증분 컴파일 (세션 v5.162.0~5.165.4)

- 모드: codebase (deep_scan off — 문서 소스 변경은 package.json 버전뿐, 코드 변경은 세션 컨텍스트로 반영)
- 업데이트 토픽: 2개 (security, features)
- 신규 토픽/개념: 없음
- 소스 스캔: 문서 기준 변경 미미 (코드 변경 34개 중 30개, 위키 미스캔)

### 토픽별 변경 요약

| 토픽 | 주요 추가 내용 |
|------|----------------|
| security | 세션 자동 로그아웃(유휴 10분 + 브라우저 닫힘 쿠키 제거), 사업자 승인 전 PERSONAL 유지(requestedRole) |
| features | 등기감시 실행 로그(MonitoringCheckLog) + cron 재시도 근본수정, FR-015 내용증명(테이블 형식·속도개선·선택삭제·지연이자) 신규 항목, cron 스케줄 12·17시 갱신 |

## 2026-07-27 — 증분 컴파일

- 모드: codebase
- 소스 파일 변경: 코드 파일 직접 반영 (knowledge_files 외 세션 변경 사항 포함)
- 업데이트 토픽: 3개 (frontend, api, features)
- 신규 토픽/개념: 없음

### 토픽별 변경 요약

| 토픽 | 변경 유형 | 주요 추가 내용 |
|------|-----------|----------------|
| frontend | 섹션 업데이트 | 500줄 분리 완료 상태 갱신, Tailwind v4 lg: prefix 미작동 이슈, overflow-x sticky 차단 이슈, 금액 입력 padding 이슈 |
| api | 항목 추가 | generate-document jeonse/lease 법원 공식 양식 Key Decision(8번), analyze vs jeonse/lease 분기 Gotcha |
| features | 항목 확장 | 보증보험 딥링크(HUG/HF/SGI), 법원 공식 양식 생성(임차권등기명령+전세권설정등기), 등기부→임대인 자동 입력 |

### 구현 변경 내역 (이번 세션)
- `app/globals.css`: `overflow-x: hidden` → 모바일(`max-width: 1023px`) 전용 제한, `.two-col-flex` / `.two-col-sidebar` / `.col-sticky` 클래스 추가
- `components/jeonse/ProcedurePageLayout.tsx`: `lg:flex-row` / `lg:sticky` → 커스텀 CSS 클래스로 교체
- `app/api/generate-document/route.ts`: `type=jeonse` / `type=lease` OpenAI 제거 → 법원 공식 양식 정적 템플릿
- `app/(app)/jeonse/analysis/hooks/useJeonseAnalysis.ts`: `handleGenerateDoc`에 `landlordName: parsedOwner` 전달
- `app/(app)/jeonse/analysis/components/JeonseInputForm.tsx`: `MONEY_INPUT_STYLE.padding` `"10px 12px"` → `"10px 32px 10px 12px"`

---

## 2026-06-22 — 증분 컴파일

- 모드: codebase
- 신규 소스 파일: 13개 추가 (총 35 → 48개 → compile-state 기준 35개 + 13개 신규)
- 업데이트 토픽: 6개 (deployment, platform-overview, algorithm, features, security, api)
- 개념 아티클 신규 생성: 2개 (two-stage-principle, uncalibrated-parameters)

### 토픽별 변경 요약
| 토픽 | 변경 유형 | 주요 추가 내용 |
|------|-----------|----------------|
| deployment | 전면 재작성 | 2단계 배포 모델(preview→promote), 환경변수 15종, smoke check |
| platform-overview | 전면 재작성 | v4.5.1 지표(51 API/27 pages/80 components/28 DB), 9.2/10 A등급, 경쟁우위 |
| algorithm | 섹션 추가 | 공공 API 10종 테이블, 등기변동 하이브리드 감시, 시세전망 Phase A~D |
| features | 헤더·소스 업데이트 | 경쟁우위 기획, 데이터통합, 사용가이드 반영, 기능현황 갱신 |
| security | 섹션 추가 | OWASP Top 10 매트릭스(8/10 충족), 보안 점수 9.0/10 업데이트 |
| api | 헤더·수치 업데이트 | 51개 라우트 분류, 28개 DB 모델, 외부 API 7종(VWorld·K-apt·BOK) |

### 신규 소스 문서 (13개)
- docs/01-plan/features/competitive-advantage.plan.md
- docs/01-plan/features/data-integration.plan.md
- docs/01-plan/features/prediction-enhancement.plan.md
- docs/02-design/registry-monitoring-hybrid.md
- docs/deployment-runbook.md
- docs/VESTRA_사용가이드_슬라이드.md
- documents/사업계획서/VESTRA_사업계획서_지원금신청_v3.md
- documents/사업계획서/VESTRA_사업계획서_현행화_v2.md
- documents/사업계획서/VESTRA_초기창업패키지_신청서_v3.md
- documents/완료보고서-2026-03-23/VESTRA_기술분석서_v4.5.1.md
- documents/완료보고서-2026-03-23/VESTRA_완료보고서_v4.5.1.md
- documents/완료보고서-2026-03-23/VESTRA_종합평점_v4.5.1.md
- documents/완료보고서-2026-03-23/VESTRA_특허기능설명서_v4.5.1.md

---

## 2026-04-18 — 전체 재컴파일

- 모드: codebase
- 신규 소스 파일: 24개 추가 (총 35개)
- 업데이트 토픽: 7개 전체
- 병렬 컴파일: 7개 에이전트 동시 실행

### 토픽별 변경 요약
| 토픽 | 이전 줄 수 | 이후 줄 수 | 주요 추가 내용 |
|------|-----------|-----------|----------------|
| algorithm | 171 | 617 | 특허 리포트 9개 알고리즘 전체 수식, 구현 위치 상세화 |
| platform-overview | 111 | 399 | 버전 갱신, 요금제, 알고리즘 검증 로드맵 4단계 |
| security | 166 | 348 | 접근통제 매트릭스, 감사로그 정책, PIA, 취약점 감사 결과 |
| features | 170 | 415 | SCR 업그레이드, 보증보험, 뉴스수집기, 경쟁우위 설계 반영 |
| api | 160 | 295 | 35개 엔드포인트 전체 매트릭스, Cron API, 역할별 접근 정책 |
| frontend | 142 | 235 | Tailwind v4 arbitrary value 이슈, 500줄 초과 파일 목록 |
| deployment | 138 | 140 | deploy.sh 규칙, 카카오 OAuth 비활성화 이슈 |

### 신규 소스 문서 (24개)
- docs/VESTRA-플랫폼-완료보고서.md
- docs/VESTRA_Patent_Report_2026.md
- docs/VESTRA-기술보고서-및-특허기술-설명서.md
- docs/TECHNICAL-REPORT-v2.3.1.md
- docs/security/access-control-matrix.md
- docs/security/audit-log-policy.md
- docs/security/security-checklist.md
- docs/security/pia.md
- docs/03-analysis/security-audit-2026-03-23.md
- docs/03-analysis/vestra-v2-commercialization.analysis.md
- docs/03-analysis/features/prediction-enhancement.analysis.md
- docs/03-analysis/vestra-rfp-enhancement-final.analysis.md
- docs/03-analysis/vestra-rfp-enhancement.analysis.md
- docs/02-design/features/news-policy-collector.design.md
- docs/02-design/features/feasibility-scr-upgrade.design.md
- docs/02-design/features/competitive-advantage.design.md
- docs/02-design/features/guarantee-insurance-eligibility.design.md
- docs/02-design/features/feasibility-report.design.md
- docs/01-plan/features/competitive-advantage.plan.md
- docs/01-plan/features/feasibility-report.plan.md
- docs/01-plan/features/guarantee-insurance-eligibility.plan.md
- docs/01-plan/features/feasibility-scr-upgrade.plan.md
- docs/04-report/features/prediction-enhancement.report.md
- README.md

---

## 2026-04-12 — 초기 컴파일

- 모드: codebase
- 소스 파일 수: 10개 (핵심 문서) + 구조 탐색
- 생성 토픽: 7개
- 상태: 완료

### 생성된 토픽
1. `platform-overview` — 플랫폼 전체 개요
2. `algorithm` — 핵심 알고리즘 (파싱/검증/스코어링/V-Score)
3. `api` — API 명세 및 엔드포인트
4. `frontend` — UI/UX 컴포넌트 구조
5. `security` — 보안 정책 및 가이드
6. `features` — 주요 기능 상세
7. `deployment` — 배포 및 인프라

### 소스 문서
- `docs/ALGORITHM.md`
- `docs/04-API-Spec.md`
- `docs/TECHNICAL-STATUS-REPORT.md`
- `docs/01-SRS.md`
- `docs/security/secure-coding-guide.md`
- `docs/03-analysis/predict-value.analysis.md`
- `docs/02-design/features/prediction-enhancement.design.md`
- `docs/01-plan/features/vestra-dgon-integration.plan.md`
- `CLAUDE.md`
- `package.json`

## 2026-08-22

**Topics updated:** features, api, frontend, security, platform-overview
**New topics:** none
**New concepts:** role-based-feature-gating
**Sources scanned:** 51+
**Sources changed:** 이번 세션 코드(app/·lib/·prisma) v5.87~5.90.2
**Changes:** 가계약서 전면 개편(양측 손글씨 서명→PDF 1페이지→오프라인 확정), 거래 FK 무결성, 회원 역할 계층+권한 가드, 매물등록 renewal 이식·매물→감시 연결·의향서 Web Push, 중개사 CRM 거래조회

## 2026-09-22

**Topics updated:** algorithm
**New topics:** none
**New concepts:** none
**Sources scanned:** 55+
**Sources changed:** docs/ALGORITHM.md(§7 신규), docs/ROADMAP-1등화.md(P1 완료), package.json(v5.174.0)
**Changes:** 부동산 유형 커버리지 확대(v5.174.0) — 시세전망·매물시세 아파트 전용→4주거유형(아파트/연립·다세대/단독·다가구/오피스텔). 계정별 구독 대응 다중키 폴백 molitFetchRtms(미구독 403·오류XML 감지+메모이제이션), 아파트 전월세 키 폴백으로 전세가율 복구. algorithm 아티클에 "실거래 시세 조회 계층" 섹션 추가.

## 2026-09-22 (2차)

**Topics updated:** algorithm
**New topics:** none
**Sources changed:** docs/ALGORITHM.md(§7.3 전국확대·§7.4 능동신호 추가), docs/ROADMAP-1등화.md(P1 진행 갱신), package.json(v5.177.0)
**Changes:** 시세지도 오피스텔+전국확대(강원/전북 자치도 LAWD 코드 정정·250시군구·동적 GU_CENTER), 능동 신호 소스 확대(전세가율 위험·등기감시 미등록), chat 프롬프트 캐싱. 외부KMS 보류, preview 환경 정합(env).
