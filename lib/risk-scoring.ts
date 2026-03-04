/**
 * VESTRA 리스크 스코어링 알고리즘
 * ──────────────────────────────
 * 순수 TypeScript 구현. AI/LLM 호출 없음.
 * 등기부등본 파싱 결과를 입력받아 가중치 기반 정량적 위험도를 산출.
 *
 * 스코어링 모델: 100점 만점, 감점 방식
 * - 높은 점수 = 안전
 * - 낮은 점수 = 위험
 */

import type { ParsedRegistry } from "./registry-parser";
import type {
  RiskInteractionRule,
  RiskInteractionResult,
  TemporalPattern,
  TemporalRiskResult,
} from "./patent-types";

// ─── 타입 정의 ───

export type RiskGrade = "A" | "B" | "C" | "D" | "F";

export interface RiskFactor {
  id: string;
  category: string;
  description: string;
  deduction: number;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
}

export interface RiskScore {
  totalScore: number;
  grade: RiskGrade;
  gradeLabel: string;
  gradeColor: string;
  factors: RiskFactor[];
  mortgageRatio: number;
  totalDeduction: number;
  summary: string;
  interactionPenalties?: RiskInteractionResult;
  temporalPatterns?: TemporalRiskResult;
}

// ─── 등급 체계 ───

interface GradeInfo {
  label: string;
  color: string;
}

const GRADE_MAP: Record<RiskGrade, GradeInfo> = {
  A: { label: "안전", color: "emerald" },
  B: { label: "양호", color: "blue" },
  C: { label: "주의", color: "amber" },
  D: { label: "위험", color: "orange" },
  F: { label: "매우위험", color: "red" },
};

function getGrade(score: number): RiskGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

// ─── 스코어링 규칙 ───

function evaluateMortgageRatio(
  parsed: ParsedRegistry,
  estimatedPrice: number
): { deduction: number; ratio: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  const { totalMortgageAmount } = parsed.summary;

  if (!estimatedPrice || estimatedPrice <= 0) {
    return { deduction: 0, ratio: 0, factors };
  }

  const ratio = (totalMortgageAmount / estimatedPrice) * 100;

  if (ratio > 120) {
    factors.push({
      id: "mortgage_extreme",
      category: "근저당",
      description: "근저당 비율 매우 위험",
      deduction: 30,
      severity: "critical",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%로, 120%를 초과합니다. 깡통주택 위험이 매우 높습니다.`,
    });
    return { deduction: 30, ratio, factors };
  }

  if (ratio > 100) {
    factors.push({
      id: "mortgage_very_high",
      category: "근저당",
      description: "근저당 비율 초과위험",
      deduction: 25,
      severity: "critical",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%로, 시세를 초과합니다. 깡통주택 위험이 높습니다.`,
    });
    return { deduction: 25, ratio, factors };
  }

  if (ratio > 80) {
    factors.push({
      id: "mortgage_high",
      category: "근저당",
      description: "근저당 비율 위험",
      deduction: 20,
      severity: "high",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 80%를 초과하여 보증금 회수 위험이 있습니다.`,
    });
    return { deduction: 20, ratio, factors };
  }

  if (ratio > 70) {
    factors.push({
      id: "mortgage_elevated",
      category: "근저당",
      description: "근저당 비율 주의",
      deduction: 10,
      severity: "medium",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 70%를 초과하여 주의가 필요합니다.`,
    });
    return { deduction: 10, ratio, factors };
  }

  if (ratio > 50) {
    factors.push({
      id: "mortgage_moderate",
      category: "근저당",
      description: "근저당 비율 보통",
      deduction: 5,
      severity: "low",
      detail: `근저당 총액이 시세의 ${ratio.toFixed(1)}%입니다. 일반적인 수준이나 모니터링이 필요합니다.`,
    });
    return { deduction: 5, ratio, factors };
  }

  return { deduction: 0, ratio, factors };
}

function evaluateSeizure(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const { hasProvisionalSeizure, hasSeizure } = parsed.summary;

  if (hasSeizure) {
    const count = parsed.gapgu.filter((e) => e.purpose === "압류" && !e.isCancelled).length;
    factors.push({
      id: "seizure",
      category: "압류",
      description: "압류 등기 존재",
      deduction: 25 * count,
      severity: "critical",
      detail: `현행 압류가 ${count}건 설정되어 있습니다. 소유권 행사에 심각한 제한이 있으며, 경매 진행 가능성이 높습니다.`,
    });
  }

  if (hasProvisionalSeizure) {
    const count = parsed.gapgu.filter((e) => e.purpose === "가압류" && !e.isCancelled).length;
    factors.push({
      id: "provisional_seizure",
      category: "가압류",
      description: "가압류 등기 존재",
      deduction: 20 * count,
      severity: "critical",
      detail: `현행 가압류가 ${count}건 설정되어 있습니다. 채무 분쟁이 있으며, 본압류로 전환될 수 있습니다.`,
    });
  }

  return factors;
}

function evaluateDisposition(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasProvisionalDisposition) {
    const count = parsed.gapgu.filter((e) => e.purpose === "가처분" && !e.isCancelled).length;
    factors.push({
      id: "disposition",
      category: "가처분",
      description: "가처분 등기 존재",
      deduction: 15 * count,
      severity: "high",
      detail: `처분금지 가처분이 ${count}건 설정되어 있습니다. 소유권 이전에 법적 분쟁이 있습니다.`,
    });
  }

  return factors;
}

function evaluateAuction(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasAuctionOrder) {
    factors.push({
      id: "auction",
      category: "경매",
      description: "경매개시결정 존재",
      deduction: 30,
      severity: "critical",
      detail: "경매가 개시된 부동산입니다. 보증금 회수가 매우 어려울 수 있으며, 임차인 보호에 각별한 주의가 필요합니다.",
    });
  }

  return factors;
}

function evaluateProvisionalRegistration(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasProvisionalRegistration) {
    factors.push({
      id: "provisional_reg",
      category: "가등기",
      description: "가등기 존재",
      deduction: 10,
      severity: "medium",
      detail: "가등기가 설정되어 있습니다. 본등기로 전환 시 후순위 권리가 말소될 수 있습니다.",
    });
  }

  return factors;
}

function evaluateTrust(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasTrust) {
    factors.push({
      id: "trust",
      category: "신탁",
      description: "신탁등기 존재",
      deduction: 15,
      severity: "high",
      detail: "신탁등기가 설정된 부동산입니다. 수탁자의 동의 없이 처분이 불가하며, 신탁원부 확인이 필요합니다.",
    });
  }

  return factors;
}

function evaluateOwnershipFrequency(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const { ownershipTransferCount } = parsed.summary;

  if (ownershipTransferCount >= 4) {
    factors.push({
      id: "ownership_freq_high",
      category: "소유권",
      description: "소유권 이전 빈도 매우 높음",
      deduction: 15,
      severity: "high",
      detail: `소유권이 ${ownershipTransferCount}회 이전되었습니다. 잦은 거래는 투기 또는 하자 물건의 징후일 수 있습니다.`,
    });
  } else if (ownershipTransferCount >= 3) {
    factors.push({
      id: "ownership_freq",
      category: "소유권",
      description: "소유권 이전 빈도 높음",
      deduction: 10,
      severity: "medium",
      detail: `소유권이 ${ownershipTransferCount}회 이전되었습니다. 평균 이상의 거래 빈도로 주의가 필요합니다.`,
    });
  }

  return factors;
}

function evaluateTotalClaims(
  parsed: ParsedRegistry,
  estimatedPrice: number
): { deduction: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  const { totalClaimsAmount } = parsed.summary;

  if (!estimatedPrice || estimatedPrice <= 0 || totalClaimsAmount <= 0) {
    return { deduction: 0, factors };
  }

  const ratio = (totalClaimsAmount / estimatedPrice) * 100;

  if (ratio > 100) {
    factors.push({
      id: "total_claims_critical",
      category: "선순위채권",
      description: "선순위채권 합산 초과",
      deduction: 25,
      severity: "critical",
      detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%로, 시세를 초과합니다. 보증금 전액 미회수 위험이 매우 높습니다.`,
    });
    return { deduction: 25, factors };
  }

  if (ratio > 80) {
    factors.push({
      id: "total_claims_high",
      category: "선순위채권",
      description: "선순위채권 합산 위험",
      deduction: 15,
      severity: "high",
      detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%입니다. 경매 시 보증금 전액 회수가 어려울 수 있습니다.`,
    });
    return { deduction: 15, factors };
  }

  if (ratio > 60) {
    factors.push({
      id: "total_claims_moderate",
      category: "선순위채권",
      description: "선순위채권 합산 주의",
      deduction: 8,
      severity: "medium",
      detail: `근저당+전세보증금 합산(${(totalClaimsAmount / 100000000).toFixed(1)}억)이 시세의 ${ratio.toFixed(1)}%입니다. 추가 채권 설정 시 위험 수준에 도달할 수 있습니다.`,
    });
    return { deduction: 8, factors };
  }

  return { deduction: 0, factors };
}

function evaluateLeaseRegistration(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasLeaseRegistration) {
    const count = parsed.eulgu.filter(
      (e) => /임차권등기|임차권설정/.test(e.purpose) && !e.isCancelled
    ).length;
    factors.push({
      id: "lease_registration",
      category: "임차권등기",
      description: "임차권등기명령 존재",
      deduction: 20,
      severity: "critical",
      detail: `임차권등기가 ${count}건 설정되어 있습니다. 이전 임차인이 보증금을 반환받지 못한 상태이며, 해당 물건의 보증금 미반환 이력을 의미합니다.`,
    });
  }

  return factors;
}

function evaluateWarningRegistration(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasWarningRegistration) {
    factors.push({
      id: "warning_reg",
      category: "예고등기",
      description: "예고등기 존재",
      deduction: 12,
      severity: "high",
      detail: "예고등기가 설정되어 있습니다. 등기원인의 무효·취소 소송이 진행 중이며, 소유권 변동 가능성이 있습니다.",
    });
  }

  return factors;
}

function evaluateRedemption(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];

  if (parsed.summary.hasRedemptionRegistration) {
    factors.push({
      id: "redemption",
      category: "환매등기",
      description: "환매등기 존재",
      deduction: 10,
      severity: "medium",
      detail: "환매등기가 설정되어 있습니다. 매도인의 환매권 행사로 소유권이 원복될 수 있습니다.",
    });
  }

  return factors;
}

function evaluateMultipleMortgages(parsed: ParsedRegistry): RiskFactor[] {
  const factors: RiskFactor[] = [];
  const activeMortgages = parsed.eulgu.filter(
    (e) => /근저당|저당/.test(e.purpose) && !e.isCancelled
  ).length;

  if (activeMortgages >= 3) {
    factors.push({
      id: "multi_mortgage",
      category: "근저당",
      description: "다수 근저당 설정",
      deduction: 10,
      severity: "medium",
      detail: `현행 근저당이 ${activeMortgages}건 설정되어 있습니다. 다수의 채권자가 존재하여 권리관계가 복잡합니다.`,
    });
  }

  return factors;
}

// ─── 위험요소 상호작용 매트릭스 ───

const INTERACTION_RULES: RiskInteractionRule[] = [
  {
    id: "seizure_auction",
    factors: ["seizure", "auction"],
    amplifier: 1.5,
    description: "압류 + 경매개시: 진행 중인 강제처분 절차",
    rationale: "압류와 경매가 동시 진행 시 소유권 상실이 거의 확정적이며, 보증금 회수 가능성이 급격히 하락합니다.",
  },
  {
    id: "multi_mortgage_high_ratio",
    factors: ["multi_mortgage", "mortgage_high"],
    amplifier: 1.3,
    description: "다수 근저당 + 높은 근저당비율: 과도한 채무부담",
    rationale: "복수 채권자에게 과도한 담보가 설정된 상태로, 채무불이행 시 연쇄적 권리행사가 발생합니다.",
  },
  {
    id: "trust_mortgage",
    factors: ["trust", "multi_mortgage"],
    amplifier: 1.4,
    description: "신탁 + 다수 근저당: 복잡한 권리관계",
    rationale: "신탁 부동산에 다수 근저당이 설정된 경우, 수탁자·위탁자·채권자 간 이해관계가 극히 복잡합니다.",
  },
  {
    id: "seizure_lease",
    factors: ["seizure", "lease_registration"],
    amplifier: 1.6,
    description: "압류 + 임차권등기: 임차인 최악 시나리오",
    rationale: "기존 임차인의 보증금 미반환(임차권등기)에 더해 압류까지 진행 중이면, 후순위 임차인의 보증금 회수가 극히 어렵습니다.",
  },
  {
    id: "auction_extreme_mortgage",
    factors: ["auction", "mortgage_extreme"],
    amplifier: 1.7,
    description: "경매 + 초과채권: 회수 불가능 상태",
    rationale: "경매가 진행 중이며 채권이 시세를 초과하여 배당으로도 보증금 회수가 불가능합니다.",
  },
  {
    id: "seizure_disposition",
    factors: ["seizure", "disposition"],
    amplifier: 1.3,
    description: "압류 + 가처분: 복합 법적 분쟁",
    rationale: "재산 압류와 처분 금지가 동시에 걸린 상태로, 복수의 법적 분쟁이 진행 중입니다.",
  },
];

function evaluateInteractions(factors: RiskFactor[]): RiskInteractionResult {
  const factorIds = new Set(factors.map((f) => f.id));
  const appliedRules: RiskInteractionResult["appliedRules"] = [];
  let totalPenalty = 0;

  for (const rule of INTERACTION_RULES) {
    // mortgage_high 패턴: mortgage_로 시작하는 모든 팩터 매칭
    const matched = rule.factors.every((ruleFactorId) => {
      if (ruleFactorId.includes("*")) {
        const prefix = ruleFactorId.replace("*", "");
        return factors.some((f) => f.id.startsWith(prefix));
      }
      return factorIds.has(ruleFactorId);
    });

    if (!matched) continue;

    // 매칭된 팩터들의 감점 합산
    const matchedFactors = rule.factors.map((rf) => {
      if (rf.includes("*")) {
        const prefix = rf.replace("*", "");
        return factors.find((f) => f.id.startsWith(prefix));
      }
      return factors.find((f) => f.id === rf);
    }).filter(Boolean) as RiskFactor[];

    const baseDeduction = matchedFactors.reduce((sum, f) => sum + f.deduction, 0);
    const amplifiedDeduction = Math.round(baseDeduction * rule.amplifier);
    const additional = amplifiedDeduction - baseDeduction;

    appliedRules.push({
      ruleId: rule.id,
      matchedFactors: matchedFactors.map((f) => f.id),
      baseDeduction,
      amplifiedDeduction,
      additionalDeduction: additional,
      description: rule.description,
    });

    totalPenalty += additional;
  }

  return { appliedRules, totalInteractionPenalty: totalPenalty };
}

// ─── 시계열 이상 패턴 탐지 ───

function dateToMonths(dateStr: string): number {
  const parts = dateStr.split(".");
  if (parts.length < 3) return 0;
  return parseInt(parts[0], 10) * 12 + parseInt(parts[1], 10);
}

function monthsBetween(d1: string, d2: string): number {
  return Math.abs(dateToMonths(d1) - dateToMonths(d2));
}

function detectTemporalPatterns(parsed: ParsedRegistry): TemporalRiskResult {
  const patterns: TemporalPattern[] = [];

  // 1. 급속 소유권이전: 5년(60개월) 내 3회 이상 이전
  const ownershipTransfers = parsed.gapgu
    .filter((e) => e.purpose === "소유권이전" && !e.isCancelled && e.date)
    .sort((a, b) => dateToMonths(a.date) - dateToMonths(b.date));

  if (ownershipTransfers.length >= 3) {
    for (let i = 0; i <= ownershipTransfers.length - 3; i++) {
      const span = monthsBetween(ownershipTransfers[i].date, ownershipTransfers[i + 2].date);
      if (span <= 60) {
        const transfersInWindow = ownershipTransfers.filter((t) => {
          const m = dateToMonths(t.date);
          return m >= dateToMonths(ownershipTransfers[i].date) &&
                 m <= dateToMonths(ownershipTransfers[i].date) + 60;
        });
        patterns.push({
          id: `rapid_transfer_${i}`,
          patternType: "rapid_transfer",
          severity: transfersInWindow.length >= 4 ? "critical" : "high",
          confidence: Math.min(1, transfersInWindow.length / 5),
          description: `${span}개월 내 소유권이 ${transfersInWindow.length}회 이전되었습니다. 투기성 거래 또는 하자 물건 의심.`,
          evidence: transfersInWindow.map((t) => ({ date: t.date, event: `소유권이전 → ${t.holder}` })),
          timespan: {
            startDate: ownershipTransfers[i].date,
            endDate: transfersInWindow[transfersInWindow.length - 1].date,
            durationMonths: span,
          },
        });
        break; // 첫 번째 패턴만 감지
      }
    }
  }

  // 2. 압류 전 근저당 설정: 압류 6개월 이내에 근저당 추가
  const seizures = parsed.gapgu
    .filter((e) => (e.purpose === "압류" || e.purpose === "가압류") && !e.isCancelled && e.date);
  const mortgages = parsed.eulgu
    .filter((e) => /근저당|저당/.test(e.purpose) && !e.isCancelled && e.date);

  for (const seizure of seizures) {
    const preMortgages = mortgages.filter((m) => {
      const gap = monthsBetween(m.date, seizure.date);
      return gap <= 6 && dateToMonths(m.date) <= dateToMonths(seizure.date);
    });

    if (preMortgages.length > 0) {
      patterns.push({
        id: `pre_seizure_mortgage_${seizure.date}`,
        patternType: "pre_seizure_mortgage",
        severity: "critical",
        confidence: 0.9,
        description: `압류(${seizure.date}) 6개월 이내에 근저당 ${preMortgages.length}건이 설정되었습니다. 재산은닉 또는 채무가중 패턴.`,
        evidence: [
          ...preMortgages.map((m) => ({ date: m.date, event: `근저당 설정 (${m.holder})` })),
          { date: seizure.date, event: `${seizure.purpose} (${seizure.holder})` },
        ],
        timespan: {
          startDate: preMortgages[0].date,
          endDate: seizure.date,
          durationMonths: monthsBetween(preMortgages[0].date, seizure.date),
        },
      });
    }
  }

  // 3. 채권 가속: 12개월 내 2건 이상 압류/가압류
  if (seizures.length >= 2) {
    const sortedSeizures = [...seizures].sort((a, b) => dateToMonths(a.date) - dateToMonths(b.date));
    for (let i = 0; i < sortedSeizures.length - 1; i++) {
      const span = monthsBetween(sortedSeizures[i].date, sortedSeizures[i + 1].date);
      if (span <= 12) {
        const clusterCount = sortedSeizures.filter((s) => {
          const m = dateToMonths(s.date);
          return m >= dateToMonths(sortedSeizures[i].date) &&
                 m <= dateToMonths(sortedSeizures[i].date) + 12;
        }).length;

        patterns.push({
          id: `claim_acceleration_${i}`,
          patternType: "claim_acceleration",
          severity: clusterCount >= 3 ? "critical" : "high",
          confidence: Math.min(1, clusterCount / 3),
          description: `12개월 내 ${clusterCount}건의 압류/가압류가 집중 발생. 채무자의 재정위기 상태.`,
          evidence: sortedSeizures.slice(i, i + clusterCount).map((s) => ({
            date: s.date,
            event: `${s.purpose} (${s.holder})`,
          })),
          timespan: {
            startDate: sortedSeizures[i].date,
            endDate: sortedSeizures[Math.min(i + clusterCount - 1, sortedSeizures.length - 1)].date,
            durationMonths: span,
          },
        });
        break;
      }
    }
  }

  // 4. 근저당 누적: 3개월 이내 연속 근저당 설정
  if (mortgages.length >= 2) {
    const sortedMortgages = [...mortgages].sort((a, b) => dateToMonths(a.date) - dateToMonths(b.date));
    for (let i = 0; i < sortedMortgages.length - 1; i++) {
      const gap = monthsBetween(sortedMortgages[i].date, sortedMortgages[i + 1].date);
      if (gap <= 3) {
        const cluster = sortedMortgages.filter((m) => {
          const mMonth = dateToMonths(m.date);
          return mMonth >= dateToMonths(sortedMortgages[i].date) &&
                 mMonth <= dateToMonths(sortedMortgages[i].date) + 3;
        });

        if (cluster.length >= 2) {
          patterns.push({
            id: `mortgage_stacking_${i}`,
            patternType: "mortgage_stacking",
            severity: "high",
            confidence: 0.8,
            description: `3개월 이내 근저당 ${cluster.length}건이 연속 설정. 과잉 레버리지 패턴.`,
            evidence: cluster.map((m) => ({
              date: m.date,
              event: `근저당 설정 (${m.holder}, ${(m.amount / 100_000_000).toFixed(1)}억원)`,
            })),
            timespan: {
              startDate: cluster[0].date,
              endDate: cluster[cluster.length - 1].date,
              durationMonths: monthsBetween(cluster[0].date, cluster[cluster.length - 1].date),
            },
          });
          break;
        }
      }
    }
  }

  // 전체 시계열 위험도
  const severityWeight: Record<string, number> = { critical: 30, high: 15, medium: 5 };
  const overallTemporalRisk = Math.min(100,
    patterns.reduce((sum, p) => sum + (severityWeight[p.severity] || 0) * p.confidence, 0)
  );

  // 이상치 점수: 패턴 수 × 평균 신뢰도
  const avgConfidence = patterns.length > 0
    ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    : 0;
  const timelineAnomalyScore = Math.min(100, patterns.length * avgConfidence * 25);

  return { patterns, overallTemporalRisk, timelineAnomalyScore };
}

// ─── 메인 스코어링 함수 ───

export function calculateRiskScore(
  parsed: ParsedRegistry,
  estimatedPrice?: number
): RiskScore {
  const allFactors: RiskFactor[] = [];
  let totalDeduction = 0;

  // 1. 근저당 비율 평가
  const mortgageEval = evaluateMortgageRatio(parsed, estimatedPrice || 0);
  allFactors.push(...mortgageEval.factors);
  totalDeduction += mortgageEval.deduction;

  // 2. 압류/가압류 평가
  const seizureFactors = evaluateSeizure(parsed);
  allFactors.push(...seizureFactors);
  totalDeduction += seizureFactors.reduce((s, f) => s + f.deduction, 0);

  // 3. 가처분 평가
  const dispositionFactors = evaluateDisposition(parsed);
  allFactors.push(...dispositionFactors);
  totalDeduction += dispositionFactors.reduce((s, f) => s + f.deduction, 0);

  // 4. 경매 평가
  const auctionFactors = evaluateAuction(parsed);
  allFactors.push(...auctionFactors);
  totalDeduction += auctionFactors.reduce((s, f) => s + f.deduction, 0);

  // 5. 가등기 평가
  const provisionalFactors = evaluateProvisionalRegistration(parsed);
  allFactors.push(...provisionalFactors);
  totalDeduction += provisionalFactors.reduce((s, f) => s + f.deduction, 0);

  // 6. 신탁 평가
  const trustFactors = evaluateTrust(parsed);
  allFactors.push(...trustFactors);
  totalDeduction += trustFactors.reduce((s, f) => s + f.deduction, 0);

  // 7. 소유권 이전 빈도 평가
  const ownershipFactors = evaluateOwnershipFrequency(parsed);
  allFactors.push(...ownershipFactors);
  totalDeduction += ownershipFactors.reduce((s, f) => s + f.deduction, 0);

  // 8. 다수 근저당 평가
  const multiMortgageFactors = evaluateMultipleMortgages(parsed);
  allFactors.push(...multiMortgageFactors);
  totalDeduction += multiMortgageFactors.reduce((s, f) => s + f.deduction, 0);

  // 9. 선순위채권 합산 분석 (근저당+전세 vs 시세)
  const totalClaimsEval = evaluateTotalClaims(parsed, estimatedPrice || 0);
  allFactors.push(...totalClaimsEval.factors);
  totalDeduction += totalClaimsEval.deduction;

  // 10. 임차권등기명령 평가
  const leaseRegFactors = evaluateLeaseRegistration(parsed);
  allFactors.push(...leaseRegFactors);
  totalDeduction += leaseRegFactors.reduce((s, f) => s + f.deduction, 0);

  // 11. 예고등기 평가
  const warningRegFactors = evaluateWarningRegistration(parsed);
  allFactors.push(...warningRegFactors);
  totalDeduction += warningRegFactors.reduce((s, f) => s + f.deduction, 0);

  // 12. 환매등기 평가
  const redemptionFactors = evaluateRedemption(parsed);
  allFactors.push(...redemptionFactors);
  totalDeduction += redemptionFactors.reduce((s, f) => s + f.deduction, 0);

  // 13. 위험요소 상호작용 평가 (비선형 증폭)
  const interactionPenalties = evaluateInteractions(allFactors);
  totalDeduction += interactionPenalties.totalInteractionPenalty;

  // 14. 시계열 이상 패턴 탐지
  const temporalPatterns = detectTemporalPatterns(parsed);
  // 시계열 위험도를 감점에 반영 (최대 20점 추가 감점)
  const temporalDeduction = Math.min(20, Math.round(temporalPatterns.overallTemporalRisk * 0.2));
  totalDeduction += temporalDeduction;

  // 최종 점수 계산 (최소 0점)
  const totalScore = Math.max(0, 100 - totalDeduction);
  const grade = getGrade(totalScore);
  const { label: gradeLabel, color: gradeColor } = GRADE_MAP[grade];

  // 요약 생성
  const summary = generateSummary(totalScore, grade, gradeLabel, allFactors, parsed);

  return {
    totalScore,
    grade,
    gradeLabel,
    gradeColor,
    factors: allFactors.sort((a, b) => b.deduction - a.deduction),
    mortgageRatio: mortgageEval.ratio,
    totalDeduction,
    summary,
    interactionPenalties,
    temporalPatterns,
  };
}

function generateSummary(
  score: number,
  grade: RiskGrade,
  gradeLabel: string,
  factors: RiskFactor[],
  parsed: ParsedRegistry
): string {
  const parts: string[] = [];

  parts.push(`종합 안전등급 ${grade}등급 (${gradeLabel}, ${score}점/100점).`);

  const criticalCount = factors.filter((f) => f.severity === "critical").length;
  const highCount = factors.filter((f) => f.severity === "high").length;

  if (criticalCount > 0) {
    parts.push(`치명적 위험요소 ${criticalCount}건 발견.`);
  }
  if (highCount > 0) {
    parts.push(`고위험 요소 ${highCount}건 발견.`);
  }

  if (factors.length === 0) {
    parts.push("특이 위험요소가 발견되지 않았습니다.");
  }

  const { activeGapguEntries, activeEulguEntries } = parsed.summary;
  parts.push(`현행 갑구 ${activeGapguEntries}건, 을구 ${activeEulguEntries}건.`);

  return parts.join(" ");
}
