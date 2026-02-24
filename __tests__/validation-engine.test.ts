import { describe, it, expect } from "vitest";
import { parseRegistry, SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { validateParsedRegistry } from "@/lib/validation-engine";

describe("validateParsedRegistry", () => {
  const parsed = parseRegistry(SAMPLE_REGISTRY_TEXT);
  const riskScore = calculateRiskScore(parsed, 850000000);

  describe("기본 구조", () => {
    it("ValidationResult 구조를 반환한다", () => {
      const result = validateParsedRegistry(parsed, 850000000, riskScore);
      expect(result).toHaveProperty("isValid");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("issues");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("timestamp");
    });

    it("score가 0~100 범위이다", () => {
      const result = validateParsedRegistry(parsed, 850000000, riskScore);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("summary 통계가 정확하다", () => {
      const result = validateParsedRegistry(parsed, 850000000, riskScore);
      expect(result.summary.totalChecks).toBeGreaterThan(0);
      expect(result.summary.errors + result.summary.warnings + result.summary.infos)
        .toBe(result.issues.length);
    });
  });

  describe("A1: 포맷 및 타입 검증", () => {
    it("SAMPLE_REGISTRY_TEXT의 날짜 형식이 정상이다", () => {
      const result = validateParsedRegistry(parsed);
      const dateErrors = result.issues.filter(
        (i) => i.id === "FMT_DATE_PATTERN" && i.severity === "error"
      );
      expect(dateErrors).toHaveLength(0);
    });

    it("위험유형 열거값이 유효하다", () => {
      const result = validateParsedRegistry(parsed);
      const riskTypeErrors = result.issues.filter(
        (i) => i.id === "FMT_RISKTYPE_INVALID"
      );
      expect(riskTypeErrors).toHaveLength(0);
    });
  });

  describe("A2: 합계 및 산술 검증", () => {
    it("근저당 합계가 일치한다", () => {
      const result = validateParsedRegistry(parsed);
      const mortgageSumErrors = result.issues.filter(
        (i) => i.id === "ARITH_MORTGAGE_SUM" && i.severity === "error"
      );
      expect(mortgageSumErrors).toHaveLength(0);
    });

    it("전세권 합계가 일치한다", () => {
      const result = validateParsedRegistry(parsed);
      const jeonseSumErrors = result.issues.filter(
        (i) => i.id === "ARITH_JEONSE_SUM" && i.severity === "error"
      );
      expect(jeonseSumErrors).toHaveLength(0);
    });

    it("총채권액이 일치한다", () => {
      const result = validateParsedRegistry(parsed);
      const claimsErrors = result.issues.filter(
        (i) => i.id === "ARITH_TOTAL_CLAIMS" && i.severity === "error"
      );
      expect(claimsErrors).toHaveLength(0);
    });

    it("활성건수가 일치한다", () => {
      const result = validateParsedRegistry(parsed);
      const countErrors = result.issues.filter(
        (i) =>
          (i.id === "ARITH_ACTIVE_GAPGU" || i.id === "ARITH_ACTIVE_EULGU") &&
          i.severity === "error"
      );
      expect(countErrors).toHaveLength(0);
    });
  });

  describe("A3: 문맥 및 규칙 검증", () => {
    it("갑구 1번 항목이 소유권보존이다", () => {
      const result = validateParsedRegistry(parsed);
      const firstEntryIssue = result.issues.find(
        (i) => i.id === "CTX_FIRST_ENTRY"
      );
      expect(firstEntryIssue).toBeUndefined();
    });

    it("활성 소유권 항목이 존재한다", () => {
      const result = validateParsedRegistry(parsed);
      const noOwnerIssue = result.issues.find(
        (i) => i.id === "CTX_NO_OWNER"
      );
      expect(noOwnerIssue).toBeUndefined();
    });
  });

  describe("A4: 크로스체크 검증", () => {
    it("요약 플래그가 실제 엔트리와 일치한다", () => {
      const result = validateParsedRegistry(parsed, 850000000, riskScore);
      const flagErrors = result.issues.filter(
        (i) => i.id.startsWith("XCHK_FLAG_") && i.severity === "error"
      );
      expect(flagErrors).toHaveLength(0);
    });

    it("추정가격이 합리적 범위이다", () => {
      const result = validateParsedRegistry(parsed, 850000000);
      const priceIssue = result.issues.find(
        (i) => i.id === "XCHK_PRICE_SANITY"
      );
      expect(priceIssue).toBeUndefined();
    });

    it("비정상적으로 낮은 가격을 탐지한다", () => {
      const result = validateParsedRegistry(parsed, 100);
      const priceIssue = result.issues.find(
        (i) => i.id === "XCHK_PRICE_SANITY"
      );
      expect(priceIssue).toBeDefined();
      expect(priceIssue?.severity).toBe("error");
    });

    it("리스크 스코어 총감점이 일치한다", () => {
      const result = validateParsedRegistry(parsed, 850000000, riskScore);
      const deductionError = result.issues.find(
        (i) => i.id === "XCHK_DEDUCTION_SUM"
      );
      expect(deductionError).toBeUndefined();
    });

    it("리스크 점수 계산이 일치한다", () => {
      const result = validateParsedRegistry(parsed, 850000000, riskScore);
      const scoreError = result.issues.find(
        (i) => i.id === "XCHK_SCORE_CALC"
      );
      expect(scoreError).toBeUndefined();
    });
  });

  describe("엣지 케이스", () => {
    it("빈 파싱 결과도 처리한다", () => {
      const empty = parseRegistry("");
      const result = validateParsedRegistry(empty);
      expect(result).toHaveProperty("isValid");
      expect(result.summary.totalChecks).toBeGreaterThan(0);
    });

    it("추정가격 없이도 동작한다", () => {
      const result = validateParsedRegistry(parsed);
      expect(result).toHaveProperty("isValid");
    });

    it("riskScore 없이도 동작한다", () => {
      const result = validateParsedRegistry(parsed, 850000000);
      expect(result).toHaveProperty("isValid");
    });
  });
});
