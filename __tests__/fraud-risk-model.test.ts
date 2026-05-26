import { describe, it, expect } from "vitest";
import { predictFraudRisk } from "@/lib/fraud-risk-model";

describe("predictFraudRisk", () => {
  // ─── 1. 고위험 입력 ───
  it("고위험 입력 시 fraudScore >= 40이고 riskLevel이 warning/danger/critical이다", () => {
    const result = predictFraudRisk({
      mortgageRatio: 90,
      jeonseRatio: 95,
      hasTaxDelinquency: true,
      regionFraudRate: 5,
    });

    expect(result.fraudScore).toBeGreaterThanOrEqual(40);
    expect(["warning", "danger", "critical"]).toContain(result.riskLevel);
  });

  // ─── 2. 저위험 입력 ───
  it("저위험 입력 시 fraudScore < 30이고 riskLevel이 safe/caution이다", () => {
    const result = predictFraudRisk({
      mortgageRatio: 10,
      jeonseRatio: 50,
      isBrokerRegistered: true,
      hasDepositInsurance: true,
    });

    expect(result.fraudScore).toBeLessThan(30);
    expect(["safe", "caution"]).toContain(result.riskLevel);
  });

  // ─── 3. 빈 입력 ───
  it("빈 입력({})에도 유효한 결과를 반환하며 contributions가 15개이다", () => {
    const result = predictFraudRisk({});

    expect(result.fraudScore).toBeGreaterThanOrEqual(0);
    expect(result.fraudScore).toBeLessThanOrEqual(100);
    expect(["safe", "caution", "warning", "danger", "critical"]).toContain(
      result.riskLevel,
    );
    expect(result.riskLabel).toBeTruthy();
    expect(result.contributions).toHaveLength(15);
    expect(result.topRiskFactors.length).toBeGreaterThan(0);
    expect(result.topRiskFactors.length).toBeLessThanOrEqual(5);
    expect(result.recommendation).toBeTruthy();
    expect(result.metadata.modelVersion).toBeTruthy();
    expect(result.metadata.featureCount).toBe(15);
    expect(result.metadata.calculatedAt).toBeTruthy();
  });

  // ─── 4. 재현성 (결정론적) ───
  it("동일 입력에 대해 동일한 fraudScore를 반환한다", () => {
    const input = {
      mortgageRatio: 55,
      jeonseRatio: 72,
      seizureCount: 1,
      regionFraudRate: 2,
    };

    const result1 = predictFraudRisk(input);
    const result2 = predictFraudRisk(input);

    expect(result1.fraudScore).toBe(result2.fraudScore);
    expect(result1.riskLevel).toBe(result2.riskLevel);
    expect(result1.contributions.map((c) => c.contribution)).toEqual(
      result2.contributions.map((c) => c.contribution),
    );
  });

  // ─── 5. 극단값 ───
  it("극단값 입력 시 fraudScore가 최대치에 근접한다", () => {
    const result = predictFraudRisk({
      mortgageRatio: 100,
      seizureCount: 10,
      jeonseRatio: 100,
      regionFraudRate: 10,
      hasTaxDelinquency: true,
      isMultiHomeOwner: true,
      isCorporate: true,
      vacancyRate: 20,
      priceVolatility: 30,
      priorityClaimRatio: 100,
      buildingAge: 50,
      auctionRate: 10,
      isBrokerRegistered: false,
      hasDepositInsurance: false,
    });

    expect(result.fraudScore).toBeGreaterThanOrEqual(80);
    expect(result.riskLevel).toBe("critical");
  });

  // ─── 6. customWeights ───
  it("customWeights를 전달하면 기본 결과와 점수가 달라진다", () => {
    const input = {
      mortgageRatio: 60,
      jeonseRatio: 75,
      hasTaxDelinquency: true,
    };

    const defaultResult = predictFraudRisk(input);
    const customResult = predictFraudRisk(input, undefined, {
      mortgage_ratio: 0.5,
      jeonse_ratio: 0.5,
      tax_delinquency: 0.01,
    });

    expect(customResult.fraudScore).not.toBe(defaultResult.fraudScore);
  });

  // ─── 7. 유사 사례 매칭 ───
  it("nearbyFraudCases와 좌표가 주어지면 similarCases가 채워진다", () => {
    const mockCases = [
      {
        address: "서울시 강남구 역삼동 123",
        caseType: "깡통전세",
        amount: 300000000,
        latitude: 37.5,
        longitude: 127.03,
      },
    ];

    const result = predictFraudRisk(
      {
        latitude: 37.501,
        longitude: 127.031,
      },
      mockCases,
    );

    expect(result.similarCases.length).toBeGreaterThan(0);
    expect(result.similarCases[0].address).toBe("서울시 강남구 역삼동 123");
    expect(result.similarCases[0].caseType).toBe("깡통전세");
    expect(result.similarCases[0].amount).toBe(300000000);
    expect(result.similarCases[0].distance).toBeGreaterThanOrEqual(0);
    expect(result.similarCases[0].similarity).toBeGreaterThan(0);
    expect(result.similarCases[0].similarity).toBeLessThanOrEqual(1);
  });
});
