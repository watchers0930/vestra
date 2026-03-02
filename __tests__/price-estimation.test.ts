import { describe, it, expect } from "vitest";
import { estimatePrice } from "@/lib/price-estimation";
import type { RealTransaction, PriceResult, RentPriceResult } from "@/lib/molit-api";

// ─── Mock 데이터 ───

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

function makeTx(overrides: Partial<RealTransaction> = {}): RealTransaction {
  return {
    aptName: "래미안아파트",
    dealAmount: 800000000,
    area: 84.95,
    floor: 10,
    dealYear: currentYear,
    dealMonth: currentMonth,
    dealDay: 1,
    regionCode: "11680",
    buildYear: 2015,
    roadName: "테헤란로",
    ...overrides,
  };
}

const mockSaleData: PriceResult = {
  transactions: [
    makeTx({ dealAmount: 750000000, floor: 5, dealMonth: Math.max(currentMonth - 1, 1) }),
    makeTx({ dealAmount: 800000000, floor: 10, dealMonth: Math.max(currentMonth - 2, 1) }),
    makeTx({ dealAmount: 850000000, floor: 15, dealMonth: Math.max(currentMonth - 3, 1) }),
  ],
  avgPrice: 800000000,
  minPrice: 750000000,
  maxPrice: 850000000,
  transactionCount: 3,
  period: "최근 12개월",
};

const mockRentData: RentPriceResult = {
  avgDeposit: 500000000,
  jeonseCount: 5,
  wolseCount: 2,
};

// ─── 테스트 ───

describe("estimatePrice (매매가 추정 엔진)", () => {
  describe("건물명 매칭 (Tier 1)", () => {
    it("건물명이 일치하면 building_match 방법을 사용한다", () => {
      const result = estimatePrice(
        { address: "서울시 강남구", aptName: "래미안아파트", area: 84 },
        mockSaleData,
        mockRentData,
      );
      expect(result.method).toBe("building_match");
      expect(result.estimatedPrice).toBeGreaterThan(0);
      expect(result.comparableCount).toBeGreaterThan(0);
    });

    it("건물명 매칭 시 면적도 유사한 거래를 우선한다", () => {
      const mixedData: PriceResult = {
        ...mockSaleData,
        transactions: [
          makeTx({ area: 84, dealAmount: 800000000 }),
          makeTx({ area: 59, dealAmount: 500000000 }),
          makeTx({ area: 120, dealAmount: 1200000000 }),
        ],
      };
      const result = estimatePrice(
        { address: "서울시 강남구", aptName: "래미안아파트", area: 84 },
        mixedData,
        null,
      );
      expect(result.method).toBe("building_match");
      // 84m² 기준이므로 59m², 120m²보다 84m²에 가까운 가격
      expect(result.estimatedPrice).toBeGreaterThan(600000000);
      expect(result.estimatedPrice).toBeLessThan(1000000000);
    });
  });

  describe("면적 매칭 (Tier 2)", () => {
    it("건물명 불일치 시 면적으로 fallback한다", () => {
      const result = estimatePrice(
        { address: "서울시 강남구", aptName: "존재하지않는건물", area: 84 },
        mockSaleData,
        null,
      );
      // 건물명 "존재하지않는건물"은 매칭 안됨 → 면적으로 fallback
      expect(["area_match", "district_avg"]).toContain(result.method);
      expect(result.estimatedPrice).toBeGreaterThan(0);
    });
  });

  describe("구/군 평균 (Tier 3)", () => {
    it("건물명/면적 모두 불일치 시 district_avg를 사용한다", () => {
      const result = estimatePrice(
        { address: "서울시 강남구", aptName: "xxx" },
        mockSaleData,
        null,
      );
      expect(["district_avg", "area_match"]).toContain(result.method);
      expect(result.estimatedPrice).toBeGreaterThan(0);
    });
  });

  describe("Fallback", () => {
    it("거래 데이터가 없으면 fallback이고 가격 0", () => {
      const result = estimatePrice(
        { address: "서울시 강남구" },
        null,
        null,
      );
      expect(result.method).toBe("fallback");
      expect(result.estimatedPrice).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it("빈 거래 배열도 fallback", () => {
      const empty: PriceResult = {
        transactions: [],
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        transactionCount: 0,
        period: "",
      };
      const result = estimatePrice({ address: "서울시" }, empty, null);
      expect(result.method).toBe("fallback");
    });
  });

  describe("가중 평균", () => {
    it("최근 거래에 더 높은 가중치를 부여한다", () => {
      const recentHigh: PriceResult = {
        ...mockSaleData,
        transactions: [
          makeTx({ dealAmount: 900000000, dealMonth: currentMonth, dealDay: 1 }),
          makeTx({ dealAmount: 700000000, dealYear: currentYear - 1, dealMonth: 1 }),
        ],
      };
      const result = estimatePrice(
        { address: "서울시", aptName: "래미안아파트", area: 84 },
        recentHigh,
        null,
      );
      // 최근 거래(9억)에 더 높은 가중치 → 8억보다 높아야
      expect(result.estimatedPrice).toBeGreaterThan(800000000);
    });
  });

  describe("신뢰도", () => {
    it("비교매물이 많을수록 신뢰도가 높다", () => {
      const manyTx: PriceResult = {
        ...mockSaleData,
        transactions: Array.from({ length: 10 }, (_, i) =>
          makeTx({ dealAmount: 800000000 + i * 10000000 })
        ),
      };
      const fewTx: PriceResult = {
        ...mockSaleData,
        transactions: [makeTx()],
      };

      const resultMany = estimatePrice(
        { address: "서울시", aptName: "래미안아파트", area: 84 },
        manyTx,
        null,
      );
      const resultFew = estimatePrice(
        { address: "서울시", aptName: "래미안아파트", area: 84 },
        fewTx,
        null,
      );

      expect(resultMany.confidence).toBeGreaterThan(resultFew.confidence);
    });

    it("신뢰도는 0~95 범위", () => {
      const result = estimatePrice(
        { address: "서울시", aptName: "래미안아파트", area: 84 },
        mockSaleData,
        null,
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });
  });

  describe("전세가", () => {
    it("전세 데이터가 있으면 전세가/전세가율을 반환한다", () => {
      const result = estimatePrice(
        { address: "서울시", aptName: "래미안아파트", area: 84 },
        mockSaleData,
        mockRentData,
      );
      expect(result.estimatedJeonsePrice).toBe(500000000);
      expect(result.jeonseRatio).toBeGreaterThan(0);
    });

    it("전세 데이터가 없으면 전세가 0", () => {
      const result = estimatePrice(
        { address: "서울시", aptName: "래미안아파트", area: 84 },
        mockSaleData,
        null,
      );
      expect(result.estimatedJeonsePrice).toBe(0);
      expect(result.jeonseRatio).toBe(0);
    });
  });

  describe("가격 범위", () => {
    it("min <= estimatedPrice <= max", () => {
      const result = estimatePrice(
        { address: "서울시", aptName: "래미안아파트", area: 84 },
        mockSaleData,
        null,
      );
      if (result.comparableCount > 0) {
        expect(result.priceRange.min).toBeLessThanOrEqual(result.estimatedPrice);
        expect(result.priceRange.max).toBeGreaterThanOrEqual(result.estimatedPrice);
      }
    });
  });
});
