/**
 * VESTRA 부동산 세금 계산기
 * ─────────────────────────
 * 2024~2026년 한국 부동산 세금 계산.
 * TaxConfig를 통해 연도별/시나리오별 세율 적용 가능.
 */

// ─── 세금 설정 ───

export interface TaxConfig {
  taxYear: number;
  /** 다주택 취득세 중과 활성 여부 (유예 만료 시 true) */
  multiHomeHeavyTaxEnabled: boolean;
  /** 생애최초 취득세 감면 활성 여부 */
  firstHomeBenefitEnabled: boolean;
  /** 종합부동산세 공정시장가액비율 (0.6 ~ 0.8) */
  fairMarketValueRatio: number;
  /** 다주택 양도세 중과 활성 여부 */
  multiHomeTransferSurchargeEnabled: boolean;
  /** 1세대1주택 양도세 비과세 기준금액 */
  oneHouseExemptionThreshold: number;
}

/** 2024-2025: 다주택 중과 유예 기간 */
export const TAX_CONFIG_2024_2025: TaxConfig = {
  taxYear: 2025,
  multiHomeHeavyTaxEnabled: false,
  firstHomeBenefitEnabled: true,
  fairMarketValueRatio: 0.60,
  multiHomeTransferSurchargeEnabled: false,
  oneHouseExemptionThreshold: 1_200_000_000,
};

/**
 * 2026 실제 적용 세제 (2026-10 기준 조사 반영 · 세무 확정 시 재검토 권장).
 * - 취득세 다주택 중과: 적용 중(조정대상지역 2주택 8% / 3주택 이상 12%, 법인 12%).
 * - 양도세 다주택 중과: 2026.5.9 유예 종료 → 5.10부터 부활(조정 2주택 +20%p / 3주택↑ +30%p).
 * - 생애최초 취득세 감면: 유지(12억 이하 200만원 한도, 2026 오피스텔 포함·청년 300만원 확대).
 * - 종부세 공정시장가액비율: 2026년 60%(2027년 70%·2028년 80% 단계 인상 예정).
 */
export const TAX_CONFIG_2026: TaxConfig = {
  taxYear: 2026,
  multiHomeHeavyTaxEnabled: true,    // 취득세 다주택 중과 적용 중
  firstHomeBenefitEnabled: true,     // 생애최초 감면 유지
  fairMarketValueRatio: 0.60,       // 2026년 60%
  multiHomeTransferSurchargeEnabled: true,  // 양도세 다주택 중과 2026.5.10 부활
  oneHouseExemptionThreshold: 1_200_000_000,
};

/** 2026 (중과 복원 시나리오) */
export const TAX_CONFIG_2026_RESTORED: TaxConfig = {
  taxYear: 2026,
  multiHomeHeavyTaxEnabled: true,    // 2025.05 유예 만료 → 중과 복원
  firstHomeBenefitEnabled: false,    // 2025년 말 감면 종료
  fairMarketValueRatio: 0.65,       // 60% → 65% 인상
  multiHomeTransferSurchargeEnabled: true,
  oneHouseExemptionThreshold: 1_200_000_000,
};

/** 연도별 기본 TaxConfig 반환 */
export function getTaxConfig(year: number = 2026): TaxConfig {
  if (year <= 2025) return TAX_CONFIG_2024_2025;
  return TAX_CONFIG_2026; // 2026 실제 적용(취득세·양도세 다주택 중과 반영)
}

const DEFAULT_CONFIG = TAX_CONFIG_2026;

// ─── 인터페이스 ───

interface AcquisitionTaxInput {
  price: number;        // 매매가
  houseCount: number;   // 보유 주택수 (매수 후 기준)
  isAdjusted: boolean;  // 조정대상지역 여부
  isFirstHome: boolean; // 생애최초 여부
}

interface HoldingTaxInput {
  assessedValue: number;   // 공시가격
  houseCount: number;
  isAdjusted: boolean;
}

interface TransferTaxInput {
  acquisitionPrice: number;  // 취득가
  transferPrice: number;     // 양도가
  holdingYears: number;      // 보유기간 (년)
  livingYears: number;       // 거주기간 (년)
  houseCount: number;
  isAdjusted: boolean;
}

// ─── 취득세 ───

export function calculateAcquisitionTax(input: AcquisitionTaxInput, config: TaxConfig = DEFAULT_CONFIG) {
  const { price, houseCount, isAdjusted, isFirstHome } = input;

  let rate: number;
  let label: string;

  // 생애최초 주택 200만원 감면 (설정에 따라 활성/비활성)
  if (config.firstHomeBenefitEnabled && isFirstHome && houseCount === 1 && price <= 1200000000) {
    if (price <= 600000000) {
      return { tax: 0, rate: 0, label: "생애최초 면제", details: "6억원 이하 생애최초 주택 취득세 면제" };
    }
    rate = 0.01;
    label = "생애최초 감면 (1%)";
    const tax = Math.round(price * rate);
    return { tax: Math.max(0, tax - 2000000), rate, label, details: "12억원 이하 생애최초 주택 200만원 감면" };
  }

  if (houseCount === 1) {
    // 1주택자 (중과 여부 무관, 동일)
    if (price <= 600000000) {
      rate = 0.01;
      label = "1주택 (6억 이하, 1%)";
    } else if (price <= 900000000) {
      rate = 0.01 + (price - 600000000) / 300000000 * 0.02;
      label = `1주택 (6~9억, ${(rate * 100).toFixed(2)}%)`;
    } else {
      rate = 0.03;
      label = "1주택 (9억 초과, 3%)";
    }
  } else if (houseCount === 2) {
    if (config.multiHomeHeavyTaxEnabled) {
      // 중과 복원: 조정지역 8%, 비조정 1~3%
      rate = isAdjusted ? 0.08 : 0.01;
      label = isAdjusted ? "2주택 조정지역 중과 (8%)" : "2주택 비조정 (1~3%)";
      if (!isAdjusted) {
        if (price <= 600000000) rate = 0.01;
        else if (price <= 900000000) rate = 0.02;
        else rate = 0.03;
      }
    } else {
      // 유예 기간: 일반 세율 적용
      if (price <= 600000000) rate = 0.01;
      else if (price <= 900000000) rate = 0.02;
      else rate = 0.03;
      label = `2주택 (유예 적용, ${(rate * 100).toFixed(0)}%)`;
    }
  } else if (houseCount === 3) {
    if (config.multiHomeHeavyTaxEnabled) {
      rate = isAdjusted ? 0.12 : 0.08;
      label = isAdjusted ? "3주택 조정지역 중과 (12%)" : "3주택 비조정 (8%)";
    } else {
      rate = isAdjusted ? 0.08 : 0.04;
      label = isAdjusted ? `3주택 조정 (유예, 8%)` : `3주택 비조정 (유예, 4%)`;
    }
  } else {
    // 4주택 이상
    rate = config.multiHomeHeavyTaxEnabled ? 0.12 : 0.04;
    label = config.multiHomeHeavyTaxEnabled ? "4주택 이상 중과 (12%)" : "4주택 이상 (유예, 4%)";
  }

  const tax = Math.round(price * rate);
  const localEduTax = Math.round(tax * 0.1); // 지방교육세
  const specialTax = rate > 0.02 ? Math.round(price * 0.002) : 0; // 농어촌특별세

  return {
    tax,
    localEduTax,
    specialTax,
    totalTax: tax + localEduTax + specialTax,
    rate,
    label,
    details: `취득세 ${(rate * 100).toFixed(1)}% + 지방교육세 + 농어촌특별세`,
  };
}

// ─── 보유세 (재산세 + 종합부동산세) ───

/** 종합부동산세 본세 계산 (공정시장가액비율 ratio 적용). 미래 비율 예고 계산에 재사용. */
function comprehensiveTaxByRatio(assessedValue: number, houseCount: number, ratio: number): number {
  const deduction = houseCount === 1 ? 1200000000 : 900000000; // 1세대1주택 12억, 그 외 9억
  const taxableValue = Math.max(0, Math.round(assessedValue * ratio) - deduction);
  if (taxableValue <= 0) return 0;
  let tax = 0;
  if (houseCount <= 2) {
    if (taxableValue <= 300000000) tax = taxableValue * 0.005;
    else if (taxableValue <= 600000000) tax = 1500000 + (taxableValue - 300000000) * 0.007;
    else if (taxableValue <= 1200000000) tax = 3600000 + (taxableValue - 600000000) * 0.01;
    else if (taxableValue <= 2500000000) tax = 9600000 + (taxableValue - 1200000000) * 0.013;
    else if (taxableValue <= 5000000000) tax = 26500000 + (taxableValue - 2500000000) * 0.015;
    else tax = 64000000 + (taxableValue - 5000000000) * 0.02;
  } else {
    if (taxableValue <= 300000000) tax = taxableValue * 0.012;
    else if (taxableValue <= 600000000) tax = 3600000 + (taxableValue - 300000000) * 0.016;
    else tax = 8400000 + (taxableValue - 600000000) * 0.022;
  }
  return Math.round(tax);
}

/** 종부세 공정시장가액비율 인상 예정(법 확정): 2027년 70%, 2028년 80%. 현재보다 높은 것만 안내. */
const FAIR_MARKET_RATIO_SCHEDULE = [{ year: 2027, ratio: 0.70 }, { year: 2028, ratio: 0.80 }];

export function calculateHoldingTax(input: HoldingTaxInput, config: TaxConfig = DEFAULT_CONFIG) {
  const { assessedValue, houseCount } = input;

  // 재산세 계산 (주택) - 공시가격 기준
  let propertyTax: number;
  if (assessedValue <= 60000000) {
    propertyTax = assessedValue * 0.001;
  } else if (assessedValue <= 150000000) {
    propertyTax = 60000 + (assessedValue - 60000000) * 0.0015;
  } else if (assessedValue <= 300000000) {
    propertyTax = 195000 + (assessedValue - 150000000) * 0.0025;
  } else {
    propertyTax = 570000 + (assessedValue - 300000000) * 0.004;
  }
  propertyTax = Math.round(propertyTax);

  // 종합부동산세: 공정시장가액비율 적용 후 공제·세율
  const deduction = houseCount === 1 ? 1200000000 : 900000000; // 1세대1주택 12억, 그 외 9억
  const taxableValue = Math.max(0, Math.round(assessedValue * config.fairMarketValueRatio) - deduction);
  const comprehensiveTax = comprehensiveTaxByRatio(assessedValue, houseCount, config.fairMarketValueRatio);

  // 미래 공정시장가액비율 인상 예정 안내(현재 계산엔 미반영).
  // 현재보다 높은 비율이면서, 그때 실제로 종부세가 발생하는 경우만 안내(0원 예고는 노이즈라 숨김).
  const futureComprehensive = FAIR_MARKET_RATIO_SCHEDULE
    .filter((f) => f.ratio > config.fairMarketValueRatio)
    .map((f) => ({
      year: f.year,
      ratio: f.ratio,
      comprehensiveTax: comprehensiveTaxByRatio(assessedValue, houseCount, f.ratio),
    }))
    .filter((f) => f.comprehensiveTax > 0);

  return {
    propertyTax,
    comprehensiveTax,
    totalTax: propertyTax + comprehensiveTax,
    details: {
      propertyTaxRate: "0.1~0.4%",
      deduction,
      taxableValue,
      fairMarketValueRatio: config.fairMarketValueRatio,
      futureComprehensive, // [{ year, ratio, comprehensiveTax }] — 예: 2027년 70% 적용 시 종부세
    },
  };
}

// ─── 양도세 ───

export function calculateTransferTax(input: TransferTaxInput, config: TaxConfig = DEFAULT_CONFIG) {
  const { acquisitionPrice, transferPrice, holdingYears, livingYears, houseCount, isAdjusted } = input;

  const gain = transferPrice - acquisitionPrice;
  if (gain <= 0) {
    return { tax: 0, gain: 0, details: "양도차익 없음 (비과세)" };
  }

  // 필요경비 (취득세 + 기타 약 3%)
  const expenses = Math.round(acquisitionPrice * 0.03);
  const taxableGain = Math.max(0, gain - expenses);

  // 1세대 1주택 비과세 (2년 이상 보유, 조정지역은 2년 거주)
  if (houseCount === 1 && holdingYears >= 2) {
    if (!isAdjusted || livingYears >= 2) {
      if (transferPrice <= config.oneHouseExemptionThreshold) {
        return { tax: 0, gain, taxableGain: 0, details: `1세대 1주택 비과세 (${(config.oneHouseExemptionThreshold / 100000000).toFixed(0)}억 이하, 2년 보유)` };
      }
      // 비과세 기준 초과분만 과세
      const taxableRatio = (transferPrice - config.oneHouseExemptionThreshold) / transferPrice;
      const adjustedGain = Math.round(taxableGain * taxableRatio);

      // 장기보유특별공제 (1주택: 연 4% 보유 + 연 4% 거주, 최대 80%)
      let deductionRate = 0;
      if (holdingYears >= 3) {
        const holdingDeduction = Math.min(holdingYears * 0.04, 0.40);
        const livingDeduction = Math.min(livingYears * 0.04, 0.40);
        deductionRate = Math.min(holdingDeduction + livingDeduction, 0.80);
      }

      const deductedGain = Math.round(adjustedGain * (1 - deductionRate));
      const tax = calculateProgressiveTax(deductedGain);

      return {
        tax,
        gain,
        taxableGain: deductedGain,
        deductionRate,
        details: `${(config.oneHouseExemptionThreshold / 100000000).toFixed(0)}억 초과분 과세, 장기보유특별공제 ${(deductionRate * 100).toFixed(0)}%`,
      };
    }
  }

  // 다주택자 중과 (설정에 따라 활성/비활성)
  let additionalRate = 0;
  if (config.multiHomeTransferSurchargeEnabled && isAdjusted) {
    if (houseCount === 2) additionalRate = 0.20; // 2주택 +20%p
    else if (houseCount >= 3) additionalRate = 0.30; // 3주택 +30%p
  }

  // 장기보유특별공제 (다주택 중과 대상은 미적용)
  let deductionRate = 0;
  if (additionalRate === 0 && holdingYears >= 3) {
    deductionRate = Math.min(holdingYears * 0.02, 0.30); // 연 2%, 최대 30%
  }

  const deductedGain = Math.round(taxableGain * (1 - deductionRate));
  let tax = calculateProgressiveTax(deductedGain);

  // 중과 추가세액
  if (additionalRate > 0) {
    tax = Math.round(deductedGain * (getProgressiveRate(deductedGain) + additionalRate));
  }

  // 지방소득세 10%
  const localIncomeTax = Math.round(tax * 0.1);

  return {
    tax,
    localIncomeTax,
    totalTax: tax + localIncomeTax,
    gain,
    taxableGain: deductedGain,
    deductionRate,
    additionalRate,
    details: additionalRate > 0
      ? `다주택 중과 +${(additionalRate * 100).toFixed(0)}%p`
      : `장기보유특별공제 ${(deductionRate * 100).toFixed(0)}%`,
  };
}

// ─── 누진세율 ───

function getProgressiveRate(taxableIncome: number): number {
  if (taxableIncome <= 14000000) return 0.06;
  if (taxableIncome <= 50000000) return 0.15;
  if (taxableIncome <= 88000000) return 0.24;
  if (taxableIncome <= 150000000) return 0.35;
  if (taxableIncome <= 300000000) return 0.38;
  if (taxableIncome <= 500000000) return 0.40;
  if (taxableIncome <= 1000000000) return 0.42;
  return 0.45;
}

function calculateProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  const brackets = [
    { limit: 14000000, rate: 0.06, deduction: 0 },
    { limit: 50000000, rate: 0.15, deduction: 1260000 },
    { limit: 88000000, rate: 0.24, deduction: 5760000 },
    { limit: 150000000, rate: 0.35, deduction: 15440000 },
    { limit: 300000000, rate: 0.38, deduction: 19940000 },
    { limit: 500000000, rate: 0.40, deduction: 25940000 },
    { limit: 1000000000, rate: 0.42, deduction: 35940000 },
    { limit: Infinity, rate: 0.45, deduction: 65940000 },
  ];

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.limit) {
      return Math.round(taxableIncome * bracket.rate - bracket.deduction);
    }
  }
  return 0;
}
