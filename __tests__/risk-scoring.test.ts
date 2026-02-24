import { describe, it, expect } from "vitest";
import { parseRegistry, SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";

describe("calculateRiskScore", () => {
  const parsed = parseRegistry(SAMPLE_REGISTRY_TEXT);

  it("점수가 0~100 범위 내이다", () => {
    const result = calculateRiskScore(parsed, 850000000);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("유효한 등급(A~F)을 반환한다", () => {
    const result = calculateRiskScore(parsed, 850000000);
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
  });

  it("등급 라벨이 존재한다", () => {
    const result = calculateRiskScore(parsed, 850000000);
    expect(result.gradeLabel).toBeTruthy();
    expect(result.gradeLabel.length).toBeGreaterThan(0);
  });

  it("감점 합계가 올바르다 (100 - totalScore = totalDeduction)", () => {
    const result = calculateRiskScore(parsed, 850000000);
    expect(result.totalScore).toBe(
      Math.max(0, 100 - result.totalDeduction)
    );
  });

  it("팩터별 감점 합계가 totalDeduction과 일치한다", () => {
    const result = calculateRiskScore(parsed, 850000000);
    const factorSum = result.factors.reduce((s, f) => s + f.deduction, 0);
    expect(factorSum).toBe(result.totalDeduction);
  });

  it("낮은 시세로 근저당 비율 위험이 높아진다", () => {
    const lowPrice = calculateRiskScore(parsed, 300000000);
    const highPrice = calculateRiskScore(parsed, 2000000000);
    expect(lowPrice.totalScore).toBeLessThanOrEqual(highPrice.totalScore);
  });

  it("시세 미입력 시에도 동작한다", () => {
    const result = calculateRiskScore(parsed);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("깨끗한 등기는 높은 점수를 받는다", () => {
    const cleanText = `
【 표 제 부 】 (건물의 표시)
서울특별시 강남구 역삼동 아파트 84.97㎡

【 갑 구 】 (소유권에 관한 사항)
순위번호 등기목적 접수 등기원인 권리자
1 소유권보존 2020년1월1일 보존등기 소유자 홍길동

【 을 구 】 (소유권 이외의 권리에 관한 사항)
순위번호 등기목적 접수 등기원인 권리자
    `.trim();
    const clean = parseRegistry(cleanText);
    const result = calculateRiskScore(clean, 1000000000);
    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe("A");
  });

  it("위험 등기는 깨끗한 등기보다 낮은 점수다", () => {
    const cleanText = `
【 표 제 부 】
서울특별시 강남구 역삼동 아파트 84.97㎡
【 갑 구 】
순위번호 등기목적
1 소유권보존 2020년1월1일 소유자 홍길동
【 을 구 】
순위번호 등기목적
    `.trim();
    const clean = calculateRiskScore(parseRegistry(cleanText), 1000000000);
    const risky = calculateRiskScore(parsed, 850000000);
    expect(risky.totalScore).toBeLessThan(clean.totalScore);
  });

  it("요약 텍스트가 생성된다", () => {
    const result = calculateRiskScore(parsed, 850000000);
    expect(result.summary).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(10);
  });
});
