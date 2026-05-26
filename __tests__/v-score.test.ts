import { describe, it, expect } from "vitest";
import { calculateVScore } from "@/lib/v-score";

// ─── Mock 데이터 ───

const mockRiskScore: any = {
  totalScore: 75,
  grade: "B",
  gradeLabel: "양호",
  totalDeduction: 25,
  factors: [],
  mortgageRatio: 30,
};

const lowRiskScore: any = {
  totalScore: 30,
  grade: "D",
  gradeLabel: "위험",
  totalDeduction: 70,
  factors: [
    {
      id: "mortgage_high",
      category: "mortgage",
      severity: "critical",
      deduction: 30,
    },
  ],
  mortgageRatio: 85,
};

const safeContractResult: any = {
  safetyScore: 90,
  clauses: [],
  missingClauses: [],
};

const riskyContractResult: any = {
  safetyScore: 35,
  clauses: [
    { riskLevel: "high" },
    { riskLevel: "warning" },
  ],
  missingClauses: ["특약사항"],
};

describe("calculateVScore", () => {
  // ─── 1. 정상 입력 (모든 소스 데이터 제공) ───

  it("모든 소스 데이터 제공 시 score 0~100, 유효한 등급, 5개 소스를 반환한다", () => {
    const result = calculateVScore({
      riskScore: mockRiskScore,
      jeonseRatio: 65,
      priceConfidence: 0.8,
      contractResult: safeContractResult,
      creditScore: 720,
      regionFraudRate: 1.0,
      auctionRate: 0.5,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
    expect(result.gradeLabel).toBeTruthy();
    expect(result.sources).toHaveLength(5);
    expect(result.metadata.version).toBe("1.0.0");
    expect(result.metadata.algorithmId).toBe("VESTRA-VSCORE-v1.0.0");
    expect(result.metadata.calculatedAt).toBeTruthy();
  });

  // ─── 2. 단일 소스 (riskScore만 제공) ───

  it("riskScore만 제공해도 동작하며 나머지 소스는 기본값 사용", () => {
    const result = calculateVScore({
      riskScore: mockRiskScore,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.sources).toHaveLength(5);

    // 등기 소스는 available, 나머지 중 일부는 unavailable
    const registrySource = result.sources.find((s) => s.id === "registry");
    expect(registrySource?.dataAvailable).toBe(true);
    expect(registrySource?.score).toBe(mockRiskScore.totalScore);

    const priceSource = result.sources.find((s) => s.id === "price");
    expect(priceSource?.dataAvailable).toBe(false);
    expect(priceSource?.score).toBe(50); // 기본값
  });

  // ─── 3. 빈 입력 ({}) ───

  it("빈 입력 시 기본값 점수 ~50, 등급 C, 모든 소스 unavailable", () => {
    const result = calculateVScore({});

    // 기본값: registry=50, price=50, contract=50, landlord=70, region=70
    // 가중합: 50*0.30 + 50*0.25 + 50*0.20 + 70*0.15 + 70*0.10 = 15+12.5+10+10.5+7 = 55
    // compositeReliability 0.7: 55*0.7 + 50*0.3 = 38.5+15 = 53.5 → 54
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThanOrEqual(65);
    expect(result.grade).toBe("C");
    expect(result.sources).toHaveLength(5);

    // 등기, 시세, 계약은 unavailable
    const registrySource = result.sources.find((s) => s.id === "registry");
    const priceSource = result.sources.find((s) => s.id === "price");
    const contractSource = result.sources.find((s) => s.id === "contract");
    expect(registrySource?.dataAvailable).toBe(false);
    expect(priceSource?.dataAvailable).toBe(false);
    expect(contractSource?.dataAvailable).toBe(false);
  });

  // ─── 4. 상호작용 규칙 — 등기 위험 + 시세 불안정 복합 ───

  it("등기 위험(totalScore<50) + 높은 전세가율(>80%) 시 복합 위험 상호작용 발생", () => {
    const result = calculateVScore({
      riskScore: lowRiskScore, // totalScore: 30 → registry < 50
      jeonseRatio: 85,        // → priceScore 30 < 50
    });

    // registry_price_compound 규칙: registry<50 && price<50 → 복합 위험
    expect(result.interactions.length).toBeGreaterThan(0);

    const compoundInteraction = result.interactions.find(
      (i) => i.sourceA === "registry" && i.sourceB === "price"
    );
    expect(compoundInteraction).toBeDefined();
    expect(compoundInteraction?.interactionType).toBe("compound");
    expect(compoundInteraction?.adjustment).toBeLessThan(0);
  });

  // ─── 5. 높은 점수 — 모든 소스 안전 ───

  it("모든 소스가 안전하면 score >= 70, 등급 A 또는 B", () => {
    const highRiskScore: any = {
      totalScore: 95,
      grade: "A",
      gradeLabel: "안전",
      totalDeduction: 5,
      factors: [],
      mortgageRatio: 15,
    };

    const result = calculateVScore({
      riskScore: highRiskScore,
      jeonseRatio: 50,          // <= 60 → 95점
      priceConfidence: 0.95,
      contractResult: safeContractResult, // safetyScore: 90
      creditScore: 800,         // >= 700 → +10
      regionFraudRate: 0.3,
      auctionRate: 0.2,
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(["A", "B"]).toContain(result.grade);
  });

  // ─── 6. compositeReliability 효과 ───

  it("compositeReliability 값에 따라 점수가 달라진다 (1.0 vs 0.5)", () => {
    const baseInput = {
      riskScore: mockRiskScore,
      jeonseRatio: 65,
      contractResult: safeContractResult,
      creditScore: 720,
    };

    const highReliability = calculateVScore({
      ...baseInput,
      compositeReliability: 1.0,
    });

    const lowReliability = calculateVScore({
      ...baseInput,
      compositeReliability: 0.5,
    });

    // reliability=1.0 → finalScore = adjustedScore * 1.0 + 50 * 0.0 = adjustedScore
    // reliability=0.5 → finalScore = adjustedScore * 0.5 + 50 * 0.5 (50 쪽으로 수렴)
    expect(highReliability.score).not.toBe(lowReliability.score);

    // 낮은 신뢰도는 50에 더 가깝다
    const highDistFrom50 = Math.abs(highReliability.score - 50);
    const lowDistFrom50 = Math.abs(lowReliability.score - 50);
    expect(lowDistFrom50).toBeLessThanOrEqual(highDistFrom50);

    // metadata에 confidenceLevel 반영 확인
    expect(highReliability.metadata.confidenceLevel).toBe(1.0);
    expect(lowReliability.metadata.confidenceLevel).toBe(0.5);
  });
});
