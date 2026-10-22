/**
 * 골든 분석 신뢰 사례집 — 위험도 엔진 정확도 + 중대 위험 누락 차단 (9점 평가축 A).
 *
 * 핵심 원칙(동어반복 방지): 각 케이스의 "정답"은 엔진 규칙이 아니라 **현실에서 세입자에게
 * 위험한가**로 정한다(realityBasis). 현실상 위험한 물건을 엔진이 안전/양호(A/B) 등급으로
 * 판정하면 = "중대 위험 누락" → 테스트 실패(보고서가 출시 차단 기준으로 지정한 항목).
 *
 * 엔진은 LLM 없이 결정적: parseRegistry(text) → calculateRiskScore(parsed, 시세, 보증금).
 * 매 배포마다 CI(__tests__/**)에서 실행된다. 케이스는 아래 CASES 배열에 추가해 확장한다.
 *
 * Phase 1(현재): 현실 기준이 명백한 케이스(규칙 95% 자동 판정). 전문가 불필요.
 * Phase 2(예정): 경계 케이스 + 실제 사기 등기부 재현 → 전문가 정답 합의.
 */
import { describe, it, expect } from "vitest";
import { parseRegistry, SAMPLE_REGISTRY_TEXT } from "@/lib/registry-parser";
import { calculateRiskScore } from "@/lib/risk-scoring";
import type { RiskGrade } from "@/lib/risk/grade-policy";

// 안전 → 위험 순. rank가 클수록 위험.
const GRADE_ORDER: RiskGrade[] = ["A", "B", "C", "D", "F"];
const rank = (g: RiskGrade) => GRADE_ORDER.indexOf(g);

interface GoldenCase {
  id: string;
  title: string;
  /** 엔진과 독립된 현실 근거 — 왜 이 판정이 정답인가. */
  realityBasis: string;
  input: { registryText: string; price?: number; deposit?: number };
  expect: {
    reality: "safe" | "risky";
    /** risky면 이 등급 이상 위험이어야(같거나 더). safe면 이 등급 이하 안전이어야. */
    gradeBoundary: RiskGrade;
    mustHaveFactorPattern?: RegExp;
    mustNotHaveFactorPattern?: RegExp;
  };
}

const CASES: GoldenCase[] = [
  {
    id: "G-001",
    title: "선순위 채권 과다 + 가압류 (SAMPLE 등기부)",
    realityBasis:
      "선순위 채권이 시세 대비 과다하고 가압류가 존재한다. 경매·배당 시 세입자 보증금 회수가 현실적으로 어렵다 → 반드시 위험 등급(D/F)이어야 한다. A/B면 중대 위험 누락.",
    input: { registryText: SAMPLE_REGISTRY_TEXT, price: 850_000_000, deposit: 550_000_000 },
    expect: { reality: "risky", gradeBoundary: "D", mustHaveFactorPattern: /claims_critical|seizure/ },
  },
  // TODO(Phase 1 확장): 등기부 합성으로 아래 케이스 추가
  //  - G-002 깨끗한 등기(압류·경매 없음, 근저당 50%↓) → safe, A/B
  //  - G-003 깡통전세(선순위 85%+) → risky, D 이상
  //  - G-004 압류+경매개시 → risky, F
  //  - G-005 다중 근저당 + 소유권 빈번 이전(사기 시계열) → risky, D 이상
];

describe("골든 분석 신뢰 사례집 — 중대 위험 누락 차단", () => {
  for (const c of CASES) {
    it(`${c.id}: ${c.title}`, () => {
      const parsed = parseRegistry(c.input.registryText);
      const r = calculateRiskScore(parsed, c.input.price, c.input.deposit);
      const factorIds = r.factors.map((f) => f.id).join(" ");

      if (c.expect.reality === "risky") {
        // 현실 위험 → 엔진이 gradeBoundary 이상 위험(D/F)이어야. A/B면 위험 누락.
        expect(
          rank(r.grade),
          `중대 위험 누락: ${c.id}는 현실상 위험인데 엔진 등급=${r.grade}(${r.gradeLabel}). 근거: ${c.realityBasis}`,
        ).toBeGreaterThanOrEqual(rank(c.expect.gradeBoundary));
      } else {
        // 현실 안전 → 엔진이 과잉 경고하면 안 됨.
        expect(
          rank(r.grade),
          `과잉 경고: ${c.id}는 현실상 안전인데 엔진 등급=${r.grade}(${r.gradeLabel}).`,
        ).toBeLessThanOrEqual(rank(c.expect.gradeBoundary));
      }

      if (c.expect.mustHaveFactorPattern) {
        expect(factorIds, `${c.id}: 기대 위험요인 미감지`).toMatch(c.expect.mustHaveFactorPattern);
      }
      if (c.expect.mustNotHaveFactorPattern) {
        expect(factorIds, `${c.id}: 없어야 할 위험요인 감지`).not.toMatch(c.expect.mustNotHaveFactorPattern);
      }

      // 버전 추적(규칙 변경 시 골든 재검토 신호)
      expect(r.scoreRuleVersion).toBeTruthy();
    });
  }
});
