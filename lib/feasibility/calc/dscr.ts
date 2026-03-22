/**
 * DSCR 계산기 (Debt Service Coverage Ratio Calculator)
 *
 * 만기시점 누적 DSCR 및 신용보강 금액을 산출합니다.
 * 모든 금액 단위: 백만원
 *
 * @module lib/feasibility/calc/dscr
 */

// ─── 입력 타입 ───

/** DSCR 계산 입력값 */
export interface DscrInput {
  totalRevenue: number;          // 분양수입 합계 (누적)
  pfTotal: number;               // PF 원금
  pfInterestTotal: number;       // PF 이자 합계
  equity: number;                // 자기자본
  constructionReserve: number;   // 공사비 유보
}

// ─── 출력 타입 ───

/** DSCR 계산 결과 */
export interface DscrResult {
  /** 만기시점 누적 DSCR */
  cumulativeDscr: number;
  /** 신용보강 금액 (백만원) */
  creditEnhancement: number;
  /** DSCR >= 1.0 여부 */
  isAdequate: boolean;
  /** PF 원리금 합계 (참조용) */
  pfDebtService: number;
  /** 가용 수입 (참조용) */
  availableIncome: number;
}

// ─── 메인 계산 함수 ───

/**
 * DSCR을 계산합니다
 *
 * DSCR = (누적수입 + 신용보강) / PF 원리금
 *
 * - PF 원리금 = PF 원금 + PF 이자 합계
 * - 가용 수입 = 분양수입 + 자기자본 + 공사비유보
 * - 신용보강 = max(0, PF 원리금 - 가용수입) → DSCR이 1.0 미만일 때 필요
 * - 누적 DSCR = 가용 수입 / PF 원리금
 */
export function calculateDscr(input: DscrInput): DscrResult {
  const { totalRevenue, pfTotal, pfInterestTotal, equity, constructionReserve } = input;

  // PF 원리금 (원금 + 이자)
  const pfDebtService = pfTotal + pfInterestTotal;

  // 가용 수입 (분양수입 + 자기자본 + 공사비유보)
  const availableIncome = totalRevenue + equity + constructionReserve;

  // 누적 DSCR
  const cumulativeDscr = pfDebtService > 0
    ? Math.round((availableIncome / pfDebtService) * 100) / 100
    : 0;

  // 신용보강 금액 (DSCR < 1.0일 때 필요한 추가 보강액)
  const creditEnhancement = pfDebtService > availableIncome
    ? Math.round(pfDebtService - availableIncome)
    : 0;

  // 적정성 판단
  const isAdequate = cumulativeDscr >= 1.0;

  return {
    cumulativeDscr,
    creditEnhancement,
    isAdequate,
    pfDebtService,
    availableIncome,
  };
}

/**
 * 특정 분양률에서의 DSCR을 계산합니다 (시나리오 연동용)
 *
 * @param baseRevenue - 100% 분양 기준 수입
 * @param saleRate - 적용 분양률 (0~1)
 * @param pfTotal - PF 원금
 * @param pfInterestTotal - PF 이자 합계
 * @param equity - 자기자본
 * @param constructionReserve - 공사비유보
 */
export function calculateDscrAtSaleRate(
  baseRevenue: number,
  saleRate: number,
  pfTotal: number,
  pfInterestTotal: number,
  equity: number,
  constructionReserve: number
): DscrResult {
  return calculateDscr({
    totalRevenue: baseRevenue * saleRate,
    pfTotal,
    pfInterestTotal,
    equity,
    constructionReserve,
  });
}
