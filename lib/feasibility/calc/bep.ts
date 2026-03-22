/**
 * BEP 분양률 계산기 (Break-Even Point Calculator)
 *
 * SCR 표50~52: BEP 분양률 3종 × 3조합
 * 이진 탐색으로 0.1% 정밀도 BEP를 산출합니다.
 * 모든 금액 단위: 백만원
 *
 * @module lib/feasibility/calc/bep
 */

// ─── 입력 타입 ───

/** BEP 계산 입력값 */
export interface BepInput {
  totalRevenue: number;              // 분양수입 합계 (100% 분양 기준)
  totalCost: number;                 // 사업비 합계
  equity: number;                    // 자기자본
  constructionReserve: number;       // 공사비 유보
  pfTotal: number;                   // PF 총액

  // 시설별 수입 비중 (합계 = 1)
  apartmentRevenueRatio: number;     // 아파트 수입 비중
  officetelRevenueRatio: number;     // 오피스텔 수입 비중
  commercialRevenueRatio: number;    // 상가 수입 비중
}

// ─── 출력 타입 ───

/** BEP 3종 결과 */
export interface BepTriple {
  businessBep: number;   // 사업 BEP 분양률 (%)
  costExitBep: number;   // 사업비 회수 BEP 분양률 (%)
  pfExitBep: number;     // PF 원리금 상환 BEP 분양률 (%)
}

/** BEP 분석 결과 */
export interface BepResult {
  /** BEP(1): 전 시설 동일 분양률 */
  bep1: BepTriple;
  /** BEP(2): 오피스텔/상가 50%, 아파트만 변동 */
  bep2: BepTriple;
  /** BEP(3): 오피스텔/상가 0%, 아파트만 변동 */
  bep3: BepTriple;
}

// ─── 내부 유틸 ───

/** 이진 탐색으로 BEP 분양률 산출 (0.1% 정밀도) */
function binarySearchBep(
  calcRevenue: (rate: number) => number,
  target: number,
  minRate: number = 0,
  maxRate: number = 100
): number {
  const PRECISION = 0.1; // 0.1% 정밀도
  let lo = minRate;
  let hi = maxRate;

  // 100%에서도 target에 못 미치면 100% 이상 필요
  if (calcRevenue(hi) < target) {
    return hi + PRECISION; // 100% 초과 (달성 불가)
  }

  while (hi - lo > PRECISION / 2) {
    const mid = (lo + hi) / 2;
    const revenue = calcRevenue(mid);

    if (revenue >= target) {
      hi = mid;
    } else {
      lo = mid;
    }
  }

  return Math.round((lo + hi) / 2 * 10) / 10; // 0.1% 단위 반올림
}

// ─── 메인 계산 함수 ───

/**
 * BEP 분양률을 3종 × 3조합으로 산출합니다 (SCR 표50~52)
 *
 * BEP 3종:
 * - 사업 BEP: 수입 >= 사업비 전체 (이익 0 이상)
 * - 사업비 회수 BEP: 수입 >= 사업비 - 자기자본 - 공사비유보
 * - PF 원리금 상환 BEP: 수입 >= PF 총액
 *
 * 조합 3종:
 * - BEP(1): 전 시설 동일 분양률
 * - BEP(2): 오피스텔/상가 50% 고정, 아파트만 변동
 * - BEP(3): 오피스텔/상가 0% 고정, 아파트만 변동
 */
export function calculateBep(input: BepInput): BepResult {
  const {
    totalRevenue,
    totalCost,
    equity,
    constructionReserve,
    pfTotal,
    apartmentRevenueRatio,
    officetelRevenueRatio,
    commercialRevenueRatio,
  } = input;

  // 각 BEP 종류별 타겟 금액
  const targets = {
    business: totalCost,                                       // 사업 BEP
    costExit: totalCost - equity - constructionReserve,        // 사업비 회수 BEP
    pfExit: pfTotal,                                           // PF 원리금 상환 BEP
  };

  // ── BEP(1): 전 시설 동일 분양률 ──
  // 수입 = totalRevenue × (rate / 100)
  const calcBep1Revenue = (rate: number): number => totalRevenue * (rate / 100);

  const bep1: BepTriple = {
    businessBep: binarySearchBep(calcBep1Revenue, targets.business),
    costExitBep: binarySearchBep(calcBep1Revenue, targets.costExit),
    pfExitBep: binarySearchBep(calcBep1Revenue, targets.pfExit),
  };

  // ── BEP(2): 오피스텔/상가 50%, 아파트만 변동 ──
  const fixedRevenue50 =
    totalRevenue * officetelRevenueRatio * 0.5 +
    totalRevenue * commercialRevenueRatio * 0.5;

  const calcBep2Revenue = (aptRate: number): number => {
    const aptRevenue = totalRevenue * apartmentRevenueRatio * (aptRate / 100);
    return aptRevenue + fixedRevenue50;
  };

  const bep2: BepTriple = {
    businessBep: binarySearchBep(calcBep2Revenue, targets.business),
    costExitBep: binarySearchBep(calcBep2Revenue, targets.costExit),
    pfExitBep: binarySearchBep(calcBep2Revenue, targets.pfExit),
  };

  // ── BEP(3): 오피스텔/상가 0%, 아파트만 변동 ──
  const calcBep3Revenue = (aptRate: number): number => {
    return totalRevenue * apartmentRevenueRatio * (aptRate / 100);
  };

  const bep3: BepTriple = {
    businessBep: binarySearchBep(calcBep3Revenue, targets.business),
    costExitBep: binarySearchBep(calcBep3Revenue, targets.costExit),
    pfExitBep: binarySearchBep(calcBep3Revenue, targets.pfExit),
  };

  return { bep1, bep2, bep3 };
}
