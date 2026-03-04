/**
 * VESTRA 자기검증 루프 (Self-Verification Engine)
 * ──────────────────────────────────────────────
 * AI 생성 의견과 결정론적 분석 결과를 교차검증하여
 * 불일치를 감지하고 복합 신뢰도를 산출.
 *
 * 특허 핵심: 생성형 AI 출력을 규칙 기반 결정론적 결과와 자동 교차검증하여
 *           분석 파이프라인의 자기 교정(self-correction) 능력을 구현.
 */

import type { RiskScore } from "./risk-scoring";
import type { ValidationResult } from "./validation-engine";
import type { VerificationCheck, SelfVerificationResult } from "./patent-types";

// ─── AI 위험수준 추출 ───

function extractAiRiskLevel(aiOpinion: string): string {
  if (/매우\s*위험|극히\s*위험|즉시/.test(aiOpinion)) return "F";
  if (/위험|주의\s*필요|신중/.test(aiOpinion)) return "D";
  if (/주의|유의|확인\s*필요/.test(aiOpinion)) return "C";
  if (/양호|비교적\s*안전/.test(aiOpinion)) return "B";
  if (/안전|문제\s*없/.test(aiOpinion)) return "A";
  return "unknown";
}

// ─── AI 가격 참조 추출 ───

function extractAiPrice(aiOpinion: string): number | null {
  // "약 X억원", "X억 Y만원" 패턴
  const eokMatch = aiOpinion.match(/약?\s*(\d+)\s*억\s*(\d{1,4})?\s*만?\s*원/);
  if (eokMatch) {
    const eok = parseInt(eokMatch[1], 10) * 100_000_000;
    const man = eokMatch[2] ? parseInt(eokMatch[2], 10) * 10_000 : 0;
    return eok + man;
  }

  const manMatch = aiOpinion.match(/약?\s*(\d{1,5})\s*만\s*원/);
  if (manMatch) return parseInt(manMatch[1], 10) * 10_000;

  return null;
}

// ─── 검증 체크 목록 ───

function checkRiskLevelConsistency(
  aiOpinion: string,
  riskScore: RiskScore,
): VerificationCheck {
  const aiLevel = extractAiRiskLevel(aiOpinion);
  const grade = riskScore.grade;

  // 등급 거리 계산 (A=0, B=1, C=2, D=3, F=4)
  const gradeMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, F: 4 };
  const aiGradeNum = gradeMap[aiLevel] ?? -1;
  const detGradeNum = gradeMap[grade] ?? -1;

  let isConsistent = true;
  let discrepancyLevel: VerificationCheck["discrepancyLevel"] = "none";
  let discrepancyDetail: string | undefined;

  if (aiGradeNum >= 0 && detGradeNum >= 0) {
    const diff = Math.abs(aiGradeNum - detGradeNum);
    if (diff >= 3) {
      isConsistent = false;
      discrepancyLevel = "major";
      discrepancyDetail = `AI는 '${aiLevel}' 수준으로 평가했으나, 정량 스코어링은 '${grade}'등급입니다. 3등급 이상 차이.`;
    } else if (diff >= 2) {
      isConsistent = false;
      discrepancyLevel = "minor";
      discrepancyDetail = `AI는 '${aiLevel}' 수준으로 평가했으나, 정량 스코어링은 '${grade}'등급입니다.`;
    }
  }

  return {
    checkId: "risk_level_consistency",
    description: "AI 위험 평가 vs 정량 스코어링 등급 일치 여부",
    aiValue: aiLevel,
    deterministicValue: grade,
    isConsistent,
    discrepancyLevel,
    discrepancyDetail,
  };
}

function checkCriticalRiskMentions(
  aiOpinion: string,
  riskScore: RiskScore,
): VerificationCheck {
  const criticalFactors = riskScore.factors.filter((f) => f.severity === "critical");
  const mentionedKeywords: Record<string, string[]> = {
    seizure: ["압류"],
    provisional_seizure: ["가압류"],
    auction: ["경매"],
    lease_registration: ["임차권등기", "임차권"],
    mortgage_extreme: ["근저당", "채권최고액"],
    mortgage_very_high: ["근저당", "시세 초과"],
  };

  const unmentioned: string[] = [];
  for (const factor of criticalFactors) {
    const keywords = mentionedKeywords[factor.id] || [factor.category];
    const mentioned = keywords.some((kw) => aiOpinion.includes(kw));
    if (!mentioned) {
      unmentioned.push(factor.description);
    }
  }

  return {
    checkId: "critical_risk_mentions",
    description: "AI가 모든 치명적 위험요소를 언급했는지",
    aiValue: `${criticalFactors.length - unmentioned.length}/${criticalFactors.length} 언급`,
    deterministicValue: `${criticalFactors.length}건 치명적 위험`,
    isConsistent: unmentioned.length === 0,
    discrepancyLevel: unmentioned.length > 0
      ? (unmentioned.length >= 2 ? "major" : "minor")
      : "none",
    discrepancyDetail: unmentioned.length > 0
      ? `AI가 언급하지 않은 치명적 위험: ${unmentioned.join(", ")}`
      : undefined,
  };
}

function checkPriceConsistency(
  aiOpinion: string,
  estimatedPrice: number,
): VerificationCheck {
  const aiPrice = extractAiPrice(aiOpinion);

  if (aiPrice === null || estimatedPrice <= 0) {
    return {
      checkId: "price_consistency",
      description: "AI 언급 가격 vs 추정 시세 일치 여부",
      aiValue: aiPrice ?? "미언급",
      deterministicValue: estimatedPrice,
      isConsistent: true,
      discrepancyLevel: "none",
    };
  }

  const deviation = Math.abs(aiPrice - estimatedPrice) / estimatedPrice;

  return {
    checkId: "price_consistency",
    description: "AI 언급 가격 vs 추정 시세 일치 여부 (±20% 허용)",
    aiValue: aiPrice,
    deterministicValue: estimatedPrice,
    isConsistent: deviation <= 0.2,
    discrepancyLevel: deviation > 0.4 ? "major" : deviation > 0.2 ? "minor" : "none",
    discrepancyDetail: deviation > 0.2
      ? `AI 언급 가격이 추정 시세 대비 ${(deviation * 100).toFixed(1)}% 차이납니다.`
      : undefined,
  };
}

function checkValidationAlertConsistency(
  aiOpinion: string,
  validation: ValidationResult,
): VerificationCheck {
  const hasErrors = validation.summary.errors > 0;
  const aiSaysReliable = /신뢰.*할\s*수\s*있|데이터.*정확|검증.*통과/.test(aiOpinion);

  return {
    checkId: "validation_alert",
    description: "검증 오류 존재 시 AI가 데이터 신뢰성을 과대평가하는지",
    aiValue: aiSaysReliable ? "신뢰할 수 있다고 평가" : "신뢰성 미언급",
    deterministicValue: `${validation.summary.errors}건 오류`,
    isConsistent: !(hasErrors && aiSaysReliable),
    discrepancyLevel: hasErrors && aiSaysReliable ? "major" : "none",
    discrepancyDetail: hasErrors && aiSaysReliable
      ? `검증에서 ${validation.summary.errors}건 오류가 있으나 AI는 데이터를 신뢰할 수 있다고 평가했습니다.`
      : undefined,
  };
}

function checkConfidenceRiskAlignment(
  riskScore: RiskScore,
  compositeReliability: number,
): VerificationCheck {
  // 신뢰도가 낮은데(< 0.4) 위험도도 낮으면(A/B) → 거짓 안전 경고
  const lowConfidence = compositeReliability < 0.4;
  const lowRisk = riskScore.grade === "A" || riskScore.grade === "B";
  const falseSafety = lowConfidence && lowRisk;

  return {
    checkId: "confidence_risk_alignment",
    description: "분석 신뢰도가 낮은 상태에서의 안전 등급 경고",
    aiValue: `신뢰도 ${(compositeReliability * 100).toFixed(0)}%`,
    deterministicValue: `${riskScore.grade}등급 (${riskScore.totalScore}점)`,
    isConsistent: !falseSafety,
    discrepancyLevel: falseSafety ? "major" : "none",
    discrepancyDetail: falseSafety
      ? `분석 신뢰도가 ${(compositeReliability * 100).toFixed(0)}%로 낮은 상태에서 ${riskScore.grade}등급이 산출되었습니다. 데이터 부족으로 인한 거짓 안전 가능성이 있습니다.`
      : undefined,
  };
}

// ─── 추천 문구 생성 ───

function generateRecommendation(
  checks: VerificationCheck[],
  overallConsistency: number,
): string {
  const majorCount = checks.filter((c) => c.discrepancyLevel === "major").length;
  const minorCount = checks.filter((c) => c.discrepancyLevel === "minor").length;

  if (majorCount === 0 && minorCount === 0) {
    return "AI 의견과 정량 분석 결과가 일관됩니다. 분석 결과를 신뢰할 수 있습니다.";
  }
  if (majorCount > 0) {
    return `AI 의견과 정량 분석 사이에 ${majorCount}건의 중대 불일치가 발견되었습니다. 분석 결과를 주의 깊게 검토하세요.`;
  }
  return `AI 의견과 정량 분석 사이에 ${minorCount}건의 경미한 불일치가 있습니다. 참고사항으로 확인하세요.`;
}

// ─── 메인 함수 ───

/**
 * AI 의견과 결정론적 분석 결과를 교차검증합니다.
 */
export function selfVerify(
  aiOpinion: string,
  riskScore: RiskScore,
  estimatedPrice: number,
  validation: ValidationResult,
  compositeReliability: number,
): SelfVerificationResult {
  const checks: VerificationCheck[] = [];

  if (aiOpinion && aiOpinion.length >= 10) {
    checks.push(checkRiskLevelConsistency(aiOpinion, riskScore));
    checks.push(checkCriticalRiskMentions(aiOpinion, riskScore));
    checks.push(checkPriceConsistency(aiOpinion, estimatedPrice));
    checks.push(checkValidationAlertConsistency(aiOpinion, validation));
  }

  checks.push(checkConfidenceRiskAlignment(riskScore, compositeReliability));

  const consistentCount = checks.filter((c) => c.isConsistent).length;
  const overallConsistency = checks.length > 0 ? consistentCount / checks.length : 1;
  const discrepancyCount = checks.filter((c) => c.discrepancyLevel !== "none").length;

  const finalReliability = overallConsistency * compositeReliability;
  const recommendation = generateRecommendation(checks, overallConsistency);

  return {
    checks,
    overallConsistency,
    discrepancyCount,
    compositeReliability: finalReliability,
    recommendation,
  };
}
