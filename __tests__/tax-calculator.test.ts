import { describe, it, expect } from "vitest";
import {
  calculateAcquisitionTax,
  calculateHoldingTax,
  calculateTransferTax,
  getTaxConfig,
  TAX_CONFIG_2024_2025,
  TAX_CONFIG_2026,
  TAX_CONFIG_2026_RESTORED,
  type TaxConfig,
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

  it("2주택 조정지역 유예 시 일반세율 (기본 config)", () => {
    const result = calculateAcquisitionTax({
      price: 800000000,
      houseCount: 2,
      isAdjusted: true,
      isFirstHome: false,
    });
    // 기본 config는 유예(2026) → 일반세율 적용
    expect(result.rate).toBeLessThan(0.08);
    expect(result.rate).toBeGreaterThan(0);
  });

  it("3주택 이상 조정지역 유예 시 8% (기본 config)", () => {
    const result = calculateAcquisitionTax({
      price: 800000000,
      houseCount: 3,
      isAdjusted: true,
      isFirstHome: false,
    });
    // 기본 config는 유예 → 3주택 조정 8%
    expect(result.rate).toBe(0.08);
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
    // 공시가 30억, 3주택: 과세표준 = 30억 * 0.6 = 18억, 공제 9억 → 과세분 9억
    const result = calculateHoldingTax({
      assessedValue: 3000000000,
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

// ─── TaxConfig 테스트 (2026) ───

describe("TaxConfig (연도별 설정)", () => {
  it("getTaxConfig: 2024는 2024-2025 설정을 반환", () => {
    const config = getTaxConfig(2024);
    expect(config).toEqual(TAX_CONFIG_2024_2025);
    expect(config.multiHomeHeavyTaxEnabled).toBe(false);
  });

  it("getTaxConfig: 2025는 2024-2025 설정을 반환", () => {
    const config = getTaxConfig(2025);
    expect(config.multiHomeHeavyTaxEnabled).toBe(false);
    expect(config.firstHomeBenefitEnabled).toBe(true);
  });

  it("getTaxConfig: 2026은 유예연장(기본) 설정을 반환", () => {
    const config = getTaxConfig(2026);
    expect(config).toEqual(TAX_CONFIG_2026);
    expect(config.multiHomeHeavyTaxEnabled).toBe(false);
  });

  it("2026 복원 시나리오는 중과가 활성화된다", () => {
    expect(TAX_CONFIG_2026_RESTORED.multiHomeHeavyTaxEnabled).toBe(true);
    expect(TAX_CONFIG_2026_RESTORED.multiHomeTransferSurchargeEnabled).toBe(true);
    expect(TAX_CONFIG_2026_RESTORED.firstHomeBenefitEnabled).toBe(false);
    expect(TAX_CONFIG_2026_RESTORED.fairMarketValueRatio).toBe(0.65);
  });
});

describe("2026 취득세 시나리오", () => {
  it("유예 연장: 2주택 조정지역도 일반세율 적용", () => {
    const result = calculateAcquisitionTax(
      { price: 800000000, houseCount: 2, isAdjusted: true, isFirstHome: false },
      TAX_CONFIG_2026,
    );
    // 유예 기간이므로 8%가 아닌 일반세율
    expect(result.rate).toBeLessThan(0.08);
  });

  it("중과 복원: 2주택 조정지역 8%", () => {
    const result = calculateAcquisitionTax(
      { price: 800000000, houseCount: 2, isAdjusted: true, isFirstHome: false },
      TAX_CONFIG_2026_RESTORED,
    );
    expect(result.rate).toBe(0.08);
  });

  it("중과 복원: 3주택 조정지역 12%", () => {
    const result = calculateAcquisitionTax(
      { price: 800000000, houseCount: 3, isAdjusted: true, isFirstHome: false },
      TAX_CONFIG_2026_RESTORED,
    );
    expect(result.rate).toBe(0.12);
  });

  it("중과 복원: 생애최초 감면 비활성", () => {
    const result = calculateAcquisitionTax(
      { price: 500000000, houseCount: 1, isAdjusted: false, isFirstHome: true },
      TAX_CONFIG_2026_RESTORED,
    );
    // 생애최초 감면 비활성 → 면제 아님
    expect(result.tax).toBeGreaterThan(0);
  });
});

describe("2026 보유세 시나리오", () => {
  it("공정시장가액비율이 적용된다", () => {
    const config60: TaxConfig = { ...TAX_CONFIG_2026, fairMarketValueRatio: 0.60 };
    const config65: TaxConfig = { ...TAX_CONFIG_2026_RESTORED, fairMarketValueRatio: 0.65 };

    const result60 = calculateHoldingTax(
      { assessedValue: 2000000000, houseCount: 1, isAdjusted: false },
      config60,
    );
    const result65 = calculateHoldingTax(
      { assessedValue: 2000000000, houseCount: 1, isAdjusted: false },
      config65,
    );

    // 65% 비율이 더 높은 과세표준 → 더 많은 종부세
    expect(result65.comprehensiveTax).toBeGreaterThanOrEqual(result60.comprehensiveTax);
  });
});

describe("2026 양도세 시나리오", () => {
  it("유예 연장: 다주택 중과 미적용", () => {
    const result = calculateTransferTax(
      {
        acquisitionPrice: 500000000,
        transferPrice: 800000000,
        holdingYears: 3,
        livingYears: 0,
        houseCount: 2,
        isAdjusted: true,
      },
      TAX_CONFIG_2026,
    );
    // 중과 비활성 → additionalRate 0
    expect(result.additionalRate).toBe(0);
  });

  it("중과 복원: 2주택 조정지역 +20%p", () => {
    const result = calculateTransferTax(
      {
        acquisitionPrice: 500000000,
        transferPrice: 800000000,
        holdingYears: 3,
        livingYears: 0,
        houseCount: 2,
        isAdjusted: true,
      },
      TAX_CONFIG_2026_RESTORED,
    );
    expect(result.additionalRate).toBe(0.20);
  });

  it("중과 복원: 3주택 이상 조정지역 +30%p", () => {
    const result = calculateTransferTax(
      {
        acquisitionPrice: 500000000,
        transferPrice: 800000000,
        holdingYears: 3,
        livingYears: 0,
        houseCount: 3,
        isAdjusted: true,
      },
      TAX_CONFIG_2026_RESTORED,
    );
    expect(result.additionalRate).toBe(0.30);
  });

  it("중과 복원 시 다주택 양도세가 유예보다 높다", () => {
    const input = {
      acquisitionPrice: 500000000,
      transferPrice: 1000000000,
      holdingYears: 3,
      livingYears: 0,
      houseCount: 2,
      isAdjusted: true,
    };
    const resultDeferred = calculateTransferTax(input, TAX_CONFIG_2026);
    const resultRestored = calculateTransferTax(input, TAX_CONFIG_2026_RESTORED);
    expect(resultRestored.tax).toBeGreaterThan(resultDeferred.tax);
  });
});
