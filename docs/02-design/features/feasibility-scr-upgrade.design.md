# Feasibility SCR Upgrade Design Document

> **Summary**: SCR 서울신용평가 사업성평가보고서와 동일한 5장+부록 구조(표64개, 그림23개, 60~80p) 보고서를 자동 생성하는 시스템 설계
>
> **Project**: VESTRA
> **Version**: v3.9.1 -> v4.0.0
> **Author**: CTO Lead (Claude)
> **Date**: 2026-03-22
> **Status**: Draft
> **Planning Doc**: [feasibility-scr-upgrade.plan.md](../01-plan/features/feasibility-scr-upgrade.plan.md)

---

## 1. Overview

### 1.1 설계 목표

1. **SCR 보고서 동일성**: 표64개, 그림23개, 5장+부록 목차 구조를 100% 재현
2. **기존 코드 확장**: 현재 feasibility 모듈(8개 파일)을 깨뜨리지 않고 확장
3. **점진적 구현**: 5개 Phase로 분리하여 각 Phase가 독립적으로 배포 가능
4. **복합시설 대응**: 6가지 사업 유형(아파트/주상복합/오피스텔/지산센터/재건축/생숙)을 단일 엔진으로 처리
5. **계산 정확도**: 월별 자금수지, DSCR, BEP 등 재무 계산의 수치적 정확도 보장

### 1.2 설계 원칙

- **Single Responsibility**: 각 계산 엔진은 하나의 역할만 수행 (사업수지/자금수지/시나리오/BEP/DSCR/민감도)
- **Strategy Pattern**: 사업 유형별 분양수입 계산을 전략 패턴으로 분리
- **Data Pipeline**: 파싱 -> 병합 -> 계산 -> 렌더링의 단방향 데이터 흐름
- **Graceful Degradation**: API 실패 시 정적DB 폴백, 사용자 미제출 시 자동 가정값

---

## 2. Architecture

### 2.1 전체 시스템 아키텍처

```
사용자 파일 업로드 (2~10개)
         |
         v
 ┌─────────────────┐
 │  Document Parser │  (Phase 2: 45개+ 항목 확장)
 │  document-parser │
 │  .ts (기존 확장)  │
 └────────┬────────┘
          |
          v
 ┌─────────────────┐     ┌──────────────────┐
 │  Context Merger  │────>│  External APIs   │
 │  context-merger  │     │  (Phase 1)       │
 │  .ts (기존 확장)  │     │  KOSIS/DART/REPS │
 └────────┬────────┘     │  /MOIS/청약시스템  │
          |               └──────────────────┘
          v
 ┌─────────────────┐
 │  SCR Project     │  (신규: 전체 데이터 모델)
 │  Context         │
 └────────┬────────┘
          |
    ┌─────┴─────┐
    v           v
┌────────┐  ┌────────────┐
│ 검증   │  │  계산 엔진   │  (Phase 3)
│ Engine │  │  6개 모듈    │
│(기존)  │  │  (신규)      │
└───┬────┘  └──────┬─────┘
    |              |
    v              v
 ┌─────────────────┐
 │  SCR Report     │  (Phase 4: HTML 템플릿)
 │  Renderer       │
 │  (신규)          │
 └────────┬────────┘
          |
          v
 ┌─────────────────┐
 │  PDF Output     │  (60~80페이지)
 │  5장+부록 구조    │
 └─────────────────┘
```

### 2.2 데이터 흐름

```
User Files -> Parse(45+ fields) -> Merge -> Validate
                                      |
                                      +-> Fetch APIs (KOSIS/DART/REPS/MOIS)
                                      |
                                      v
                              SCR ProjectContext
                                      |
                     +----------------+----------------+
                     |                |                |
                     v                v                v
              BusinessCalc     ScenarioCalc      MarketAnalysis
              (사업수지)        (시나리오/BEP)     (시장환경)
                     |                |                |
                     +--------+-------+                |
                              v                        v
                       SCR Report Renderer (64표+23그림)
                              |
                              v
                     HTML -> Print-to-PDF
```

### 2.3 모듈 의존성

| 모듈 | 의존 대상 | 역할 |
|------|---------|------|
| `scr-types.ts` | 없음 (순수 타입) | SCR 보고서 전체 데이터 모델 |
| `scr-parser-extensions.ts` | `document-parser.ts` | 45개+ 항목 파싱 확장 |
| `api/kosis.ts` | 외부 API | 통계청 인구/세대/사업체 |
| `api/dart.ts` | 외부 API | 전자공시 재무제표 |
| `api/reps.ts` | 외부 API | 부동산원 매매/전세지수 |
| `api/mois.ts` | 외부 API | 행안부 주민등록 인구 |
| `calc/business-income.ts` | `scr-types.ts` | 사업수지 계산 |
| `calc/monthly-cashflow.ts` | `scr-types.ts` | 월별 자금수지 (48개월) |
| `calc/scenario.ts` | `calc/business-income.ts` | 시나리오별 사업수지 |
| `calc/bep.ts` | `calc/business-income.ts` | BEP 분양률 3종 |
| `calc/dscr.ts` | `calc/monthly-cashflow.ts` | DSCR 산출 |
| `calc/sensitivity.ts` | `calc/scenario.ts`, `calc/dscr.ts` | 민감도 분석 |
| `scr-report-html.ts` | 전체 | SCR 동일 HTML 렌더링 |

---

## 3. Data Model

### 3.1 SCR ProjectContext (핵심 데이터 모델)

```typescript
// lib/feasibility/scr-types.ts

/** 사업 유형 */
type ProjectType =
  | "아파트단지"
  | "주상복합"
  | "오피스텔"
  | "지식산업센터"
  | "재건축재개발"
  | "생활형숙박시설";

/** 시설 유형 */
type FacilityType = "아파트" | "오피스텔" | "상가" | "기숙사" | "숙박";

/** 타입별 분양 정보 */
interface SaleUnitType {
  typeName: string;         // "84A", "84B", "115OA" 등
  facility: FacilityType;
  units: number;            // 세대수/실수
  exclusiveArea: number;    // 전용면적 (평)
  supplyArea: number;       // 분양면적 (평)
  pricePerExclusivePyeong: number;  // 전용평당가 (만원)
  pricePerSupplyPyeong: number;     // 분양평당가 (만원)
  pricePerUnit: number;     // 세대당가 (백만원)
  totalRevenue: number;     // 수입금 (백만원)
  revenueRatio: number;     // 비율 (%)
}

/** 분양대금 납입일정 */
interface PaymentSchedule {
  facility: FacilityType;
  contractDeposit: number;  // 계약금 비율 (%)
  intermediatePayments: { date: string; ratio: number }[];  // 중도금
  balance: { date: string; ratio: number };  // 잔금
}

/** 자금조달 계획 */
interface FundingPlan {
  pfLoan: {
    amount: number;       // 백만원
    interestRate: number; // %
    maturityDate: string;
    repaymentMethod: string;
  };
  existingPfLoan?: {
    amount: number;
    maturityDate: string;
  };
  selfCapital: number;    // 자기자본 (백만원)
  totalFunding: number;   // 합계
}

/** 토지 현황 */
interface LandInfo {
  private: { area: number; amount: number; pricePerPyeong: number };
  public: { area: number; amount: number; pricePerPyeong: number };
  other: { area: number; amount: number };
  total: { area: number; amount: number; pricePerPyeong: number };
}

/** 사업주체 정보 (II장) */
interface CompanyInfo {
  name: string;
  establishedDate: string;
  businessType: string;
  capital: number;          // 자본금 (억원)
  ceo: string;
  address: string;
  shareholders: { name: string; shares: number; ratio: number; note: string }[];
  ongoingProjects: {
    name: string; type: string; location: string;
    units: number; period: string; saleRate: number; progress: number;
  }[];
  financials: {
    year: number;
    revenue: number; cogs: number; grossProfit: number;
    sgna: number; operatingIncome: number; ebitda: number;
    netIncome: number;
  }[];
  balanceSheet: {
    year: number;
    totalAssets: number; cashAssets: number;
    totalLiabilities: number; totalBorrowings: number;
    shortTermBorrowings: number; longTermBorrowings: number;
    totalEquity: number;
    debtToEquity: number; borrowingDependency: number;
  }[];
  cashFlows: {
    year: number;
    operating: number; investing: number; financing: number;
    netChange: number; beginningCash: number; endingCash: number;
  }[];
  borrowings: {
    name: string; maturity: string; rate: number; balance: number;
  }[];
}

/** 시장 환경 데이터 (III장) */
interface MarketEnvironment {
  regulations: {
    adjustmentArea: boolean;
    ltv: number; dti: number;
    transferRestriction: string;
  };
  demographics: {
    population: { year: number; national: number; city: number; district: number; dong: number }[];
    households: { year: number; national: number; city: number; district: number; dong: number }[];
    ageDistribution: { ageGroup: string; national: number; city: number; district: number; dong: number }[];
    businesses: { industry: string; cityCount: number; cityWorkers: number; districtCount: number; districtWorkers: number }[];
  };
  housingMarket: {
    supplyRate: { year: number; national: number; city: number; district: number }[];
    transactionVolume: { year: number; category: string; national: number; city: number; district: number }[];
    housingType: { year: number; detached: number; apartment: number; rowHouse: number; multiFamily: number; nonResidential: number }[];
    buildingAge: { period: string; national: number; city: number; district: number; dong: number }[];
    areaDistribution: { area: string; national: number; city: number; district: number; dong: number }[];
    upcomingSupply: { region: string; units: number; moveIn: string; developer: string; type: string }[];
    plannedSupply: { region: string; name: string; units: number; saleDate: string; developer: string }[];
    unsoldUnits: { region: string; year: number; count: number; postCompletion: number }[];
    unsoldDetail: { location: string; name: string; developer: string; saleDate: string; moveIn: string; totalUnits: number; unsold: number }[];
  };
}

/** 분양가 적정성 검토 (IV장) */
interface PricingReview {
  locationConditions: {
    transport: string;
    living: string;
    education: string;
  };
  nearbyDevelopment: {
    name: string; description: string; period: string;
  }[];
  comparableSales: {
    no: number; name: string; type: string; developer: string;
    location: string; moveInDate: string; units: number; floors: number;
    supplyArea: number; pricePerSupplyPyeong: number;
    exclusiveArea?: number; pricePerExclusivePyeong?: number;
    transactionPeriod: string;
  }[];
  comparableNewSales: {
    no: number; name: string; type: string; developer: string;
    location: string; saleDate: string; moveInDate: string;
    units: number; floors: number; supplyArea: number;
    pricePerSupplyPyeong: number; saleRate: number;
    competitionRatio: string; premium?: number;
  }[];
  averagePrices: {
    year: number; category: string;
    national: number; city: number; district: number; dong: number;
  }[];
  pricingOpinion: string;  // LLM 생성 적정성 검토 의견
}

/** 사업수지 */
interface BusinessIncome {
  revenue: {
    apartment: number;
    officetel: number;
    balconyExpansion: number;
    commercial: number;
    intermediateInterest: number;
    vat: number;
    total: number;
  };
  cost: {
    landCost: number;
    directConstructionCost: number;
    indirectConstructionCost: number;
    salesExpense: number;
    generalExpense: number;
    taxesAndDues: number;
    financialCost: {
      pfFee: number;
      pfInterest: number;
      intermediateInterest: number;
      subtotal: number;
    };
    total: number;
  };
  profit: number;         // 세전사업이익
  profitRate: number;      // 이익률
}

/** 월별 자금수지 항목 */
interface MonthlyCashflowRow {
  period: string;          // "'25.06" 형식
  revenue: {
    apartment: number; officetel: number; balcony: number;
    commercial: number; intermediateInterest: number; vat: number;
    total: number;
  };
  cost: {
    landCost: number; directConstruction: number; indirectConstruction: number;
    salesExpense: number; generalExpense: number; taxesAndDues: number;
    pfFee: number; pfInterest: number; intermediateInterest: number;
    total: number;
  };
  businessIncome: number;
  funding: {
    selfCapital: number; existingPf: number; newPf: number; total: number;
  };
  repayment: {
    selfCapital: number; existingPf: number; newPf: number; total: number;
  };
  cashChange: number;
  endingCash: number;
}

/** 시나리오 분석 */
interface ScenarioAnalysis {
  scenarios: {
    name: string;  // "차주안", "시나리오1", "시나리오2"
    saleRates: Record<FacilityType, number>;
    businessIncome: BusinessIncome;
  }[];
  sensitivity: {
    name: string;
    totalSaleRateByRevenue: number;
    totalRevenue: number;
    profit: number;
    profitRate: number;
    dscr: number;
    creditEnhancement: number;
    unsoldInventory: number;
  }[];
}

/** BEP 분양률 */
interface BepAnalysis {
  /** BEP(1): 아파트/오피스텔/상가 모두 동일 분양률 */
  bep1: {
    businessIncomeBep: number;
    businessCostExitBep: number;
    pfExitBep: number;
  };
  /** BEP(2): 오피스텔/상가 50% 고정 */
  bep2: {
    businessIncomeBep: number;
    businessCostExitBep: number;
    pfExitBep: number;
  };
  /** BEP(3): 오피스텔/상가 0% 고정 */
  bep3: {
    businessIncomeBep: number;
    businessCostExitBep: number;
    pfExitBep: number;
  };
}

/** SCR 보고서 전체 데이터 모델 */
interface ScrReportData {
  metadata: {
    reportId: string;
    reportNumber: string;  // "VESTRA-2026-001" 형식
    generatedAt: string;
    version: string;
  };
  // 전문부
  frontMatter: {
    purpose: string;
    assumptions: string;
    disclaimers: string;
    analysts: { name: string; title: string; email: string }[];
  };
  // I장: 사업 개요
  projectOverview: {
    name: string;
    location: string;
    zoning: string;
    developer: string;
    landArea: number;
    buildingArea: number;
    totalFloorArea: { total: number; above: number; below: number };
    buildingCoverage: number;
    floorAreaRatio: number;
    scale: string;
    facilities: string;
    constructionPeriod: number;
    projectType: ProjectType;
    saleUnitTypes: SaleUnitType[];          // 표3, 표4
    paymentSchedules: PaymentSchedule[];    // 표5
    fundingPlan: FundingPlan;               // 표6
    landInfo: LandInfo;                     // 표7
    projectSchedule: { date: string; event: string; status: string }[];  // 표2
    structureDiagram: object;               // 그림1 데이터
    birdEyeViewUrl?: string;                // 조감도 URL
  };
  // II장: 사업주체 분석
  companyAnalysis: CompanyInfo;
  // III장: 시장 환경 분석
  marketEnvironment: MarketEnvironment;
  // IV장: 분양가 적정성 검토
  pricingReview: PricingReview;
  // V장: 원리금상환가능성 분석
  financialAnalysis: {
    assumptions: {
      saleRateSchedule: { period: string; current: number; cumulative: number; facility: FacilityType }[];
      fundingAssumptions: string;
      otherAssumptions: string;
    };
    businessIncome: BusinessIncome;         // 표41
    cashflowSummary: object;                // 표42
    fundingScale: object;                   // 표43
    monthlyCashflow: MonthlyCashflowRow[];  // 표44~46 (48개월)
    scenarioAnalysis: ScenarioAnalysis;     // 표47~49
    bepAnalysis: BepAnalysis;               // 표50~52
  };
  // Appendices
  appendices: {
    governmentPolicies: object[];           // 표53~54
    regulationAreas: object;                // 표55~58
    hugHighPriceAreas: object;              // 표59
    interestRateTrend: object;              // 그림20
    priceIndexTrend: object;                // 그림21~23
    nearbyDevelopmentDetail: object[];      // 표60~64
  };
}
```

### 3.2 기존 타입과의 관계

```
기존 MergedProjectContext ─────────────→ ScrReportData.projectOverview (확장)
기존 VerificationResult ──────────────→ ScrReportData.pricingReview (통합)
기존 FeasibilityReport ───────────────→ ScrReportData (전체 대체)
기존 FeasibilityScore/V-Score ────────→ 유지 (별도 요약 점수)
```

기존 `FeasibilityReport` 타입은 하위 호환성 유지. `ScrReportData`가 상위 호환 모델.

---

## 4. API Specification

### 4.1 신규 외부 API

| API | Base URL | 인증 | 용도 | 환경변수 |
|-----|----------|------|------|---------|
| 통계청 KOSIS | `https://kosis.kr/openapi/` | API Key | 인구/세대/사업체/주택보급률 | `KOSIS_API_KEY` |
| DART 전자공시 | `https://opendart.fss.or.kr/api/` | API Key | 재무제표(8년)/주주현황 | `DART_API_KEY` |
| 부동산원 REPS | `https://data.reb.or.kr/` | API Key | 매매가격지수/전세가격지수 | `REPS_API_KEY` |
| 행안부 MOIS | `https://api.mois.go.kr/` | API Key | 연령대별 인구 | `MOIS_API_KEY` |

### 4.2 신규 내부 API 엔드포인트

| Method | Path | 설명 | Phase |
|--------|------|------|-------|
| POST | `/api/feasibility/scr-parse` | 확장 파싱 (45개+ 항목) | 2 |
| POST | `/api/feasibility/scr-calculate` | 계산 엔진 실행 | 3 |
| POST | `/api/feasibility/scr-report` | SCR 보고서 생성 | 4 |
| GET | `/api/feasibility/scr-report/[id]` | 보고서 조회 | 4 |

### 4.3 API 상세: POST /api/feasibility/scr-calculate

**Request:**
```json
{
  "projectContext": { /* ScrReportData.projectOverview */ },
  "companyCorpCode": "00126380",  // DART 법인코드 (선택)
  "options": {
    "scenarioCount": 3,
    "bepTypes": [1, 2, 3],
    "monthlyCashflowMonths": 48
  }
}
```

**Response:**
```json
{
  "businessIncome": { /* BusinessIncome */ },
  "monthlyCashflow": [ /* MonthlyCashflowRow[] */ ],
  "scenarioAnalysis": { /* ScenarioAnalysis */ },
  "bepAnalysis": { /* BepAnalysis */ },
  "dscr": { "cumulative": 1.50, "atMaturity": 1.28 }
}
```

---

## 5. 계산 엔진 설계

### 5.1 사업수지 계산기 (calc/business-income.ts)

```
분양수입 합계 = Sigma(시설유형별)
  아파트:    타입별 세대수 x 세대당 분양가
  오피스텔:  타입별 실수 x 실당 분양가
  상가:      총 전용면적 x 평당 분양가
  발코니확장비: 아파트 세대수 x 확장비 단가
  중도금이자후불: 별도 산출 (연 4.5% 가정)
  VAT: 오피스텔/상가에만 적용 (매출VAT - 매입VAT)

사업비 합계 = 토지비 + 직접공사비 + 간접공사비 + 판매비
            + 일반부대비용 + 제세공과금 + 금융비용(PF수수료+PF이자+중도금이자)

세전사업이익 = 분양수입 합계 - 사업비 합계
```

### 5.2 월별 자금수지 생성기 (calc/monthly-cashflow.ts)

48개월 월별 배분 로직:
- **분양수입**: 분양률 스케줄 x 납입일정 비율로 월별 배분
- **토지비**: 착공 전 일시 지출
- **직접공사비**: S-curve 배분 (착공~준공 구간 정규분포 근사)
- **간접공사비**: 분기별 균등 배분
- **판매비**: 분양 시점 집중
- **일반부대비용**: 월 균등
- **제세공과금**: 취득세(착공시), 보존등기(준공시), 기타 분기별
- **PF수수료**: 조달 시점 일시
- **PF이자**: 월 균등 (잔액 x 월이자율)
- **중도금이자**: 분양률 x 중도금 누적 x 월이자율

### 5.3 시나리오 엔진 (calc/scenario.ts)

```
차주안:     아파트 100% / 오피스텔 100% / 상가 100%
시나리오1:  아파트  95% / 오피스텔  50% / 상가  50%
시나리오2:  아파트  90% / 오피스텔  50% / 상가  50%
```

시설유형별 분양률 분리 적용 -> 사업수지 재계산

### 5.4 BEP 계산기 (calc/bep.ts)

이진 탐색으로 BEP 분양률 산출 (정밀도 0.1%):

```typescript
function findBep(
  targetFunction: (saleRate: number) => number,  // 사업이익/현금잔액
  targetValue: number,                            // 0 (BEP)
  min: number,  // 0%
  max: number,  // 100%
  precision: number  // 0.001
): number
```

**BEP(1)**: 전 시설 동일 분양률 -> `사업수지 = 0` / `사업비지출 = 수입` / `PF상환 = 수입-신용보강`
**BEP(2)**: 오피스텔/상가 50% 고정, 아파트만 변동
**BEP(3)**: 오피스텔/상가 0% 고정, 아파트만 변동

### 5.5 DSCR 계산기 (calc/dscr.ts)

```
만기시점 누적 DSCR = (누적분양수입 + 신용보강) / PF 원리금
  신용보강 = 자기자본 + 공사비유보(만기시점)
```

### 5.6 민감도 분석 (calc/sensitivity.ts)

시나리오별 민감도 매트릭스:
- 만기시점 분양률(총수입 기준)
- 총 수입 / (세전)사업이익 / (세전)수익률
- 만기시점 누적 DSCR
- 신용보강 금액
- 미분양재고(분양가 기준)

### 5.7 시세 예측 엔진 (calc/price-forecast.ts) — v1.1 추가

주거용 건축(재건축/신축 모두)에 대한 주변 시세 분석 + 준공 후 변동시세 예측.

**입력**: 사업지 주소, 사업 유형(재건축/신축), 준공 예정일, 계획 분양가

**산출물**:

```typescript
interface PriceForecast {
  // 1. 현재 주변 시세
  nearbyPrices: {
    cases: NearbyCase[];          // 반경 2km 내 아파트 13건+ 매매시세
    avgPricePerPyeong: number;    // 평균 공급평당 매매시세
    priceRange: { min: number; max: number };
  };

  // 2. 분양가 대비 프리미엄 (인근 분양사례 기반)
  premium: {
    cases: PremiumCase[];         // 분양가→현재 매매가 상승률
    avgPremiumRate: number;       // 평균 프리미엄율 (예: +2.4%)
    maxPremiumRate: number;
  };

  // 3. 시세 추이 (7년)
  priceTrend: {
    yearly: { year: number; avgPrice: number; avgSalePrice: number }[];
    annualGrowthRate: number;     // 연평균 상승률 (최근 3년)
  };

  // 4. 준공 후 예상 시세 (3 시나리오)
  forecast: {
    conservative: number;         // 보수적 (프리미엄 0% + 지역 하위 상승률)
    moderate: number;             // 중립적 (평균 프리미엄율 + 지역 평균 상승률)
    optimistic: number;           // 낙관적 (최대 프리미엄율 + 지역 상위 상승률)
    completionDate: string;       // 준공 예정일
  };

  // 5. 재건축 전용 (사업유형이 재건축인 경우만)
  reconstruction?: {
    currentPrice: number;         // 재건축 전 현재 시세
    estimatedPostPrice: number;   // 재건축 후 예상 시세
    contributionPerUnit: number;  // 조합원 분담금
    expectedProfit: number;       // 예상 수익 (후시세 - 분담금 - 전시세)
    profitRate: number;           // 수익률
  };
}
```

**예측 알고리즘**:
1. MOLIT 실거래가 API → 반경 2km 내 매매사례 수집
2. 분양사례 중 입주 완료 단지 → 분양가 대비 현재 매매가 프리미엄율 산출
3. 부동산원 REPS → 해당 지역 매매가격지수 연평균 상승률
4. 준공시점 예상 시세 = 계획분양가 × (1 + 프리미엄율) × (1 + 연상승률)^(잔여연수)
5. (재건축) 기존 아파트 시세 조회 → 분담금 추정 → 순수익 계산

**적용 보고서 섹션**: IV장 5절 "분양가 적정성 검토 의견" 하위
- 표: 준공 후 예상 시세 (3 시나리오)
- 그림: 시세 추이 + 예측 선차트 (실선=실적, 점선=예측)
- 표: 재건축 수익 분석 (재건축인 경우)

---

## 6. HTML 보고서 렌더링 설계

### 6.1 SCR 스타일 CSS

```css
/* 핵심 스타일 규칙 */
@page { size: A4; margin: 2cm 2.5cm; }
body { font-family: "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; font-size: 9pt; }

/* SCR 표 스타일 */
.scr-table { border-collapse: collapse; width: 100%; }
.scr-table th { background: #2b3e50; color: white; font-size: 8pt; padding: 4px 6px; }
.scr-table td { border-bottom: 1px solid #ddd; padding: 3px 6px; font-size: 8pt; }
.scr-table .number { text-align: right; font-variant-numeric: tabular-nums; }
.scr-table .negative { color: #c00; }  /* 음수는 괄호+빨간색 */

/* 표/그림 번호 */
.table-title { background: #2b3e50; color: white; padding: 4px 8px; font-size: 8pt; font-weight: bold; }
.figure-title { background: #2b3e50; color: white; padding: 4px 8px; font-size: 8pt; font-weight: bold; }

/* 장 헤더 */
.chapter-header { border-top: 3px solid #2b3e50; padding: 8px 0; font-size: 14pt; font-weight: bold; }
.section-header { border-bottom: 1px solid #2b3e50; padding: 4px 0; font-size: 11pt; }

/* 페이지 브레이크 */
.page-break { page-break-before: always; }
.avoid-break { page-break-inside: avoid; }

/* 헤더/푸터 */
.page-header { border-bottom: 2px solid #2b3e50; }
.page-header .chapter-name { font-size: 9pt; color: #2b3e50; }
.page-header .brand { font-size: 11pt; font-weight: bold; font-style: italic; color: #2b3e50; float: right; }
.page-footer { border-top: 1px solid #2b3e50; font-size: 7pt; color: #666; }
```

### 6.2 차트 생성 전략

| 차트 유형 | 라이브러리 | 적용 섹션 |
|---------|----------|---------|
| 사업구조 플로우차트 | SVG 직접 생성 | I-2 (그림1) |
| 지역 지도 | 정적 SVG (행정구역) | III-2 (그림2) |
| 막대+선 복합차트 | Recharts (SSR) | III-2 (그림3~5) |
| 적층 바차트 | Recharts (SSR) | V-1.2 (그림17) |
| 파이차트 | Recharts (SSR) | V-1.2 (그림18) |
| 영역차트 | Recharts (SSR) | V-1.3 (그림19) |
| 선차트 | Recharts (SSR) | App (그림20~23) |
| 수평 바차트 | Recharts (SSR) | IV-5.2 (그림16), III (그림9~10) |
| 위치도(지도) | Kakao Maps Static | IV-4.2, IV-4.3, IV-5.2 (그림14~16) |

Recharts를 서버사이드에서 SVG로 렌더링하여 HTML에 인라인 삽입.

### 6.3 표 렌더링 구조

64개 표를 함수화:

```typescript
// 각 표는 독립 렌더 함수
function renderTable1_ProjectOverview(data: ScrReportData): string { ... }
function renderTable3_SalePrice(data: ScrReportData): string { ... }
function renderTable41_BusinessIncome(data: ScrReportData): string { ... }
function renderTable44_MonthlyCashflow1(data: MonthlyCashflowRow[]): string { ... }
// ... 64개
```

월별 자금수지 표(표44~46)는 48개월을 16개월씩 3분할:
- 표44: 착공~분양 초기 (~16개월)
- 표45: 분양 중기 (17~32개월)
- 표46: 입주~사업종료 (33~48개월+사업종료)

---

## 7. 파일 구조

### 7.1 신규 파일 목록

```
lib/feasibility/
├── scr-types.ts                    # SCR 전체 데이터 모델 (Phase 1)
├── scr-parser-extensions.ts        # 파싱 45개+ 확장 (Phase 2)
├── scr-project-type-detector.ts    # 사업 유형 자동 감지 (Phase 2)
├── api/
│   ├── kosis.ts                    # 통계청 KOSIS API (Phase 1)
│   ├── dart.ts                     # DART 전자공시 API (Phase 1)
│   ├── reps.ts                     # 부동산원 REPS API (Phase 1)
│   └── mois.ts                     # 행안부 주민등록 API (Phase 1)
├── calc/
│   ├── business-income.ts          # 사업수지 계산기 (Phase 3)
│   ├── monthly-cashflow.ts         # 월별 자금수지 생성기 (Phase 3)
│   ├── scenario.ts                 # 시나리오 엔진 (Phase 3)
│   ├── bep.ts                      # BEP 분양률 계산기 (Phase 3)
│   ├── dscr.ts                     # DSCR 계산기 (Phase 3)
│   └── sensitivity.ts              # 민감도 분석 (Phase 3)
├── scr-report-html.ts              # SCR 동일 HTML 렌더러 (Phase 4)
├── scr-report-charts.ts            # 23개 차트 생성 (Phase 4)
├── scr-report-tables.ts            # 64개 표 렌더 함수 (Phase 4)
├── scr-report-css.ts               # SCR 스타일시트 (Phase 4)
├── static/
│   ├── government-policies.json    # 정부 부동산 대책 연표 (Phase 1)
│   ├── regulation-areas.json       # 규제지역 현황 (Phase 1)
│   ├── hug-high-price.json         # HUG 고분양가 관리지역 (Phase 1)
│   └── construction-cost-index.json # KICT 건설공사비지수 (Phase 1)

app/api/feasibility/
├── scr-parse/route.ts              # 확장 파싱 API (Phase 2)
├── scr-calculate/route.ts          # 계산 엔진 API (Phase 3)
├── scr-report/route.ts             # 보고서 생성 API (Phase 4)
└── scr-report/[id]/route.ts        # 보고서 조회 API (Phase 4)

components/feasibility/
├── ScrReportWizard.tsx              # 입력 위저드 (Phase 5)
├── ScrFileUploadStep.tsx            # 파일 업로드 단계 (Phase 5)
├── ScrDataReviewStep.tsx            # 데이터 검토/수정 단계 (Phase 5)
├── ScrProgressIndicator.tsx         # 생성 진행률 표시 (Phase 5)
├── ScrReportPreview.tsx             # 보고서 미리보기 (Phase 5)
└── ScrPdfDownload.tsx               # PDF 다운로드 버튼 (Phase 5)
```

---

## 8. 구현 Phase 세부 분해

### Phase 1: 데이터 수집 인프라 (신규 API + 정적DB + 타입) — 예상 3일

| # | 작업 | 파일 | 의존성 | 난이도 |
|---|------|------|--------|-------|
| 1.1 | SCR 전체 데이터 모델 타입 정의 | `scr-types.ts` | 없음 | 중 |
| 1.2 | 통계청 KOSIS API 클라이언트 | `api/kosis.ts` | KOSIS_API_KEY | 중 |
| 1.3 | DART 전자공시 API 클라이언트 | `api/dart.ts` | DART_API_KEY | 상 |
| 1.4 | 부동산원 REPS API 클라이언트 | `api/reps.ts` | REPS_API_KEY | 중 |
| 1.5 | 행안부 MOIS API 클라이언트 | `api/mois.ts` | MOIS_API_KEY | 중 |
| 1.6 | 정적DB JSON 4종 생성 | `static/*.json` | 없음 | 하 |
| 1.7 | 환경변수 등록 + API 키 발급 | `.env.local` | 외부 |  하 |

### Phase 2: 파싱 엔진 고도화 — 예상 2일

| # | 작업 | 파일 | 의존성 | 난이도 |
|---|------|------|--------|-------|
| 2.1 | 파싱 항목 45개+ 확장 (정규식+NER) | `scr-parser-extensions.ts` | Phase 1.1 | 상 |
| 2.2 | 타입별 분양가 테이블 파싱 | `scr-parser-extensions.ts` | 2.1 | 상 |
| 2.3 | 사업수지표 구조 파싱 (수입/지출) | `scr-parser-extensions.ts` | 2.1 | 상 |
| 2.4 | 분양대금 납입일정 파싱 | `scr-parser-extensions.ts` | 2.1 | 중 |
| 2.5 | 사업 유형 자동 감지 | `scr-project-type-detector.ts` | 2.1 | 중 |
| 2.6 | SCR Parse API Route | `scr-parse/route.ts` | 2.1~2.5 | 하 |
| 2.7 | 파싱 테스트 (SCR 원본 PDF 기준) | `__tests__/` | 2.1~2.5 | 중 |

### Phase 3: 계산 엔진 구축 — 예상 4일

| # | 작업 | 파일 | 의존성 | 난이도 |
|---|------|------|--------|-------|
| 3.1 | 사업수지 계산기 (복합시설 대응) | `calc/business-income.ts` | Phase 1.1 | 상 |
| 3.2 | 월별 자금수지 생성기 (48개월) | `calc/monthly-cashflow.ts` | 3.1 | 최상 |
| 3.3 | 시나리오 엔진 (분양률 변동) | `calc/scenario.ts` | 3.1 | 중 |
| 3.4 | BEP 분양률 계산기 (3종 x 3조합) | `calc/bep.ts` | 3.1 | 상 |
| 3.5 | DSCR 계산기 | `calc/dscr.ts` | 3.2 | 중 |
| 3.6 | 민감도 분석 | `calc/sensitivity.ts` | 3.3, 3.5 | 중 |
| 3.7 | SCR Calculate API Route | `scr-calculate/route.ts` | 3.1~3.6 | 하 |
| 3.8 | 계산 엔진 테스트 (SCR 원본 수치 검증) | `__tests__/` | 3.1~3.6 | 상 |

### Phase 4: 보고서 템플릿 구축 — 예상 5일

| # | 작업 | 파일 | 의존성 | 난이도 |
|---|------|------|--------|-------|
| 4.1 | SCR 스타일 CSS (A4, 헤더/푸터/페이지번호) | `scr-report-css.ts` | 없음 | 중 |
| 4.2 | 전문부 렌더러 (표지~목차, 7페이지) | `scr-report-html.ts` | 4.1 | 중 |
| 4.3 | I장 렌더러 (표1~7, 그림1) | `scr-report-tables.ts` | 4.1 | 중 |
| 4.4 | II장 렌더러 (표8~16) — DART 데이터 활용 | `scr-report-tables.ts` | Phase 1.3 | 상 |
| 4.5 | III장 렌더러 (표17~29, 그림2~10) — API 데이터 활용 | `scr-report-tables.ts` | Phase 1.2,1.5 | 최상 |
| 4.6 | IV장 렌더러 (표30~39, 그림11~16) | `scr-report-tables.ts` | 4.1 | 상 |
| 4.7 | V장 렌더러 (표40~52, 그림17~19) | `scr-report-tables.ts` | Phase 3 | 최상 |
| 4.8 | Appendices 렌더러 (표53~64, 그림20~23) | `scr-report-tables.ts` | Phase 1.6 | 중 |
| 4.9 | 23개 차트 생성 (Recharts SSR -> SVG) | `scr-report-charts.ts` | 4.1 | 상 |
| 4.10 | 자동 목차 생성 (전체/표/그림/부록) | `scr-report-html.ts` | 4.2~4.8 | 중 |
| 4.11 | SCR Report API Route | `scr-report/route.ts` | 4.2~4.10 | 하 |
| 4.12 | Print-to-PDF 최적화 (페이지 브레이크 조정) | `scr-report-css.ts` | 4.2~4.10 | 중 |

### Phase 5: UI/UX 고도화 — 예상 3일

| # | 작업 | 파일 | 의존성 | 난이도 |
|---|------|------|--------|-------|
| 5.1 | 입력 위저드 (3단계: 업로드→검토→생성) | `ScrReportWizard.tsx` | Phase 2,3,4 | 중 |
| 5.2 | 파일 업로드 단계 (10개 파일, 필수/선택 표시) | `ScrFileUploadStep.tsx` | 5.1 | 중 |
| 5.3 | 데이터 검토/수정 단계 (파싱 결과 편집) | `ScrDataReviewStep.tsx` | 5.1 | 상 |
| 5.4 | 실시간 진행률 표시 (SSE) | `ScrProgressIndicator.tsx` | 5.1 | 중 |
| 5.5 | 보고서 미리보기 (iframe, 60~80p) | `ScrReportPreview.tsx` | 5.1 | 중 |
| 5.6 | PDF 다운로드 | `ScrPdfDownload.tsx` | 5.5 | 하 |
| 5.7 | 기존 사업성 분석 페이지에 SCR 모드 추가 | 기존 페이지 수정 | 5.1~5.6 | 중 |

---

## 9. 구현 순서 및 의존성 그래프

```
Phase 1 (API+타입)  ───┬──→ Phase 3 (계산엔진) ──→ Phase 4.7 (V장)
   |                   |                              |
   |                   └──→ Phase 4.4 (II장)          |
   |                   └──→ Phase 4.5 (III장)         |
   |                                                   |
   └──→ Phase 2 (파싱) ────────────────────────────→ Phase 4 (전체)
                                                       |
                                                       └──→ Phase 5 (UI)
```

**병렬 진행 가능**:
- Phase 1 + Phase 2 동시 진행
- Phase 1 완료 후 Phase 3 + Phase 4.1~4.3 동시 진행
- Phase 3 완료 후 Phase 4.7 진행

---

## 10. 테스트 전략

### 10.1 테스트 범위

| 유형 | 대상 | 도구 | 기준 |
|------|------|------|------|
| 단위 테스트 | 계산 엔진 6개 | Vitest | SCR 원본 수치와 1% 이내 오차 |
| 단위 테스트 | 파싱 확장 | Vitest | SCR PDF에서 45개 항목 추출 성공 |
| 통합 테스트 | API Route | Vitest + fetch | 200 응답 + 올바른 구조 |
| 스냅샷 테스트 | HTML 렌더링 | Vitest | 표/그림 번호 매김 정확성 |
| 시각 테스트 | PDF 출력 | 수동 (Print-to-PDF) | SCR 원본과 레이아웃 비교 |

### 10.2 핵심 검증 데이터 (SCR 원본 기준)

| 항목 | SCR 원본값 | 허용 오차 |
|------|---------|---------|
| 분양수입 합계 | 234,068백만원 | 0% |
| 사업비 합계 | 217,708백만원 | 0% |
| 세전사업이익 | 16,360백만원 | 0% |
| 이익률 | 7.0% | 0.1%p |
| 차주안 DSCR | 1.50배 | 0.01 |
| 시나리오1 사업이익 | (-)1,422백만원 | 0% |
| 시나리오2 사업이익 | (-)11,428백만원 | 0% |
| BEP(1) PF Exit | 81.4% | 0.1%p |
| BEP(2) PF Exit | 83.9% | 0.1%p |
| BEP(3) PF Exit | 87.2% | 0.1%p |

---

## 11. 에이전트 팀 구성 제안

VESTRA 프로젝트 레벨: **Dynamic** -> 최대 3 에이전트

### 11.1 추천 팀 구성

| 역할 | 담당 Phase | 주요 업무 |
|------|----------|---------|
| **Backend Expert** | Phase 1, 2, 3 | API 연동, 파싱 엔진 확장, 계산 엔진 구축 |
| **Frontend Architect** | Phase 4, 5 | HTML 보고서 렌더링, 차트 생성, UI 위저드 |
| **QA Strategist** | Check 단계 | SCR 원본 대비 수치 검증, 레이아웃 비교 |

### 11.2 오케스트레이션 패턴

| PDCA Phase | 패턴 | 설명 |
|------------|------|------|
| Plan | Leader | CTO가 기획서 검토 및 보완 (완료) |
| Design | Leader | CTO가 설계서 작성 (현재) |
| Do (Phase 1~2) | Swarm | Backend Expert가 API+파싱, Frontend가 타입+정적DB |
| Do (Phase 3) | Pipeline | Backend Expert 단독 (계산 엔진은 순차적 의존성) |
| Do (Phase 4~5) | Swarm | Frontend가 렌더링+UI, Backend가 API Route |
| Check | Council | QA + CTO가 SCR 원본 대비 검증 |
| Act | Leader | CTO가 수정 우선순위 결정 |

### 11.3 Phase별 예상 일정

| Phase | 기간 | 병렬 가능 |
|-------|------|---------|
| Phase 1 (API+타입) | 3일 | Phase 2와 병렬 |
| Phase 2 (파싱 확장) | 2일 | Phase 1과 병렬 |
| Phase 3 (계산 엔진) | 4일 | Phase 4.1~4.3과 부분 병렬 |
| Phase 4 (HTML 렌더링) | 5일 | Phase 3 완료 후 V장 렌더링 |
| Phase 5 (UI/UX) | 3일 | Phase 4 완료 후 |
| **총 예상** | **~12일** (병렬 시 ~10일) | |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-22 | 초안 작성 (SCR 79p 전수 분석 기반) | CTO Lead |
