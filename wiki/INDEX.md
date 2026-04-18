# VESTRA Wiki INDEX

> **컴파일 날짜**: 2026-04-18
> **프로젝트 버전**: v5.12.0
> **배포 URL**: https://vestra-plum.vercel.app
> **총 토픽**: 7개 | **소스 문서**: 35개

---

## 토픽 목록

| 토픽 | 파일 | 설명 | Sources | Lines | Coverage |
|------|------|------|---------|-------|----------|
| 플랫폼 개요 | [topics/platform-overview.md](topics/platform-overview.md) | 전체 아키텍처, 기술 스택, 코드 규모, 요금제 | 7 | 399 | high |
| 핵심 알고리즘 | [topics/algorithm.md](topics/algorithm.md) | 9종 특허 알고리즘 전체 수식 및 구현 위치 | 6 | 617 | high |
| API 명세 | [topics/api.md](topics/api.md) | 35개+ 엔드포인트, 접근 매트릭스, Cron API | 5 | 295 | high |
| 프론트엔드 | [topics/frontend.md](topics/frontend.md) | 페이지/컴포넌트 구조, Tailwind v4 이슈 | 5 | 235 | high |
| 보안 | [topics/security.md](topics/security.md) | RBAC, 감사로그, PIA, 취약점 감사, 접근 매트릭스 | 7 | 348 | high |
| 주요 기능 | [topics/features.md](topics/features.md) | 구현 완료/설계 중 기능 전체, SCR/보증보험/뉴스 | 10 | 415 | high |
| 배포/인프라 | [topics/deployment.md](topics/deployment.md) | Vercel, Neon, deploy.sh, Cron, 환경변수 | 4 | 140 | high |

---

## 빠른 참조

### "이런 걸 알고 싶다면..."

| 질문 | 토픽 |
|------|------|
| 전체 시스템 구조가 궁금하다 | platform-overview |
| 등기부등본 파싱 알고리즘은? | algorithm |
| V-Score 계산 방법은? | algorithm |
| 특허 출원 대상 알고리즘은? | algorithm |
| API 엔드포인트 목록이 필요하다 | api |
| Rate Limit 정책은? | api, security |
| 페이지 라우팅 구조는? | frontend |
| Tailwind v4 arbitrary value 이슈? | frontend |
| 암호화·CSRF·XSS 방어는? | security |
| 접근 권한 매트릭스(역할별)? | security |
| 전세 보호/사업성/보증보험 기능? | features |
| SCR 업그레이드 설계는? | features |
| 배포 명령어(deploy vestra)? | deployment |
| 환경변수 목록? | deployment |
| Cron Job 스케줄? | deployment |

---

## 소스 문서 목록 (35개)

### 핵심 문서
| 문서 | 경로 |
|------|------|
| CLAUDE.md | `CLAUDE.md` |
| README.md | `README.md` |
| package.json | `package.json` |

### 기술 보고서
| 문서 | 경로 |
|------|------|
| ALGORITHM.md | `docs/ALGORITHM.md` |
| 04-API-Spec.md | `docs/04-API-Spec.md` |
| TECHNICAL-STATUS-REPORT.md | `docs/TECHNICAL-STATUS-REPORT.md` |
| TECHNICAL-REPORT-v2.3.1.md | `docs/TECHNICAL-REPORT-v2.3.1.md` |
| VESTRA-플랫폼-완료보고서.md | `docs/VESTRA-플랫폼-완료보고서.md` |
| VESTRA_Patent_Report_2026.md | `docs/VESTRA_Patent_Report_2026.md` |
| VESTRA-기술보고서-및-특허기술-설명서.md | `docs/VESTRA-기술보고서-및-특허기술-설명서.md` |
| 01-SRS.md | `docs/01-SRS.md` |

### 보안 문서
| 문서 | 경로 |
|------|------|
| secure-coding-guide.md | `docs/security/secure-coding-guide.md` |
| access-control-matrix.md | `docs/security/access-control-matrix.md` |
| audit-log-policy.md | `docs/security/audit-log-policy.md` |
| security-checklist.md | `docs/security/security-checklist.md` |
| pia.md | `docs/security/pia.md` |
| security-audit-2026-03-23.md | `docs/03-analysis/security-audit-2026-03-23.md` |

### 기능 설계/계획
| 문서 | 경로 |
|------|------|
| prediction-enhancement.design.md | `docs/02-design/features/prediction-enhancement.design.md` |
| feasibility-scr-upgrade.design.md | `docs/02-design/features/feasibility-scr-upgrade.design.md` |
| guarantee-insurance-eligibility.design.md | `docs/02-design/features/guarantee-insurance-eligibility.design.md` |
| news-policy-collector.design.md | `docs/02-design/features/news-policy-collector.design.md` |
| feasibility-report.design.md | `docs/02-design/features/feasibility-report.design.md` |
| competitive-advantage.design.md | `docs/02-design/features/competitive-advantage.design.md` |

### 분석 보고서
| 문서 | 경로 |
|------|------|
| predict-value.analysis.md | `docs/03-analysis/predict-value.analysis.md` |
| vestra-algorithm-advancement.analysis.md | `docs/03-analysis/vestra-algorithm-advancement.analysis.md` |
| vestra-v2-commercialization.analysis.md | `docs/03-analysis/vestra-v2-commercialization.analysis.md` |
| vestra-rfp-enhancement-final.analysis.md | `docs/03-analysis/vestra-rfp-enhancement-final.analysis.md` |
| vestra-rfp-enhancement.analysis.md | `docs/03-analysis/vestra-rfp-enhancement.analysis.md` |
| prediction-enhancement.analysis.md | `docs/03-analysis/features/prediction-enhancement.analysis.md` |
| prediction-enhancement.report.md | `docs/04-report/features/prediction-enhancement.report.md` |

---

## 최근 변경 이력

- **2026-04-18**: 전체 재컴파일 — 신규 소스 24개 추가 반영 (총 35개)
  - algorithm: 특허 리포트 기반 9개 알고리즘 전체 수식 상세화 (171줄 → 617줄)
  - security: 보안 문서 5종 추가, 취약점 감사 결과 반영 (166줄 → 348줄)
  - features: 기능 설계서 6종 반영, SCR/보증보험/뉴스수집기 추가 (170줄 → 415줄)
  - platform-overview: 버전 갱신(v5.10.5→v5.12.0), 요금제/검증 로드맵 추가 (111줄 → 399줄)
  - api: 35개 엔드포인트 매트릭스, 접근 통제 전체 반영 (160줄 → 295줄)
  - frontend: Tailwind v4 이슈, 500줄 초과 파일 목록 추가 (142줄 → 235줄)
  - deployment: deploy.sh 규칙, Cron 보안, 카카오 비활성화 추가 (138줄 → 140줄)
- **2026-04-12**: 초기 컴파일 (7 topics, 11 sources)
