import { describe, expect, it } from "vitest";
import { parseRegistry } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { buildClaimRatios, evaluateClaimRatios, decisiveClaimRisk } from "@/lib/risk/claims-policy";
import { evaluateMortgageRatio } from "@/lib/risk/evaluators";
import { predictFraudRisk, extractFeaturesFromRiskScore } from "@/lib/fraud-risk-model";
import { addressKey } from "@/lib/registry/title-address-parser";
import { parseAreaValue } from "@/lib/registry/title-area-parser";
import { sameProperty } from "@/lib/analysis/normalize-record";

const registry = (amount: number, purpose = "근저당권설정") => parseRegistry(`【 표 제 부 】
서울특별시 강남구 테헤란로 123
아파트 84.97㎡
【 갑 구 】
1 소유권보존 2020년1월1일 소유자 홍길동
【 을 구 】
1 ${purpose} 2021년1월1일 채권최고액 금${amount}원 전세금 금${amount}원 권리자 임차인`);

describe("채권 산정 미확인과 갱신", () => {
  it.each([undefined, 0, -1, NaN, Infinity])("채권 없는 등기도 시세 %s이면 보증금 회수 여력을 안전으로 판단하지 않는다", price => {
    const parsed = registry(0);
    parsed.eulgu = [];
    parsed.summary.totalMortgageAmount = 0;
    for (const deposit of [undefined, 0, 600]) {
      const score = calculateRiskScore(parsed, price, deposit);
      expect(score.claimRatios?.marketValue).toBeNull();
      expect(score.claimRatios?.ratioToMarket).toBeNull();
      expect(score.claimRatios?.combinedBurden).toBeNull();
      expect(score.totalScore).toBe(80);
      expect(score.grade).not.toBe("A");
      expect(score.factors).toContainEqual(expect.objectContaining({ id: "claims_unverified", deduction: 20 }));
    }
    expect(calculateRiskScore(parsed, 1000, 600).factors.some(f => f.id === "claims_unverified")).toBe(false);
    expect(calculateRiskScore(parsed, 1000, 600).totalScore).toBe(85);
  });
  it.each([[0, undefined], [300, undefined], [0, 1000]])("미확인 %s/%s는 100점이 아니며 주의를 생성", (amount, price) => {
    const score = calculateRiskScore(registry(amount), price);
    expect(score.totalScore).toBeLessThan(85);
    expect(score.grade).not.toBe("A");
    expect(score.factors.some(f => f.id === "claims_unverified" && /산정 불가/.test(f.description))).toBe(true);
  });
  it("불확실 채권은 확인된 고위험을 덮지 않는다", () => {
    const r = { ...buildClaimRatios(registry(900), 1000), uncertainClaims: true };
    const result = evaluateClaimRatios(r);
    expect(result.deduction).toBeGreaterThanOrEqual(51);
    expect(result.factors.map(f => f.id)).toContain("claims_unverified");
    expect(result.factors.reduce((sum, f) => sum + f.deduction, 0)).toBe(result.deduction);
  });
  it("금액 미확인 채권이 있어도 확인된 보증금만으로 시세를 초과하면 고위험을 유지", () => {
    const ratios = buildClaimRatios(registry(0), 1000, 1100);
    expect(ratios.uncertainClaims).toBe(true);
    expect(evaluateClaimRatios(ratios).deduction).toBe(71);
    expect(decisiveClaimRisk(ratios)?.basis).toBe("combinedBurden");
  });
  it("보증금 대비 비율은 결정요인이 아니며 시세가 없으면 주의한다", () => {
    const r = buildClaimRatios(registry(500), 10000, 100);
    expect(r.ratioToDeposit).toBe(500);
    expect(evaluateClaimRatios(r).deduction).toBe(0);
    expect(decisiveClaimRisk(r)).toBeNull();
    expect(evaluateClaimRatios(buildClaimRatios(registry(500), undefined, 100)).deduction).toBeGreaterThan(0);
  });
  it("타인 전세권은 합산하고 명시한 본인 갱신 전세권만 제외", () => {
    const parsed = registry(600, "전세권설정");
    parsed.eulgu[0].holder = "김임차";
    const entry = parsed.eulgu[0];
    const foreign = buildClaimRatios(parsed, 1000, 600);
    expect(foreign.priorClaims).toBe(600);
    expect(foreign.combinedBurden).toBe(120);
    expect(decisiveClaimRisk(foreign)?.basis).toBe("combinedBurden");
    expect(evaluateClaimRatios(foreign).factors[0].detail).toContain("전세권 1건 포함");
    const own = buildClaimRatios(parsed, 1000, 600, { order: entry.order, holder: entry.holder });
    expect(own.priorClaims).toBe(0);
    expect(own.combinedBurden).toBe(60);
    expect(decisiveClaimRisk(own)).toBeNull();
    expect(evaluateClaimRatios(own).factors[0].detail).toContain("본인 갱신 전세권 600원 제외");
    expect(buildClaimRatios(parsed, 1000, 600, { order: entry.order, holder: "타인" }).priorClaims).toBe(600);
    parsed.eulgu.push({ ...entry, order: 2, holder: "다른 임차인", amount: 200 });
    expect(buildClaimRatios(parsed, 1000, 600, { order: entry.order, holder: entry.holder }).priorClaims).toBe(200);
  });
});

describe("중복감점과 결정적 위험 전파", () => {
  it.each([55, 81, 90, 130])("근저당 %s%% 기본 감점은 max이며 양쪽 경고를 보존", ratio => {
    const parsed = registry(ratio);
    const score = calculateRiskScore(parsed, 100);
    expect(score.totalDeduction).toBe(Math.max(evaluateMortgageRatio(parsed, 100).deduction,
      evaluateClaimRatios(buildClaimRatios(parsed, 100)).deduction));
    const debtFactors = score.factors.filter(f => /^(mortgage_|total_claims_)/.test(f.id));
    expect(debtFactors.filter(f => f.deduction > 0)).toHaveLength(1);
    expect(debtFactors.map(f => f.id)).toEqual(expect.arrayContaining([
      ...evaluateMortgageRatio(parsed, 100).factors.map(f => f.id),
      ...evaluateClaimRatios(buildClaimRatios(parsed, 100)).factors.map(f => f.id),
    ]));
    expect(new Set(debtFactors.map(f => f.description)).size).toBe(debtFactors.length);
    expect(score.factors.reduce((s, f) => s + f.deduction, 0)).toBe(score.totalDeduction);
  });
  it("다수 근저당과 높은 비율 상호작용에 도달", () => {
    const parsed = registry(30);
    parsed.eulgu.push({ ...parsed.eulgu[0], order: 2 }, { ...parsed.eulgu[0], order: 3 });
    parsed.summary.totalMortgageAmount = 90;
    expect(calculateRiskScore(parsed, 100).interactionPenalties?.appliedRules.map(r => r.ruleId)).toContain("multi_mortgage_high_ratio");
  });
  it("경매와 초과채권 상호작용에 도달", () => {
    const parsed = registry(130);
    parsed.summary.hasAuctionOrder = true;
    expect(calculateRiskScore(parsed, 100).interactionPenalties?.appliedRules.map(r => r.ruleId)).toContain("auction_extreme_mortgage");
  });
  it.each([[85, 0, 60], [30, 55, 60], [50, 60, 80]])("채권 %s 보증금 %s의 사기위험 하한 %s", (claim, deposit, floor) => {
    const risk = calculateRiskScore(registry(claim), 100, deposit);
    const features = extractFeaturesFromRiskScore(risk);
    expect(features.priorityClaimRatio).toBe(claim);
    const fraud = predictFraudRisk(features);
    expect(fraud.fraudScore).toBeGreaterThanOrEqual(floor);
    expect(["danger", "critical"]).toContain(fraud.riskLevel);
    expect(fraud.recommendation).toContain("선순위 부담 기준 고위험");
    expect(fraud.recommendation).not.toContain("낮은 편");
  });
});

const snapshot = (address: string, propertyInfo = {}) => ({ id: "a", type: "rights", typeLabel: "권리분석",
  address, data: JSON.stringify({ propertyInfo }), createdAt: new Date() });
describe("동일 물건과 면적 경계", () => {
  it.each(["제101동 제301호", "101동 301호", "제101동 제3층 제301호", "제１０１동제３층제３０１호"])("동호수 canonical %s", unit => {
    expect(addressKey(unit)).toBe("101동 301호");
    expect(sameProperty(snapshot(`서울 건물 ${unit}`), snapshot("서울 건물", { unitNumber: "101동 301호" }))).toBe(true);
  });
  it("동호수 미확인은 건물 주소가 같아도 비교하지 않으며 고유번호 우선", () => {
    expect(sameProperty(snapshot("서울 건물"), snapshot("서울 건물"))).toBe(false);
    expect(sameProperty(snapshot("서울 건물 301호"), snapshot("서울 건물 301호"))).toBe(false);
    expect(sameProperty(snapshot("서울 건물 101동 301호"), snapshot("서울 건물 102동 301호"))).toBe(false);
    expect(sameProperty(snapshot("A", { propUid: "1" }), snapshot("B", { propUid: "1" }))).toBe(true);
    expect(sameProperty(snapshot("서울 101동 301호", { propUid: "1" }), snapshot("서울 101동 301호", { propUid: "2" }))).toBe(false);
    // #4: 공백 제거로 건물번호+동번호가 붙어 서로 다른 물건이 같은 키가 되던 회귀 방지
    expect(sameProperty(snapshot("테헤란로 12 101동 301호"), snapshot("테헤란로 1 2101동 301호"))).toBe(false);
  });
  it.each([["1,234.56㎡", 1234.56], ["12,345,678.9m²", 12345678.9], ["１２３，４５６．７８㎡", 123456.78],
    ["12,34.56㎡", 0], ["1.234.56㎡", 0], ["-1,234.56㎡", 0], ["1,234㎡", 1234]])("면적 %s → %s", (input, expected) => {
    expect(parseAreaValue(input)).toBe(expected);
  });
});
