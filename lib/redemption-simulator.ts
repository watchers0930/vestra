/**
 * VESTRA 경매 배당 시뮬레이터 (Auction Redemption Simulator)
 * ─────────────────────────────────────────────────────────
 * 등기부등본의 권리순위(접수일 기반)에 따라 경매 시 배당을 시뮬레이션.
 * 추정가의 70%/80%/90% 시나리오에서 각 채권자의 회수율을 산출.
 *
 * 특허 핵심: 접수일 기반 법정 우선순위 결정 → 소액임차인 최우선변제 적용
 *           → 다중 가격 시나리오 배당 시뮬레이션 → 보증금 회수율 산출
 */

import type { ParsedRegistry } from "./registry-parser";
import type {
  ClaimPriority,
  AuctionScenario,
  RedemptionSimulationResult,
} from "./patent-types";

// ─── 소액임차인 최우선변제 기준 (2024~2026) ───

interface PreferentialThreshold {
  region: string;
  depositThreshold: number;
  maxPreferential: number;
}

const PREFERENTIAL_THRESHOLDS: PreferentialThreshold[] = [
  { region: "서울", depositThreshold: 165_000_000, maxPreferential: 55_000_000 },
  { region: "과밀억제권역", depositThreshold: 145_000_000, maxPreferential: 48_000_000 },
  { region: "광역시", depositThreshold: 80_000_000, maxPreferential: 27_000_000 },
  { region: "기타", depositThreshold: 70_000_000, maxPreferential: 23_000_000 },
];

const AUCTION_COST_RATE = 0.05;
const DEFAULT_SCENARIOS = [0.7, 0.8, 0.9];

// ─── 지역 판별 ───

function detectRegion(address: string): PreferentialThreshold {
  if (/서울/.test(address)) return PREFERENTIAL_THRESHOLDS[0];
  if (/과천|성남|하남|고양|광명|부천|안양/.test(address)) return PREFERENTIAL_THRESHOLDS[1];
  if (/부산|대구|인천|광주|대전|울산|세종/.test(address)) return PREFERENTIAL_THRESHOLDS[2];
  return PREFERENTIAL_THRESHOLDS[3];
}

// ─── 날짜 비교 유틸리티 ───

function dateToNum(date: string): number {
  return parseInt(date.replace(/\./g, ""), 10) || 0;
}

// ─── 권리 추출 및 우선순위 정렬 ───

function buildClaimPriorityList(
  parsed: ParsedRegistry,
  tenantDeposit: number,
  address: string,
): ClaimPriority[] {
  const claims: ClaimPriority[] = [];
  const region = detectRegion(address);

  // 을구: 근저당, 전세권
  for (const entry of parsed.eulgu) {
    if (entry.isCancelled) continue;

    if (/근저당|저당/.test(entry.purpose)) {
      claims.push({
        order: 0,
        type: "근저당",
        holder: entry.holder || "채권자",
        amount: entry.amount,
        date: entry.date,
        isPreferential: false,
      });
    }

    if (/전세권/.test(entry.purpose)) {
      claims.push({
        order: 0,
        type: "전세권",
        holder: entry.holder || "전세권자",
        amount: entry.amount,
        date: entry.date,
        isPreferential: false,
      });
    }
  }

  // 갑구: 압류, 가압류
  for (const entry of parsed.gapgu) {
    if (entry.isCancelled) continue;

    if (entry.purpose === "압류" || entry.purpose === "가압류") {
      const amountMatch = entry.detail.match(/금\s*([\d,]+)\s*원/);
      const amount = amountMatch
        ? parseInt(amountMatch[1].replace(/,/g, ""), 10)
        : 0;

      claims.push({
        order: 0,
        type: entry.purpose === "압류" ? "압류" : "가압류",
        holder: entry.holder || "채권자",
        amount,
        date: entry.date,
        isPreferential: false,
      });
    }
  }

  // 임차인 보증금 (사용자 입력)
  if (tenantDeposit > 0) {
    const isPreferential = tenantDeposit <= region.depositThreshold;
    claims.push({
      order: 0,
      type: "임차권",
      holder: "임차인(본인)",
      amount: tenantDeposit,
      date: "9999.99.99", // 우선순위 계산에서 별도 처리
      isPreferential,
    });
  }

  // 접수일 기준 정렬 (같은 날짜면 원래 순서 유지)
  claims.sort((a, b) => dateToNum(a.date) - dateToNum(b.date));

  // 순위 번호 부여
  claims.forEach((c, i) => { c.order = i + 1; });

  return claims;
}

// ─── 배당 시뮬레이션 ───

function simulateAuction(
  claims: ClaimPriority[],
  estimatedPrice: number,
  auctionPriceRatio: number,
  address: string,
  tenantDeposit: number,
): AuctionScenario {
  const auctionPrice = Math.round(estimatedPrice * auctionPriceRatio);
  const region = detectRegion(address);

  // 경매비용 공제
  let remaining = Math.round(auctionPrice * (1 - AUCTION_COST_RATE));

  // 1단계: 소액임차인 최우선변제 (경매가의 1/2 한도 내)
  const maxPreferentialPool = Math.round(auctionPrice * 0.5);
  let preferentialUsed = 0;

  const preferentialClaims = claims.filter((c) => c.isPreferential);
  const normalClaims = claims.filter((c) => !c.isPreferential);

  const distributions: AuctionScenario["distributions"] = [];

  // 최우선변제 배당
  for (const claim of preferentialClaims) {
    const maxRecoverable = Math.min(
      region.maxPreferential,
      claim.amount,
      maxPreferentialPool - preferentialUsed,
      remaining,
    );
    const recovered = Math.max(0, maxRecoverable);
    preferentialUsed += recovered;
    remaining -= recovered;

    distributions.push({
      claimOrder: claim.order,
      holder: claim.holder,
      claimAmount: claim.amount,
      recoveredAmount: recovered,
      recoveryRate: claim.amount > 0 ? recovered / claim.amount : 0,
      shortfall: claim.amount - recovered,
    });
  }

  // 2단계: 일반 채권 접수일 순 배당
  for (const claim of normalClaims) {
    const recovered = Math.min(claim.amount, Math.max(0, remaining));
    remaining -= recovered;

    distributions.push({
      claimOrder: claim.order,
      holder: claim.holder,
      claimAmount: claim.amount,
      recoveredAmount: recovered,
      recoveryRate: claim.amount > 0 ? recovered / claim.amount : 0,
      shortfall: claim.amount - recovered,
    });
  }

  // 3단계: 최우선변제 잔여분 (최우선변제로 다 못 받은 경우, 일반 순위로 추가 배당)
  for (const claim of preferentialClaims) {
    if (remaining <= 0) break;
    const dist = distributions.find((d) => d.claimOrder === claim.order);
    if (dist && dist.shortfall > 0) {
      const additional = Math.min(dist.shortfall, remaining);
      dist.recoveredAmount += additional;
      dist.shortfall -= additional;
      dist.recoveryRate = claim.amount > 0 ? dist.recoveredAmount / claim.amount : 0;
      remaining -= additional;
    }
  }

  // 순서 재정렬
  distributions.sort((a, b) => a.claimOrder - b.claimOrder);

  // 임차인 배당 결과 추출
  const tenantDist = distributions.find((d) => d.holder === "임차인(본인)");

  return {
    auctionPriceRatio,
    auctionPrice,
    distributions,
    tenantDeposit,
    tenantRecovery: tenantDist?.recoveredAmount ?? 0,
    tenantRecoveryRate: tenantDist?.recoveryRate ?? 0,
  };
}

// ─── 추천 문구 생성 ───

function generateRecommendation(
  scenarios: AuctionScenario[],
  claims: ClaimPriority[],
): string {
  const parts: string[] = [];
  const worst = scenarios[0]; // 70%
  const mid = scenarios[1];   // 80%
  const best = scenarios[2];  // 90%

  if (worst.tenantRecoveryRate >= 1) {
    parts.push("모든 시나리오에서 보증금 전액 회수가 가능합니다.");
  } else if (mid.tenantRecoveryRate >= 1) {
    parts.push(`경매가 80% 이상 시 보증금 전액 회수 가능하나, 70% 시나리오에서는 회수율이 ${(worst.tenantRecoveryRate * 100).toFixed(1)}%입니다.`);
  } else if (best.tenantRecoveryRate >= 1) {
    parts.push(`경매가 90% 시에만 보증금 전액 회수 가능합니다. 70% 시나리오 회수율: ${(worst.tenantRecoveryRate * 100).toFixed(1)}%.`);
  } else {
    parts.push(`어떤 시나리오에서도 보증금 전액 회수가 불가합니다. 최선 시나리오(90%) 회수율: ${(best.tenantRecoveryRate * 100).toFixed(1)}%.`);
  }

  const totalClaims = claims.reduce((sum, c) => sum + c.amount, 0);
  const claimCount = claims.filter((c) => c.type !== "임차권").length;
  if (claimCount > 0) {
    parts.push(`선순위 채권 ${claimCount}건, 총 ${(totalClaims / 100_000_000).toFixed(1)}억원이 설정되어 있습니다.`);
  }

  const preferential = claims.filter((c) => c.isPreferential);
  if (preferential.length > 0) {
    parts.push("소액임차인 최우선변제 대상으로 판정되어 일부 우선 변제를 받을 수 있습니다.");
  }

  return parts.join(" ");
}

// ─── 메인 시뮬레이션 함수 ───

/**
 * 경매 배당 시뮬레이션을 실행합니다.
 *
 * @param parsed - parseRegistry() 결과
 * @param estimatedPrice - 추정 시세
 * @param tenantDeposit - 임차인 보증금 (선택, 기본값: parsed에서 추출)
 * @param address - 부동산 소재지 (소액임차인 지역 판정용)
 * @returns RedemptionSimulationResult
 */
export function simulateRedemption(
  parsed: ParsedRegistry,
  estimatedPrice: number,
  tenantDeposit?: number,
  address?: string,
): RedemptionSimulationResult {
  const addr = address || parsed.title.address || "";
  const deposit = tenantDeposit ?? parsed.summary.totalJeonseAmount;

  if (estimatedPrice <= 0) {
    return {
      claims: [],
      scenarios: [],
      worstCaseRecovery: 0,
      bestCaseRecovery: 0,
      recommendation: "추정 시세가 없어 배당 시뮬레이션을 수행할 수 없습니다.",
    };
  }

  // 권리 목록 구축
  const claims = buildClaimPriorityList(parsed, deposit, addr);

  // 3개 시나리오 시뮬레이션
  const scenarios = DEFAULT_SCENARIOS.map((ratio) =>
    simulateAuction(claims, estimatedPrice, ratio, addr, deposit)
  );

  const worstCaseRecovery = scenarios[0].tenantRecoveryRate;
  const bestCaseRecovery = scenarios[scenarios.length - 1].tenantRecoveryRate;

  const recommendation = generateRecommendation(scenarios, claims);

  return {
    claims,
    scenarios,
    worstCaseRecovery,
    bestCaseRecovery,
    recommendation,
  };
}
