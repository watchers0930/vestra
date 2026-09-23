import { describe, it, expect } from "vitest";
import { coerceDeepAnalysis } from "@/lib/contract-clauses-ai";

describe("coerceDeepAnalysis", () => {
  it("정상 raw를 타입에 맞게 정규화한다", () => {
    const r = coerceDeepAnalysis({
      clauses: [
        { title: "제1조 (보증금)", content: "보증금 3억", riskLevel: "high", analysis: "위험", relatedLaw: "주임법 제3조" },
        { title: "제2조 (기간)", content: "2년", riskLevel: "safe", analysis: "표준" },
      ],
      missingClauses: [{ title: "전세권설정", importance: "high", description: "필요" }],
      recommendedTerms: [
        { priority: "critical", category: "보증금", title: "반환기한 특약", text: "보증금은 명도와 동시에 반환한다.", rationale: "지연 방지" },
      ],
    });
    expect(r.clauses).toHaveLength(2);
    expect(r.clauses[0].riskLevel).toBe("high");
    expect(r.clauses[1].relatedLaw).toBe(""); // 없으면 빈 문자열
    expect(r.missingClauses[0].importance).toBe("high");
    expect(r.recommendedTerms.terms).toHaveLength(1);
    expect(r.recommendedTerms.terms[0].template.template).toContain("명도와 동시에");
    expect(r.recommendedTerms.terms[0].template.priority).toBe("critical");
    expect(r.recommendedTerms.riskLevel).toBe("critical");
  });

  it("잘못된 riskLevel/importance/priority는 안전한 기본값으로", () => {
    const r = coerceDeepAnalysis({
      clauses: [{ title: "제1조", riskLevel: "이상한값" }],
      missingClauses: [{ title: "x", importance: "??" }],
      recommendedTerms: [{ title: "t", text: "문구", priority: "??", category: "??" }],
    });
    expect(r.clauses[0].riskLevel).toBe("warning");
    expect(r.missingClauses[0].importance).toBe("medium");
    expect(r.recommendedTerms.terms[0].template.priority).toBe("medium");
    expect(r.recommendedTerms.terms[0].template.category).toBe("기타");
  });

  it("title 없는 조항·문구 없는 특약은 제외한다", () => {
    const r = coerceDeepAnalysis({
      clauses: [{ content: "제목없음" }, { title: "제1조", content: "ok" }],
      recommendedTerms: [{ title: "제목만", text: "" }, { title: "완성", text: "문구있음" }],
    });
    expect(r.clauses).toHaveLength(1);
    expect(r.recommendedTerms.terms).toHaveLength(1);
  });

  it("각 배열 최대 12개로 제한", () => {
    const many = (k: string) => Array.from({ length: 20 }, (_, i) => ({ title: `${k}${i}`, text: "문구", content: "c" }));
    const r = coerceDeepAnalysis({ clauses: many("c"), missingClauses: many("m"), recommendedTerms: many("t") });
    expect(r.clauses).toHaveLength(12);
    expect(r.missingClauses).toHaveLength(12);
    expect(r.recommendedTerms.terms).toHaveLength(12);
  });

  it("null·비객체 입력에 안전", () => {
    for (const bad of [null, undefined, 42, "x", []]) {
      const r = coerceDeepAnalysis(bad as unknown);
      expect(r.clauses).toEqual([]);
      expect(r.missingClauses).toEqual([]);
      expect(r.recommendedTerms.terms).toEqual([]);
      expect(r.recommendedTerms.riskLevel).toBe("safe");
    }
  });
});
