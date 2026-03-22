/**
 * 시세 예측 엔진 (Price Forecast Engine)
 *
 * 주변 시세 분석 + 준공 후 변동시세 예측
 * 모든 금액 단위: 만원/평
 *
 * @module lib/feasibility/calc/price-forecast
 */

// ─── 입력 타입 ───

/** 인근 매매/분양 사례 */
export interface NearbyCase {
  name: string;                    // 단지명
  pricePerPyeong: number;         // 현재 시세 (만원/평)
  saleDate: string;                // 매매/분양 시점 (YYYY-MM)
  isPremiumCase: boolean;          // 프리미엄 분석 대상 여부
  originalSalePrice?: number;      // 최초 분양가 (만원/평, 프리미엄 계산용)
}

/** 지역 매매가격지수 */
export interface RegionalPriceIndex {
  month: string;                   // YYYY-MM
  index: number;                   // 지수값
}

/** 시세 예측 입력값 */
export interface PriceForecastInput {
  address: string;                 // 소재지
  projectType: "재건축" | "신축";
  completionDate: string;          // 준공 예정일 (YYYY-MM)
  plannedPricePerPyeong: number;   // 계획 분양가 (만원/평)
  nearbyCases: NearbyCase[];       // 인근 매매/분양사례
  regionalPriceIndex: RegionalPriceIndex[]; // 지역 매매가격지수 (월별)
}

// ─── 출력 타입 ───

/** 재건축 추가 분석 결과 */
export interface ReconstructionAnalysis {
  currentPrice: number;            // 현재 시세 (만원/평)
  estimatedPostPrice: number;      // 준공 후 추정 시세 (만원/평)
  contributionPerUnit: number;     // 세대당 분담금 (만원)
  expectedProfit: number;          // 세대당 예상 수익 (만원)
  profitRate: number;              // 수익률 (%)
}

/** 시세 예측 결과 */
export interface PriceForecastResult {
  /** 현재 주변 평균 시세 (만원/평) */
  currentAvgPrice: number;
  /** 시세 범위 */
  priceRange: { min: number; max: number };
  /** 평균 프리미엄률 (%) */
  avgPremiumRate: number;
  /** 연간 상승률 (%) */
  annualGrowthRate: number;
  /** 시나리오별 준공 후 예측 시세 (만원/평) */
  forecast: {
    conservative: number;  // 보수적
    moderate: number;      // 중립적
    optimistic: number;    // 낙관적
  };
  /** 계획 분양가 대비 현재 시세 비교 */
  priceComparison: {
    plannedPrice: number;             // 계획 분양가
    currentAvg: number;               // 현재 평균 시세
    gapAmount: number;                // 차이 (만원/평)
    gapRate: number;                  // 차이율 (%)
    assessment: "할인" | "적정" | "고가"; // 분양가 적정성 평가
  };
  /** 재건축 추가 분석 (projectType이 재건축일 때) */
  reconstruction?: ReconstructionAnalysis;
}

// ─── 내부 유틸 ───

/** 두 날짜 사이의 개월 수 계산 */
function monthsBetween(from: string, to: string): number {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

/** 선형 회귀로 연간 성장률 추정 */
function estimateAnnualGrowthRate(indices: RegionalPriceIndex[]): number {
  if (indices.length < 2) return 0;

  // 시간을 연 단위로 변환
  const sorted = [...indices].sort((a, b) => a.month.localeCompare(b.month));
  const baseMonth = sorted[0].month;

  const n = sorted.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const entry of sorted) {
    const x = monthsBetween(baseMonth, entry.month) / 12; // 연 단위
    const y = entry.index;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;

  // 기울기 (연간 지수 변화)
  const slope = (n * sumXY - sumX * sumY) / denominator;

  // 기준 지수 (절편)
  const intercept = (sumY - slope * sumX) / n;

  if (intercept === 0) return 0;

  // 연간 성장률 (%)
  return Math.round((slope / intercept) * 10000) / 100;
}

/** 프리미엄률 계산 */
function calculatePremiumRate(currentPrice: number, originalPrice: number): number {
  if (originalPrice === 0) return 0;
  return Math.round(((currentPrice - originalPrice) / originalPrice) * 10000) / 100;
}

// ─── 메인 계산 함수 ───

/**
 * 주변 시세를 분석하고 준공 후 변동시세를 예측합니다
 *
 * 분석 항목:
 * - 인근 사례 기반 현재 평균 시세
 * - 프리미엄 사례의 평균 프리미엄률
 * - 지역 가격지수 기반 연간 상승률 추정
 * - 3가지 시나리오(보수/중립/낙관)별 준공 후 시세 예측
 * - 재건축인 경우 추가 분석 (분담금, 예상 수익)
 */
export function forecastPrice(input: PriceForecastInput): PriceForecastResult {
  const {
    projectType,
    completionDate,
    plannedPricePerPyeong,
    nearbyCases,
    regionalPriceIndex,
  } = input;

  // ── 현재 시세 분석 ──
  const prices = nearbyCases.map((c) => c.pricePerPyeong);
  const currentAvgPrice = prices.length > 0
    ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    : 0;

  const priceRange = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
  };

  // ── 프리미엄 분석 ──
  const premiumCases = nearbyCases.filter(
    (c) => c.isPremiumCase && c.originalSalePrice && c.originalSalePrice > 0
  );
  const premiumRates = premiumCases.map((c) =>
    calculatePremiumRate(c.pricePerPyeong, c.originalSalePrice!)
  );
  const avgPremiumRate = premiumRates.length > 0
    ? Math.round(premiumRates.reduce((s, r) => s + r, 0) / premiumRates.length * 100) / 100
    : 0;

  // ── 연간 상승률 추정 ──
  const annualGrowthRate = estimateAnnualGrowthRate(regionalPriceIndex);

  // ── 준공 후 시세 예측 ──
  // 현재 시점 기준 준공까지의 기간 (연)
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearsToCompletion = Math.max(0, monthsBetween(currentYearMonth, completionDate) / 12);

  // 시나리오별 연간 성장률 가정
  const conservativeGrowth = Math.max(annualGrowthRate * 0.5, -2); // 보수적: 절반 or 최소 -2%
  const moderateGrowth = annualGrowthRate;                          // 중립: 추세 유지
  const optimisticGrowth = annualGrowthRate * 1.5;                  // 낙관: 1.5배

  const forecast = {
    conservative: Math.round(currentAvgPrice * Math.pow(1 + conservativeGrowth / 100, yearsToCompletion)),
    moderate: Math.round(currentAvgPrice * Math.pow(1 + moderateGrowth / 100, yearsToCompletion)),
    optimistic: Math.round(currentAvgPrice * Math.pow(1 + optimisticGrowth / 100, yearsToCompletion)),
  };

  // ── 분양가 적정성 비교 ──
  const gapAmount = plannedPricePerPyeong - currentAvgPrice;
  const gapRate = currentAvgPrice !== 0
    ? Math.round((gapAmount / currentAvgPrice) * 10000) / 100
    : 0;

  let assessment: "할인" | "적정" | "고가";
  if (gapRate < -5) {
    assessment = "할인";    // 현재 시세 대비 5% 이상 저렴
  } else if (gapRate <= 10) {
    assessment = "적정";    // ±10% 이내
  } else {
    assessment = "고가";    // 10% 이상 고가
  }

  const priceComparison = {
    plannedPrice: plannedPricePerPyeong,
    currentAvg: currentAvgPrice,
    gapAmount,
    gapRate,
    assessment,
  };

  // ── 재건축 추가 분석 ──
  let reconstruction: ReconstructionAnalysis | undefined;

  if (projectType === "재건축") {
    const estimatedPostPrice = forecast.moderate;
    // 재건축 분담금 ≈ 계획 분양가 - 현재 시세 (단순 추정)
    const contributionPerUnit = Math.max(0, plannedPricePerPyeong - currentAvgPrice);
    const expectedProfit = estimatedPostPrice - plannedPricePerPyeong;
    const profitRate = plannedPricePerPyeong !== 0
      ? Math.round((expectedProfit / plannedPricePerPyeong) * 10000) / 100
      : 0;

    reconstruction = {
      currentPrice: currentAvgPrice,
      estimatedPostPrice,
      contributionPerUnit,
      expectedProfit,
      profitRate,
    };
  }

  return {
    currentAvgPrice,
    priceRange,
    avgPremiumRate,
    annualGrowthRate,
    forecast,
    priceComparison,
    reconstruction,
  };
}
