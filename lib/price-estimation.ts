/**
 * VESTRA 매매가 추정 엔진 (Price Estimation Engine)
 * ─────────────────────────────────────────────────
 * MOLIT 실거래 데이터 기반 비교매물 분석 알고리즘.
 * LLM 없이 통계적 방법으로 매매가/전세가를 추정.
 */

import type { RealTransaction, PriceResult, RentPriceResult } from "./molit-api";

// ─── 타입 정의 ───

export interface TargetProperty {
  aptName?: string;
  area?: number;
  address: string;
  floor?: number;
}

export interface ComparableTransaction extends RealTransaction {
  weight: number;
  similarity: number;
  adjustedPrice: number;
}

export interface PriceEstimationResult {
  estimatedPrice: number;
  estimatedJeonsePrice: number;
  jeonseRatio: number;
  confidence: number;
  comparableCount: number;
  priceRange: {
    min: number;
    max: number;
    stdDev: number;
  };
  method: "building_match" | "area_match" | "district_avg" | "fallback";
  comparables: ComparableTransaction[];
}

// ─── 유틸리티 ───

/** 건물명에서 매칭용 키워드 추출 */
function extractKeywords(name: string): string[] {
  if (!name) return [];
  return name
    .replace(/\d+의?\d*[-\d]*/g, " ")
    .replace(/(특별자치시|특별자치도|특별시|광역시)/g, " ")
    .replace(/\b(시|도|구|군|읍|면|동|리|로|길|가|층|호|실)\b/g, " ")
    .replace(/제\s*\d+/g, " ")
    .replace(/\[.*?\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length >= 2);
}

/** 건물명 키워드 매칭 */
function matchesBuildingName(txName: string, targetKeywords: string[]): boolean {
  if (!txName || targetKeywords.length === 0) return false;
  return targetKeywords.some(
    (kw) =>
      (txName.includes(kw)) ||
      (kw.includes(txName) && txName.length >= 2)
  );
}

/** 거래 시점에서 현재까지의 개월 수 */
function monthsAgo(tx: RealTransaction, now: Date): number {
  const txDate = new Date(tx.dealYear, tx.dealMonth - 1, tx.dealDay);
  return Math.max(0, (now.getTime() - txDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
}

/** 표준편차 계산 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ─── 비교매물 필터링 ───

/** Tier 1: 건물명 매칭으로 비교매물 필터링 */
function filterByBuildingName(
  transactions: RealTransaction[],
  target: TargetProperty,
): RealTransaction[] {
  const keywords = [
    ...extractKeywords(target.aptName || ""),
    ...extractKeywords(target.address),
  ];
  if (keywords.length === 0) return [];

  return transactions.filter((tx) => matchesBuildingName(tx.aptName, keywords));
}

/** Tier 2: 면적 유사성으로 필터링 (±20%) */
function filterByArea(
  transactions: RealTransaction[],
  targetArea: number,
): RealTransaction[] {
  if (!targetArea || targetArea <= 0) return [];
  return transactions.filter(
    (tx) => tx.area > 0 && Math.abs(tx.area - targetArea) / targetArea < 0.2
  );
}

// ─── 가중치 및 가격 보정 ───

/** 시간 감쇠 가중치: 최근 거래일수록 높은 가중치 */
function timeWeight(months: number): number {
  return Math.exp(-0.1 * months);
}

/** 면적 유사도 가중치 */
function areaWeight(txArea: number, targetArea: number): number {
  if (!targetArea || targetArea <= 0 || !txArea || txArea <= 0) return 1;
  return 1 - Math.min(Math.abs(txArea - targetArea) / targetArea, 0.5);
}

/** 면적 보정 가격 */
function adjustPriceByArea(dealAmount: number, txArea: number, targetArea: number): number {
  if (!targetArea || targetArea <= 0 || !txArea || txArea <= 0) return dealAmount;
  if (Math.abs(txArea - targetArea) / targetArea < 0.05) return dealAmount;
  return Math.round(dealAmount * (targetArea / txArea));
}

/** 층수 프리미엄 보정 */
function adjustPriceByFloor(price: number, txFloor: number, targetFloor: number, medianFloor: number): number {
  if (!targetFloor || targetFloor <= 0) return price;
  const floorDiff = targetFloor - txFloor;
  return Math.round(price * (1 + 0.005 * floorDiff));
}

/** 비교매물에 가중치와 보정가격 부여 */
function scoreComparables(
  transactions: RealTransaction[],
  target: TargetProperty,
  now: Date,
): ComparableTransaction[] {
  const floors = transactions.map((t) => t.floor).sort((a, b) => a - b);
  const medianFloor = floors.length > 0 ? floors[Math.floor(floors.length / 2)] : 10;

  return transactions.map((tx) => {
    const months = monthsAgo(tx, now);
    const wTime = timeWeight(months);
    const wArea = areaWeight(tx.area, target.area || 0);
    const weight = wTime * wArea;

    let adjustedPrice = adjustPriceByArea(tx.dealAmount, tx.area, target.area || 0);
    adjustedPrice = adjustPriceByFloor(adjustedPrice, tx.floor, target.floor || 0, medianFloor);

    const similarity = Math.min(wTime * 0.6 + wArea * 0.4, 1);

    return { ...tx, weight, similarity, adjustedPrice };
  });
}

/** 가중 평균 가격 계산 */
function weightedAverage(comparables: ComparableTransaction[]): number {
  if (comparables.length === 0) return 0;
  const totalWeight = comparables.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return comparables[0].adjustedPrice;
  const avg = comparables.reduce((sum, c) => sum + c.adjustedPrice * c.weight, 0) / totalWeight;
  return Math.round(avg);
}

// ─── 신뢰도 계산 ───

function calculateConfidence(
  comparables: ComparableTransaction[],
  method: PriceEstimationResult["method"],
  now: Date,
): number {
  if (comparables.length === 0) return 0;

  // 비교매물 수 기반 (최대 50점)
  let score = Math.min(comparables.length * 10, 50);

  // 최근성 보너스 (최대 20점)
  const mostRecent = Math.min(...comparables.map((c) => monthsAgo(c, now)));
  if (mostRecent <= 3) score += 20;
  else if (mostRecent <= 6) score += 10;
  else if (mostRecent <= 12) score += 5;

  // 가격 분산도 보너스 (최대 20점)
  if (comparables.length >= 2) {
    const prices = comparables.map((c) => c.adjustedPrice);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const cv = mean > 0 ? stdDev(prices) / mean : 1;
    if (cv < 0.15) score += 20;
    else if (cv < 0.30) score += 10;
  }

  // 건물명 매칭 보너스
  if (method === "building_match") score += 10;

  return Math.min(score, 95);
}

// ─── 메인 추정 함수 ───

export function estimatePrice(
  target: TargetProperty,
  saleData: PriceResult | null,
  rentData: RentPriceResult | null,
): PriceEstimationResult {
  const now = new Date();
  const transactions = saleData?.transactions || [];

  let comparables: ComparableTransaction[] = [];
  let method: PriceEstimationResult["method"] = "fallback";

  // Tier 1: 건물명 매칭
  const buildingMatched = filterByBuildingName(transactions, target);
  if (buildingMatched.length > 0) {
    // 건물명 매칭 내에서 면적 추가 필터링
    const areaFiltered = target.area
      ? buildingMatched.filter(
          (tx) => tx.area > 0 && Math.abs(tx.area - target.area!) / target.area! < 0.3
        )
      : buildingMatched;

    const toScore = areaFiltered.length > 0 ? areaFiltered : buildingMatched;
    comparables = scoreComparables(toScore, target, now);
    method = "building_match";
  }

  // Tier 2: 면적 유사성
  if (comparables.length === 0 && target.area) {
    const areaMatched = filterByArea(transactions, target.area);
    if (areaMatched.length > 0) {
      comparables = scoreComparables(areaMatched, target, now);
      method = "area_match";
    }
  }

  // Tier 3: 구/군 전체 평균
  if (comparables.length === 0 && transactions.length > 0) {
    comparables = scoreComparables(transactions, target, now);
    method = "district_avg";
  }

  // 가격 계산
  const estimatedPrice = weightedAverage(comparables);

  // 가격 범위
  const prices = comparables.map((c) => c.adjustedPrice);
  const priceRange = prices.length > 0
    ? {
        min: Math.min(...prices),
        max: Math.max(...prices),
        stdDev: Math.round(stdDev(prices)),
      }
    : { min: 0, max: 0, stdDev: 0 };

  // 전세가 추정
  const estimatedJeonsePrice = rentData?.avgDeposit || 0;

  // 전세가율
  const jeonseRatio = estimatedPrice > 0 && estimatedJeonsePrice > 0
    ? Math.round((estimatedJeonsePrice / estimatedPrice) * 1000) / 10
    : 0;

  // 신뢰도
  const confidence = calculateConfidence(comparables, method, now);

  // 상위 비교매물 (가중치 순 정렬, 최대 10개)
  const topComparables = [...comparables]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  return {
    estimatedPrice,
    estimatedJeonsePrice,
    jeonseRatio,
    confidence,
    comparableCount: comparables.length,
    priceRange,
    method,
    comparables: topComparables,
  };
}
