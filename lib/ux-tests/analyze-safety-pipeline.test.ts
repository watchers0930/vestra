import { expect, it, vi } from "vitest";

// 외부 조회·AI 호출만 격리하고 파서부터 최종 모델까지 실제 구현으로 검증한다.
vi.mock("@/lib/openai", () => ({
  getOpenAIClient: vi.fn(), checkOpenAICostGuard: async () => ({ allowed: false }),
  OPENAI_MODEL: "test", REASONING_ANALYTICAL: "medium",
}));
vi.mock("@/lib/ai-quality-gate", () => ({ judgeAnalysisQuality: vi.fn() }));
vi.mock("@/lib/molit-api", () => ({ fetchComprehensivePrices: async () => null }));
vi.mock("@/lib/building-api", () => ({ fetchBuildingInfoByAddress: async () => null }));
vi.mock("@/lib/kapt-api", () => ({ fetchKaptInfoByAddress: async () => null }));
import { runAnalysisPipeline } from "@/app/api/analyze-unified/analyze-service";

const rawText = (claim: number, purpose = "근저당권설정") => `【 표 제 부 】
서울특별시 강남구 테헤란로 123
아파트 84.97㎡
【 갑 구 】
1 소유권보존 2020년1월1일 소유자 홍길동
【 을 구 】
1 ${purpose} 2021년1월1일 채권최고액 금${claim}원 전세금 금${claim}원 전세권자 김임차`;
const base = { address: "", ip: "test", userPrice: 1000000000 };

it("등기가 분석 가능해도 시세·채권이 없으면 보증금 안전을 확정하지 않는다", async () => {
  const result = await runAnalysisPipeline({ ...base, userPrice: 0, userDeposit: 600000000,
    rawText: `${rawText(0).split("【 을 구 】")[0]}【 을 구 】` });
  expect(result.riskAnalysis.analyzable).toBe(true);
  expect(result.riskScore.claimRatios?.marketValue).toBeNull();
  expect(result.riskScore.totalScore).toBe(80);
  expect(result.riskScore.grade).not.toBe("A");
  expect(result.riskScore.factors).toContainEqual(expect.objectContaining({ id: "claims_unverified" }));
  expect(result.riskAnalysis.risks.some(r => r.level === "warning" && /산정 불가/.test(r.title))).toBe(true);
});

it.each([[850000000, 0], [300000000, 550000000]])("선순위 %s / 보증금 %s 고위험은 파이프라인 결론에 일관되게 반영", async (claim, userDeposit) => {
  const result = await runAnalysisPipeline({ ...base, rawText: rawText(claim), userDeposit });
  expect(result.riskAnalysis.analyzable).toBe(true);
  expect(result.riskScore.totalScore).toBeLessThanOrEqual(49);
  expect(result.aiOpinion).toContain("선순위 부담 기준 고위험");
  expect(result.fraudRisk.fraudScore).toBeGreaterThanOrEqual(60);
  expect(["danger", "critical"]).toContain(result.fraudRisk.riskLevel);
  expect(result.fraudRisk.recommendation).toContain("선순위 부담 기준 고위험");
  expect(result.fraudRisk.recommendation).not.toContain("낮은 편");
});

it("본인 갱신 선택은 실제 분석까지 전달되어 보증금을 이중 합산하지 않는다", async () => {
  const input = { ...base, rawText: rawText(600000000, "전세권설정"), userDeposit: 600000000 };
  const foreign = await runAnalysisPipeline(input);
  const own = await runAnalysisPipeline({ ...input, ownJeonseRight: { order: 1, holder: "김임차" } });
  expect(foreign.riskScore.claimRatios?.combinedBurden).toBe(120);
  expect(own.riskScore.claimRatios?.combinedBurden).toBe(60);
  expect(own.riskScore.decisiveHighRisk).toBeNull();
  expect(own.fraudRisk.fraudScore).toBeLessThan(60);
});
