import type { FraudRiskResult } from "../patent-types";
import type { RiskScore } from "../risk-scoring";
import { decisiveClaimRisk } from "./claims-policy";

/** 위험점수는 높을수록 위험하다. 가중평균이 결정적 담보 위험을 희석하지 못하게 한다. */
export function applyClaimFraudFloor(result: FraudRiskResult, risk?: RiskScore): FraudRiskResult {
  const decisive = risk?.claimRatios ? decisiveClaimRisk(risk.claimRatios) : null;
  if (!decisive) return result;
  const fraudScore = Math.max(result.fraudScore, decisive.ratio >= 100 ? 80 : 60);
  const critical = fraudScore >= 80;
  return {
    ...result, fraudScore, riskLevel: critical ? "critical" : "danger",
    riskLabel: critical ? "매우위험" : "위험",
    recommendation: `${decisive.reason}: ${decisive.basis === "combinedBurden" ? "보증금 포함 부담" : "시세 대비 선순위"} ${decisive.ratio.toFixed(1)}%. 보증금 회수 위험이 높아 계약·갱신 전 전문가와 권리순위 및 채권 감액·말소를 확인하세요. 전세보증금반환보증 가입 가능 여부도 확인하세요.`,
  };
}
