import { describe, it, expect } from "vitest";
import {
  calculateAcquisitionTax,
  calculateHoldingTax,
  calculateTransferTax,
} from "@/lib/tax-calculator";

describe("calculateAcquisitionTax (취득세)", () => {
  it("생애최초 6억 이하 면제", () => {
    const result = calculateAcquisitionTax({
      price: 500000000,
      houseCount: 1,
      isAdjusted: false,
      isFirstHome: true,
    });
    expect(result.tax).toBe(0);
  });

  it("1주택 6억 이하 1%", () => {
    const result = calculateAcquisitionTax({
      price: 500000000,
      houseCount: 1,
      isAdjusted: false,
      isFirstHome: false,
    });
    expect(result.rate).toBe(0.01);
    expect(result.tax).toBe(5000000);
  });

  it("2주택 조정지역 8%", () => {
    const result = calculateAcquisitionTax({
      price: 800000000,
      houseCount: 2,
      isAdjusted: true,
      isFirstHome: false,
    });
    expect(result.rate).toBe(0.08);
  });

  it("3주택 이상 조정지역 12%", () => {
    const result = calculateAcquisitionTax({
      price: 800000000,
      houseCount: 3,
      isAdjusted: true,
      isFirstHome: false,
    });
    expect(result.rate).toBe(0.12);
  });

  it("세액이 0 이상이다", () => {
    const result = calculateAcquisitionTax({
      price: 100000000,
      houseCount: 1,
      isAdjusted: false,
      isFirstHome: false,
    });
    expect(result.tax).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateHoldingTax (보유세)", () => {
  it("재산세를 계산한다", () => {
    const result = calculateHoldingTax({
      assessedValue: 300000000,
      houseCount: 1,
      isAdjusted: false,
    });
    expect(result.propertyTax).toBeGreaterThan(0);
    expect(result.totalTax).toBeGreaterThanOrEqual(result.propertyTax);
  });

  it("다주택자는 종부세가 부과된다", () => {
    const result = calculateHoldingTax({
      assessedValue: 1500000000,
      houseCount: 3,
      isAdjusted: true,
    });
    expect(result.comprehensiveTax).toBeGreaterThan(0);
  });

  it("세액이 0 이상이다", () => {
    const result = calculateHoldingTax({
      assessedValue: 50000000,
      houseCount: 1,
      isAdjusted: false,
    });
    expect(result.totalTax).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateTransferTax (양도세)", () => {
  it("양도차익이 없으면 세금 0", () => {
    const result = calculateTransferTax({
      acquisitionPrice: 500000000,
      transferPrice: 400000000,
      holdingYears: 5,
      livingYears: 3,
      houseCount: 1,
      isAdjusted: false,
    });
    expect(result.tax).toBe(0);
  });

  it("1주택 2년 보유 12억 이하 비과세", () => {
    const result = calculateTransferTax({
      acquisitionPrice: 500000000,
      transferPrice: 800000000,
      holdingYears: 3,
      livingYears: 3,
      houseCount: 1,
      isAdjusted: false,
    });
    expect(result.tax).toBe(0);
  });

  it("다주택자는 양도세가 부과된다", () => {
    const result = calculateTransferTax({
      acquisitionPrice: 500000000,
      transferPrice: 800000000,
      holdingYears: 3,
      livingYears: 0,
      houseCount: 3,
      isAdjusted: true,
    });
    expect(result.tax).toBeGreaterThan(0);
  });

  it("세액이 0 이상이다", () => {
    const result = calculateTransferTax({
      acquisitionPrice: 500000000,
      transferPrice: 1500000000,
      holdingYears: 1,
      livingYears: 0,
      houseCount: 2,
      isAdjusted: true,
    });
    expect(result.tax).toBeGreaterThanOrEqual(0);
  });
});
