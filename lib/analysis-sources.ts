/**
 * 분석 근거(citation) 생성 — AI 근거표시 (P0-1)
 * ────────────────────────────────────────────────
 * LLM이 근거를 "말하게" 하지 않고, 분석 파이프라인이 실제로 fetch·계산한 값만
 * 구조화해 반환한다(환각 0). 프론트는 이 sources[]를 "분석 근거"로 표시한다.
 *
 * 입력 타입은 느슨하게(옵셔널) 받아 값이 있는 소스만 포함한다.
 * @module lib/analysis-sources
 */

export interface SourceCitation {
  /** 분류: 실거래 | 등기 | 건축물대장 | 시세추정 | 위험도 | V-Score */
  category: string;
  label: string;
  /** 사람이 읽는 근거 내용(실제 값) */
  detail: string;
  /** 출처 기관/주체 */
  provider: string;
  /** 데이터 기준 기간/시점(있으면) */
  asOf?: string;
}

interface SaleLike {
  avgPrice?: number | null;
  transactionCount?: number | null;
  period?: string | null;
}
interface RentLike {
  avgDeposit?: number | null;
  jeonseCount?: number | null;
  period?: string | null;
}
interface RiskLike {
  totalScore?: number;
  grade?: string;
  gradeLabel?: string;
  mortgageRatio?: number;
  factors?: Array<{ label?: string; description?: string } | string>;
}
interface VScoreLike {
  score?: number;
  grade?: string;
}

export interface BuildSourcesInput {
  marketData?: { sale?: SaleLike | null; rent?: RentLike | null } | null;
  marketDataFiltered?: boolean;
  buildingPurpose?: string | null;
  buildYear?: string | null;
  estimatedPrice?: number | null;
  priceMethod?: string | null;
  priceConfidence?: number | null; // 0~1
  riskScore?: RiskLike | null;
  vScore?: VScoreLike | null;
}

function eok(won?: number | null): string {
  if (!won || won <= 0) return "-";
  const e = Math.floor(won / 1e8);
  const m = Math.round((won % 1e8) / 1e4);
  return e > 0 ? (m > 0 ? `${e}억 ${m.toLocaleString()}만원` : `${e}억원`) : `${m.toLocaleString()}만원`;
}

const PRICE_METHOD_LABEL: Record<string, string> = {
  building_match: "동일 단지·면적 실거래 매칭",
  area_match: "동일 면적대 실거래 매칭",
  district_avg: "지역 평균 실거래",
  fallback: "제한적 데이터 추정",
};

/** 분석 결과에서 근거(sources) 배열을 생성한다. 값이 있는 항목만 포함. */
export function buildAnalysisSources(input: BuildSourcesInput): SourceCitation[] {
  const out: SourceCitation[] = [];

  // 1) 실거래 — 매매
  const sale = input.marketData?.sale;
  if (sale && (sale.transactionCount ?? 0) > 0) {
    out.push({
      category: "실거래",
      label: "매매 실거래가",
      detail: `매매 ${sale.transactionCount}건, 평균 ${eok(sale.avgPrice)}${input.marketDataFiltered ? " (동일 단지·면적 필터)" : ""}`,
      provider: "국토교통부 실거래가",
      asOf: sale.period ?? undefined,
    });
  }
  // 2) 실거래 — 전세
  const rent = input.marketData?.rent;
  if (rent && (rent.jeonseCount ?? 0) > 0) {
    out.push({
      category: "실거래",
      label: "전세 실거래가",
      detail: `전세 ${rent.jeonseCount}건, 평균 보증금 ${eok(rent.avgDeposit)}`,
      provider: "국토교통부 실거래가",
      asOf: rent.period ?? undefined,
    });
  }
  // 3) 건축물대장
  if (input.buildingPurpose || input.buildYear) {
    const parts = [input.buildingPurpose, input.buildYear && `준공 ${input.buildYear}`].filter(Boolean);
    out.push({
      category: "건축물대장",
      label: "건물 정보",
      detail: parts.join(" · "),
      provider: "건축물대장(국토교통부)",
    });
  }
  // 4) 시세 추정
  if ((input.estimatedPrice ?? 0) > 0) {
    const method = input.priceMethod ? PRICE_METHOD_LABEL[input.priceMethod] ?? input.priceMethod : undefined;
    const conf = input.priceConfidence != null ? ` · 신뢰도 ${Math.round(input.priceConfidence * 100)}%` : "";
    out.push({
      category: "시세추정",
      label: "추정 시세",
      detail: `${eok(input.estimatedPrice)}${method ? ` (${method})` : ""}${conf}`,
      provider: "VESTRA 시세추정 엔진(실거래 기반)",
    });
  }
  // 5) 위험도
  const risk = input.riskScore;
  if (risk && risk.grade) {
    const topFactors = (risk.factors ?? [])
      .slice(0, 3)
      .map((f) => (typeof f === "string" ? f : f.label || f.description || ""))
      .filter(Boolean);
    const ratio = risk.mortgageRatio != null ? ` · 근저당비율 ${Math.round(risk.mortgageRatio * 100)}%` : "";
    out.push({
      category: "위험도",
      label: `위험등급 ${risk.grade}${risk.gradeLabel ? `(${risk.gradeLabel})` : ""}`,
      detail: `${risk.totalScore != null ? `점수 ${risk.totalScore}` : ""}${ratio}${topFactors.length ? ` · 주요요인: ${topFactors.join(", ")}` : ""}`,
      provider: "VESTRA 위험도 엔진",
    });
  }
  // 6) V-Score
  const v = input.vScore;
  if (v && v.score != null) {
    out.push({
      category: "V-Score",
      label: `V-Score ${v.score}${v.grade ? ` (${v.grade})` : ""}`,
      detail: "권리·시세·신뢰도 종합 점수(실증 상관 r=0.687)",
      provider: "VESTRA V-Score(특허 출원 중)",
    });
  }

  return out;
}
