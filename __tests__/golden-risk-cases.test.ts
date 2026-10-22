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
import {
  REGISTRY_SAFE,
  REGISTRY_UNDERWATER,
  REGISTRY_SEIZURE_AUCTION,
  REGISTRY_MULTI_TRANSFER,
  REGISTRY_CANCELLED_SEIZURE,
  REGISTRY_OWN_JEONSE,
} from "./fixtures/golden-registries";

// 안전 → 위험 순. rank가 클수록 위험.
const GRADE_ORDER: RiskGrade[] = ["A", "B", "C", "D", "F"];
const rank = (g: RiskGrade) => GRADE_ORDER.indexOf(g);

interface GoldenCase {
  id: string;
  title: string;
  /** 엔진과 독립된 현실 근거 — 왜 이 판정이 정답인가. */
  realityBasis: string;
  input: { registryText: string; price?: number; deposit?: number; ownJeonse?: { order: number; holder: string } };
  expect: {
    /** safe=안전해야 / risky=위험해야 / uncertain=정보부족이라 안전(A) 단정 금지. */
    reality: "safe" | "risky" | "uncertain";
    /** risky면 이 등급 이상 위험이어야(같거나 더). safe면 이 등급 이하 안전이어야. uncertain은 미사용. */
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
  {
    id: "G-002",
    title: "깨끗한 등기 — 근저당 소액(시세 18%), 압류·경매 없음",
    realityBasis:
      "선순위 근저당이 시세 대비 소액이고 압류·경매가 없다. 보증금 회수 위험이 낮음 → 안전(A/B)이어야 한다. D/F면 과잉 경고.",
    input: { registryText: REGISTRY_SAFE, price: 850_000_000, deposit: 300_000_000 },
    expect: { reality: "safe", gradeBoundary: "B", mustNotHaveFactorPattern: /seizure|auction|total_claims_critical/ },
  },
  {
    id: "G-003",
    title: "깡통전세 — 선순위 근저당 7.2억(시세 8.5억의 85%)",
    realityBasis:
      "선순위 근저당이 시세의 85%로, 보증금(5.5억)보다 앞선다. 경매 시 세입자가 보증금을 못 받을 가능성이 높음 → 반드시 위험(D 이상).",
    input: { registryText: REGISTRY_UNDERWATER, price: 850_000_000, deposit: 550_000_000 },
    expect: { reality: "risky", gradeBoundary: "D", mustHaveFactorPattern: /total_claims_critical/ },
  },
  {
    id: "G-004",
    title: "압류 + 임의경매개시결정",
    realityBasis:
      "활성 압류와 경매개시결정이 존재한다. 경매가 진행 중이면 보증금 회수가 치명적으로 위험함 → 반드시 위험(D 이상), 압류·경매를 감지해야 한다.",
    input: { registryText: REGISTRY_SEIZURE_AUCTION, price: 850_000_000, deposit: 400_000_000 },
    expect: { reality: "risky", gradeBoundary: "D", mustHaveFactorPattern: /seizure|auction/ },
  },
  {
    id: "G-005",
    title: "다중 근저당 + 소유권 6개월 내 3회 이전(사기 의심 시계열)",
    realityBasis:
      "짧은 기간 소유권이 반복 이전되고 다중 근저당이 설정됐다. 명의신탁·깡통전세 사기의 전형적 시계열 → 위험(D 이상), 소유권 빈번 이전을 감지해야 한다.",
    input: { registryText: REGISTRY_MULTI_TRANSFER, price: 850_000_000, deposit: 400_000_000 },
    expect: { reality: "risky", gradeBoundary: "D", mustHaveFactorPattern: /ownership_freq/ },
  },
  {
    id: "G-006",
    title: "말소된 가압류 — 과거 가압류 해제 + 근저당 소액",
    realityBasis:
      "가압류가 해제(말소)됐고 근저당은 소액이다. 말소된 권리는 현행 위험이 아니다 → 안전(A/B). 말소된 가압류를 현행 위험으로 잡으면 과잉 경고.",
    input: { registryText: REGISTRY_CANCELLED_SEIZURE, price: 850_000_000, deposit: 300_000_000 },
    expect: { reality: "safe", gradeBoundary: "B", mustNotHaveFactorPattern: /seizure/ },
  },
  {
    id: "G-007",
    title: "시세 미확인 — 등기는 안전하나 시세·보증금 정보 없음",
    realityBasis:
      "등기 자체는 깨끗하나 시세·보증금이 없어 선순위 부담을 확정할 수 없다. 정보 부족 시 '안전(A)' 단정은 위험 → A가 아니어야 하고 불확실성(claims_unverified)을 반영해야 한다.",
    input: { registryText: REGISTRY_SAFE }, // 시세·보증금 미입력
    expect: { reality: "uncertain", gradeBoundary: "A", mustHaveFactorPattern: /unverified/ },
  },
  {
    id: "G-008",
    title: "본인 전세권 — 유일한 선순위가 세입자 본인 전세권(ownJeonse 지정)",
    realityBasis:
      "을구의 유일한 권리가 세입자 본인의 전세권(5억)이다. 본인 보증금을 타인 선순위 위험으로 계산하면 과잉 경고. ownJeonse 지정 시 본인 전세권을 제외하면 선순위 위험이 없어 안전(A/B)이어야 한다.",
    input: {
      registryText: REGISTRY_OWN_JEONSE,
      price: 850_000_000,
      deposit: 500_000_000,
      ownJeonse: { order: 1, holder: "정민수" },
    },
    expect: { reality: "safe", gradeBoundary: "B", mustNotHaveFactorPattern: /total_claims_critical/ },
  },
];

describe("골든 분석 신뢰 사례집 — 중대 위험 누락 차단", () => {
  for (const c of CASES) {
    it(`${c.id}: ${c.title}`, () => {
      const parsed = parseRegistry(c.input.registryText);
      const r = calculateRiskScore(parsed, c.input.price, c.input.deposit, c.input.ownJeonse);
      const factorIds = r.factors.map((f) => f.id).join(" ");

      if (c.expect.reality === "risky") {
        // 현실 위험 → 엔진이 gradeBoundary 이상 위험(D/F)이어야. A/B면 위험 누락.
        expect(
          rank(r.grade),
          `중대 위험 누락: ${c.id}는 현실상 위험인데 엔진 등급=${r.grade}(${r.gradeLabel}). 근거: ${c.realityBasis}`,
        ).toBeGreaterThanOrEqual(rank(c.expect.gradeBoundary));
      } else if (c.expect.reality === "safe") {
        // 현실 안전 → 엔진이 과잉 경고하면 안 됨.
        expect(
          rank(r.grade),
          `과잉 경고: ${c.id}는 현실상 안전인데 엔진 등급=${r.grade}(${r.gradeLabel}).`,
        ).toBeLessThanOrEqual(rank(c.expect.gradeBoundary));
      } else {
        // uncertain: 정보 부족 → 안전(A) 단정 금지. A보다 낮은(덜 안전) 등급이어야.
        expect(
          rank(r.grade),
          `정보 부족인데 안전(A) 단정: ${c.id} 엔진 등급=${r.grade}. 불확실성을 반영해야 함.`,
        ).toBeGreaterThan(rank("A"));
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
