# 시세전망 강화 (Prediction Enhancement) 설계서

> **Summary**: 예측 엔진 5모델 앙상블 + 외부 데이터 연동 + UI 대시보드 + 백테스팅 시스템 설계
>
> **Project**: Vestra
> **Version**: 2.3.1
> **Author**: Watchers
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [prediction-enhancement.plan.md](../../01-plan/features/prediction-enhancement.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 기존 3모델 앙상블을 5모델(+ARIMA, +ETS)로 확장하되 **기존 API 응답 하위 호환 유지**
2. MOLIT 12개월 → 36개월 데이터 확대, 외부 거시경제 데이터 실시간 연동
3. 1600줄 prediction 페이지를 컴포넌트 단위로 분리하고 대시보드/비교 차트 추가
4. 백테스팅으로 예측 정확도를 사용자에게 투명하게 공개

### 1.2 Design Principles

- **하위 호환성**: 기존 `PredictionResult` 인터페이스 필드 삭제 없음 (새 필드만 추가)
- **Graceful Degradation**: 외부 API 실패 시 ECONOMIC_DEFAULTS로 자동 폴백
- **점진적 개선**: 기존 파일 수정 위주, 새 모듈은 최소한으로
- **서버리스 호환**: Vercel 함수 타임아웃(60초) 내 실행 보장

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌───────────────┐   │
│  │Dashboard │ │RegionCmp │ │MarketCycle  │ │BacktestView   │   │
│  └────┬─────┘ └────┬─────┘ └──────┬──────┘ └──────┬────────┘   │
│       └──────────┬──┘              │               │            │
│            prediction/page.tsx     │               │            │
└────────────────┬───────────────────┴───────────────┘            │
                 │ POST /api/predict-value                        │
┌────────────────▼────────────────────────────────────────────────┐
│                     API Route (Server)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ molit-api.ts │  │ bok-api.ts   │  │ supply-api.ts      │    │
│  │ (36개월)      │  │ (기준금리)    │  │ (입주물량)          │    │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘    │
│         └──────────┬──────┘                     │               │
│         ┌──────────▼────────────────────────────▼──┐            │
│         │        prediction-engine.ts               │            │
│         │  ┌─────────┐ ┌──────┐ ┌────────┐         │            │
│         │  │Linear   │ │Mean  │ │Momentum│         │            │
│         │  │Regress  │ │Rever │ │Model   │         │            │
│         │  └─────────┘ └──────┘ └────────┘         │            │
│         │  ┌─────────┐ ┌──────┐                    │            │
│         │  │ ARIMA   │ │ ETS  │  ← 신규            │            │
│         │  └─────────┘ └──────┘                    │            │
│         │         ↓ 5모델 앙상블                     │            │
│         └──────────┬───────────────────────────────┘            │
│                    ↓                                            │
│         ┌──────────────────┐  ┌─────────────────┐              │
│         │ backtesting.ts   │  │ OpenAI API       │              │
│         │ (정확도 검증)     │  │ (LLM 의견)       │              │
│         └──────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
사용자 입력 (주소, 비교 지역)
    ↓
/api/predict-value (POST)
    ├─ [병렬] MOLIT 36개월 실거래 수집
    ├─ [병렬] 한국은행 기준금리 조회
    ├─ [병렬] 입주물량 데이터 조회
    ↓
estimatePrice (가격 추정)
    ↓
predictValue (5모델 앙상블)
    ├─ 선형회귀 모델
    ├─ 평균회귀 모델
    ├─ 모멘텀 모델
    ├─ ARIMA 모델 (신규)
    └─ ETS 모델 (신규)
    ↓
backtesting (정확도 검증)
    ↓
OpenAI LLM 의견 생성
    ↓
클라이언트 렌더링
    ├─ Dashboard (핵심 지표)
    ├─ 시나리오 차트
    ├─ 지역 비교
    ├─ 시장 사이클
    ├─ 백테스팅 결과
    └─ 이상탐지 뷰
```

### 2.3 Dependencies

| 컴포넌트 | 의존 대상 | 용도 |
|----------|-----------|------|
| ARIMA 모델 | molit-api (36개월) | 최소 24개월 시계열 필요 |
| ETS 모델 | molit-api (36개월) | 계절성 분해에 24개월+ 필요 |
| bok-api | 한국은행 ECOS API | 기준금리 실시간 조회 |
| supply-api | 국토부 입주물량 API | 공급 리스크 반영 |
| Dashboard | prediction-engine | 앙상블 결과 시각화 |
| RegionCompare | molit-api × N | 다중 지역 병렬 조회 |
| BacktestView | backtesting.ts | 과거 예측 정확도 표시 |

---

## 3. Data Model

### 3.1 확장 타입 정의

```typescript
// prediction-engine.ts 확장 — 기존 인터페이스에 필드 추가

// 기존 ScenarioPredictions에 월별 추이 추가
export interface MonthlyPrediction {
  month: number;        // 1~12
  price: number;        // 예상 가격
  confidence: number;   // 해당 월 신뢰도
}

// 기존 PredictionResult 확장 (하위 호환)
export interface PredictionResult {
  // ... 기존 필드 유지 ...
  monthlyForecast?: MonthlyPrediction[];      // 신규: 12개월 월별 예측
  macroFactors?: MacroEconomicFactors;        // 신규: 실시간 거시지표
  backtestResult?: BacktestResult;            // 신규: 백테스팅 결과
  marketCycle?: MarketCycleInfo;              // 신규: 시장 사이클 정보
}

// 거시경제 실시간 데이터
export interface MacroEconomicFactors {
  baseRate: number;           // 한국은행 기준금리 (실시간)
  baseRateDate: string;       // 기준금리 기준일
  supplyVolume?: number;      // 입주물량 (향후 12개월)
  supplyRegion?: string;      // 입주물량 지역
  dataSource: "live" | "fallback";  // 데이터 출처
}

// 백테스팅 결과
export interface BacktestResult {
  mape: number;               // Mean Absolute Percentage Error
  rmse: number;               // Root Mean Square Error
  accuracy12m: number;        // 12개월 예측 정확도 (%)
  sampleCount: number;        // 검증 샘플 수
  period: string;             // 검증 기간
}

// 시장 사이클
export interface MarketCycleInfo {
  phase: "상승" | "하락" | "횡보" | "회복";
  confidence: number;
  durationMonths: number;     // 현재 국면 지속 기간
  signal: string;             // 판단 근거
}
```

### 3.2 기존 ModelResult 확장

```typescript
// patent-types.ts — 기존 구조 유지, ARIMA/ETS 추가

export interface ModelResult {
  modelName: string;    // "linear" | "meanReversion" | "momentum" | "arima" | "ets"
  prediction: { "1y": number; "5y": number; "10y": number };
  r2: number;
  weight: number;
}

// EnsemblePredictionResult는 변경 없음 (models 배열이 5개로 증가할 뿐)
```

---

## 4. API Specification

### 4.1 기존 API 확장 (하위 호환)

#### `POST /api/predict-value`

**Request** (변경 없음):
```json
{
  "address": "서울특별시 강남구 삼성동 123"
}
```

**Response** (기존 필드 유지 + 신규 필드 추가):
```json
{
  "currentPrice": 850000000,
  "predictions": {
    "optimistic": { "1y": 935000000, "5y": 1200000000, "10y": 1600000000 },
    "base": { "1y": 880000000, "5y": 1050000000, "10y": 1300000000 },
    "pessimistic": { "1y": 820000000, "5y": 900000000, "10y": 1050000000 }
  },
  "confidence": 72,
  "factors": [...],
  "variables": [...],
  "aiOpinion": "...",
  "ensemble": {
    "models": [
      { "modelName": "linear", ... },
      { "modelName": "meanReversion", ... },
      { "modelName": "momentum", ... },
      { "modelName": "arima", ... },
      { "modelName": "ets", ... }
    ],
    "ensemble": { "1y": ..., "5y": ..., "10y": ... },
    "dominantModel": "arima",
    "modelAgreement": 0.82
  },
  "realTransactions": [...],
  "priceStats": {...},
  "rentStats": {...},
  "calculatedJeonseRatio": 65.2,

  "monthlyForecast": [
    { "month": 1, "price": 855000000, "confidence": 78 },
    { "month": 2, "price": 860000000, "confidence": 76 },
    ...
  ],
  "macroFactors": {
    "baseRate": 2.75,
    "baseRateDate": "2026-03-14",
    "supplyVolume": 45000,
    "supplyRegion": "서울특별시",
    "dataSource": "live"
  },
  "backtestResult": {
    "mape": 8.3,
    "rmse": 42000000,
    "accuracy12m": 91.7,
    "sampleCount": 24,
    "period": "2025-03 ~ 2026-02"
  },
  "marketCycle": {
    "phase": "횡보",
    "confidence": 68,
    "durationMonths": 8,
    "signal": "거래량 감소 + 가격 정체"
  }
}
```

### 4.2 지역 비교 API (신규)

#### `POST /api/predict-value/compare`

**Request**:
```json
{
  "addresses": [
    "서울특별시 강남구 삼성동",
    "서울특별시 서초구 반포동",
    "서울특별시 송파구 잠실동"
  ]
}
```

**Response**:
```json
{
  "comparisons": [
    { "address": "...", "currentPrice": ..., "predictions": ..., "confidence": ... },
    { "address": "...", "currentPrice": ..., "predictions": ..., "confidence": ... },
    { "address": "...", "currentPrice": ..., "predictions": ..., "confidence": ... }
  ]
}
```

---

## 5. Module Design

### 5.1 ARIMA 모델 (`prediction-engine.ts` 내부)

```typescript
/**
 * ARIMA(p,d,q) 모델 — 자기회귀 통합 이동평균
 * 서버리스 환경에 맞춰 경량 자체 구현 (외부 라이브러리 미사용)
 *
 * - p=1 (자기회귀 차수): 직전 값의 영향
 * - d=1 (차분 차수): 1차 차분으로 비정상성 제거
 * - q=1 (이동평균 차수): 직전 오차 항
 * - 파라미터 추정: 최소제곱법 (Grid Search)
 */
export function arimaModel(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult
): ModelResult {
  // 1. 월별 평균가 시계열 생성
  // 2. 1차 차분 → 정상 시계열 변환
  // 3. AR(1) + MA(1) 파라미터 추정
  // 4. 1y/5y/10y 예측값 생성
  // 5. 장기 예측은 추세 수렴 (불확실성 반영)
}
```

### 5.2 ETS 모델 (`prediction-engine.ts` 내부)

```typescript
/**
 * ETS(A,A,A) — 가법적 오차 + 가법적 추세 + 가법적 계절성
 * Holt-Winters 확장판
 *
 * - 기존 anomaly-detector.ts의 Holt 평활법을 예측용으로 확장
 * - 계절성 주기: 12개월
 * - 파라미터: α(레벨), β(추세), γ(계절) 자동 최적화
 */
export function etsModel(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult
): ModelResult {
  // 1. 월별 평균가 시계열 생성
  // 2. 초기값 설정 (첫 12개월 평균)
  // 3. Holt-Winters 3중 평활
  // 4. 계절성 패턴 추출
  // 5. 1y/5y/10y 예측 (계절 조정 포함)
}
```

### 5.3 한국은행 API 모듈 (`lib/bok-api.ts` 신규)

```typescript
/**
 * 한국은행 ECOS(경제통계시스템) API 클라이언트
 * - 기준금리 조회 (722Y001/0101000)
 * - 소비자물가 상승률 (901Y009)
 * - 캐시: 24시간 (금리는 수시 변동 아님)
 * - 실패 시 ECONOMIC_DEFAULTS로 폴백
 */

export interface BOKResponse {
  baseRate: number;
  baseRateDate: string;
  cpiRate?: number;
}

export async function fetchBaseRate(): Promise<BOKResponse> { ... }
```

### 5.4 입주물량 API 모듈 (`lib/supply-api.ts` 신규)

```typescript
/**
 * 국토부/부동산원 입주물량 데이터
 * - 공공데이터포털 입주예정물량 API
 * - 시/도/구 단위 향후 12개월 입주물량
 * - 캐시: 7일 (월 단위 데이터)
 * - 실패 시 null 반환 (선택적 데이터)
 */

export interface SupplyData {
  region: string;
  volume12m: number;      // 향후 12개월 입주물량
  volumeAvg5y: number;    // 최근 5년 연평균
  supplyRatio: number;    // 입주물량/연평균 비율
}

export async function fetchSupplyVolume(region: string): Promise<SupplyData | null> { ... }
```

### 5.5 백테스팅 엔진 (`lib/backtesting.ts` 신규)

```typescript
/**
 * 백테스팅 엔진 — 과거 예측 정확도 검증
 *
 * 방법: Rolling Window Backtest
 * 1. 36개월 데이터 중 처음 24개월로 모델 훈련
 * 2. 이후 12개월을 1개월씩 예측 vs 실제 비교
 * 3. MAPE, RMSE 산출
 */

export interface BacktestResult {
  mape: number;
  rmse: number;
  accuracy12m: number;
  sampleCount: number;
  period: string;
  monthlyErrors: Array<{
    month: string;
    predicted: number;
    actual: number;
    error: number;
  }>;
}

export function runBacktest(
  transactions: RealTransaction[],
  modelFn: (txs: RealTransaction[]) => number
): BacktestResult { ... }
```

### 5.6 앙상블 재설계

```typescript
/**
 * 5모델 앙상블 가중치 결합
 *
 * 기존: R² 기반 가중치
 * 개선: R² + 백테스팅 MAPE 역수 혼합 가중치
 *
 * weight_i = (r2_i × 0.4 + (1/mape_i) × 0.6) / Σweights
 *
 * 모델별 최소 가중치: 0.05 (5%)
 * 데이터 부족 시: ARIMA/ETS 제외하고 3모델 폴백
 */
export function buildEnsembleV2(
  currentPrice: number,
  transactions: RealTransaction[],
  trend: TrendResult,
  macroFactors?: MacroEconomicFactors
): EnsemblePredictionResult { ... }
```

---

## 6. UI/UX Design

### 6.1 페이지 레이아웃 (리팩토링 후)

```
┌──────────────────────────────────────────────────┐
│  주소 검색 바 + 비교 지역 추가 (최대 3개)           │
├──────────────────────────────────────────────────┤
│  [대시보드]  [차트]  [비교]  [백테스트]  [이상탐지]  │  ← 탭 네비게이션
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │ 현재 추정가  │ │ 1년 예측   │ │ 신뢰도     │   │  ← Dashboard 탭
│  │ 8.5억원     │ │ +3.5%     │ │ 72점       │   │
│  └────────────┘ └────────────┘ └────────────┘   │
│                                                  │
│  ┌──────────────────────┐ ┌──────────────────┐  │
│  │ 시장 사이클: 횡보     │ │ 거시지표         │  │
│  │ 8개월째 지속         │ │ 금리 2.75%       │  │
│  └──────────────────────┘ │ 입주물량 45,000   │  │
│                           └──────────────────┘  │
│  ┌──────────────────────────────────────────┐   │
│  │ 시나리오 차트 (낙관/기본/비관 + 월별)      │   │  ← 차트 탭
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ 지역 비교 차트 (최대 3개 지역)             │   │  ← 비교 탭
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │ 백테스팅 결과 (예측 vs 실제 차트)          │   │  ← 백테스트 탭
│  │ MAPE: 8.3% | 정확도: 91.7%               │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### 6.2 컴포넌트 구조

| 컴포넌트 | 파일 위치 | 역할 |
|----------|-----------|------|
| `PredictionDashboard` | `components/prediction/Dashboard.tsx` | 핵심 지표 카드 모음 (신규) |
| `RegionCompare` | `components/prediction/RegionCompare.tsx` | 지역 간 비교 차트 (신규) |
| `MarketCycleView` | `components/prediction/MarketCycle.tsx` | 시장 사이클 표시 (신규) |
| `BacktestView` | `components/prediction/BacktestView.tsx` | 백테스팅 결과 차트 (신규) |
| `MonthlyForecastChart` | `components/prediction/MonthlyForecast.tsx` | 월별 예측 추이 (신규) |
| `MacroIndicators` | `components/prediction/MacroIndicators.tsx` | 거시 지표 카드 (신규) |
| `PredictionTabs` | `components/prediction/PredictionTabs.tsx` | 탭 네비게이션 (신규) |
| `KakaoMap` | `components/prediction/KakaoMap.tsx` | 기존 유지 |
| `LeafletMap` | `components/prediction/LeafletMap.tsx` | 기존 유지 |
| `AnomalyDetectionView` | `components/prediction/AnomalyDetectionView.tsx` | 기존 유지 |

### 6.3 페이지 리팩토링 전략

현재 `app/(app)/prediction/page.tsx`가 1600줄 → 탭 기반 분리:

```
prediction/page.tsx (300줄 이하)
  ├─ 주소 검색 로직 (유지)
  ├─ API 호출 (유지)
  └─ PredictionTabs 렌더링
      ├─ tab="dashboard" → <PredictionDashboard />
      ├─ tab="chart" → 기존 시나리오 차트 + MonthlyForecast
      ├─ tab="compare" → <RegionCompare />
      ├─ tab="backtest" → <BacktestView />
      └─ tab="anomaly" → <AnomalyDetectionView />
```

---

## 7. Error Handling

### 7.1 외부 API 폴백 전략

| API | 실패 시 처리 | 사용자 표시 |
|-----|-------------|------------|
| MOLIT API | 12개월 폴백 → 0건이면 에러 | "데이터 부족" 경고 |
| 한국은행 API | `ECONOMIC_DEFAULTS.baseInterestRate` 사용 | `dataSource: "fallback"` 표시 |
| 입주물량 API | `null` 반환 (선택적) | 해당 카드 숨김 |
| OpenAI API | AI 의견 생략 | "AI 의견 생성 실패" 안내 |

### 7.2 모델 폴백

```
거래 데이터 ≥ 24건: 5모델 앙상블
거래 데이터 12~23건: 3모델 (ARIMA/ETS 제외)
거래 데이터 3~11건: 2모델 (선형회귀 + 평균회귀)
거래 데이터 < 3건: 단순 인플레이션 추정
```

---

## 8. Security Considerations

- [x] 기존 Rate Limit 유지 (30초당 1회)
- [x] 기존 일일 사용량 제한 유지
- [x] 기존 sanitizeField 적용
- [ ] BOK API 키를 환경 변수로 관리 (`BOK_API_KEY`)
- [ ] 비교 API에 최대 3개 제한 (DoS 방지)
- [ ] 외부 API 응답 검증 (XSS 방지)

---

## 9. Test Plan

### 9.1 단위 테스트 (Vitest)

| 테스트 대상 | 파일 | 핵심 케이스 |
|------------|------|------------|
| ARIMA 모델 | `__tests__/prediction-engine.test.ts` | 24건+ 데이터로 예측 정확성 |
| ETS 모델 | `__tests__/prediction-engine.test.ts` | 계절성 패턴 반영 확인 |
| 5모델 앙상블 | `__tests__/prediction-engine.test.ts` | 가중치 합 = 1, 폴백 동작 |
| 백테스팅 | `__tests__/backtesting.test.ts` | MAPE 계산 정확성 |
| BOK API | `__tests__/bok-api.test.ts` | 정상 응답 + 폴백 |
| 시장 사이클 | `__tests__/prediction-engine.test.ts` | 상승/하락/횡보 분류 |

### 9.2 핵심 테스트 케이스

- [ ] Happy path: 강남구 36개월 데이터 → 5모델 앙상블 → 월별 예측 생성
- [ ] 데이터 부족: 10건 미만 거래 → 3모델 폴백 정상 동작
- [ ] API 실패: 한국은행 API 타임아웃 → ECONOMIC_DEFAULTS 폴백
- [ ] 지역 비교: 3개 지역 동시 조회 → 병렬 처리 8초 이내
- [ ] 하위 호환: 기존 테스트 전체 통과

---

## 10. Implementation Order

### Phase A: 예측 엔진 고도화 (우선순위 1)

```
1. [ ] molit-api.ts — fetchComprehensivePrices months 파라미터 36 지원
2. [ ] prediction-engine.ts — 월별 평균가 시계열 생성 유틸 함수
3. [ ] prediction-engine.ts — arimaModel() 구현
4. [ ] prediction-engine.ts — etsModel() 구현
5. [ ] prediction-engine.ts — buildEnsembleV2() (5모델 앙상블)
6. [ ] prediction-engine.ts — 시장 사이클 탐지 함수
7. [ ] prediction-engine.ts — 월별 세분화 예측
8. [ ] prediction-engine.ts — 신뢰도 공식 업데이트
9. [ ] __tests__/prediction-engine.test.ts — 새 모델 테스트 추가
```

### Phase B: 외부 데이터 소스 (우선순위 2)

```
10. [ ] lib/bok-api.ts — 한국은행 기준금리 API 모듈
11. [ ] lib/supply-api.ts — 입주물량 데이터 모듈
12. [ ] prediction-engine.ts — ECONOMIC_DEFAULTS → 실시간 대체
13. [ ] app/api/predict-value/route.ts — 외부 데이터 병렬 조회 통합
```

### Phase C: UI/시각화 (우선순위 3)

```
14. [ ] components/prediction/PredictionTabs.tsx — 탭 네비게이션
15. [ ] components/prediction/Dashboard.tsx — 핵심 지표 대시보드
16. [ ] components/prediction/MacroIndicators.tsx — 거시지표 카드
17. [ ] components/prediction/MonthlyForecast.tsx — 월별 추이 차트
18. [ ] components/prediction/MarketCycle.tsx — 시장 사이클 뷰
19. [ ] components/prediction/RegionCompare.tsx — 지역 비교 차트
20. [ ] app/(app)/prediction/page.tsx — 리팩토링 (탭 기반)
21. [ ] app/api/predict-value/compare/route.ts — 비교 API
```

### Phase D: 백테스팅 (우선순위 4)

```
22. [ ] lib/backtesting.ts — 백테스팅 엔진
23. [ ] components/prediction/BacktestView.tsx — 결과 시각화
24. [ ] app/api/predict-value/route.ts — 백테스팅 결과 포함
```

---

## 11. File Structure

```
lib/
├── prediction-engine.ts    # 수정: ARIMA, ETS, 5모델 앙상블, 시장사이클
├── molit-api.ts            # 수정: 36개월 확대
├── bok-api.ts              # 신규: 한국은행 API
├── supply-api.ts           # 신규: 입주물량 API
├── backtesting.ts          # 신규: 백테스팅 엔진
├── patent-types.ts         # 수정: 타입 확장
├── price-estimation.ts     # 유지
├── anomaly-detector.ts     # 유지
└── api-cache.ts            # 유지

components/prediction/
├── KakaoMap.tsx            # 유지
├── LeafletMap.tsx          # 유지
├── AnomalyDetectionView.tsx # 유지
├── RiskHeatMap.tsx         # 유지
├── PredictionTabs.tsx      # 신규
├── Dashboard.tsx           # 신규
├── MacroIndicators.tsx     # 신규
├── MonthlyForecast.tsx     # 신규
├── MarketCycle.tsx         # 신규
├── RegionCompare.tsx       # 신규
└── BacktestView.tsx        # 신규

app/api/predict-value/
├── route.ts                # 수정: 5모델 + 외부데이터 + 백테스팅
└── compare/route.ts        # 신규: 지역 비교

app/(app)/prediction/
└── page.tsx                # 수정: 탭 기반 리팩토링

__tests__/
├── prediction-engine.test.ts  # 수정: ARIMA/ETS 테스트 추가
├── backtesting.test.ts        # 신규
└── bok-api.test.ts            # 신규
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | 초안 작성 | Watchers |
