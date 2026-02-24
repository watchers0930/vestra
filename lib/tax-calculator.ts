// 2024-2025 기준 한국 부동산 세금 계산기

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

export function calculateAcquisitionTax(input: AcquisitionTaxInput) {
  const { price, houseCount, isAdjusted, isFirstHome } = input;

  let rate: number;
  let label: string;

  // 생애최초 주택 200만원 감면 (6억 이하 면제, 12억 이하 감면)
  if (isFirstHome && houseCount === 1 && price <= 1200000000) {
    if (price <= 600000000) {
      return { tax: 0, rate: 0, label: "생애최초 면제", details: "6억원 이하 생애최초 주택 취득세 면제" };
    }
    rate = 0.01;
    label = "생애최초 감면 (1%)";
    const tax = Math.round(price * rate);
    return { tax: Math.max(0, tax - 2000000), rate, label, details: "12억원 이하 생애최초 주택 200만원 감면" };
  }

  if (houseCount === 1) {
    // 1주택자
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
    rate = isAdjusted ? 0.08 : 0.01;
    label = isAdjusted ? "2주택 조정지역 (8%)" : "2주택 비조정 (1~3%)";
    if (!isAdjusted) {
      if (price <= 600000000) rate = 0.01;
      else if (price <= 900000000) rate = 0.02;
      else rate = 0.03;
    }
  } else if (houseCount === 3) {
    rate = isAdjusted ? 0.12 : 0.08;
    label = isAdjusted ? "3주택 조정지역 (12%)" : "3주택 비조정 (8%)";
  } else {
    rate = 0.12;
    label = "4주택 이상 (12%)";
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
    details: `취득세 ${(rate * 100).toFixed(1)}% + 지방교육세 + 농어촌특별세`
  };
}

export function calculateHoldingTax(input: HoldingTaxInput) {
  const { assessedValue, houseCount } = input;

  // 재산세 계산 (주택)
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

  // 종합부동산세 (공시가격 기준 공제 후)
  const deduction = houseCount === 1 ? 1200000000 : 900000000; // 1세대1주택 12억, 그 외 9억
  const taxableValue = Math.max(0, assessedValue - deduction);

  let comprehensiveTax = 0;
  if (taxableValue > 0) {
    if (houseCount <= 2) {
      // 일반세율
      if (taxableValue <= 300000000) comprehensiveTax = taxableValue * 0.005;
      else if (taxableValue <= 600000000) comprehensiveTax = 1500000 + (taxableValue - 300000000) * 0.007;
      else if (taxableValue <= 1200000000) comprehensiveTax = 3600000 + (taxableValue - 600000000) * 0.01;
      else if (taxableValue <= 2500000000) comprehensiveTax = 9600000 + (taxableValue - 1200000000) * 0.013;
      else if (taxableValue <= 5000000000) comprehensiveTax = 26500000 + (taxableValue - 2500000000) * 0.015;
      else comprehensiveTax = 64000000 + (taxableValue - 5000000000) * 0.02;
    } else {
      // 3주택 이상 중과세율
      if (taxableValue <= 300000000) comprehensiveTax = taxableValue * 0.012;
      else if (taxableValue <= 600000000) comprehensiveTax = 3600000 + (taxableValue - 300000000) * 0.016;
      else comprehensiveTax = 8400000 + (taxableValue - 600000000) * 0.022;
    }
  }
  comprehensiveTax = Math.round(comprehensiveTax);

  return {
    propertyTax,
    comprehensiveTax,
    totalTax: propertyTax + comprehensiveTax,
    details: {
      propertyTaxRate: "0.1~0.4%",
      deduction: deduction,
      taxableValue,
    }
  };
}

export function calculateTransferTax(input: TransferTaxInput) {
  const { acquisitionPrice, transferPrice, holdingYears, livingYears, houseCount, isAdjusted } = input;

  const gain = transferPrice - acquisitionPrice;
  if (gain <= 0) {
    return { tax: 0, gain: 0, details: "양도차익 없음 (비과세)" };
  }

  // 필요경비 (취득세 + 기타 약 3%)
  const expenses = Math.round(acquisitionPrice * 0.03);
  const taxableGain = Math.max(0, gain - expenses);

  // 1세대 1주택 비과세 (2년 이상 보유, 조정지역은 2년 거주, 12억 이하)
  if (houseCount === 1 && holdingYears >= 2) {
    if (!isAdjusted || livingYears >= 2) {
      if (transferPrice <= 1200000000) {
        return { tax: 0, gain, taxableGain: 0, details: "1세대 1주택 비과세 (12억 이하, 2년 보유)" };
      }
      // 12억 초과분만 과세
      const taxableRatio = (transferPrice - 1200000000) / transferPrice;
      const adjustedGain = Math.round(taxableGain * taxableRatio);

      // 장기보유특별공제
      let deductionRate = 0;
      if (holdingYears >= 3) {
        const holdingDeduction = Math.min(holdingYears * 0.04, 0.40); // 연 4%, 최대 40%
        const livingDeduction = Math.min(livingYears * 0.04, 0.40);  // 연 4%, 최대 40%
        deductionRate = Math.min(holdingDeduction + livingDeduction, 0.80);
      }

      const deductedGain = Math.round(adjustedGain * (1 - deductionRate));
      const tax = calculateProgressiveTax(deductedGain);

      return {
        tax,
        gain,
        taxableGain: deductedGain,
        deductionRate,
        details: `12억 초과분 과세, 장기보유특별공제 ${(deductionRate * 100).toFixed(0)}%`
      };
    }
  }

  // 다주택자 중과
  let additionalRate = 0;
  if (isAdjusted) {
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
      : `장기보유특별공제 ${(deductionRate * 100).toFixed(0)}%`
  };
}

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
