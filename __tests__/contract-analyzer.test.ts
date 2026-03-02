import { describe, it, expect } from "vitest";
import { analyzeContract } from "@/lib/contract-analyzer";

// ─── 샘플 계약서 ───

const SAMPLE_CONTRACT = `
부동산 임대차 계약서

제1조 (목적물의 표시)
서울특별시 강남구 테헤란로 123, 456호

제2조 (보증금 및 차임)
보증금은 금 5억원으로 하며, 계약금 5천만원은 계약시, 중도금 2억원은 2025년 3월 1일, 잔금 2억5천만원은 2025년 4월 1일에 지급한다.
보증금 반환은 임대차 종료 후 1개월 이내에 한다.

제3조 (계약기간)
임대차 기간은 2025년 5월 1일부터 2027년 4월 30일까지 2년으로 한다.

제4조 (계약 해지)
임차인이 차임을 2회 이상 연체한 경우 임대인은 계약을 해지할 수 있다.

제5조 (특약사항)
1. 반려동물 사육을 금지한다.
2. 현 시설 상태 그대로 인도한다.

제6조 (원상회복)
임차인은 임대차 종료 시 목적물을 원상회복하여 반환한다. 통상 사용으로 인한 손모는 제외한다.

제7조 (임차인의 의무)
임차인은 선량한 관리자의 주의의무로 목적물을 사용하여야 한다.
`;

const RISKY_CONTRACT = `
임대차계약

제1조 (보증금)
보증금은 3억원으로 한다.

제2조 (계약기간)
계약기간은 1년으로 한다.

제3조 (계약해지)
임대인은 사유 없이 일방적으로 해지할 수 있다.

제4조 (특약사항)
모든 수리비는 임차인이 부담한다.
보증금 반환 청구를 불가로 한다.

제5조 (원상회복)
임차인은 모든 시설을 교체하고 전면 수리하여 원상 완벽하게 회복한다.

제6조 (차임 증감)
차임은 매년 10%씩 인상할 수 있다.
`;

const UNSTRUCTURED_TEXT = `
이 부동산 임대차 계약에서 보증금은 2억원이며 계약기간은 2년입니다.
특약사항으로 반려동물 사육을 금지합니다.
`;

// ─── 테스트 ───

describe("analyzeContract (계약서 분석 엔진)", () => {
  describe("조항 파싱", () => {
    it("제N조 패턴으로 조항을 분리한다", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      expect(result.clauses.length).toBeGreaterThanOrEqual(5);
    });

    it("조항 제목이 올바르게 추출된다", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      const titles = result.clauses.map((c) => c.title);
      expect(titles.some((t) => t.includes("보증금"))).toBe(true);
      expect(titles.some((t) => t.includes("계약기간") || t.includes("계약 기간"))).toBe(true);
    });
  });

  describe("리스크 감지 - 안전한 계약서", () => {
    it("표준 계약서는 대부분 safe로 판정된다", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      const safeClauses = result.clauses.filter((c) => c.riskLevel === "safe");
      expect(safeClauses.length).toBeGreaterThanOrEqual(3);
    });

    it("2년 계약기간은 safe로 판정된다", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      const periodClause = result.clauses.find((c) => c.title.includes("계약기간"));
      expect(periodClause).toBeDefined();
      expect(periodClause!.riskLevel).toBe("safe");
    });

    it("차임 2회 연체 해지는 safe로 판정된다", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      const termClause = result.clauses.find((c) => c.title.includes("해지"));
      expect(termClause).toBeDefined();
      expect(termClause!.riskLevel).toBe("safe");
    });
  });

  describe("리스크 감지 - 위험한 계약서", () => {
    it("임대인 일방해지는 high 리스크", () => {
      const result = analyzeContract(RISKY_CONTRACT);
      const termClause = result.clauses.find(
        (c) => c.title.includes("해지") || c.analysis.includes("일방")
      );
      expect(termClause).toBeDefined();
      expect(termClause!.riskLevel).toBe("high");
    });

    it("1년 계약기간은 warning", () => {
      const result = analyzeContract(RISKY_CONTRACT);
      const periodClause = result.clauses.find((c) => c.title.includes("계약기간"));
      expect(periodClause).toBeDefined();
      expect(periodClause!.riskLevel).toBe("warning");
    });

    it("위험한 특약사항은 high 리스크", () => {
      const result = analyzeContract(RISKY_CONTRACT);
      // 특약에 "수리비 전가", "보증금 반환 불가" 등이 있으므로 high가 최소 1개
      const highRiskClauses = result.clauses.filter((c) => c.riskLevel === "high");
      expect(highRiskClauses.length).toBeGreaterThanOrEqual(1);
      // 특약 조항이 high risk로 감지되었는지 (수리비 전가 또는 보증금 포기)
      const hasHighRiskSpecial = highRiskClauses.some(
        (c) => c.analysis.includes("수리비") || c.analysis.includes("보증금") || c.analysis.includes("일방")
      );
      expect(hasHighRiskSpecial).toBe(true);
    });

    it("5% 초과 차임 인상은 high 리스크", () => {
      const result = analyzeContract(RISKY_CONTRACT);
      const rentClause = result.clauses.find(
        (c) => c.title.includes("차임") || c.analysis.includes("5%")
      );
      expect(rentClause).toBeDefined();
      expect(rentClause!.riskLevel).toBe("high");
    });

    it("과도한 원상회복은 high 리스크", () => {
      const result = analyzeContract(RISKY_CONTRACT);
      const restClause = result.clauses.find(
        (c) => c.title.includes("원상") || c.analysis.includes("원상회복")
      );
      expect(restClause).toBeDefined();
      expect(restClause!.riskLevel).toBe("high");
    });
  });

  describe("누락 조항 검사", () => {
    it("전세권설정 미언급 시 누락으로 감지", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      const jeonse = result.missingClauses.find((mc) => mc.title.includes("전세권"));
      expect(jeonse).toBeDefined();
      expect(jeonse!.importance).toBe("high");
    });

    it("보증금보호(HUG) 미언급 시 누락으로 감지", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      const deposit = result.missingClauses.find((mc) => mc.title.includes("보증금보호"));
      expect(deposit).toBeDefined();
      expect(deposit!.importance).toBe("high");
    });

    it("계약갱신청구권 미언급 시 누락으로 감지", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      const renewal = result.missingClauses.find((mc) => mc.title.includes("갱신"));
      expect(renewal).toBeDefined();
    });
  });

  describe("안전점수", () => {
    it("표준 계약서는 50점 이상", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      expect(result.safetyScore).toBeGreaterThanOrEqual(50);
    });

    it("위험한 계약서는 안전한 계약서보다 점수가 낮다", () => {
      const safeResult = analyzeContract(SAMPLE_CONTRACT);
      const riskyResult = analyzeContract(RISKY_CONTRACT);
      expect(riskyResult.safetyScore).toBeLessThan(safeResult.safetyScore);
    });

    it("안전점수는 0~100 범위", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      expect(result.safetyScore).toBeGreaterThanOrEqual(0);
      expect(result.safetyScore).toBeLessThanOrEqual(100);
    });
  });

  describe("비구조화 텍스트", () => {
    it("제N조 패턴이 없어도 키워드 기반으로 분석한다", () => {
      const result = analyzeContract(UNSTRUCTURED_TEXT);
      expect(result.clauses.length).toBeGreaterThan(0);
    });
  });

  describe("관련 법령", () => {
    it("각 조항에 관련 법령이 포함된다", () => {
      const result = analyzeContract(SAMPLE_CONTRACT);
      for (const clause of result.clauses) {
        expect(clause.relatedLaw).toBeDefined();
        expect(clause.relatedLaw.length).toBeGreaterThan(0);
      }
    });
  });
});
