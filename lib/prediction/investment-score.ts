/**
 * 투자점수 (Investment Score) — 이미 산출된 예측 지표를 도메인 전문가 가중치로
 * 결합해 0~100 종합 점수와 등급(S~D)을 산출한다.
 *
 * 설계 원칙 (특허 포트폴리오 방법론과 정합):
 * - 신규 데이터 수집 없이 predict-value가 이미 계산한 지표만 사용
 * - 각 구성요소를 도메인 근거로 0~100 정규화 후 가중 합산 (V-Score/Fraud Model과 동일 접근)
 * - breakdown으로 기여도를 투명하게 노출 (XAI) → 백테스트로 사후 캘리브레이션 가능
 * - 점수는 "정량 지표의 종합"이지 수익 보장이 아니다 (신뢰도 함께 노출)
 *
 * ⚠️ 가중치·정규화 범위는 도메인 근거 초기값이며, 실데이터 백테스트로 튜닝 대상.
 */

export type InvestmentGrade = "S" | "A" | "B" | "C" | "D";

export interface InvestmentScoreInput {
  currentPrice: number;            // 현재 기준가 (원)
  base1yPrice: number;             // 1년 후 기준(base) 예측가 (원)
  confidence: number;              // 예측 신뢰도 0~100
  demandFactor: number;            // 수요 계수 (demandFactor, 대략 0.90~1.05)
  policyFactor: number;            // 정책 계수 (policyFactor, 대략 0.95~1.03)
  supplyVolume?: number | null;    // 12개월 입주물량 (세대). 없으면 중립 처리
  jeonseRatio?: number | null;     // 전세가율 % (안전도). 없으면 중립 처리
  sampleSize?: number;             // 근거 실거래 건수. 표본 부족 시 신뢰도 하향
}

export type ScoreReliability = "high" | "medium" | "low";

export interface InvestmentScoreComponent {
  key: string;
  label: string;
  subScore: number;    // 0~100
  weight: number;      // 0~1
  contribution: number; // subScore * weight (점수 기여분)
  note: string;
}

export interface InvestmentScoreResult {
  score: number;        // 0~100
  grade: InvestmentGrade;
  breakdown: InvestmentScoreComponent[];
  reliability: ScoreReliability;  // 근거 데이터 충분도
  reliabilityNote: string;
  disclaimer: string;
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/** 값 v를 [lo,hi] 구간에서 0~100으로 선형 정규화 (구간 밖은 clamp) */
function linearScale(v: number, lo: number, hi: number): number {
  if (hi === lo) return 50;
  return clamp(((v - lo) / (hi - lo)) * 100);
}

/** 전세가율(%) → 안전도 0~100. 60~70% 적정(최고), 과도하게 높으면(깡통 위험) 급감. */
function jeonseRatioToSafety(ratio: number): number {
  if (ratio <= 0) return 50;
  if (ratio <= 50) return 72;          // 갭 크지만 안전
  if (ratio <= 70) return 100;         // 적정 구간
  if (ratio <= 80) return linearScale(ratio, 70, 80) * -0.5 + 100; // 70→100, 80→75
  if (ratio <= 90) return linearScale(ratio, 80, 90) * -0.75 + 75; // 80→75, 90→0
  return 0;                            // 90%+ 깡통 위험
}

// 도메인 근거 가중치 (합=1.0). 백테스트 캘리브레이션 대상.
const WEIGHTS = {
  outlook: 0.30,   // 가격 전망
  demand: 0.20,    // 수요
  supply: 0.15,    // 공급 부담(역)
  policy: 0.10,    // 정책
  safety: 0.15,    // 전세가율 안전도
  confidence: 0.10, // 예측 신뢰도
};

function toGrade(score: number): InvestmentGrade {
  if (score >= 80) return "S";
  if (score >= 65) return "A";
  if (score >= 50) return "B";
  if (score >= 35) return "C";
  return "D";
}

export function calculateInvestmentScore(input: InvestmentScoreInput): InvestmentScoreResult {
  const { currentPrice, base1yPrice, confidence, demandFactor, policyFactor, supplyVolume, jeonseRatio } = input;

  // 1) 가격 전망: 1년 예측 상승률 -5%~+15% → 0~100
  const growth1y = currentPrice > 0 ? (base1yPrice / currentPrice - 1) : 0;
  const outlookScore = linearScale(growth1y, -0.05, 0.15);

  // 2) 수요: demandFactor 0.90~1.05 → 0~100
  const demandScore = linearScale(demandFactor, 0.90, 1.05);

  // 3) 공급 부담(역): 12개월 입주물량이 많을수록 하방압력. 0세대=100, 2000세대+=0.
  //    데이터 없으면 중립(50). 절대 스케일이 지역별로 달라 보수적 처리.
  const supplyScore = (supplyVolume == null)
    ? 50
    : clamp(100 - linearScale(supplyVolume, 0, 2000));

  // 4) 정책: policyFactor 0.95~1.03 → 0~100
  const policyScore = linearScale(policyFactor, 0.95, 1.03);

  // 5) 안전도: 전세가율 기반. 데이터 없으면 중립(50).
  const safetyScore = (jeonseRatio == null) ? 50 : clamp(jeonseRatioToSafety(jeonseRatio));

  // 6) 신뢰도: confidence 그대로
  const confScore = clamp(confidence);

  const breakdown: InvestmentScoreComponent[] = [
    { key: "outlook", label: "가격 전망", subScore: Math.round(outlookScore), weight: WEIGHTS.outlook, contribution: outlookScore * WEIGHTS.outlook, note: `1년 예측 ${(growth1y * 100).toFixed(1)}%` },
    { key: "demand", label: "수요", subScore: Math.round(demandScore), weight: WEIGHTS.demand, contribution: demandScore * WEIGHTS.demand, note: `수요계수 ${demandFactor.toFixed(3)}` },
    { key: "supply", label: "공급 부담", subScore: Math.round(supplyScore), weight: WEIGHTS.supply, contribution: supplyScore * WEIGHTS.supply, note: supplyVolume == null ? "입주물량 데이터 없음(중립)" : `12개월 입주 ${supplyVolume.toLocaleString()}세대` },
    { key: "policy", label: "정책", subScore: Math.round(policyScore), weight: WEIGHTS.policy, contribution: policyScore * WEIGHTS.policy, note: `정책계수 ${policyFactor.toFixed(3)}` },
    { key: "safety", label: "전세가율 안전도", subScore: Math.round(safetyScore), weight: WEIGHTS.safety, contribution: safetyScore * WEIGHTS.safety, note: jeonseRatio == null ? "전세가율 데이터 없음(중립)" : `전세가율 ${jeonseRatio.toFixed(1)}%` },
    { key: "confidence", label: "예측 신뢰도", subScore: Math.round(confScore), weight: WEIGHTS.confidence, contribution: confScore * WEIGHTS.confidence, note: `신뢰도 ${Math.round(confidence)}%` },
  ];

  const score = Math.round(breakdown.reduce((s, c) => s + c.contribution, 0));

  // 근거 실거래 표본 충분도 → 신뢰도. 백테스트 sampleCap(8/30)과 경계 일관.
  // 실증 검증(표본 부족 단지에서 점수가 오도될 수 있음)에서 도출한 캘리브레이션.
  const n = input.sampleSize ?? 0;
  const reliability: ScoreReliability = n >= 30 ? "high" : n >= 8 ? "medium" : "low";
  const reliabilityNote =
    reliability === "high" ? `실거래 표본 충분(${n}건) — 신뢰도 높음`
    : reliability === "medium" ? `실거래 표본 보통(${n}건) — 참고 권장`
    : `실거래 표본 부족(${n}건) — 참고용, 점수 신뢰도 낮음`;

  return {
    score: clamp(score),
    grade: toGrade(score),
    breakdown,
    reliability,
    reliabilityNote,
    disclaimer: "투자점수는 예측 지표(전망·수요·공급·정책·안전도·신뢰도)의 정량 종합이며, 수익을 보장하지 않습니다.",
  };
}
