# 시세전망 강화 (Prediction Enhancement) 기획서

> **Summary**: Vestra 시세전망 기능의 예측 정확도, 데이터 소스, UI/시각화를 종합적으로 강화
>
> **Project**: Vestra
> **Version**: 2.3.1
> **Author**: Watchers
> **Date**: 2026-03-18
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

현재 Vestra 시세전망은 MOLIT 12개월 실거래 데이터 + 3개 통계 모델 앙상블로 운영 중이다. 이를 다음 세 축으로 강화한다:

1. **예측 정확도 향상** — 고급 시계열 모델 도입 및 데이터 기간 확대
2. **데이터 소스 확대** — 거시경제 지표, 입주물량, 인구이동 등 외부 데이터 연동
3. **UI/시각화 개선** — 지역 비교, 시장 사이클, 대시보드 등 사용자 경험 고도화

### 1.2 Background

- 현재 예측 엔진: 선형회귀 + 평균회귀 + 모멘텀 (3모델 앙상블)
- 데이터: MOLIT API 12개월 실거래가만 사용
- 신뢰도 상한: 90점 (데이터 제약으로 실질적으로 60~75점 대)
- 시장 환경 변수(금리, 공급, 인구) 반영이 하드코딩 상수에 의존
- 경쟁 서비스 대비 차별화 필요 (특허 기술 고도화)

### 1.3 Related Documents

- 알고리즘 문서: `docs/ALGORITHM.md`
- 특허 기술 사양: `docs/VESTRA_Patent_Technical_Specification.pdf`
- 기술 리포트: `docs/TECHNICAL-REPORT-v2.3.1.md`
- SRS: `docs/01-SRS.md`
- API Spec: `docs/04-API-Spec.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] **Phase A**: 예측 엔진 고도화 (ARIMA/ETS 모델, 데이터 기간 36개월 확대)
- [ ] **Phase B**: 외부 데이터 소스 연동 (한국은행 금리, 입주물량, 인구이동)
- [ ] **Phase C**: UI/시각화 대폭 개선 (지역 비교, 시장 사이클, 대시보드)
- [ ] **Phase D**: 백테스팅 시스템 (과거 예측 정확도 검증)

### 2.2 Out of Scope

- ML 학습 서버 구축 (서버리스 내에서 처리)
- 실시간 스트리밍 데이터 (배치 조회 유지)
- 모바일 앱 전용 UI
- 유료 데이터 API 구독 (무료 공공데이터만 사용)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 상태 |
|----|----------|----------|------|
| FR-01 | ARIMA/ETS 모델을 앙상블에 추가하여 5개 모델 체제 구축 | High | Pending |
| FR-02 | MOLIT 데이터 조회 기간을 12개월 → 36개월로 확대 | High | Pending |
| FR-03 | 한국은행 기준금리 API 실시간 연동 (하드코딩 제거) | High | Pending |
| FR-04 | 입주물량 데이터 연동 (공급 리스크 반영) | Medium | Pending |
| FR-05 | 인구이동 데이터 연동 (수요 예측 보조) | Medium | Pending |
| FR-06 | 지역 간 시세 비교 차트 (최대 3개 지역) | High | Pending |
| FR-07 | 시장 사이클 탐지 및 시각화 (상승/하락/횡보) | Medium | Pending |
| FR-08 | 예측 대시보드 (핵심 지표 한눈에) | High | Pending |
| FR-09 | 백테스팅 — 과거 12개월 예측 정확도 검증 표시 | Low | Pending |
| FR-10 | 월별 세분화 예측 (현재 1/5/10년 → 월별 추이 추가) | Medium | Pending |

### 3.2 Non-Functional Requirements

| 카테고리 | 기준 | 측정 방법 |
|----------|------|-----------|
| 성능 | API 응답 시간 < 8초 (현재 ~5초, 모델 추가 고려) | Vercel 로그 |
| 성능 | 36개월 데이터 조회 병렬화로 지연 최소화 | 응답 시간 측정 |
| 정확도 | 백테스팅 MAPE < 15% (1년 예측 기준) | 자체 검증 |
| 안정성 | 외부 API 실패 시 기존 엔진으로 graceful fallback | 에러율 모니터링 |
| 호환성 | 기존 API 응답 형식 하위 호환 유지 | 기존 테스트 통과 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 5개 모델 앙상블 작동 및 기존 테스트 통과
- [ ] 36개월 데이터 기반 예측 생성 확인
- [ ] 최소 2개 외부 데이터 소스 실시간 연동
- [ ] 지역 비교, 대시보드 UI 완성
- [ ] 백테스팅 결과 MAPE 15% 이하 달성
- [ ] 기존 API 하위 호환 유지

### 4.2 Quality Criteria

- [ ] 기존 vitest 테스트 전체 통과
- [ ] 새 모델 단위 테스트 추가
- [ ] 빌드 성공 (next build)
- [ ] Vercel 배포 정상

---

## 5. Implementation Phases

### Phase A: 예측 엔진 고도화 (핵심)

| 단계 | 작업 | 영향 파일 |
|------|------|-----------|
| A-1 | MOLIT API 조회 기간 36개월 확대 | `lib/molit-api.ts` |
| A-2 | ARIMA 모델 구현 (자기회귀 통합 이동평균) | `lib/prediction-engine.ts` |
| A-3 | ETS 모델 구현 (지수평활법 계열) | `lib/prediction-engine.ts` |
| A-4 | 앙상블 가중치 재설계 (5모델) | `lib/prediction-engine.ts` |
| A-5 | 월별 세분화 예측 추가 | `lib/prediction-engine.ts`, `app/api/predict-value/route.ts` |
| A-6 | 신뢰도 산출 공식 업데이트 | `lib/prediction-engine.ts` |

### Phase B: 외부 데이터 소스 연동

| 단계 | 작업 | 영향 파일 |
|------|------|-----------|
| B-1 | 한국은행 기준금리 API 연동 모듈 | `lib/bok-api.ts` (신규) |
| B-2 | 입주물량 데이터 연동 모듈 | `lib/supply-api.ts` (신규) |
| B-3 | 인구이동 데이터 연동 모듈 | `lib/population-api.ts` (신규) |
| B-4 | 거시 변수를 예측 엔진에 통합 | `lib/prediction-engine.ts` |
| B-5 | ECONOMIC_DEFAULTS 하드코딩 → 실시간 대체 | `lib/prediction-engine.ts` |

### Phase C: UI/시각화 개선

| 단계 | 작업 | 영향 파일 |
|------|------|-----------|
| C-1 | 예측 대시보드 컴포넌트 | `components/prediction/Dashboard.tsx` (신규) |
| C-2 | 지역 비교 차트 (최대 3개 지역) | `components/prediction/RegionCompare.tsx` (신규) |
| C-3 | 시장 사이클 탐지 및 표시 | `components/prediction/MarketCycle.tsx` (신규) |
| C-4 | 월별 추이 차트 추가 | `app/(app)/prediction/page.tsx` |
| C-5 | 기존 페이지 리팩토링 (1600줄 → 컴포넌트 분리) | `app/(app)/prediction/page.tsx` |

### Phase D: 백테스팅

| 단계 | 작업 | 영향 파일 |
|------|------|-----------|
| D-1 | 백테스팅 엔진 구현 | `lib/backtesting.ts` (신규) |
| D-2 | 백테스팅 결과 시각화 | `components/prediction/BacktestView.tsx` (신규) |
| D-3 | 예측 정확도 지표 (MAPE, RMSE) 표시 | `app/(app)/prediction/page.tsx` |

---

## 6. Risks and Mitigation

| 리스크 | 영향 | 가능성 | 대응 방안 |
|--------|------|--------|-----------|
| MOLIT 36개월 조회 시 API 응답 지연 | High | High | 병렬 요청 + 캐싱 강화 (30분 → 2시간) |
| 외부 API(한국은행 등) 장애 시 예측 불가 | Medium | Medium | fallback으로 ECONOMIC_DEFAULTS 유지 |
| ARIMA 모델 계산 복잡도로 응답 시간 초과 | High | Medium | 서버리스 타임아웃 내 최적화, 필요시 사전계산 |
| 데이터 부족 지역에서 5모델 앙상블 불안정 | Medium | High | 최소 데이터 기준 미달 시 3모델로 자동 폴백 |
| 기존 API 응답 형식 변경으로 호환성 깨짐 | High | Low | 기존 필드 유지 + 새 필드 추가 방식 |

---

## 7. Architecture Considerations

### 7.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 7.2 Key Architectural Decisions

| 결정 사항 | 선택지 | 선택 | 근거 |
|-----------|--------|------|------|
| ARIMA 구현 | 외부 라이브러리 / 자체 구현 | 자체 구현 | 의존성 최소화, Vercel 서버리스 호환 |
| 외부 API 캐싱 | Redis / 메모리 캐시 | 메모리 캐시 | 현재 인프라 유지, Vercel 호환 |
| 데이터 기간 | 24개월 / 36개월 | 36개월 | 계절성 파악에 최소 24개월 필요 |
| 페이지 리팩토링 | 점진적 분리 / 전면 재작성 | 점진적 분리 | 기존 기능 유지하며 개선 |

### 7.3 기존 구조 유지

```
lib/
├── prediction-engine.ts    # 기존 + ARIMA/ETS 추가
├── molit-api.ts            # 36개월 확대
├── price-estimation.ts     # 유지
├── anomaly-detector.ts     # 유지
├── bok-api.ts              # 신규: 한국은행 API
├── supply-api.ts           # 신규: 입주물량 API
├── population-api.ts       # 신규: 인구이동 API
└── backtesting.ts          # 신규: 백테스팅 엔진

components/prediction/
├── KakaoMap.tsx            # 유지
├── LeafletMap.tsx          # 유지
├── AnomalyDetectionView.tsx # 유지
├── RiskHeatMap.tsx         # 유지
├── Dashboard.tsx           # 신규: 예측 대시보드
├── RegionCompare.tsx       # 신규: 지역 비교
├── MarketCycle.tsx         # 신규: 시장 사이클
└── BacktestView.tsx        # 신규: 백테스팅 결과
```

---

## 8. Convention Prerequisites

### 8.1 기존 컨벤션 확인

- [x] `CLAUDE.md` 코딩 컨벤션 섹션 있음
- [x] ESLint 설정 있음
- [x] TypeScript 설정 있음
- [x] Tailwind CSS v4 사용

### 8.2 환경 변수 추가 필요

| Variable | Purpose | Scope | 신규 |
|----------|---------|-------|:----:|
| `OPENAI_API_KEY` | OpenAI API | Server | 기존 |
| `MOLIT_API_KEY` | 국토교통부 API | Server | 기존 |
| `BOK_API_KEY` | 한국은행 API | Server | ✅ |

---

## 9. Implementation Order (권장)

```
Phase A (예측 엔진) ─────────────────────────┐
  A-1 → A-2 → A-3 → A-4 → A-5 → A-6        │
                                              ├── Phase C (UI)
Phase B (데이터 소스) ────────────────────────┘  C-1 → C-2 → C-3 → C-4 → C-5
  B-1 → B-2 → B-3 → B-4 → B-5
                                              Phase D (백테스팅)
                                                D-1 → D-2 → D-3
```

**권장 순서**: A → B → C → D (엔진 먼저, UI는 병렬 가능)

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`prediction-enhancement.design.md`)
2. [ ] 한국은행 API 키 발급 및 환경변수 등록
3. [ ] Phase A부터 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | 초안 작성 | Watchers |
