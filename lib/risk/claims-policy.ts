import type { ParsedRegistry } from "../registry-parser";
import type { RiskFactor } from "../risk-scoring";
export const SCORE_RULE_VERSION = "risk-v3-2026-10";
export interface ClaimRatioSet {
  priorClaims: number;
  marketValue: number | null;
  userDeposit: number | null;
  ratioToMarket: number | null;
  ratioToDeposit: number | null;
  jeonseRatio: number | null;
  marketJeonseRatio: number | null;
  combinedBurden: number | null;
  claimBasis: "actual" | "maxClaim";
  priorityConfirmed: boolean;
  uncertainClaims: boolean;
  jeonseClaimsIncluded?: number;
  ownJeonseExcluded?: number;
}
export function claimsDeduction(r: number | null): number {
  if (r === null || r < 60) return 0;
  if (r < 70) return 15;
  if (r < 80) return 30;
  if (r < 85) return 45;
  if (r < 100) return 51;
  return 71;
}
const positive = (n: number | undefined) => n !== undefined && Number.isFinite(n) && n > 0 ? n : null;
/** 갱신 분석자가 본인 권리로 명시한 등기. 금액이 같다는 이유로 추정하지 않는다. */
export interface OwnJeonseRight { order: number; holder: string; }
export function buildClaimRatios(parsed: ParsedRegistry, price?: number, deposit?: number, ownJeonseRight?: OwnJeonseRight): ClaimRatioSet {
  const active = parsed.eulgu.filter(e => !e.isCancelled && !e.isSupplementary && /근저당|저당|전세권/.test(e.purpose));
  const own = ownJeonseRight && positive(deposit) ? active.filter(e => /전세권/.test(e.purpose)
    && e.order === ownJeonseRight.order && e.holder.trim() === ownJeonseRight.holder.trim()
    && Boolean(e.holder.trim()) && positive(e.amount)) : [];
  const excluded = own.length === 1 ? own[0] : undefined;
  const claims = active.filter(e => e !== excluded);
  const uncertainClaims = Boolean(ownJeonseRight && !excluded)
    || claims.some(e => !Number.isFinite(e.amount) || e.amount <= 0)
    || [...parsed.gapgu, ...parsed.eulgu].some(e => !e.isCancelled && /압류|가등기|임차권|신탁/.test(e.purpose));
  const priorClaims = claims.reduce((s, e) => s + (positive(e.amount) ?? 0), 0);
  const marketValue = positive(price);
  const userDeposit = deposit !== undefined && Number.isFinite(deposit) && deposit >= 0 ? deposit : null;
  // 미확인 채권을 0%로 표시하지 않는다. 확인 가능한 금액은 보수적으로 별도 평가한다.
  const ratio = (denominator: number | null) => denominator && !(uncertainClaims && priorClaims === 0)
    ? priorClaims / denominator * 100 : null;
  return { priorClaims, marketValue, userDeposit, ratioToMarket: ratio(marketValue),
    ratioToDeposit: ratio(positive(deposit)),
    jeonseRatio: marketValue && userDeposit !== null ? userDeposit / marketValue * 100 : null,
    marketJeonseRatio: null,
    combinedBurden: marketValue && userDeposit !== null ? (priorClaims + userDeposit) / marketValue * 100 : null,
    claimBasis: "maxClaim", priorityConfirmed: false, uncertainClaims,
    jeonseClaimsIncluded: claims.filter(e => /전세권/.test(e.purpose)).length, ownJeonseExcluded: excluded?.amount ?? 0 };
}
export function evaluateClaimRatios(ratios: ClaimRatioSet): { deduction: number; factors: RiskFactor[] } {
  // 보증금 대비 선순위 비율은 참고용이다. 담보 여력은 시세 대비 부담으로 평가한다.
  const r = Math.max(ratios.ratioToMarket ?? 0, ratios.combinedBurden ?? 0);
  const unknown = ratios.uncertainClaims || ratios.ratioToMarket === null
    || (ratios.userDeposit !== null && ratios.combinedBurden === null);
  // 미확인 부담만으로도 안전(A)을 표시하지 않는다. 확인된 고위험 감점은 유지한다.
  const deduction = Math.max(claimsDeduction(r), unknown ? 20 : 0);
  const detail = `확인된 현행 채권 기준(채권최고액). 시세 대비 선순위 ${ratios.ratioToMarket ?? "미확인"}%, 보증금 포함 부담 ${ratios.combinedBurden ?? "미확인"}%. 전세권 ${ratios.jeonseClaimsIncluded ?? 0}건 포함, 본인 갱신 전세권 ${ratios.ownJeonseExcluded ?? 0}원 제외(사용자 지정). 순위는 확정되지 않았습니다.`;
  const factors: RiskFactor[] = [];
  if (claimsDeduction(r)) factors.push({
    id: r >= 100 ? "total_claims_critical" : r >= 85 ? "total_claims_high" : "total_claims_moderate",
    category: "선순위채권", description: r >= 85 ? "선순위 부담 기준 고위험" : "선순위 부담 주의",
    deduction, severity: r >= 100 ? "critical" : r >= 85 ? "high" : "medium", detail,
  });
  if (unknown) factors.push({
    id: "claims_unverified", category: "선순위채권", description: "선순위 부담 산정 불가/확인 불가",
    deduction: factors.length ? 0 : deduction, severity: "medium",
    detail: `채권 금액·시세 또는 본인 전세권 식별 근거를 확인할 수 없어 안전을 확정할 수 없습니다. 시세 미확인 시 보증금 회수 여력과 깡통전세 여부를 판단할 수 없습니다. 등기 원본과 시세·본인 권리를 확인하세요. ${detail}`,
  });
  if (!factors.length && (ratios.jeonseClaimsIncluded || ratios.ownJeonseExcluded)) factors.push({
    id: "jeonse_claims_basis", category: "선순위채권", description: "전세권 합산 근거 확인",
    deduction: 0, severity: "low", detail,
  });
  return { deduction, factors };
}
export function decisiveClaimRisk(ratios: ClaimRatioSet) {
  const basis: "combinedBurden" | "ratioToMarket" = (ratios.combinedBurden ?? -1) > (ratios.ratioToMarket ?? -1) ? "combinedBurden" : "ratioToMarket";
  const ratio = ratios[basis];
  return ratio !== null && ratio >= 85 ? { reason: "선순위 부담 기준 고위험", basis, ratio } : null;
}
