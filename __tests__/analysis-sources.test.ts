/**
 * lib/analysis-sources.ts 테스트
 * 분석 근거(citation)는 실제 값이 있는 소스만 포함(환각 0)해야 한다.
 */
import { describe, it, expect } from "vitest";
import { buildAnalysisSources } from "@/lib/analysis-sources";

describe("buildAnalysisSources", () => {
  it("빈 입력이면 빈 배열", () => {
    expect(buildAnalysisSources({})).toEqual([]);
  });

  it("실거래 건수 0이면 실거래 근거를 넣지 않는다", () => {
    const s = buildAnalysisSources({ marketData: { sale: { avgPrice: 0, transactionCount: 0 }, rent: null } });
    expect(s.find((x) => x.category === "실거래")).toBeUndefined();
  });

  it("실거래 매매·전세가 있으면 실제 값으로 근거 포함", () => {
    const s = buildAnalysisSources({
      marketData: {
        sale: { avgPrice: 820000000, transactionCount: 12, period: "2026-06~08" },
        rent: { avgDeposit: 500000000, jeonseCount: 8 },
      },
    });
    const sale = s.find((x) => x.label === "매매 실거래가");
    const rent = s.find((x) => x.label === "전세 실거래가");
    expect(sale?.detail).toContain("12건");
    expect(sale?.detail).toContain("8억");
    expect(sale?.provider).toBe("국토교통부 실거래가");
    expect(sale?.asOf).toBe("2026-06~08");
    expect(rent?.detail).toContain("8건");
    expect(rent?.detail).toContain("5억");
  });

  it("시세추정: estimatedPrice 0이면 제외, 있으면 method·신뢰도 반영", () => {
    expect(buildAnalysisSources({ estimatedPrice: 0 }).find((x) => x.category === "시세추정")).toBeUndefined();
    const s = buildAnalysisSources({ estimatedPrice: 850000000, priceMethod: "building_match", priceConfidence: 0.82 });
    const est = s.find((x) => x.category === "시세추정");
    expect(est?.detail).toContain("동일 단지·면적 실거래 매칭");
    expect(est?.detail).toContain("82%");
  });

  it("위험도: grade·주요요인 포함", () => {
    const s = buildAnalysisSources({
      riskScore: { totalScore: 72, grade: "C", gradeLabel: "주의", mortgageRatio: 0.35, factors: [{ label: "근저당 과다" }, "선순위 임차"] },
    });
    const risk = s.find((x) => x.category === "위험도");
    expect(risk?.label).toContain("C");
    expect(risk?.detail).toContain("근저당비율 35%");
    expect(risk?.detail).toContain("근저당 과다");
  });

  it("V-Score: score 있으면 포함(특허 근거 표기)", () => {
    const s = buildAnalysisSources({ vScore: { score: 78, grade: "B" } });
    const v = s.find((x) => x.category === "V-Score");
    expect(v?.label).toContain("78");
    expect(v?.provider).toContain("특허");
  });

  it("입력에 없는 값은 절대 만들어내지 않는다(환각 0)", () => {
    // 위험도만 준 경우 실거래·시세·건축물 근거가 생기면 안 됨
    const s = buildAnalysisSources({ riskScore: { grade: "A", totalScore: 20 } });
    expect(s.every((x) => x.category === "위험도")).toBe(true);
  });
});
