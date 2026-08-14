/**
 * 구매력(수요 풀) 기반 가격 상승 제약 계수
 *
 * 초고가 주택일수록 실제로 매입 가능한 가구(순자산 여력)가 급감하므로,
 * 최근 추세를 장기까지 그대로 연장하면 비현실적 폭등이 나온다.
 * 가구 순자산 분포(공식 통계)로 "그 가격을 감당 가능한 가구 비율(상위 %)"을 추정하고,
 * 구매층이 얇을수록 장기 성장률을 낮추는 계수를 산출한다.
 *
 * 출처: 통계청 2024 가계금융복지조사 (전국 가구 순자산 분위 경계, 2024-03 기준)
 *  - 상위 10% ≈ 10억원 / 상위 5% ≈ 15억원 / 상위 1% ≈ 33억원
 *  (서울은 전국보다 높으나, 보수적으로 전국 분포를 사용)
 */

// 순자산(원) → 상위 백분위(%) 앵커 (공식 통계값)
const NET_WORTH_ANCHORS: { netWorth: number; topPct: number }[] = [
  { netWorth: 300_000_000, topPct: 43 },    // 3억: 순자산 3억 미만 56.9% → 3억은 상위 ~43%
  { netWorth: 1_000_000_000, topPct: 10 },  // 10억 = 상위 10%
  { netWorth: 1_500_000_000, topPct: 5 },   // 15억 = 상위 5%
  { netWorth: 3_300_000_000, topPct: 1 },   // 33억 = 상위 1%
];

/** 자기자본(순자산 필요액) → 상위 몇 % 가구가 감당 가능한지 추정 (로그 보간 + 상단 외삽) */
export function estimateTopPercent(equity: number): number {
  if (equity <= NET_WORTH_ANCHORS[0].netWorth) return NET_WORTH_ANCHORS[0].topPct;

  for (let i = 0; i < NET_WORTH_ANCHORS.length - 1; i++) {
    const a = NET_WORTH_ANCHORS[i];
    const b = NET_WORTH_ANCHORS[i + 1];
    if (equity <= b.netWorth) {
      // 로그-로그 선형 보간
      const t = (Math.log(equity) - Math.log(a.netWorth)) / (Math.log(b.netWorth) - Math.log(a.netWorth));
      const logPct = Math.log(a.topPct) + t * (Math.log(b.topPct) - Math.log(a.topPct));
      return Math.exp(logPct);
    }
  }

  // 33억(상위 1%) 초과 → 지수 감소 외삽 (구매층 급감)
  // 70억 ≈ 0.2%, 100억 ≈ 0.1% 수준
  const top1 = NET_WORTH_ANCHORS[NET_WORTH_ANCHORS.length - 1];
  const ratio = top1.netWorth / equity;         // <1
  return Math.max(0.02, top1.topPct * Math.pow(ratio, 1.5));
}

/**
 * 구매력 계수 (0.5 ~ 1.0)
 * - 구매 가능 가구 비율이 두터우면(대중가) 1.0 → 성장 제약 없음
 * - 얇을수록(초고가) 낮아짐 → 장기 성장률을 강하게 눌러 비현실적 폭등 방지
 * @param price 현재가(원)
 * @param ltv 대출 비율(기본 0.2 = 자기자본 80%)
 */
export function purchasingPowerFactor(price: number, ltv = 0.2): number {
  if (!price || price <= 0) return 1;
  const equity = price * (1 - ltv);
  const topPct = estimateTopPercent(equity);
  // topPct 10%↑ → 1.0, 5% → ~0.85, 1% → ~0.62, 0.2% → ~0.5
  const factor = 0.5 + Math.min(topPct, 10) * 0.05;
  return Math.max(0.5, Math.min(1, factor));
}
