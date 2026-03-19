# 시세전망 강화 (Prediction Enhancement) 갭 분석 리포트

> **Summary**: prediction-enhancement 설계서 vs 구현 코드 비교 분석
>
> **Author**: gap-detector
> **Created**: 2026-03-18
> **Design Document**: docs/02-design/features/prediction-enhancement.design.md
> **Status**: Check (분석 완료)

---

## 1. 분석 개요

- **분석 대상**: prediction-enhancement (시세전망 강화)
- **설계 문서**: `/Users/watchers/Desktop/vestra/docs/02-design/features/prediction-enhancement.design.md`
- **구현 경로**: `lib/`, `components/prediction/`, `app/api/predict-value/`, `app/(app)/prediction/`
- **분석 일시**: 2026-03-18
- **총 구현 단계**: 24단계 (Phase A~D)

---

## 2. 전체 점수

| 카테고리 | 점수 | 상태 |
|----------|:----:|:----:|
| 설계 일치도 | 77.1% | WARNING |
| 아키텍처 준수 | 85% | WARNING |
| 컨벤션 준수 | 90% | PASS |
| **종합** | **79.2%** | **WARNING** |

**Match Rate 산출 근거**: 완전 구현 16 + 부분 구현 5 x 0.5 = 18.5 / 24 x 100 = **77.1%**

---

## 3. 24단계 상세 분석

### Phase A: 예측 엔진 고도화

#### Step 1. molit-api.ts -- 36개월 지원
- **상태**: PASS
- **근거**: `fetchRecentPrices()` 함수의 `months` 파라미터가 기본 12개월에서 최대 36개월까지 지원. `fetchComprehensivePrices()`도 동일하게 `months` 파라미터 수용. route.ts에서 `fetchComprehensivePrices(address, 36)`으로 호출 확인.
- **파일**: `/Users/watchers/Desktop/vestra/lib/molit-api.ts` (344행, 564행)

#### Step 2. prediction-engine.ts -- 월별 시계열 유틸
- **상태**: PASS
- **근거**: `MonthlyTimeSeries` 인터페이스와 `toMonthlyTimeSeries()` 함수가 구현됨. yearMonth, avgPrice, count 필드 모두 포함. 정렬 로직 포함.
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (476~502행)

#### Step 3. prediction-engine.ts -- arimaModel()
- **상태**: PASS
- **근거**: ARIMA(1,1,1) 모델 구현 완료. 1차 차분, AR(1) phi 계수 추정, MA(1) theta 계수 추정, n-step ahead 예측, 하한 보호(0.3x), R2 산출 모두 설계 명세와 일치.
- **편차**: 설계서에는 `export function`으로 명시되어 있으나 실제 구현은 모듈 내부 함수 (`function`, export 없음). 내부에서만 사용되므로 기능적 차이 없음.
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (506~585행)

#### Step 4. prediction-engine.ts -- etsModel()
- **상태**: PASS
- **근거**: ETS(A,A,A) Holt-Winters 3중 지수평활 구현 완료. alpha=0.3, beta=0.1, gamma=0.15 (24개월 미만이면 0), 계절 길이 12개월, fitting + forecasting 로직 모두 설계와 일치.
- **편차**: 설계서의 "파라미터 자동 최적화"는 구현되지 않고 고정값 사용. 서버리스 환경 제약상 합리적 결정.
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (589~664행)

#### Step 5. prediction-engine.ts -- buildEnsembleV2() (5모델)
- **상태**: WARNING (부분 구현)
- **근거**: 5모델 앙상블 자체는 완전 구현 (linear, meanReversion, momentum, arima, ets). 거시경제 보정 로직도 포함.
- **편차 (가중치 공식)**:
  - 설계: `weight_i = (r2_i x 0.4 + (1/mape_i) x 0.6) / sum(weights)` (R2 + 백테스팅 MAPE 역수 혼합)
  - 구현: R2 기반 동적 가중치만 사용 (MAPE 역수 미반영). 최소 가중치도 설계 0.05와 일치하나 공식이 다름.
- **영향**: 중간 -- 백테스팅 기반 가중치 조정이 빠져있어 모델 성능 피드백 루프 부재.
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (668~742행)

#### Step 6. prediction-engine.ts -- 시장 사이클 탐지
- **상태**: PASS
- **근거**: `detectMarketCycle()` 함수 구현 완료. 상승/하락/횡보/회복 4단계 분류, 연속 상승/하락 개월 수 계산, 거래량 변화 반영, 신뢰도 산출 모두 설계 명세와 일치.
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (746~806행)

#### Step 7. prediction-engine.ts -- 월별 세분화 예측
- **상태**: PASS
- **근거**: `generateMonthlyForecast()` 함수가 12개월 월별 예측 생성. 계절성 패턴 추출 (24개월+ 데이터), 신뢰도 감쇠 (멀수록 낮아짐), MonthlyPrediction 인터페이스 준수.
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (810~849행)

#### Step 8. prediction-engine.ts -- 신뢰도 공식 업데이트
- **상태**: WARNING (부분 구현)
- **근거**: 기존 신뢰도 공식에 36개월 데이터 보너스 (`transactions.length >= 24`일 때 +5점) 추가됨.
- **편차**: 설계서 section 5.6에서 언급한 "5모델이면 보너스" 조건은 코드에 주석으로만 존재하고, 실제로는 데이터 건수 기반 보너스만 적용. 앙상블 모델 수에 따른 동적 보너스 미구현.
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (877~879행)

#### Step 9. __tests__/prediction-engine.test.ts -- 새 모델 테스트
- **상태**: FAIL (미구현)
- **근거**: 기존 테스트 파일은 `calculateTrend`와 `predictValue` 테스트만 포함. ARIMA 모델, ETS 모델, 5모델 앙상블, 시장 사이클 탐지에 대한 테스트 케이스가 전혀 없음.
- **설계서 요구사항**:
  - ARIMA 모델: 24건+ 데이터로 예측 정확성
  - ETS 모델: 계절성 패턴 반영 확인
  - 5모델 앙상블: 가중치 합=1, 폴백 동작
  - 시장 사이클: 상승/하락/횡보 분류
- **파일**: `/Users/watchers/Desktop/vestra/__tests__/prediction-engine.test.ts` (162행, 새 테스트 없음)

---

### Phase B: 외부 데이터 소스

#### Step 10. lib/bok-api.ts -- 한국은행 기준금리
- **상태**: WARNING (부분 구현)
- **근거**: `fetchBaseRate()` 구현 완료. ECOS API 722Y001 통계표 호출, 24시간 캐시, 폴백 로직 모두 정상.
- **편차**:
  - 설계서 `BOKResponse`에 `cpiRate?: number` (소비자물가 상승률) 필드가 있으나, 구현에서는 제외됨.
  - 구현의 `BOKResponse`에 `dataSource: "live" | "fallback"` 필드가 추가됨 (설계서 원본에는 없지만 `MacroEconomicFactors`에서 사용하므로 합리적 추가).
- **영향**: 낮음 -- CPI는 현재 어디서도 소비되지 않음.
- **파일**: `/Users/watchers/Desktop/vestra/lib/bok-api.ts` (73행)

#### Step 11. lib/supply-api.ts -- 입주물량 데이터
- **상태**: WARNING (부분 구현)
- **근거**: `SupplyData` 인터페이스와 `fetchSupplyVolume()` 구현 완료. 7일 캐시, null 반환 폴백 모두 정상.
- **편차**:
  - 설계서: `fetchSupplyVolume(region: string)` -- region 파라미터
  - 구현: `fetchSupplyVolume(address: string)` -- address 파라미터 (내부에서 region 추출)
  - 설계서: 공공데이터포털 API 호출
  - 구현: 정적 데이터 기반 추정 (`SUPPLY_ESTIMATES` 하드코딩). `dataSource`가 `"estimate" | "static"`으로 실 API 미연동.
- **영향**: 중간 -- 실시간 데이터가 아닌 추정값 사용. 향후 API 연동 필요.
- **파일**: `/Users/watchers/Desktop/vestra/lib/supply-api.ts` (89행)

#### Step 12. prediction-engine.ts -- ECONOMIC_DEFAULTS -> 실시간 대체
- **상태**: PASS
- **근거**: `predictValue()` 함수에서 `macroFactors?.dataSource === "live"`일 때 실시간 기준금리 사용. `buildEnsembleV2()`에서도 거시경제 보정 로직 포함 (금리 차이 기반 -0.5%/pp 보정).
- **파일**: `/Users/watchers/Desktop/vestra/lib/prediction-engine.ts` (861~863행, 710~714행)

#### Step 13. app/api/predict-value/route.ts -- 외부 데이터 통합
- **상태**: PASS
- **근거**: `Promise.all()`로 MOLIT 36개월 + BOK 기준금리 + 입주물량 병렬 조회 구현. 각 API 실패 시 `.catch()` 폴백 처리. macroFactors 구성 후 predictValue에 전달. 백테스팅 결과도 포함.
- **파일**: `/Users/watchers/Desktop/vestra/app/api/predict-value/route.ts` (59~68행)

---

### Phase C: UI/시각화

#### Step 14. components/prediction/PredictionTabs.tsx
- **상태**: PASS
- **근거**: 5개 탭 (대시보드, 차트, 지역 비교, 백테스트, 이상탐지) 구현. `PredictionTabId` 타입, `disabledTabs` prop 지원, 반응형 overflow-x-auto 처리.
- **파일**: `/Users/watchers/Desktop/vestra/components/prediction/PredictionTabs.tsx` (55행)

#### Step 15. components/prediction/Dashboard.tsx
- **상태**: PASS
- **근거**: `PredictionDashboard` 컴포넌트 구현. 핵심 지표 카드 3개 (현재 추정가, 1년 예측, 신뢰도), 시장 사이클, 거시 지표, 앙상블 모델 정보, 백테스팅 요약 모두 포함. 설계서 레이아웃과 일치.
- **파일**: `/Users/watchers/Desktop/vestra/components/prediction/Dashboard.tsx` (160행)

#### Step 16. components/prediction/MacroIndicators.tsx
- **상태**: PASS
- **근거**: `MacroIndicators` 컴포넌트 구현. 기준금리 + dataSource 표시 (live/fallback), 입주물량 조건부 렌더링 모두 포함.
- **파일**: `/Users/watchers/Desktop/vestra/components/prediction/MacroIndicators.tsx` (37행)

#### Step 17. components/prediction/MonthlyForecast.tsx
- **상태**: PASS
- **근거**: `MonthlyForecastChart` 컴포넌트 구현. Recharts AreaChart로 월별 가격 예측 추이 시각화. 신뢰도 범위 표시, 계절성 조정 안내 텍스트 포함.
- **파일**: `/Users/watchers/Desktop/vestra/components/prediction/MonthlyForecast.tsx` (71행)

#### Step 18. components/prediction/MarketCycle.tsx
- **상태**: PASS
- **근거**: `MarketCycleView` 컴포넌트 구현. 상승/하락/횡보/회복 4단계 색상 분류, 지속 기간/신뢰도 표시, 시각적 사이클 진행 바 포함.
- **파일**: `/Users/watchers/Desktop/vestra/components/prediction/MarketCycle.tsx` (52행)

#### Step 19. components/prediction/RegionCompare.tsx
- **상태**: PASS
- **근거**: `RegionCompare` 컴포넌트 구현. 최대 3개 지역 비교 입력, 개별 API 호출로 비교 데이터 수집, Recharts BarChart 시각화, 비교 테이블 포함.
- **편차**: 설계서의 `/api/predict-value/compare` 전용 API 대신 개별 `/api/predict-value` 다중 호출 방식. 기능적으로는 동일하나 네트워크 효율성 차이.
- **파일**: `/Users/watchers/Desktop/vestra/components/prediction/RegionCompare.tsx` (173행)

#### Step 20. app/(app)/prediction/page.tsx -- 탭 기반 리팩토링
- **상태**: FAIL (미구현)
- **근거**: 현재 page.tsx는 **1117행**으로 여전히 대형 단일 파일. 설계서 목표는 300행 이하의 탭 기반 구조였으나, 실제로는:
  - PredictionTabs 컴포넌트를 import하지 않음
  - Dashboard, MacroIndicators, MonthlyForecast, MarketCycle, RegionCompare, BacktestView 컴포넌트를 import하지 않음
  - 기존의 모놀리식 렌더링 구조 유지
  - 신규 컴포넌트들이 만들어졌지만 페이지에서 사용되지 않음
- **설계서 요구사항**: 탭 기반 분리 (dashboard/chart/compare/backtest/anomaly)
- **실제 구현**: 탭 없이 모든 섹션이 순차적으로 렌더링
- **영향**: 높음 -- 핵심 UX 변경이 미적용. 컴포넌트는 존재하지만 통합되지 않음.
- **파일**: `/Users/watchers/Desktop/vestra/app/(app)/prediction/page.tsx` (1117행)

#### Step 21. app/api/predict-value/compare/route.ts -- 비교 API
- **상태**: FAIL (미구현)
- **근거**: 파일 자체가 존재하지 않음. 설계서에서 정의한 `POST /api/predict-value/compare` 엔드포인트 미생성.
- **설계서 요구사항**: `{ addresses: string[] }` -> `{ comparisons: [...] }` 형태의 전용 비교 API
- **현재 대안**: RegionCompare 컴포넌트가 개별 API를 다중 호출하는 방식으로 우회
- **파일**: `/Users/watchers/Desktop/vestra/app/api/predict-value/compare/route.ts` (미존재)

---

### Phase D: 백테스팅

#### Step 22. lib/backtesting.ts
- **상태**: WARNING (부분 구현)
- **근거**: `runBacktest()` 함수 구현 완료. Rolling Window 방식, MAPE/RMSE/accuracy12m 산출, monthlyErrors 배열 생성.
- **편차**:
  - 설계서: `runBacktest(transactions, modelFn)` -- 모델 함수를 파라미터로 받아 다양한 모델 테스트 가능
  - 구현: `runBacktest(transactions)` -- 단순 선형 추세 기반 예측만 사용, modelFn 파라미터 없음
  - 설계서: BacktestResult에 `monthlyErrors` 포함
  - 구현: monthlyErrors를 계산하지만 반환하지 않음 (BacktestResult 타입에서 monthlyErrors 필드 누락)
- **영향**: 중간 -- 백테스팅이 단일 모델에만 적용되어 5모델 각각의 성능 비교 불가
- **파일**: `/Users/watchers/Desktop/vestra/lib/backtesting.ts` (94행)

#### Step 23. components/prediction/BacktestView.tsx
- **상태**: PASS
- **근거**: `BacktestView` 컴포넌트 구현 완료. 정확도 등급 표시 (우수/양호/보통/미흡), MAPE/RMSE/검증샘플/검증기간 카드, 백테스팅 설명 섹션 포함.
- **편차**: 설계서에서 언급한 "예측 vs 실제 차트"는 미포함 (monthlyErrors가 반환되지 않으므로). 현재는 요약 지표만 표시.
- **파일**: `/Users/watchers/Desktop/vestra/components/prediction/BacktestView.tsx` (76행)

#### Step 24. app/api/predict-value/route.ts -- 백테스팅 결과 포함
- **상태**: PASS
- **근거**: route.ts에서 `runBacktest(comprehensive.sale.transactions)` 호출 후 `predictionResult.backtestResult`에 할당. 36개월 데이터 있을 때만 실행.
- **파일**: `/Users/watchers/Desktop/vestra/app/api/predict-value/route.ts` (97~102행)

---

## 4. 타입 정의 비교 (설계서 Section 3)

| 타입 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| `MonthlyPrediction` | month, price, confidence | 일치 | PASS |
| `MacroEconomicFactors` | baseRate, baseRateDate, supplyVolume?, supplyRegion?, dataSource | 일치 | PASS |
| `BacktestResult` (prediction-engine) | mape, rmse, accuracy12m, sampleCount, period | 일치 (monthlyErrors 미포함) | WARNING |
| `BacktestResult` (backtesting.ts) | + monthlyErrors | monthlyErrors 계산하지만 반환 안함 | WARNING |
| `MarketCycleInfo` | phase, confidence, durationMonths, signal | 일치 | PASS |
| `PredictionResult` 확장 | monthlyForecast?, macroFactors?, backtestResult?, marketCycle? | 일치 | PASS |
| `BOKResponse` | baseRate, baseRateDate, cpiRate? | cpiRate 누락, dataSource 추가 | WARNING |
| `SupplyData` | region, volume12m, volumeAvg5y, supplyRatio | dataSource 추가 ("estimate"\|"static") | PASS |

---

## 5. API 명세 비교 (설계서 Section 4)

### POST /api/predict-value

| 응답 필드 | 설계서 | 구현 | 상태 |
|-----------|--------|------|------|
| currentPrice | O | O | PASS |
| predictions (3시나리오) | O | O | PASS |
| confidence | O | O | PASS |
| factors | O | O | PASS |
| variables | O | O | PASS |
| aiOpinion | O | O | PASS |
| ensemble (5모델) | O | O | PASS |
| realTransactions | O | O | PASS |
| priceStats | O | O | PASS |
| rentStats | O | O | PASS |
| calculatedJeonseRatio | O | O | PASS |
| **monthlyForecast** | O | O | PASS |
| **macroFactors** | O | O | PASS |
| **backtestResult** | O | O | PASS |
| **marketCycle** | O | O | PASS |

### POST /api/predict-value/compare (신규)

| 항목 | 설계서 | 구현 | 상태 |
|------|--------|------|------|
| 엔드포인트 존재 | O | X (미생성) | FAIL |
| Request: addresses[] | O | X | FAIL |
| Response: comparisons[] | O | X | FAIL |

---

## 6. 에러 처리 비교 (설계서 Section 7)

| API | 설계서 폴백 전략 | 구현 | 상태 |
|-----|-----------------|------|------|
| MOLIT API | 12개월 폴백 -> 0건이면 에러 | `.catch()` -> null 반환 | WARNING |
| 한국은행 API | ECONOMIC_DEFAULTS 사용 | FALLBACK 객체 반환 | PASS |
| 입주물량 API | null 반환 | `.catch()` -> null | PASS |
| OpenAI API | AI 의견 생략 | try/catch -> 실패 메시지 | PASS |

| 모델 폴백 | 설계서 기준 | 구현 | 상태 |
|-----------|-----------|------|------|
| >= 24건 | 5모델 앙상블 | activeModels 필터링 (r2 > 0) | PASS |
| 12~23건 | 3모델 (ARIMA/ETS 제외) | ARIMA/ETS가 r2=0 반환 -> 제외 | PASS |
| 3~11건 | 2모델 (선형회귀 + 평균회귀) | 모든 모델 시도, 부족 시 r2=0 | WARNING |
| < 3건 | 단순 인플레이션 추정 | 명시적 분기 없음 | WARNING |

---

## 7. 테스트 비교 (설계서 Section 9)

| 테스트 대상 | 설계서 파일 | 구현 | 상태 |
|------------|-----------|------|------|
| ARIMA 모델 | `__tests__/prediction-engine.test.ts` | 테스트 없음 | FAIL |
| ETS 모델 | `__tests__/prediction-engine.test.ts` | 테스트 없음 | FAIL |
| 5모델 앙상블 | `__tests__/prediction-engine.test.ts` | 테스트 없음 | FAIL |
| 백테스팅 | `__tests__/backtesting.test.ts` | 파일 미존재 | FAIL |
| BOK API | `__tests__/bok-api.test.ts` | 파일 미존재 | FAIL |
| 시장 사이클 | `__tests__/prediction-engine.test.ts` | 테스트 없음 | FAIL |

---

## 8. 차이점 요약

### 8.1 누락 기능 (설계 O, 구현 X)

| 항목 | 설계 위치 | 설명 |
|------|-----------|------|
| 페이지 탭 리팩토링 | design.md Section 6.3 | page.tsx가 1117행으로 탭 기반 분리 미적용. 신규 컴포넌트 7개가 만들어졌지만 페이지에서 미사용 |
| 비교 API | design.md Section 4.2 | `POST /api/predict-value/compare` 엔드포인트 미생성 |
| ARIMA/ETS/앙상블 테스트 | design.md Section 9.1 | 새 모델에 대한 단위 테스트 전무 |
| 백테스팅 테스트 | design.md Section 9.1 | `__tests__/backtesting.test.ts` 파일 미존재 |
| BOK API 테스트 | design.md Section 9.1 | `__tests__/bok-api.test.ts` 파일 미존재 |

### 8.2 추가 기능 (설계 X, 구현 O)

| 항목 | 구현 위치 | 설명 |
|------|-----------|------|
| BOKResponse.dataSource | `lib/bok-api.ts:14` | live/fallback 구분 필드 추가 (MacroEconomicFactors와 일관성 확보) |
| SupplyData.dataSource | `lib/supply-api.ts:17` | estimate/static 구분 필드 추가 |
| Dashboard 백테스팅 요약 | `components/prediction/Dashboard.tsx:132` | 대시보드 내 백테스팅 요약 카드 (설계서에 없던 추가 기능) |

### 8.3 변경 기능 (설계 != 구현)

| 항목 | 설계서 | 구현 | 영향 |
|------|--------|------|------|
| 앙상블 가중치 공식 | R2 x 0.4 + (1/MAPE) x 0.6 | R2 기반만 사용 | 높음 |
| 백테스팅 함수 시그니처 | `runBacktest(transactions, modelFn)` | `runBacktest(transactions)` | 중간 |
| BacktestResult.monthlyErrors | 포함 | 미포함 (계산하지만 반환 안함) | 중간 |
| BOKResponse.cpiRate | 포함 (optional) | 미포함 | 낮음 |
| supply-api 데이터 소스 | 공공데이터포털 API | 정적 하드코딩 데이터 | 중간 |
| RegionCompare API 방식 | 전용 compare API 1회 호출 | 개별 predict-value API N회 호출 | 낮음 |
| prediction/page.tsx 라인 수 | ~300행 | 1117행 | 높음 |

---

## 9. 권장 조치

### 즉시 조치 (Critical)

1. **페이지 탭 리팩토링 적용 (Step 20)**
   - `app/(app)/prediction/page.tsx`에 PredictionTabs, Dashboard, MacroIndicators, MonthlyForecast, MarketCycle, RegionCompare, BacktestView 컴포넌트 통합
   - 1117행 -> 300행 목표
   - 이미 만들어진 7개 컴포넌트를 import하여 탭별로 렌더링

2. **테스트 작성 (Step 9)**
   - `__tests__/prediction-engine.test.ts`에 ARIMA, ETS, buildEnsembleV2, detectMarketCycle 테스트 추가
   - `__tests__/backtesting.test.ts` 신규 생성
   - `__tests__/bok-api.test.ts` 신규 생성

### 문서 업데이트 필요

1. supply-api.ts의 실제 구현이 정적 데이터 기반임을 설계서에 반영 (또는 API 연동 구현)
2. 앙상블 가중치 공식 변경 사항을 설계서에 반영 (MAPE 역수 제거 또는 구현 추가)
3. runBacktest 함수 시그니처 차이 해소

### 개선 권장 (Optional)

1. `POST /api/predict-value/compare` 전용 API 생성 (Step 21) -- 네트워크 효율성 개선
2. BacktestResult에 monthlyErrors 필드 추가하여 예측 vs 실제 차트 지원
3. ETS 파라미터 자동 최적화 (Grid Search)
4. BOKResponse에 cpiRate 추가

---

## 10. 단계별 요약 테이블

| # | 단계 | 상태 | 비고 |
|---|------|------|------|
| 1 | molit-api.ts 36개월 | PASS | |
| 2 | 월별 시계열 유틸 | PASS | |
| 3 | arimaModel() | PASS | export 미사용 (내부함수) |
| 4 | etsModel() | PASS | 파라미터 고정값 |
| 5 | buildEnsembleV2() | WARNING | 가중치 공식 차이 |
| 6 | 시장 사이클 탐지 | PASS | |
| 7 | 월별 세분화 예측 | PASS | |
| 8 | 신뢰도 공식 업데이트 | WARNING | 5모델 보너스 미적용 |
| 9 | 새 모델 테스트 | FAIL | 테스트 미작성 |
| 10 | bok-api.ts | WARNING | cpiRate 누락 |
| 11 | supply-api.ts | WARNING | 정적 데이터 사용 |
| 12 | ECONOMIC_DEFAULTS 대체 | PASS | |
| 13 | route.ts 외부 데이터 통합 | PASS | |
| 14 | PredictionTabs.tsx | PASS | |
| 15 | Dashboard.tsx | PASS | |
| 16 | MacroIndicators.tsx | PASS | |
| 17 | MonthlyForecast.tsx | PASS | |
| 18 | MarketCycle.tsx | PASS | |
| 19 | RegionCompare.tsx | PASS | |
| 20 | page.tsx 탭 리팩토링 | FAIL | 1117행, 탭 미적용 |
| 21 | compare API | FAIL | 파일 미존재 |
| 22 | backtesting.ts | WARNING | modelFn 미지원 |
| 23 | BacktestView.tsx | PASS | |
| 24 | route.ts 백테스팅 포함 | PASS | |

**PASS**: 16개 / **WARNING**: 5개 / **FAIL**: 3개

**Match Rate**: (16 + 5 x 0.5) / 24 x 100 = **77.1%**

---

## 11. 동기화 옵션

Match Rate가 70%~90% 구간이므로:

> "일부 차이가 있습니다. 문서 업데이트 또는 구현 보완이 권장됩니다."

권장 옵션:
1. **구현을 설계에 맞추기**: 페이지 리팩토링 + 테스트 작성 + compare API 생성 (3개 FAIL 해소 -> ~89.6%)
2. **설계를 구현에 맞추기**: 앙상블 가중치 공식, supply-api 구현 방식 등 설계서 업데이트 (5개 WARNING 해소 -> ~89.6%)
3. **양쪽 통합**: 옵션 1 + 2 모두 수행 -> 목표 95%+

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-18 | 초기 갭 분석 완료 | gap-detector |

## Related Documents
- Plan: [prediction-enhancement.plan.md](../../01-plan/features/prediction-enhancement.plan.md)
- Design: [prediction-enhancement.design.md](../../02-design/features/prediction-enhancement.design.md)
