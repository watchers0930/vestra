/**
 * lib/ai-quality-gate.ts 테스트
 * LLM-as-judge 채점 로직: 종합 재계산·통과조건·fail-open·입력검증.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// getOpenAIClient를 모킹해 실제 API 호출 없이 판사 응답을 주입한다.
const createMock = vi.fn();
vi.mock("@/lib/openai", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return {
    ...actual,
    getOpenAIClient: () => ({ chat: { completions: { create: createMock } } }),
    OPENAI_MODEL: "gpt-5-mini",
    REASONING_MECHANICAL: "minimal",
  };
});

import { judgeAnalysisQuality, QUALITY_PASS_THRESHOLD } from "@/lib/ai-quality-gate";

const GROUND_TRUTH = {
  riskGrade: "위험",
  safetyScore: 35,
  mortgageRatio: 0.72,
  jeonseRatio: 95,
  estimatedPriceFormatted: "3억 5,000만원",
  criticalFactors: ["근저당 과다(72%)", "전세가율 95% 깡통 위험"],
  sourceLabels: ["등기부등본 파싱", "위험도 스코어링", "국토부 매매 실거래가"],
};

/** 판사 JSON 응답을 흉내내는 헬퍼 */
function mockJudgeResponse(obj: unknown) {
  createMock.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(obj) } }],
  });
}

describe("judgeAnalysisQuality", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("의견이 비었거나 너무 짧으면 채점하지 않고 skipped(fail-open)", async () => {
    const r = await judgeAnalysisQuality({ opinion: "", groundTruth: GROUND_TRUTH });
    expect(r.status).toBe("skipped");
    expect(r.pass).toBe(true);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("종합은 가중치(0.5/0.3/0.2)로 코드에서 재계산한다(모델 overall 무시)", async () => {
    // 모델이 엉뚱한 overall를 줘도 무시되어야 한다.
    mockJudgeResponse({ accuracy: 80, grounding: 70, completeness: 60, overall: 999, issues: [] });
    const r = await judgeAnalysisQuality({ opinion: "충분히 긴 종합 의견입니다. ".repeat(3), groundTruth: GROUND_TRUTH });
    // 80*0.5 + 70*0.3 + 60*0.2 = 40 + 21 + 12 = 73
    expect(r.overall).toBe(73);
    expect(r.status).toBe("judged");
    expect(r.pass).toBe(true); // 73 >= 70, accuracy 80 >= 60
  });

  it("종합이 임계 미만이면 미달", async () => {
    mockJudgeResponse({ accuracy: 65, grounding: 60, completeness: 50, issues: ["근거 부족"] });
    const r = await judgeAnalysisQuality({ opinion: "충분히 긴 종합 의견입니다. ".repeat(3), groundTruth: GROUND_TRUTH });
    // 65*0.5 + 60*0.3 + 50*0.2 = 32.5 + 18 + 10 = 60.5 → 61
    expect(r.overall).toBe(61);
    expect(r.overall).toBeLessThan(QUALITY_PASS_THRESHOLD);
    expect(r.pass).toBe(false);
    expect(r.issues).toContain("근거 부족");
  });

  it("정확성 하드플로어: 종합이 높아도 accuracy<60이면 무조건 미달", async () => {
    // accuracy 55(환각), grounding/completeness 100 → 55*0.5+100*0.3+100*0.2 = 27.5+30+20 = 77.5→78 (>=70)
    mockJudgeResponse({ accuracy: 55, grounding: 100, completeness: 100, issues: ["사실과 다른 금액"] });
    const r = await judgeAnalysisQuality({ opinion: "충분히 긴 종합 의견입니다. ".repeat(3), groundTruth: GROUND_TRUTH });
    expect(r.overall).toBeGreaterThanOrEqual(QUALITY_PASS_THRESHOLD);
    expect(r.pass).toBe(false); // accuracy 55 < 60 하드플로어
  });

  it("점수는 0~100으로 클램프하고 반올림한다", async () => {
    mockJudgeResponse({ accuracy: 150, grounding: -20, completeness: 33.6, issues: [] });
    const r = await judgeAnalysisQuality({ opinion: "충분히 긴 종합 의견입니다. ".repeat(3), groundTruth: GROUND_TRUTH });
    expect(r.accuracy).toBe(100);
    expect(r.grounding).toBe(0);
    expect(r.completeness).toBe(34);
  });

  it("issues 배열이 아니거나 빈 문자열이면 걸러낸다", async () => {
    mockJudgeResponse({ accuracy: 80, grounding: 80, completeness: 80, issues: ["  ", "", "실제 사유", 123] });
    const r = await judgeAnalysisQuality({ opinion: "충분히 긴 종합 의견입니다. ".repeat(3), groundTruth: GROUND_TRUTH });
    expect(r.issues).toEqual(["실제 사유"]);
  });

  it("API가 던지면 분석을 깨뜨리지 않고 skipped(fail-open)", async () => {
    createMock.mockRejectedValueOnce(new Error("network"));
    const r = await judgeAnalysisQuality({ opinion: "충분히 긴 종합 의견입니다. ".repeat(3), groundTruth: GROUND_TRUTH });
    expect(r.status).toBe("skipped");
    expect(r.pass).toBe(true);
  });

  it("JSON 파싱 불가 응답도 skipped(fail-open)", async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: "그냥 텍스트" } }] });
    const r = await judgeAnalysisQuality({ opinion: "충분히 긴 종합 의견입니다. ".repeat(3), groundTruth: GROUND_TRUTH });
    expect(r.status).toBe("skipped");
    expect(r.pass).toBe(true);
  });
});
