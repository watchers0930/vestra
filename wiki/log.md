# Wiki Compile Log

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
