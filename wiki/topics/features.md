# 주요 기능 (Features)

[coverage: high -- 4 sources: docs/01-SRS.md, docs/TECHNICAL-STATUS-REPORT.md, docs/VESTRA-플랫폼-완료보고서.md, docs/01-plan/features/vestra-dgon-integration.plan.md]

---

## Purpose

VESTRA의 기능 상세. 핵심 분석 6종, 전세 보호 7종, 부가 기능 다수로 구성된다. 모든 주요 기능은 완료 상태다.

---

## Features (기능 목록)

### FR-001: 권리분석 (/rights)

등기부등본(PDF/텍스트) 업로드 → 자동 파싱 → 권리 상태 분석 → 위험도 산정

| 컴포넌트 | 역할 |
|---------|------|
| `registry-parser.ts` | 등기부등본 파싱 (598줄) |
| `validation-engine.ts` | 4단계 유효성 검증 (1,232줄) |
| `risk-scoring.ts` | 12항목 위험도 스코어링 (937줄) |
| `confidence-engine.ts` | 신뢰도 전파 (263줄) |
| `ScoreGauge`, `KpiCard` | 결과 시각화 |

**관련 API**: `/api/analyze-rights`, `/api/parse-registry`

---

### FR-002: 계약서 분석 (/contract)

매매/임대차 계약서 업로드 → AI 특약사항/불리한 조항/누락 항목 분석 → 법적 검토 의견

| 컴포넌트 | 역할 |
|---------|------|
| `contract-analyzer.ts` | AI 기반 조항 분석 (597줄) |
| `court-api.ts` | 대법원 판례 연동 |
| OpenAI GPT-4.1-mini | 법률 조언 생성 |

**관련 API**: `/api/analyze-contract`

---

### FR-003: 세무 시뮬레이션 (/tax)

취득세, 양도소득세, 종합부동산세를 물건 정보 및 보유 현황에 따라 자동 계산

| 항목 | 상세 |
|------|------|
| 취득세 | 주택/비주택, 다주택 중과세율 |
| 양도소득세 | 보유기간, 장기보유특별공제 |
| 종합부동산세 | 공시가격, 공제액 |
| 엔진 | `tax-calculator.ts` (334줄) |

---

### FR-004: 시세전망 (/prediction)

국토교통부 실거래가 + AI → 낙관/중립/비관 3시나리오 시세전망 (1년/5년/10년)

- **예측 엔진**: 5모델 앙상블 (Linear + MeanReversion + Momentum + ARIMA + ETS)
- **외부 데이터**: MOLIT 36개월, 한국은행 기준금리, 입주물량 API
- **시각화**: Recharts 차트, 카카오/리플릿 지도
- **백테스팅**: MAPE, RMSE, 12개월 예측 정확도

**관련 API**: `/api/predict-value`, `/api/real-price`

---

### FR-005: 전세 보호 서비스 (/jeonse/*)

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

---

### FR-006: AI 어시스턴트 (/assistant)

부동산 법률, 세금, 시세 관련 실시간 AI 챗봇

- OpenAI GPT-4.1-mini + 부동산 도메인 전문 프롬프트 (`prompts.ts`)
- 대법원 판례 자동 검색 연동
- **관련 API**: `/api/chat`, `/api/scholar/search`

---

### FR-007: 관리자 대시보드 (/admin)

ADMIN 역할 전용. 회원 관리, 분석 현황, 시스템 설정, ML 학습관리, 공지사항, 감사 로그

---

### 추가 주요 기능

| 기능 | 경로 | 설명 |
|------|------|------|
| 전세사기 위험 진단 | (통합) | 15피처 그래디언트 부스팅, `/api/fraud-risk` |
| 사기사례 DB | (관리자) | 지도 기반 사기사례 히트맵 |
| 대시보드 | /dashboard | 보유 자산 포트폴리오 |
| 상호검증 | /verification | 임대인/임차인 교차 검증 |
| 분석보고서 | /report | PDF 내보내기 지원 |
| 시세지도 | /price-map | MOLIT 실거래가 + 카카오 지오코딩 |
| 신용 조회 | (통합) | `/api/credit-check` 임대인 신용 |
| 등기 모니터링 | (Cron) | 매일 09:00 감시 등기 변동 확인 |
| 보증보험 안내 | (통합) | `guarantee-insurance.ts` |
| 대출 가심사 | (통합) | `loan-simulator.ts`, `feasibility/` |
| 의사결정 리포트 | (통합) | `decision-report.ts` |
| 임대인 프로파일 | (통합) | `landlord-profiler.ts` |
| 뉴스/정책 수집 | (Cron) | `news-collector.ts` 매주 월 03:00 |

---

## External Integrations

| API | 용도 | 모듈 |
|-----|------|------|
| OpenAI (gpt-4.1-mini) | 자연어 분석, 계약서 해석, AI 채팅 | `openai.ts` |
| MOLIT (국토교통부) | 실거래가, 공시가격 | `molit-api.ts` |
| 건축물대장 API | 건물 정보 조회 | `building-api.ts` |
| 대법원 판례 API | 부동산 판례 검색 | `court-api.ts` |
| 한국은행 (BOK ECOS) | 기준금리 조회 | `bok-api.ts` |
| 서울시 공공데이터 | 지역 데이터 | `seoul-data-api.ts` |
| Kakao Maps SDK | 지도, 지오코딩 | 클라이언트 SDK |
| 보증보험 API | 보증보험 가입 안내 | `guarantee-insurance.ts` |
| 신용 조회 | 임대인 신용 등급 | `credit-api.ts` |

---

## dgon 등기연계 (기획 완료, 구현 대기)

VESTRA 분석 → dgon 등기 실행을 끊김 없이 연결하는 PG사 패턴 통합.

**연계 흐름**: VESTRA 토큰 생성 → dgon 리다이렉트 → 토큰 검증 → 폼 프리필 → 등기 진행 → 콜백

**등기 유형 추천 로직**:
| 위험도 | 추천 |
|--------|------|
| ≥ 85, 권리관계 단순 | 셀프등기 |
| 60~84, 일반 거래 | 전자등기 |
| < 60, 복잡한 권리관계 | 프리미엄등기 |

**필요 API**: `/api/dgon/create-token`, `/api/dgon/verify-token`  
**기획서**: `docs/01-plan/features/vestra-dgon-integration.plan.md`

---

## Gotchas

- 대법원 판례 API (`LAW_API_KEY`) 미설정 시 빈 배열 반환 (서비스 중단 없음)
- 전세가율은 MOLIT 실거래가 데이터 기반이므로 데이터 없는 지역은 `estimatedPriceSource: "none"`
- 등기 모니터링 Cron은 Vercel Cron Jobs로 구현 (`/api/cron/*`)

---

## Sources

- `/Users/watchers/Desktop/vestra/docs/01-SRS.md`
- `/Users/watchers/Desktop/vestra/docs/TECHNICAL-STATUS-REPORT.md`
- `/Users/watchers/Desktop/vestra/docs/VESTRA-플랫폼-완료보고서.md`
- `/Users/watchers/Desktop/vestra/docs/01-plan/features/vestra-dgon-integration.plan.md`
