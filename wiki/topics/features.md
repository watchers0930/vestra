---
topic: features
last_compiled: 2026-06-22
sources: 14
---

# 주요 기능 (Features)

---

## Purpose [coverage: high -- 4 sources]

VESTRA는 AI 기반 부동산 자산관리 플랫폼으로, 등기부등본 권리분석부터 전세 보호, 시세전망, 계약서 검토, 세무 시뮬레이션, 사업성 분석까지 부동산 거래 전 과정에 걸쳐 AI 분석을 제공한다. 핵심 분석 기능 7종(FR-001~FR-007), 부가 기능 다수, 그리고 향후 구현 예정인 경쟁우위 강화 기능 5단계(Phase)로 구성된다.

---

## Features (기능 목록) [coverage: high -- 8 sources]

### 구현 완료

---

#### FR-001: 권리분석 (`/rights`)

등기부등본(PDF/텍스트) 업로드 → 자동 파싱 → 권리 상태 분석 → 위험도 산정

| 컴포넌트 | 역할 |
|---------|------|
| `registry-parser.ts` | 등기부등본 파싱 (598줄) |
| `validation-engine.ts` | 4단계 유효성 검증 (1,233줄) |
| `risk-scoring.ts` | 13팩터 + 6상호작용 위험도 스코어링 (938줄) |
| `confidence-engine.ts` | 신뢰도 전파 (263줄) |
| `ScoreGauge`, `KpiCard` | 결과 시각화 |

**관련 API**: `POST /api/analyze-rights`, `POST /api/parse-registry`

---

#### FR-002: 계약서 분석 (`/contract`)

매매/임대차 계약서 업로드 → AI 특약사항/불리한 조항/누락 항목 분석 → 법적 검토 의견

| 컴포넌트 | 역할 |
|---------|------|
| `contract-analyzer.ts` | AI 기반 조항 분석 (597줄) |
| `court-api.ts` | 대법원 판례 연동 |
| OpenAI GPT-4.1-mini | 법률 조언 생성 |

- 계약 분석 시 뉴스·정책 수집기에서 최근 30일 정책(전세, 규제지역, 대출규제 태그) 컨텍스트 자동 주입

**관련 API**: `POST /api/analyze-contract`

---

#### FR-003: 세무 시뮬레이션 (`/tax`)

취득세, 양도소득세, 종합부동산세를 물건 정보 및 보유 현황에 따라 자동 계산

| 항목 | 상세 |
|------|------|
| 취득세 | 주택/비주택, 다주택 중과세율 |
| 양도소득세 | 보유기간, 장기보유특별공제 |
| 종합부동산세 | 공시가격, 공제액 |
| 엔진 | `tax-calculator.ts` (335줄) — 세율은 한국 세법 기반, 검증 완료 |

**관련 API**: `POST /api/analyze-unified`

---

#### FR-004: 시세전망 (`/prediction`) — v2.4.0

국토교통부 실거래가 + AI → 낙관/중립/비관 3시나리오 시세전망 (1년/5년/10년)

**예측 엔진 (`prediction-engine.ts`, 902줄)**

| 모델 | 설명 |
|------|------|
| 선형회귀 | R² 기반 추세 외삽 |
| 평균회귀 | 과거 평균으로 수렴 |
| 모멘텀 | 단기 3개월 추세 가속 |
| ARIMA(1,1,1) | 차분 + AR + MA, 최소 12개월 시계열 필요 |
| ETS(A,A,A) | Holt-Winters 3중 평활, 계절성(12개월) 반영 |

**앙상블**: R² 기반 동적 가중치 (최소 5%). 데이터 건수 기반 자동 폴백(24건+ → 5모델, 12~23건 → 3~5모델, 3~11건 → 2~3모델)

**외부 데이터**:
- MOLIT 36개월 실거래가 (배치 6건씩 병렬 수집)
- 한국은행 ECOS API 기준금리 (24시간 캐시, 폴백 2.75%)
- 입주물량 (정적 추정, 공공API 연동 예정)

**추가 기능**:
- 월별 12개월 세분화 예측 (신뢰도 감쇠 적용)
- 시장 사이클 탐지 (상승/하락/횡보/회복)
- Rolling Window 백테스팅 (MAPE, RMSE, 정확도 공개)
- 지역 비교 (최대 3개 지역 병렬 조회)
- 뉴스·정책 수집기에서 최근 30일 정책 컨텍스트 자동 주입

**UI**: 탭 기반 5탭 (대시보드/차트/비교/백테스트/이상탐지), 7개 신규 컴포넌트 (`PredictionTabs`, `Dashboard`, `MacroIndicators`, `MonthlyForecast`, `MarketCycle`, `RegionCompare`, `BacktestView`)

**관련 API**: `POST /api/predict-value`, `POST /api/predict-value/compare`, `GET /api/real-price`

---

#### FR-005: 전세 보호 서비스 (`/jeonse/*`)

전세 계약의 보증금 반환 위험도 분석 및 보호 조치 안내

| 하위 페이지 | 기능 |
|------------|------|
| `/jeonse` | 절차 안내 |
| `/jeonse/analysis` | 전세 안전 분석 (전세가율, 보증금 반환 리스크) |
| `/jeonse/transfer` | 전입신고 안내 |
| `/jeonse/fixed-date` | 확정일자 안내 |
| `/jeonse/jeonse-right` | 전세권설정등기 안내 |
| `/jeonse/lease-registration` | 임차권등기명령 안내 |
| `/jeonse/lease-report` | 주택임대차 신고 안내 |

전세 분석 결과에 보증보험 가입 가능성 카드(`GuaranteeInsuranceCard`) 통합 — HUG/HF/SGI 3개 기관 자동 판정 및 예상 보증료 산출

---

#### FR-006: AI 어시스턴트 (`/assistant`)

부동산 법률, 세금, 시세 관련 실시간 AI 챗봇

- OpenAI GPT-4.1-mini + 부동산 도메인 전문 프롬프트 (`prompts.ts`)
- 대법원 판례 자동 검색 연동
- 최근 7일 뉴스/정책 컨텍스트 자동 주입 (출처·날짜 포함 안내)

**관련 API**: `POST /api/chat`, `GET /api/scholar/search`

---

#### FR-007: 관리자 대시보드 (`/admin`)

ADMIN 역할 전용

| 기능 | 상세 |
|------|------|
| 사용자 관리 | 조회/역할변경/비활성화 |
| 분석 현황 | 일별/월별 분석 통계 |
| 공지사항 관리 | CRUD |
| OAuth 설정 | Google/카카오/네이버 키 관리 (AES-256-GCM 암호화) |
| 학습 데이터 | AI 학습 데이터 승인/관리 |
| 도메인 용어 | 부동산 전문 용어 사전 관리 |
| 감사 로그 | 시스템 활동 내역 조회 |
| 보증보험 규칙 | HUG/HF/SGI 가입 조건 버전 관리 및 롤백 |
| 뉴스·정책 관리 | 수집 현황, 정책 변경 알림, 수동 수집 트리거 |

---

#### FR-008: 인증 및 계정 관리

NextAuth v5 기반 소셜 로그인 (Google, 네이버 — 카카오 설정 중) + 5단계 역할 기반 접근 제어

| 역할 | 일일 분석 한도 |
|------|:------:|
| GUEST | 2회 |
| PERSONAL | 5회 |
| BUSINESS | 50회 |
| REALESTATE | 100회 |
| ADMIN | 무제한 |

**관련 API**: `/api/auth/[...nextauth]`, `/api/user/profile`, `/api/user/usage`, `/api/user/setup-role`

---

#### FR-009: 감사 로그 (Audit Trail)

모든 주요 사용자 활동 및 관리자 작업 자동 기록. 로그 항목: 액션 유형, IP, User-Agent, 상세 JSON, PII 마스킹 처리

---

#### FR-010: 구독 및 결제

| 플랜 | 월 요금 | 주요 제공 범위 |
|------|:------:|--------------|
| FREE | 0원 | 권리분석 일 5회, 기본 대시보드, AI 어시스턴트(제한) |
| PRO | 50,000원 | 모든 분석 기능, 일 50회, 계약서 AI 검토, PDF 리포트, AI 무제한 |
| BUSINESS | 100,000원 | PRO + 일 100회, 포트폴리오 관리, 우선 지원 |

**관련 API**: `GET/POST /api/subscription`, `POST /api/subscription/cancel`

---

#### 추가 구현 완료 기능

| 기능 | 경로/모듈 | 설명 |
|------|-----------|------|
| 전세사기 위험 진단 | `fraud-risk-model.ts` (488줄) | 15피처 SHAP 유사 그래디언트 부스팅, `/api/fraud-risk` |
| V-Score 통합 평가 | `v-score.ts` (427줄) | 5소스 + 6상호작용 통합 점수 |
| 이상 탐지 | `anomaly-detector.ts` | Holt/CUSUM/Bollinger Band |
| 가중치 튜닝 | `adaptive-weight-tuner.ts` | Thompson Sampling 기반 자동 캘리브레이션 |
| 통합 분석 | `/api/analyze-unified` | 다계층 종합 분석 |
| 사기사례 DB | `/api/fraud-cases` | 지도 기반 히트맵, Leaflet + leaflet.heat |
| 동적 체크리스트 | `checklist-generator.ts` (467줄) | risk factors → 서류/행동 매핑, 13개 카테고리 |
| 분석보고서 | `/report` | 통합 리스크 PDF 내보내기, 7개 섹션 |
| 시세지도 | `/price-map` | MOLIT 실거래가 + 카카오 지오코딩 |
| 신용 조회 | `credit-api.ts` | KCB/NICE Strategy 패턴, Mock 우선 |
| 등기 모니터링 | Cron `/api/cron/registry-monitor` | 매일 09:00, 배치 50건, SHA-256 해시 비교 |
| 보증보험 안내 | `guarantee-insurance.ts` | HUG/HF/SGI 규칙 엔진 + 보증료 계산 + DB 규칙 관리 |
| 상호검증 | `/verification` | 임대인/임차인 교차 검증, 공유 리포트 |
| 알림 인프라 | `notification-sender.ts` (217줄) | 카카오 알림톡 (Bizm API), Mock 모드 폴백 |
| 뉴스·정책 수집 | `news-collector.ts` + Cron 매일 06:00 | RSS 5개 피드, 키워드 자동 분류, 90일 보관 정책 |
| 대시보드 | `/dashboard` | 보유 자산 포트폴리오 |
| 학술 검색 | `/api/scholar/search` | 법률 판례/논문 검색 |
| 문서 생성 | `/api/generate-document` | 전세권설정등기 신청서 등 |
| API 데이터 허브 | `/api-hub` | 공공 API 통합 대시보드 |
| 임대인 추적 | `landlord-profiler.ts` | 동일 임대인 소유 물건 자동 수집, 안전 등급(A~F) 산정 |

---

### 진행 중 (설계 완료, 구현 진행 중)

#### 사업성 분석 보고서 (`/feasibility`) — SCR 업그레이드 (v4.2.0, ~77%)

SCR 서울신용평가 사업성평가보고서 동일 구조(5장+부록, 표 64개, 그림 23개, 60~80p) 자동 생성

| Phase | 내용 | 완성도 |
|-------|------|:------:|
| Phase 1 | 데이터 수집 인프라 (KOSIS/DART/REPS/MOIS API + 정적DB + 타입) | 90% |
| Phase 2 | 파싱 엔진 고도화 (45개+ 항목, 정규식+NER) | 80% |
| Phase 3 | 계산 엔진 구축 (사업수지/48개월 자금수지/시나리오 4단계/BEP 3종/DSCR/민감도) | 85% |
| Phase 4 | 보고서 렌더링 이중화 (React 컴포넌트 미리보기 + 서버사이드 HTML → PDF) | 70% |
| Phase 5 | UI/UX 고도화 (3단계 위저드, SSE 스트리밍, PDF 다운로드) | 60% |

**지원 사업 유형**: 아파트단지, 주상복합, 오피스텔, 지식산업센터, 재건축·재개발, 생활형숙박시설  
**신규 외부 API**: KOSIS(통계청), DART(전자공시), REPS(부동산원), MOIS(행안부)  
**핵심 관련 API**: `POST /api/feasibility/scr-parse`, `POST /api/feasibility/scr-calculate`, `POST /api/feasibility/scr-report`

---

#### 사업성 분석 보고서 — 다중 문서 주장-검증 엔진 (설계 완료)

투자계획서, 재원조달계획 등 복수 파일(PDF/DOCX/XLSX/HWP) → 공공데이터 교차 검증 → 합리성 3단계 판정(적정/낙관적/비현실적) → SCR 스타일 PDF 보고서

| 모듈 | 역할 |
|------|------|
| `document-parser.ts` | 파일별 파서 (정규식 패턴 매칭) |
| `context-merger.ts` | 다중 문서 컨텍스트 병합 + 불일치 감지 (2% 이상 괴리 시 충돌 등록) |
| `feasibility-validator.ts` | 주장-검증 엔진 (MOLIT/KICT/REB 교차 검증) |
| `audit-engine.ts` | 합리성 판정 + V-Score 응용 사업성 점수 산출 (A~F 5등급) |
| `benchmark-db.ts` | 업계 벤치마크 DB (KICT 건설공사비, PF금리, Cap Rate, 분양률) |

**관련 API**: `POST /api/feasibility/parse`, `POST /api/feasibility/verify`, `POST /api/feasibility/report`

---

### 계획 중 (설계 완료, 구현 대기)

#### 경쟁우위 강화 5단계 (competitive-advantage, v4.8.0)

| Phase | 내용 | 주요 구현 항목 |
|-------|------|--------------|
| Phase 1 | PWA 전환 | serwist 서비스 워커, manifest, Web Push (VAPID), 오프라인 최근 분석 3건 캐시 |
| Phase 2 | 보증보험 + 임대인 추적 | `/api/guarantee/check` 독립 엔드포인트, `/api/landlord/track` |
| Phase 3 | 대출 가심사 + 건당 과금 | `loan-simulator.ts` (5대 은행 조건 DB), 의사결정 통합 리포트, 포트원 결제 (4,900원/건) |
| Phase 4 | 임대인 프로파일 | `LandlordProfile` DB, 사용자 제보(`UserReport`), 안전 등급 6개 항목 100점 산정 |
| Phase 5 | AI+전문가 하이브리드 | `ExpertRequest` 워크플로우, AI 정확도 배지, adaptive-weight-tuner 연동 |

**신규 Prisma 모델**: `LandlordProfile`, `UserReport`, `LoanCondition`, `SinglePurchase`, `ExpertRequest`  
**FREE 티어 변경**: 전세 안전도·등기부 기본 분석·보증보험 확인은 무제한 허용 예정

#### dgon 등기연계 (기획 완료, 구현 대기)

VESTRA 분석 → dgon 등기 실행 PG사 패턴 통합

**연계 흐름**: VESTRA 토큰 생성 → dgon 리다이렉트 → 토큰 검증 → 폼 프리필 → 등기 진행 → 콜백

**등기 유형 추천 로직**:

| 위험도 | 추천 |
|--------|------|
| ≥ 85, 권리관계 단순 | 셀프등기 |
| 60~84, 일반 거래 | 전자등기 |
| < 60, 복잡한 권리관계 | 프리미엄등기 |

**필요 API**: `POST /api/dgon/create-token`, `POST /api/dgon/verify-token`

---

## Architecture [coverage: high -- 5 sources]

### 시스템 구성

```
클라이언트 (React 19 + Next.js 16 App Router + Tailwind v4)
    │ HTTPS
Next.js 서버 (Vercel Serverless)
    ├── API Routes (/api/*)
    ├── SSR/RSC 페이지
    └── Middleware (Auth + Rate Limit)
         │
    비즈니스 로직 엔진 (lib/)
    ├── registry-parser     validation-engine
    ├── risk-scoring         tax-calculator
    ├── contract-analyzer    prediction-engine
    ├── fraud-risk-model     v-score
    ├── anomaly-detector     adaptive-weight-tuner
    └── guarantee-insurance  news-collector
         │
    ┌────────────┐  ┌──────────────┐  ┌───────────────────┐
    │ Neon       │  │ OpenAI API   │  │ 공공데이터 API      │
    │ PostgreSQL │  │ GPT-4.1-mini │  │ MOLIT/건축물대장    │
    │ + Prisma   │  │              │  │ 대법원/한국은행     │
    └────────────┘  └──────────────┘  └───────────────────┘
```

### DB 모델 (21개 테이블)

| 분류 | 테이블 |
|------|--------|
| 인증 (4개) | Account, Session, VerificationToken, User |
| 핵심 비즈니스 (5개) | Analysis, Asset, Subscription, Payment, FraudCase |
| 사용량 관리 (2개) | RateLimit, DailyUsage |
| 알림/모니터링 (4개) | NotificationSetting, MonitoredProperty, MonitoringAlert, Announcement |
| 시스템 관리 (4개) | AuditLog, SystemSetting, TrainingData, DomainVocabulary |
| 공유/검증 (2개) | VerificationRequest, SharedReport |

추가 예정 (설계 완료): `GuaranteeRule`, `NewsArticle`, `NewsUsageLog`, `FeasibilityReport`, `FeasibilityFile`, `BenchmarkCache`, `LandlordProfile`, `UserReport`, `LoanCondition`, `SinglePurchase`, `ExpertRequest`

### 외부 API 연동 현황

| API | 제공기관 | 용도 | 환경변수 |
|-----|---------|------|---------|
| OpenAI GPT-4.1-mini | OpenAI | 자연어 분석, 계약서 해석, AI 채팅 | `OPENAI_API_KEY` |
| MOLIT 실거래가 | 국토교통부 | 아파트/전세 실거래 데이터 | `MOLIT_API_KEY` |
| 건축물대장 | 국토교통부 | 건물 정보 조회 | 공공데이터포털 키 |
| 대법원 판례 | 법제처 | 부동산 판례 검색 | `LAW_API_KEY` |
| 한국은행 ECOS | 한국은행 | 기준금리 (24시간 캐시) | `BOK_API_KEY` |
| Kakao Maps SDK | 카카오 | 지도 시각화, 지오코딩 | `NEXT_PUBLIC_KAKAO_MAP_KEY` |
| KOSIS | 통계청 | 인구/세대/사업체 (SCR) | `KOSIS_API_KEY` |
| DART | 전자공시 | 재무제표/주주현황 (SCR) | `DART_API_KEY` |
| REPS | 부동산원 | 매매·전세가격지수 (SCR) | `REPS_API_KEY` |
| MOIS | 행안부 | 연령대별 인구 (SCR) | `MOIS_API_KEY` |

### Cron 스케줄

| Cron 경로 | 스케줄 | 기능 |
|----------|--------|------|
| `/api/cron/registry-monitor` | 매일 09:00 | 등기 변동 감시 (배치 50건) |
| `/api/cron/fraud-import` | 매주 월 03:00 | 전세사기 사례 데이터 갱신 |
| `/api/cron/news-collector` | 매일 06:00 | 뉴스/정책 RSS 수집 |
| `/api/cron/guarantee-monitor` | 매주 월 09:00 | 보증보험 공식 사이트 변경 감지 |

---

## Key Decisions [coverage: high -- 6 sources]

### AI/ML 파라미터 검증 현황

자체 설계 파라미터(가중치, 감점 수치, 증폭계수)는 **도메인 전문가 휴리스틱 초기값**이며 실증 데이터 캘리브레이션이 미완료다. 향후 검증 로드맵:

| Phase | 기간 | 내용 |
|-------|------|------|
| 1 | 1~2개월 | HUG 보증사고, 법원 경매, 전세사기 판례 데이터 수집 |
| 2 | 2~3개월 | 후향적 검증 (민감도 80%+, 오경보율 20% 이하 목표) |
| 3 | 1~2개월 | Thompson Sampling 자동 캘리브레이션 |
| 4 | 지속 | 실서비스 A/B 테스트 + 분기별 리뷰 |

**검증 완료 항목**: 세금 세율/공제액(한국 세법 기반), ARIMA/ETS/Holt 등 통계 방법론  
**미검증 항목**: 감점 수치(30/25/20점 등), 증폭계수(1.3~1.7), V-Score 가중치, 15피처 가중치, 시계열 패턴 조건

### 렌더링 이중화 (사업성 SCR 보고서)

브라우저 미리보기는 React 컴포넌트(`ScrChapter*.tsx`), PDF 출력은 서버사이드 HTML string(`scr-report-html.ts`)으로 이중화. 동일 `ScrReportData` 모델을 입력으로 사용하며, `scr-shared.tsx`에서 공통 UI 공유.

### 시세전망 하위 호환 정책

`PredictionResult` 인터페이스의 기존 필드는 삭제 없이 신규 필드만 추가. v2.3.0 → v2.4.0 업그레이드 시 API 응답 형식 100% 하위 호환 유지.

### 보증보험 규칙 관리

코드 내 기본 상수(`DEFAULT_GUARANTEE_RULES`)를 fallback으로 유지하면서, 관리자가 DB를 통해 규칙을 동적으로 갱신 가능. 버전 이력 자동 기록 → 롤백 지원.

### 뉴스·정책 컨텍스트 주입

수집된 뉴스/정책 데이터를 AI 어시스턴트(채팅), 계약서 분석, 시세전망 API에 자동 주입. 활용 로그(`NewsUsageLog`)를 기록하고 90일 초과 데이터는 자동 삭제.

### RFP 고도화 Gap 분석 결과 (v0.8.0)

55개 요구사항 전체 구현 완료(100% Match Rate, PASS). 주요 구현: 동적 체크리스트, 히트맵, 등기변동 모니터링, 통합 리포트 PDF, 알림 인프라, 상호검증 워크플로우, 전세사기 피해사례 DB, 신용정보 연동 Strategy 패턴.

---

## Gotchas [coverage: high -- 5 sources]

- **대법원 판례 API** (`LAW_API_KEY`) 미설정 시 빈 배열 반환 — 서비스 중단 없음
- **전세가율**은 MOLIT 실거래가 기반이므로 데이터 없는 지역은 `estimatedPriceSource: "none"`
- **등기 모니터링 Cron**은 실제 등기부 API 미연동(TODO 표시). 현재는 시뮬레이션 구조
- **카카오 로그인**은 카카오 개발자 콘솔 설정 미완료로 비활성화 상태
- **테스트 코드** Vitest 설정은 있으나, 핵심 엔진 단위 테스트 파일 별도 작성 필요 (시세전망 엔진 36건 테스트는 완료)
- **SCR 계산 엔진 파라미터**: 사업수지 계산에서 감점 수치(분양률 시나리오 분류 등)는 전문가 휴리스틱 초기값, SCR 원본 수치와 0% 오차 목표이나 실증 검증 필요
- **입주물량 데이터** (`supply-api.ts`)는 현재 정적 하드코딩. 공공데이터 API 실시간 연동 예정
- **앙상블 가중치** 설계서(R² + MAPE 역수 혼합)와 구현(R² 기반)이 불일치. 설계서 업데이트 또는 구현 추가 예정
- **KCB/NICE 신용정보 Provider**는 스켈레톤 구현(throw Error). API 키 없으면 MockCreditProvider 동작
- **이메일 발송**은 Mock 모드만 구현. 실제 이메일 발송 미연동
- **Rate Limit DB 오류** 발생 시 요청 허용 정책 (가용성 우선 설계)
- **뉴스 RSS URL** 구현 시 실제 접속 가능 여부 검증 필요. 접속 불가 시 graceful skip
- **대출 가심사/의사결정 리포트/임대인 프로파일/상호검증/AI 신뢰도** 페이지는 사용자 가이드(v4.5.1) 기준으로 존재하나 구현 완성도 검증 필요 (`/loan-check`, `/decision-report`, `/landlord-profile`, `/verification`, `/ai-trust`)

---

## Sources

- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/docs/01-SRS.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/feasibility-scr-upgrade.design.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/guarantee-insurance-eligibility.design.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/news-policy-collector.design.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/prediction-enhancement.design.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/feasibility-report.design.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/features/competitive-advantage.design.md`
- `/Users/watchers/Desktop/vestra/docs/03-analysis/vestra-rfp-enhancement-final.analysis.md`
- `/Users/watchers/Desktop/vestra/docs/04-report/features/prediction-enhancement.report.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA_사용가이드_슬라이드.md`
- `/Users/watchers/Desktop/vestra/docs/01-plan/features/competitive-advantage.plan.md`
- `/Users/watchers/Desktop/vestra/docs/01-plan/features/data-integration.plan.md`
- `/Users/watchers/Desktop/vestra/docs/02-design/registry-monitoring-hybrid.md`
