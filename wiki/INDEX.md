# VESTRA Wiki INDEX

> **컴파일 날짜**: 2026-09-16
> **프로젝트 버전**: v5.167.6
> **배포 URL**: https://vestra.ai.kr (구 vestra-plum.vercel.app)
> **총 토픽**: 7개 | **개념 아티클**: 3개 | **소스 문서**: 51개+

---

## 토픽 목록

| 토픽 | 파일 | 설명 | Sources | Coverage |
|------|------|------|---------|----------|
| 플랫폼 개요 | [topics/platform-overview.md](topics/platform-overview.md) | 전체 아키텍처, 회원 역할 계층, 거래 FK 무결성, v5.90.2 | 13 | high |
| 핵심 알고리즘 | [topics/algorithm.md](topics/algorithm.md) | 7개 특허 알고리즘, 공공 API 10종, 예측 강화 로드맵 | 11 | high |
| API 명세 | [topics/api.md](topics/api.md) | 거래 API·권한 가드·findMany 상한·cleanup cron·issue-order 분리 | 12 | high |
| 프론트엔드 | [topics/frontend.md](topics/frontend.md) | renewal UI, 매물등록·가계약서·서명패드, PDF | 16 | high |
| 보안 | [topics/security.md](topics/security.md) | RBAC·PII·CSRF·IDOR·crypto NUL 게이트·xlsx 취약점 해소·OWASP | 23 | high |
| 주요 기능 | [topics/features.md](topics/features.md) | 등기감시(P1017 원자화)·의향서·전세·dead code 정리·가짜데이터 제거 | 24 | high |
| 배포/인프라 | [topics/deployment.md](topics/deployment.md) | 2단계 배포, Vercel, cron 8종·cleanup, prebuild 보안게이트, xlsx CDN | 8 | high |

---

## 개념 아티클 (Concepts)

| 개념 | 파일 | 연결 토픽 |
|------|------|-----------|
| 2단계 검증 원칙 | [concepts/two-stage-principle.md](concepts/two-stage-principle.md) | algorithm, deployment, security |
| 미검증 파라미터 문제 | [concepts/uncalibrated-parameters.md](concepts/uncalibrated-parameters.md) | algorithm, api, deployment |
| 역할 기반 기능 게이팅 | [concepts/role-based-feature-gating.md](concepts/role-based-feature-gating.md) | platform-overview, api, security, features |

---

## 빠른 참조

### "이런 걸 알고 싶다면..."

| 질문 | 토픽 |
|------|------|
| 전체 시스템 구조가 궁금하다 | platform-overview |
| 등기부등본 파싱 알고리즘은? | algorithm |
| V-Score 계산 방법은? | algorithm |
| 공공 API 10종 연동 구조는? | algorithm |
| 등기변동 하이브리드 감시 구조는? | algorithm, features |
| 시세전망 강화 로드맵(Phase A~D)? | algorithm |
| API 엔드포인트 목록이 필요하다 | api |
| Rate Limit 정책은? | api, security |
| 페이지 라우팅 구조는? | frontend |
| Tailwind v4 arbitrary value / responsive prefix 이슈? | frontend |
| overflow-x: hidden이 sticky를 차단하는 이슈? | frontend |
| 법원 공식 양식 (임차권등기명령, 전세권설정등기)? | features, api |
| 보증보험 HUG/HF/SGI 신청 딥링크? | features |
| OWASP Top 10 커버리지는? | security |
| 암호화·CSRF·XSS 방어는? | security |
| 접근 권한 매트릭스(역할별)? | security |
| 전세 보호/사업성/보증보험 기능? | features |
| 대출가심사/임대인프로파일 기능? | features |
| 배포 명령어(deploy vestra)? | deployment |
| 환경변수 목록? | deployment |
| Cron Job 스케줄? | deployment |
| 왜 모든 것에 2단계 구조가 있나? | concepts/two-stage-principle |
| 위험도 점수를 신뢰할 수 있나? | concepts/uncalibrated-parameters |

---

## 소스 문서 목록 (51개)

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
| deployment-runbook.md | `docs/deployment-runbook.md` |
| VESTRA_사용가이드_슬라이드.md | `docs/VESTRA_사용가이드_슬라이드.md` |

### 완료보고서 v4.5.1
| 문서 | 경로 |
|------|------|
| VESTRA_기술분석서_v4.5.1.md | `documents/완료보고서-2026-03-23/VESTRA_기술분석서_v4.5.1.md` |
| VESTRA_완료보고서_v4.5.1.md | `documents/완료보고서-2026-03-23/VESTRA_완료보고서_v4.5.1.md` |
| VESTRA_종합평점_v4.5.1.md | `documents/완료보고서-2026-03-23/VESTRA_종합평점_v4.5.1.md` |
| VESTRA_특허기능설명서_v4.5.1.md | `documents/완료보고서-2026-03-23/VESTRA_특허기능설명서_v4.5.1.md` |

### 사업계획서
| 문서 | 경로 |
|------|------|
| VESTRA_사업계획서_지원금신청_v3.md | `documents/사업계획서/VESTRA_사업계획서_지원금신청_v3.md` |
| VESTRA_사업계획서_현행화_v2.md | `documents/사업계획서/VESTRA_사업계획서_현행화_v2.md` |
| VESTRA_초기창업패키지_신청서_v3.md | `documents/사업계획서/VESTRA_초기창업패키지_신청서_v3.md` |

### 보안 문서
| 문서 | 경로 |
|------|------|
| secure-coding-guide.md | `docs/security/secure-coding-guide.md` |
| access-control-matrix.md | `docs/security/access-control-matrix.md` |
| audit-log-policy.md | `docs/security/audit-log-policy.md` |
| security-checklist.md | `docs/security/security-checklist.md` |
| pia.md | `docs/security/pia.md` |
| security-audit-2026-03-23.md | `docs/03-analysis/security-audit-2026-03-23.md` |

### 기능 기획/설계
| 문서 | 경로 |
|------|------|
| competitive-advantage.plan.md | `docs/01-plan/features/competitive-advantage.plan.md` |
| data-integration.plan.md | `docs/01-plan/features/data-integration.plan.md` |
| prediction-enhancement.plan.md | `docs/01-plan/features/prediction-enhancement.plan.md` |
| registry-monitoring-hybrid.md | `docs/02-design/registry-monitoring-hybrid.md` |
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

- **2026-09-16**: 세션(v5.166.0~5.167.6) 반영 — security·api·features·deployment 4개 토픽 갱신 (전수 보안감사 + 등기감시 근본수정 + 대규모 정리)
  - **전수 보안감사·수정**: crypto.ts NUL 바이트 제거(보안 SAST 게이트가 PII 암호화 파일을 바이너리로 취급해 건너뛰던 사각지대) + 재발방지 게이트 신설, CSRF 4곳(photos·temp-doc·temp-photo·sync-data DELETE), IDOR(agent/clients properties 소유권 검증), PII env 등록·로그 마스킹, 이중발급 낙관적 잠금, invite 실명 마스킹
  - **등기감시 로그 유실 근본수정**: 반복 문제의 진짜 원인=간헐 Neon P1017(커넥션 닫힘)로 cron이 lastCheckedAt만 갱신하고 별도 recordCheckLog create가 실패해 유실. update+로그를 `$transaction` 원자화+3회 재시도+maxDuration=60. 운영 실측 검증
  - **성능**: findMany 상한(verification·monitoring/alerts·agent/clients·admin/announcements), certify·safety-check rate limit
  - **인프라**: cleanup cron 신설(temp 고아 Blob 정리+AuditLog/Notification retention), xlsx 취약점 해소(SheetJS 공식 0.20.3 CDN)
  - **대규모 정리**: dead code — 구 서명(/api/sign)·/ai-trust·SCR 뷰어 파이프라인 29파일·미연결 컴포넌트 17개·미사용 lib export 34심볼 제거. molit-api(613)·issue-order(535) 500줄 분리. 가짜 임대인 시드데이터 제거
- **2026-09-15**: 세션(v5.162.0~5.165.4) 반영 — security·features 갱신 (deep_scan off라 문서 소스 변경은 package.json 버전뿐; 아래는 코드 변경을 세션 컨텍스트로 반영)
  - **세션 자동 로그아웃**: 유휴 10분(`lib/session-config.ts` 단일상수) + 브라우저 닫힘=로그아웃(Auth.js v5가 세션쿠키에 강제주입하는 Expires/Max-Age를 route에서 제거, `lib/session-cookie.ts`)
  - **사업자 승인 전 PERSONAL 유지**: 신청 시 role 즉시 변경 대신 `User.requestedRole`에 기록, 관리자 승인 시에만 role 부여(승인 전 권한상승·화면 오전환 차단), 거부 시 requestedRole 정리
  - **내용증명(keepzip)**: 생성 속도 개선(reasoning medium→minimal, 44.6s→9.6s), 지연이자 항목(민법 제379조 연 5%) 추가·한 줄화, PDF·화면 테이블 형식(수신인/발신인/부동산 표시 + '내용' 셀, 12pt, 회색 배경), 체크박스 선택·전체삭제(DELETE `/api/keepzip/cases`, 본인 것만 IDOR 차단)
  - **등기감시 cron 로그 근본수정**: `recordCheckLog` 빈 catch 제거 + 3회 재시도(일시적 DB실패 복구), lastCheckedAt만 갱신되고 로그 누락되던 문제 해결
  - **마이페이지**: 유료 플랜 배지+만료일, 구독 카드 현재 플랜 선택, GNB 로그아웃 아이콘화, 의향서 카드 폭 확대
- **2026-08-22**: 이번 세션(v5.87~5.90.2) 반영 — 5개 토픽 갱신(features·api·frontend·security·platform-overview)
  - 가계약서 전면 개편(양측 손글씨 서명→PDF A4 1페이지→오프라인 확정, 표준계약 10개 조항 요약, 주민번호 성별1자리)
  - 거래 데이터 FK 무결성(EContract↔의향서/매물/임차인, MonitoredProperty↔매물)
  - 회원 역할 계층(개인/부동산/임대사업자/기업=사업성분석/관리자) + 권한 가드(매물등록 verifyStatus, 사업성분석 기업전용)
  - 매물등록 renewal 이식, 매물→감시 연결, 의향서 Web Push, 중개사 CRM 거래조회
  - 신규 개념: role-based-feature-gating
- **2026-07-27**: 3개 토픽 증분 업데이트 (코드 구현 반영)
  - frontend: 500줄 파일 분리 완료 상태 갱신, Tailwind v4 responsive prefix 미작동 이슈 + overflow-x sticky 차단 이슈 추가, 금액 입력 padding 이슈 추가
  - api: generate-document jeonse/lease 타입 법원 공식 양식 적용 Key Decision 추가
  - features: 보증보험 기관별 신청 딥링크, 법원 공식 양식 자동 생성(임차권등기명령/전세권설정등기), 등기부 파싱→임대인 자동 입력 반영
- **2026-06-22**: 신규 소스 16개 추가 반영 (총 51개) — 6개 토픽 업데이트, 개념 아티클 2개 신규 생성
  - deployment: 2단계 배포 흐름(preview→promote), 환경변수 전체 목록(15종), smoke check 추가
  - platform-overview: v4.5.1 기준 스케일 지표 갱신(51 API / 27 pages / 80 components / 28 DB models), 9.2/10 A등급 추가
  - algorithm: 공공 API 10종 연동 테이블, 등기변동 하이브리드 감시 아키텍처, 시세전망 강화 로드맵(Phase A~D) 추가
  - features: 경쟁우위 기획 반영, 대출가심사·임대인프로파일·의사결정리포트 현황 업데이트
  - security: OWASP Top 10 커버리지 매트릭스 추가, 보안 점수 B+(7.5) → 9.0/10 상향 반영
  - api: 51개 라우트 분류 명세, 28개 DB 모델, 외부 API 7종(VWorld·K-apt·BOK 추가)
  - concepts/two-stage-principle: 알고리즘·배포·보안의 2단계 구조 공통 패턴
  - concepts/uncalibrated-parameters: 핵심 위험도 파라미터 캘리브레이션 미완료 패턴
- **2026-04-18**: 전체 재컴파일 — 신규 소스 24개 추가 반영 (총 35개)
- **2026-04-12**: 초기 컴파일 (7 topics, 11 sources)
