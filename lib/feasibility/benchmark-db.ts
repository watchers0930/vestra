/**
 * 업계 벤치마크 DB
 *
 * 건설공사비지수, PF 금리, Cap Rate, 분양률 등
 * 사업성 판단의 기준이 되는 벤치마크 데이터를 관리합니다.
 *
 * 정적 기본값 + DB 캐시(BenchmarkCache) 이중 구조로
 * 외부 API가 실패해도 기본값으로 동작합니다.
 *
 * @module lib/feasibility/benchmark-db
 */

import { prisma } from "@/lib/prisma";
import type { BenchmarkValue } from "./feasibility-types";

// ---------------------------------------------------------------------------
// 정적 벤치마크 기본값 (2026년 1분기 기준)
// ---------------------------------------------------------------------------

export const INDUSTRY_BENCHMARKS = {
  // 건설공사비지수 (KICT 기준, 2026년 Q1 업데이트)
  CONSTRUCTION_COST_INDEX: {
    baseYear: 2020,
    currentValue: 158.2,
    yoyGrowth: 0.038,
    byPurpose: {
      아파트: { perPyeong: 580 },     // 만원/평 (2026 Q1)
      오피스텔: { perPyeong: 520 },
      상가: { perPyeong: 450 },
      지식산업센터: { perPyeong: 400 },
      복합: { perPyeong: 500 },
      기타: { perPyeong: 480 },
    },
  },

  // PF 금리 밴드 (신용등급별, 2026 Q1)
  PF_INTEREST_RATES: {
    AAA: { min: 0.040, max: 0.050 },  // 4.5% 중심
    AA:  { min: 0.050, max: 0.060 },  // 5.5% 중심
    A:   { min: 0.065, max: 0.075 },  // 7.0% 중심
    BBB: { min: 0.085, max: 0.095 },  // 9.0% 중심
    BB:  { min: 0.105, max: 0.115 },  // 11.0% 중심
    "B+": { min: 0.125, max: 0.135 }, // 13.0% 중심
    // 레거시 호환
    gradeA: { min: 0.040, max: 0.075 },
    gradeB: { min: 0.085, max: 0.135 },
    bridge: { min: 0.14, max: 0.20 },
  },

  // 수익형 부동산 Cap Rate (지역별)
  CAP_RATE: {
    서울_오피스: 0.042,
    서울_리테일: 0.048,
    경기_물류: 0.055,
    지방_상가: 0.065,
  },

  // 분양률 기준 (지역별, 2026 Q1 업데이트)
  SALE_RATE: {
    서울: { initial: 0.85, final: 0.95 },   // 95%
    경기: { initial: 0.72, final: 0.85 },   // 85%
    인천: { initial: 0.68, final: 0.80 },   // 80%
    부산: { initial: 0.62, final: 0.75 },   // 75%
    대구: { initial: 0.58, final: 0.70 },   // 70%
    대전: { initial: 0.65, final: 0.78 },   // 78%
    광주: { initial: 0.60, final: 0.72 },   // 72%
    세종: { initial: 0.52, final: 0.65 },   // 65%
    지방: { initial: 0.50, final: 0.72 },   // 기본 지방
  },

  // 수익률 기준 (용도별, 2026 Q1 업데이트)
  PROFIT_RATE: {
    아파트: { min: 0.08, max: 0.15, avg: 0.115 },
    오피스텔: { min: 0.06, max: 0.10, avg: 0.08 },
    상가: { min: 0.05, max: 0.08, avg: 0.065 },
    지식산업센터: { min: 0.07, max: 0.12, avg: 0.095 },
    복합: { min: 0.06, max: 0.10, avg: 0.08 },
  },
} as const;

// ---------------------------------------------------------------------------
// 지역 분류
// ---------------------------------------------------------------------------

type RegionCategory = "서울" | "경기" | "인천" | "부산" | "대구" | "대전" | "광주" | "세종" | "지방";

export function classifyRegion(address: string): RegionCategory {
  if (address.includes("서울")) return "서울";
  if (address.includes("인천")) return "인천";
  if (address.includes("부산")) return "부산";
  if (address.includes("대구")) return "대구";
  if (address.includes("대전")) return "대전";
  if (address.includes("광주")) return "광주";
  if (address.includes("세종")) return "세종";
  if (
    address.includes("경기") ||
    address.includes("수원") ||
    address.includes("성남") ||
    address.includes("용인") ||
    address.includes("고양") ||
    address.includes("안양") ||
    address.includes("부천") ||
    address.includes("화성") ||
    address.includes("평택")
  ) {
    return "경기";
  }
  return "지방";
}

// ---------------------------------------------------------------------------
// 벤치마크 조회 (캐시 → 기본값 폴백)
// ---------------------------------------------------------------------------

export async function getBenchmarkForConstruction(
  purpose: string
): Promise<BenchmarkValue> {
  // 1. DB 캐시 조회
  const cacheKey = `kict:${purpose}:${new Date().toISOString().slice(0, 7)}`;
  try {
    const cached = await prisma.benchmarkCache.findUnique({
      where: { key: cacheKey },
    });

    if (cached && new Date(cached.expiresAt) > new Date()) {
      const data = cached.data as { perPyeong: number };
      return {
        value: data.perPyeong,
        source: `KICT 건설공사비지수 (캐시: ${cached.source})`,
        sourceType: "kict",
        asOfDate: cached.asOfDate.toISOString(),
      };
    }
  } catch {
    // DB 접근 실패 시 기본값 사용
  }

  // 2. 정적 기본값
  const purposeKey = purpose as keyof typeof INDUSTRY_BENCHMARKS.CONSTRUCTION_COST_INDEX.byPurpose;
  const data = INDUSTRY_BENCHMARKS.CONSTRUCTION_COST_INDEX.byPurpose[purposeKey]
    || INDUSTRY_BENCHMARKS.CONSTRUCTION_COST_INDEX.byPurpose["기타"];

  return {
    value: data.perPyeong,
    source: "KICT 건설공사비지수 (2026년 1분기 기본값)",
    sourceType: "kict",
    asOfDate: new Date().toISOString(),
  };
}

export async function getBenchmarkForSaleRate(
  address: string
): Promise<BenchmarkValue> {
  const region = classifyRegion(address);
  const rates = INDUSTRY_BENCHMARKS.SALE_RATE[region as keyof typeof INDUSTRY_BENCHMARKS.SALE_RATE]
    || INDUSTRY_BENCHMARKS.SALE_RATE["지방"];

  return {
    value: rates.initial * 100, // 백분율로 변환
    source: `지역별 평균 분양률 (${region}, 2026 Q1)`,
    sourceType: "internal",
    asOfDate: new Date().toISOString(),
    range: { min: rates.initial * 100, max: rates.final * 100 },
  };
}

export async function getBenchmarkForPfRate(
  creditGrade?: string
): Promise<BenchmarkValue> {
  const grade = creditGrade as keyof typeof INDUSTRY_BENCHMARKS.PF_INTEREST_RATES;
  const rates = INDUSTRY_BENCHMARKS.PF_INTEREST_RATES[grade]
    || INDUSTRY_BENCHMARKS.PF_INTEREST_RATES.BBB; // 기본: BBB 등급

  return {
    value: ((rates.min + rates.max) / 2) * 100, // 중간값 백분율
    source: `시장 PF 금리 밴드 (${creditGrade || "BBB"}, 2026년 Q1)`,
    sourceType: "internal",
    asOfDate: new Date().toISOString(),
    range: { min: rates.min * 100, max: rates.max * 100 },
  };
}

export async function getBenchmarkForProfitRate(
  purpose: string
): Promise<BenchmarkValue> {
  const purposeKey = purpose as keyof typeof INDUSTRY_BENCHMARKS.PROFIT_RATE;
  const data = INDUSTRY_BENCHMARKS.PROFIT_RATE[purposeKey]
    || INDUSTRY_BENCHMARKS.PROFIT_RATE["기타" as keyof typeof INDUSTRY_BENCHMARKS.PROFIT_RATE]
    || { min: 0.05, max: 0.15, avg: 0.10 };

  return {
    value: data.avg * 100,
    source: `${purpose} 평균 수익률 기준`,
    sourceType: "internal",
    asOfDate: new Date().toISOString(),
    range: { min: data.min * 100, max: data.max * 100 },
  };
}
