/**
 * SCR 보고서 폴백 데이터 생성
 *
 * API 실패 시 프로젝트 컨텍스트(주소, 프로젝트 타입, 구/군) 기반으로
 * 현실적인 폴백 데이터를 생성합니다.
 *
 * 모든 반환값에 _isFallback 마커를 포함하여 UI에서 "추정치" 표시가 가능합니다.
 *
 * @module lib/feasibility/scr-fallback-data
 */

import { classifyRegion } from "./benchmark-db";

// ─── 지역별 기초 데이터 ───

const REGION_POPULATION: Record<string, { population: number; households: number; yoyPop: number; yoyHh: number }> = {
  서울: { population: 9_411_000, households: 4_250_000, yoyPop: -0.003, yoyHh: 0.008 },
  경기: { population: 13_640_000, households: 5_680_000, yoyPop: 0.005, yoyHh: 0.012 },
  인천: { population: 2_980_000, households: 1_260_000, yoyPop: 0.002, yoyHh: 0.010 },
  부산: { population: 3_350_000, households: 1_520_000, yoyPop: -0.005, yoyHh: 0.006 },
  대구: { population: 2_380_000, households: 1_040_000, yoyPop: -0.004, yoyHh: 0.005 },
  대전: { population: 1_450_000, households: 640_000, yoyPop: -0.002, yoyHh: 0.007 },
  광주: { population: 1_420_000, households: 620_000, yoyPop: -0.003, yoyHh: 0.006 },
  세종: { population: 390_000, households: 165_000, yoyPop: 0.025, yoyHh: 0.030 },
  지방: { population: 1_800_000, households: 780_000, yoyPop: -0.005, yoyHh: 0.004 },
};

const REGION_SUPPLY_RATE: Record<string, number> = {
  서울: 97.2, 경기: 103.5, 인천: 105.8, 부산: 108.2,
  대구: 106.4, 대전: 104.9, 광주: 107.1, 세종: 112.5, 지방: 110.3,
};

const AGE_DISTRIBUTION_TEMPLATE = [
  { label: "0~9세", ratio: 0.07 },
  { label: "10~19세", ratio: 0.09 },
  { label: "20~29세", ratio: 0.13 },
  { label: "30~39세", ratio: 0.14 },
  { label: "40~49세", ratio: 0.15 },
  { label: "50~59세", ratio: 0.17 },
  { label: "60~69세", ratio: 0.13 },
  { label: "70~79세", ratio: 0.08 },
  { label: "80세 이상", ratio: 0.04 },
];

const REGION_UNSOLD_BASE: Record<string, number> = {
  서울: 120, 경기: 2800, 인천: 1500, 부산: 3200,
  대구: 4500, 대전: 1800, 광주: 2100, 세종: 1200, 지방: 3500,
};

// ─── 기준금리 추이 (실제 데이터 기반) ───

const INTEREST_RATE_HISTORY = [
  { yearMonth: "2024-01", baseRate: 3.50, mortgageRate: 4.80 },
  { yearMonth: "2024-03", baseRate: 3.50, mortgageRate: 4.75 },
  { yearMonth: "2024-06", baseRate: 3.50, mortgageRate: 4.60 },
  { yearMonth: "2024-09", baseRate: 3.50, mortgageRate: 4.55 },
  { yearMonth: "2024-10", baseRate: 3.25, mortgageRate: 4.40 },
  { yearMonth: "2024-12", baseRate: 3.00, mortgageRate: 4.20 },
  { yearMonth: "2025-02", baseRate: 2.75, mortgageRate: 4.05 },
  { yearMonth: "2025-04", baseRate: 2.75, mortgageRate: 3.95 },
  { yearMonth: "2025-06", baseRate: 2.50, mortgageRate: 3.85 },
  { yearMonth: "2025-09", baseRate: 2.50, mortgageRate: 3.80 },
  { yearMonth: "2025-12", baseRate: 2.50, mortgageRate: 3.75 },
  { yearMonth: "2026-03", baseRate: 2.50, mortgageRate: 3.70 },
];

// ─── 폴백 생성 함수 ───

export function generateFallbackPopulation(district: string) {
  const region = classifyRegion(district);
  const base = REGION_POPULATION[region] || REGION_POPULATION["지방"];
  const currentYear = new Date().getFullYear();
  const trends: { year: number; population: number; households: number }[] = [];

  for (let i = 4; i >= 0; i--) {
    const factor = Math.pow(1 + base.yoyPop, -i);
    const hhFactor = Math.pow(1 + base.yoyHh, -i);
    trends.push({
      year: currentYear - i,
      population: Math.round(base.population * factor),
      households: Math.round(base.households * hhFactor),
    });
  }

  return { trends, _isFallback: true as const };
}

export function generateFallbackHousingSupply(district: string) {
  const region = classifyRegion(district);
  const baseRate = REGION_SUPPLY_RATE[region] || 106;
  const currentYear = new Date().getFullYear();
  const trends: { year: number; supplyRate: number; totalHousing: number }[] = [];

  for (let i = 4; i >= 0; i--) {
    const rate = baseRate - i * 0.8 + Math.random() * 0.4;
    trends.push({
      year: currentYear - i,
      supplyRate: Math.round(rate * 10) / 10,
      totalHousing: Math.round(450_000 + Math.random() * 50_000),
    });
  }

  return { trends, _isFallback: true as const };
}

export function generateFallbackAgeDistribution(district: string) {
  const region = classifyRegion(district);
  const base = REGION_POPULATION[region] || REGION_POPULATION["지방"];
  // 수도권은 30~40대 비중 높게, 지방은 50~60대 비중 높게 보정
  const isMetro = ["서울", "경기", "인천"].includes(region);

  const ageGroups = AGE_DISTRIBUTION_TEMPLATE.map((ag) => {
    let adjustedRatio = ag.ratio;
    if (isMetro && (ag.label === "30~39세" || ag.label === "20~29세")) {
      adjustedRatio += 0.015;
    } else if (!isMetro && (ag.label === "60~69세" || ag.label === "70~79세")) {
      adjustedRatio += 0.02;
    }
    return {
      ageGroup: ag.label,
      total: Math.round(base.population * adjustedRatio),
    };
  });

  return { ageGroups, _isFallback: true as const };
}

export function generateFallbackUnsoldTrend(district: string) {
  const region = classifyRegion(district);
  const base = REGION_UNSOLD_BASE[region] || 3000;
  const currentYear = new Date().getFullYear();
  const trends: { yearMonth: string; totalUnsold: number; postCompletionUnsold: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const month = new Date(currentYear, new Date().getMonth() - i, 1);
    const variation = 1 + (Math.random() - 0.5) * 0.15;
    const total = Math.round(base * variation);
    trends.push({
      yearMonth: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
      totalUnsold: total,
      postCompletionUnsold: Math.round(total * 0.35),
    });
  }

  return { trends, _isFallback: true as const };
}

const REGION_TX_VOLUME: Record<string, number> = {
  서울: 9500, 경기: 11000, 인천: 5500, 부산: 5200,
  대구: 4000, 대전: 3200, 광주: 2800, 세종: 1800, 지방: 3500,
};

export function generateFallbackTransactions(district: string) {
  const region = classifyRegion(district);
  const baseVol = REGION_TX_VOLUME[region] || 3500;
  const currentYear = new Date().getFullYear();
  const transactions: { year: number; volume: number; yoyChange: number }[] = [];

  for (let i = 4; i >= 0; i--) {
    const variation = 1 + (Math.random() - 0.5) * 0.2;
    const vol = Math.round(baseVol * variation);
    transactions.push({
      year: currentYear - i,
      volume: vol,
      yoyChange: Math.round((variation - 1) * 100 * 10) / 10,
    });
  }

  return { transactions, _isFallback: true as const };
}

export function generateFallbackInterestRate() {
  return {
    trends: INTEREST_RATE_HISTORY,
    _isFallback: true as const,
  };
}

const REGION_PRICE_INDEX: Record<string, { base: number; growth: number; rentBase: number; rentGrowth: number }> = {
  서울: { base: 108, growth: 0.004, rentBase: 103, rentGrowth: 0.003 },
  경기: { base: 104, growth: 0.003, rentBase: 100, rentGrowth: 0.0025 },
  인천: { base: 102, growth: 0.0025, rentBase: 98, rentGrowth: 0.002 },
  부산: { base: 100, growth: 0.0015, rentBase: 96, rentGrowth: 0.001 },
  대구: { base: 97, growth: 0.001, rentBase: 94, rentGrowth: 0.001 },
  대전: { base: 100, growth: 0.002, rentBase: 96, rentGrowth: 0.0015 },
  광주: { base: 99, growth: 0.0015, rentBase: 95, rentGrowth: 0.001 },
  세종: { base: 95, growth: 0.001, rentBase: 92, rentGrowth: 0.001 },
  지방: { base: 96, growth: 0.0008, rentBase: 93, rentGrowth: 0.0008 },
};

export function generateFallbackPriceIndex(district: string) {
  const region = classifyRegion(district);
  const params = REGION_PRICE_INDEX[region] || REGION_PRICE_INDEX["지방"];
  const indices: { yearMonth: string; index: number }[] = [];
  const rentIndices: { yearMonth: string; index: number }[] = [];

  for (let i = 23; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const saleIdx = Math.round((params.base + (23 - i) * params.growth * params.base) * 10) / 10;
    const rentIdx = Math.round((params.rentBase + (23 - i) * params.rentGrowth * params.rentBase) * 10) / 10;

    indices.push({ yearMonth: ym, index: saleIdx });
    rentIndices.push({ yearMonth: ym, index: rentIdx });
  }

  return { indices, rentIndices, _isFallback: true as const };
}

export function generateFallbackDeveloper(companyName: string) {
  const currentYear = new Date().getFullYear();
  const baseRevenue = 150_000; // 1,500억 (만원 단위)

  const incomeStatements = Array.from({ length: 6 }, (_, i) => {
    const year = currentYear - 5 + i;
    const growth = 1 + i * 0.08;
    const revenue = Math.round(baseRevenue * growth);
    const costOfSales = Math.round(revenue * 0.82);
    const grossProfit = revenue - costOfSales;
    const operatingProfit = Math.round(grossProfit * 0.55);
    const netIncome = Math.round(operatingProfit * 0.72);

    return {
      year,
      revenue,
      costOfSales,
      grossProfit,
      operatingProfit,
      ebitda: Math.round(operatingProfit * 1.15),
      netIncome,
    };
  });

  const balanceSheets = Array.from({ length: 6 }, (_, i) => {
    const year = currentYear - 5 + i;
    const growth = 1 + i * 0.06;
    const totalAssets = Math.round(200_000 * growth);
    const totalLiabilities = Math.round(totalAssets * 0.65);

    return { year, totalAssets, totalLiabilities };
  });

  const cashFlow = Array.from({ length: 6 }, (_, i) => {
    const year = currentYear - 5 + i;
    return {
      year,
      operating: Math.round(12_000 + i * 2000 + (Math.random() - 0.3) * 5000),
      investing: Math.round(-8_000 - i * 1500),
      financing: Math.round(-3_000 + (Math.random() - 0.5) * 4000),
    };
  });

  return {
    corpName: companyName || "미확인",
    ceoName: "",
    establishDate: "",
    incomeStatements,
    balanceSheets,
    cashFlow,
    _isFallback: true as const,
  };
}

// ─── 주택 분포 폴백 ───

const REGION_HOUSING_DIST: Record<string, { apt: number; multi: number; detached: number; other: number }> = {
  서울: { apt: 58, multi: 22, detached: 10, other: 10 },
  경기: { apt: 62, multi: 16, detached: 14, other: 8 },
  인천: { apt: 65, multi: 14, detached: 13, other: 8 },
  부산: { apt: 60, multi: 12, detached: 18, other: 10 },
  대구: { apt: 58, multi: 13, detached: 20, other: 9 },
  대전: { apt: 55, multi: 14, detached: 22, other: 9 },
  광주: { apt: 56, multi: 12, detached: 23, other: 9 },
  세종: { apt: 72, multi: 8, detached: 12, other: 8 },
  지방: { apt: 48, multi: 10, detached: 32, other: 10 },
};

const REGION_BUILDING_AGE: Record<string, number[]> = {
  서울: [10, 14, 26, 28, 22],
  경기: [18, 20, 28, 22, 12],
  인천: [16, 18, 27, 24, 15],
  부산: [12, 15, 25, 27, 21],
  대구: [14, 16, 26, 26, 18],
  대전: [13, 17, 28, 25, 17],
  광주: [14, 16, 27, 25, 18],
  세종: [45, 30, 15, 8, 2],
  지방: [10, 13, 24, 28, 25],
};

export function generateFallbackHousingDistribution(district: string) {
  const region = classifyRegion(district);
  const dist = REGION_HOUSING_DIST[region] || REGION_HOUSING_DIST["지방"];
  const ages = REGION_BUILDING_AGE[region] || REGION_BUILDING_AGE["지방"];

  return {
    housingDistribution: [
      { type: "아파트", ratio: dist.apt },
      { type: "연립/다세대", ratio: dist.multi },
      { type: "단독주택", ratio: dist.detached },
      { type: "기타", ratio: dist.other },
    ],
    buildingAge: [
      { range: "5년 미만", ratio: ages[0] },
      { range: "5~10년", ratio: ages[1] },
      { range: "10~20년", ratio: ages[2] },
      { range: "20~30년", ratio: ages[3] },
      { range: "30년 이상", ratio: ages[4] },
    ],
    _isFallback: true as const,
  };
}
